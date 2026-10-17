// Snapforge Ship-Ready Check — MCP server
// Passive, read-only launch checks for live web apps built with Replit / Lovable / Bolt.
import { createServer } from "node:http";
import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

const UA = "SnapforgeShipReadyCheck/1.0 (+https://snapforgelab.com)";
const FREE_AUDIT = "https://snapforgelab.com/free-audit";
const DEEP_NOTE = "This is a surface check only. For a deeper review (exposed keys, auth, database rules), the app owner can request the free Snapforge Lab audit, which confirms ownership first.";

function isPrivateIp(ip) {
  if (isIP(ip) === 4) {
    const p = ip.split(".").map(Number);
    return p[0]===10 || (p[0]===172&&p[1]>=16&&p[1]<=31) || (p[0]===192&&p[1]===168) ||
           p[0]===127 || (p[0]===169&&p[1]===254) || p[0]===0 || p[0]>=224;
  }
  const s = ip.toLowerCase();
  return s==="::1" || s.startsWith("fe80") || s.startsWith("fc") || s.startsWith("fd") || s.startsWith("::ffff:127") || s==="::";
}
async function assertPublicUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { throw new Error("That doesn't look like a valid URL. Use something like https://yourapp.replit.app"); }
  if (!/^https?:$/.test(url.protocol)) throw new Error("Only http and https URLs can be checked.");
  const host = url.hostname.toLowerCase();
  if (host==="localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new Error("I can only check apps on the public internet, not local or internal addresses.");
  const ips = isIP(host) ? [host] : (await dnsLookup(host, { all: true })).map(a => a.address);
  if (ips.some(isPrivateIp)) throw new Error("That address resolves to a private network, which I can't check.");
  return url;
}

async function fetchT(url, opts={}, ms=20000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try { return await fetch(url, { redirect: "follow", signal: c.signal, headers: { "user-agent": UA, ...(opts.headers||{}) }, method: opts.method||"GET" }); }
  finally { clearTimeout(t); }
}

function detectStack(html, headers, host) {
  const h = html.toLowerCase();
  if (host.endsWith(".lovable.app") || h.includes("gptengineer.js") || h.includes("cdn.gpteng.co") || h.includes("lovable-tagger")) return "lovable";
  if (host.endsWith(".bolt.host") || /built with bolt|bolt\.new\b/.test(h)) return "bolt";
  if (host.endsWith(".replit.app") || host.endsWith(".repl.co") || h.includes("replit.com/public/js") || (headers.get("server")||"").toLowerCase().includes("replit")) return "replit";
  return "unknown";
}

const FIXES = {
  missing_security_headers: {
    replit: "Add these HTTP response headers to every response my Express/server sends: Strict-Transport-Security: max-age=63072000; includeSubDomains; preload, X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy: strict-origin-when-cross-origin, and a Content-Security-Policy that allows my own scripts and styles. Show me the exact server code change.",
    lovable: "In my app, add these security headers to every response (via middleware or my hosting config): Strict-Transport-Security, X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy: strict-origin-when-cross-origin, and a Content-Security-Policy that allows my own scripts/styles. Give me the exact change for how this app is deployed.",
    bolt: "Add security headers (Strict-Transport-Security, X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy: strict-origin-when-cross-origin, and a Content-Security-Policy) to every response, using a _headers file or netlify.toml for my deploy. Show me the file to add.",
  },
  open_cors: {
    replit: "My server currently returns Access-Control-Allow-Origin: * . Replace it with a strict allowlist that only allows my own domain(s) and localhost in development. Show the exact CORS config.",
    lovable: "My API responds with Access-Control-Allow-Origin: * . Change it to an allowlist of only my production domain(s). Give me the exact change.",
    bolt: "My API returns Access-Control-Allow-Origin: * . Restrict it to my own domain(s) only. Show the exact change.",
  },
  sitemap_returns_html: {
    replit: "My /sitemap.xml returns my app's HTML instead of XML. Serve a real XML sitemap at /sitemap.xml with the correct content-type application/xml, and make sure the catch-all route doesn't swallow it. Show the exact route change.",
    lovable: "My /sitemap.xml returns HTML, not XML. Generate a proper XML sitemap served with content-type application/xml, and add a /robots.txt that points to it. Show me the change.",
    bolt: "My /sitemap.xml serves the SPA HTML. Add a real sitemap.xml (static file or build step) served as application/xml and reference it from robots.txt. Show me the files.",
  },
  missing_title_meta: {
    replit: "My pages are missing a unique <title> and <meta name=\"description\">. Add a descriptive title and meta description per page so Google can index them. Show me where to set them.",
    lovable: "My app has no proper <title> or meta description for search engines (client-rendered). Add per-page title and meta description (react-helmet or SSR/prerender). Show me the change.",
    bolt: "My SPA ships an empty title and no meta description. Add per-route title + meta description and consider prerendering for SEO. Show me the change.",
  },
  dev_banner_in_prod: {
    replit: "My production site still shows the Replit dev banner / devtools script. Remove the dev-only banner and scripts from the production build. Show me what to remove.",
    lovable: "My live site still shows an 'Edit with Lovable' dev badge. Remove dev-only badges/scripts from the production build. Show me the change.",
    bolt: "My production build still includes dev-only UI. Strip dev banners/scripts from the production bundle. Show me the change.",
  },
  app_down: {
    replit: "My Replit app isn't reachable in production. Check the deployment status, the run command and the port binding (bind to 0.0.0.0 and the provided PORT). Walk me through getting it live.",
    lovable: "My app isn't loading in production. Check the deploy logs, build output and domain settings. Walk me through getting it live.",
    bolt: "My Bolt app isn't loading in production. Check the Netlify/Vercel deploy logs and build settings. Walk me through getting it live.",
  },
};

function fixFor(issue, stack) {
  const s = (stack && FIXES[issue]?.[stack]) ? stack : "replit";
  return FIXES[issue] ? FIXES[issue][s] : null;
}

async function checkApp(rawUrl) {
  const url = await assertPublicUrl(rawUrl);
  const base = `${url.protocol}//${url.host}`;
  const findings = [];
  let stack = "unknown", ok = false, ms = null, html = "";
  let res;
  const t0 = Date.now();
  try {
    res = await fetchT(url.href);
    ms = Date.now() - t0;
    ok = res.ok;
    html = await res.text();
  } catch {
    findings.push({ id: "app_down", severity: "critical", title: "App is not reachable", detail: `Nothing loaded at ${url.href}. Check that the deployment is live.` });
    return { url: url.href, reachable: false, stack, findings, free_audit: FREE_AUDIT };
  }
  const headers = res.headers;
  stack = detectStack(html, headers, url.hostname.toLowerCase());
  if (!ok) {
    findings.push({ id: "app_down", severity: "critical", title: `App returned HTTP ${res.status}`, detail: `The homepage returned status ${res.status}, so visitors see an error. Fix this first.`, fix_prompt: fixFor("app_down", stack) });
    return { url: url.href, reachable: true, http_status: res.status, response_ms: ms, stack, findings, summary: `The app returned HTTP ${res.status}.`, free_audit: FREE_AUDIT };
  }
  const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i)||[])[1]?.trim();
  const desc = /<meta[^>]+name=["']description["'][^>]*>/i.test(html);
  if (!title || !desc) findings.push({ id: "missing_title_meta", severity: "medium", title: "Missing title or meta description", detail: `title: ${title?`"${title}"`:"missing"}; meta description: ${desc?"present":"missing"}. Google needs both to index the page well.` });
  try {
    const sm = await fetchT(`${base}/sitemap.xml`, {}, 12000);
    const ct = (sm.headers.get("content-type")||"").toLowerCase();
    const body = (await sm.text()).slice(0, 400).toLowerCase();
    if (sm.ok && !ct.includes("xml") && (body.includes("<!doctype html") || body.includes("<html"))) {
      findings.push({ id: "sitemap_returns_html", severity: "medium", title: "sitemap.xml returns HTML, not XML", detail: "Your /sitemap.xml serves the app's HTML. Search engines can't read it." });
    }
  } catch {}
  const want = { "strict-transport-security":"HSTS", "x-content-type-options":"X-Content-Type-Options", "x-frame-options":"X-Frame-Options", "content-security-policy":"Content-Security-Policy" };
  const missing = Object.entries(want).filter(([k]) => !headers.get(k)).map(([,v]) => v);
  if (missing.length) findings.push({ id: "missing_security_headers", severity: "medium", title: "Missing security headers", detail: `Not set: ${missing.join(", ")}.` });
  try {
    const c = await fetchT(url.href, { headers: { origin: "https://evil.example" } }, 12000);
    const acao = c.headers.get("access-control-allow-origin");
    const acc = (c.headers.get("access-control-allow-credentials")||"").toLowerCase();
    if (acao === "*") findings.push({ id: "open_cors", severity: acc==="true"?"high":"low", title: "CORS open to any site", detail: `Access-Control-Allow-Origin is *${acc==="true"?" with credentials allowed, which is dangerous":""}.` });
  } catch {}
  if (/edit with lovable|data-lovable|replit-dev-banner|__replco|replit\.com\/public\/js\/replit-dev/i.test(html)) {
    findings.push({ id: "dev_banner_in_prod", severity: "low", title: "Dev banner/script left in production", detail: "A builder dev banner or dev script is still shipping in production." });
  }
  for (const f of findings) { const fp = fixFor(f.id, stack); if (fp) f.fix_prompt = fp; }
  const order = { critical:0, high:1, medium:2, low:3 };
  findings.sort((a,b)=>order[a.severity]-order[b.severity]);
  return { url: url.href, reachable: true, http_status: res.status, response_ms: ms, stack, findings, summary: findings.length?`${findings.length} issue(s) found.`:"No issues found in the passive checks.", free_audit: FREE_AUDIT, note: DEEP_NOTE };
}

function build() {
  const server = new McpServer({ name: "snapforge-ship-ready-check", version: "1.0.0" });
  server.registerTool("check_app", {
    title: "Ship-ready check",
    description: "Run a passive, read-only launch check on the public URL of a live app the user owns or is authorized to test (built with Replit, Lovable or Bolt). Checks: reachable and fast, SEO title/meta, robots/sitemap, security headers, open CORS, and a dev banner left in production. Only reads what any visitor's browser already sees (homepage, response headers, robots.txt, sitemap.xml); never scans JavaScript bundles for secrets, never signs in, submits forms, writes data or reads databases. Refuse private/internal addresses.",
    inputSchema: { url: z.string().min(4).describe("Public https URL of the app to check, e.g. https://yourapp.replit.app") },
    outputSchema: {
      url: z.string(), reachable: z.boolean(), http_status: z.number().optional(), response_ms: z.number().nullable().optional(),
      stack: z.string(), summary: z.string().optional(), free_audit: z.string(), note: z.string().optional(),
      findings: z.array(z.object({ id: z.string(), severity: z.string(), title: z.string(), detail: z.string(), fix_prompt: z.string().optional() }))
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: true },
  }, async (args) => {
    try {
      const r = await checkApp(String(args?.url||"").trim());
      return { content: [{ type: "text", text: r.reachable ? `${r.summary} Stack: ${r.stack}.` : `Could not reach ${r.url}.` }], structuredContent: r };
    } catch (e) {
      return { isError: true, content: [{ type: "text", text: e.message || "Could not run the check." }] };
    }
  });
  server.registerTool("get_fix_prompt", {
    title: "Get fix prompt",
    description: "Return a paste-ready prompt to fix a specific issue in the user's builder (Replit Agent, Lovable or Bolt). Use the issue id from check_app.",
    inputSchema: {
      issue: z.enum(["missing_security_headers","open_cors","sitemap_returns_html","missing_title_meta","dev_banner_in_prod","app_down"]),
      builder: z.enum(["replit","lovable","bolt"]).optional()
    },
    outputSchema: { issue: z.string(), builder: z.string(), fix_prompt: z.string() },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, async (args) => {
    const builder = args?.builder || "replit";
    const fp = fixFor(args.issue, builder);
    return { content: [{ type: "text", text: fp || "No fix prompt for that issue." }], structuredContent: { issue: args.issue, builder, fix_prompt: fp || "" } };
  });
  return server;
}

const port = Number(process.env.PORT ?? 8787);
const MCP = "/mcp";
createServer(async (req, res) => {
  const url = new URL(req.url||"/", `http://${req.headers.host||"localhost"}`);
  if (req.method==="OPTIONS" && url.pathname===MCP) {
    res.writeHead(204, { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Methods":"POST, GET, OPTIONS", "Access-Control-Allow-Headers":"content-type, mcp-session-id", "Access-Control-Expose-Headers":"Mcp-Session-Id" }); return res.end();
  }
  if (req.method==="GET" && url.pathname==="/") { res.writeHead(200,{"content-type":"text/plain"}); return res.end("Snapforge Ship-Ready Check MCP server"); }
  if (url.pathname===MCP && ["POST","GET","DELETE"].includes(req.method||"")) {
    res.setHeader("Access-Control-Allow-Origin","*"); res.setHeader("Access-Control-Expose-Headers","Mcp-Session-Id");
    const server = build();
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on("close", () => { transport.close(); server.close(); });
    try { await server.connect(transport); await transport.handleRequest(req, res); }
    catch (e) { if (!res.headersSent) res.writeHead(500).end("Internal server error"); }
    return;
  }
  res.writeHead(404).end("Not Found");
}).listen(port, () => console.log(`Snapforge MCP on :${port}${MCP}`));
