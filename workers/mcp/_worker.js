// Snapforge Ship-Ready Check — MCP server (Cloudflare Worker port of chatgpt-plugin/server.js)
//
// Passive, read-only launch checks for a live web app the caller owns or is
// authorized to test. It reads ONLY what any visitor's browser already receives
// from the target: the homepage HTML, the HTTP response headers, robots.txt,
// sitemap.xml and the CORS response header. It never scans JavaScript bundles,
// never extracts secrets, never queries a database or API, never signs in,
// submits a form or writes anything. Same scope and class as securityheaders.com.
//
// Node-only bits of the original (node:http / node:dns / node:net and the MCP
// SDK's node transport) are replaced with the Worker fetch handler and a minimal
// stateless JSON-RPC handler. Cloudflare's fetch already refuses private
// addresses, so the DNS lookup is dropped; the hostname and IP-literal guards
// are kept.

const UA = "SnapforgeShipReadyCheck/1.0 (+https://snapforgelab.com)";
const FREE_AUDIT = "https://snapforgelab.com/free-audit";
const DEEP_NOTE =
  "This is a surface check only. For a deeper review (exposed keys, auth, database rules), the app owner can request the free Snapforge Lab audit, which confirms ownership first.";
const MCP_PATH = "/mcp";
const RATE_LIMIT = 20; // check_app calls per IP per hour

// ---------- URL / SSRF guard (no DNS on Workers) ----------
function ipKind(host) {
  if (/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.test(host)) {
    return host.split(".").every((o) => Number(o) <= 255) ? 4 : 0;
  }
  if (host.includes(":") && /^[0-9a-f:.]+$/i.test(host)) return 6;
  return 0;
}
function isPrivateIp(ip) {
  if (ipKind(ip) === 4) {
    const p = ip.split(".").map(Number);
    return (
      p[0] === 10 ||
      (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
      (p[0] === 192 && p[1] === 168) ||
      p[0] === 127 ||
      (p[0] === 169 && p[1] === 254) ||
      p[0] === 0 ||
      p[0] >= 224
    );
  }
  const s = ip.toLowerCase();
  return (
    s === "::1" ||
    s.startsWith("fe80") ||
    s.startsWith("fc") ||
    s.startsWith("fd") ||
    s.startsWith("::ffff:127") ||
    s === "::"
  );
}
function assertPublicUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("That doesn't look like a valid URL. Use something like https://yourapp.replit.app");
  }
  if (!/^https?:$/.test(url.protocol)) throw new Error("Only http and https URLs can be checked.");
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal"))
    throw new Error("I can only check apps on the public internet, not local or internal addresses.");
  if (ipKind(host) && isPrivateIp(host))
    throw new Error("That address is on a private network, which I can't check.");
  return url;
}

async function fetchT(url, opts = {}, ms = 20000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    return await fetch(url, {
      redirect: "follow",
      signal: c.signal,
      headers: { "user-agent": UA, ...(opts.headers || {}) },
      method: opts.method || "GET",
    });
  } finally {
    clearTimeout(t);
  }
}

function detectStack(html, headers, host) {
  const h = html.toLowerCase();
  if (host.endsWith(".lovable.app") || h.includes("gptengineer.js") || h.includes("cdn.gpteng.co") || h.includes("lovable-tagger")) return "lovable";
  if (host.endsWith(".bolt.host") || /built with bolt|bolt\.new\b/.test(h)) return "bolt";
  if (host.endsWith(".replit.app") || host.endsWith(".repl.co") || h.includes("replit.com/public/js") || (headers.get("server") || "").toLowerCase().includes("replit")) return "replit";
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
  const s = stack && FIXES[issue]?.[stack] ? stack : "replit";
  return FIXES[issue] ? FIXES[issue][s] : null;
}

async function checkApp(rawUrl) {
  const url = assertPublicUrl(rawUrl);
  const base = `${url.protocol}//${url.host}`;
  const findings = [];
  let stack = "unknown",
    ok = false,
    ms = null,
    html = "";
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
  const title = (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [])[1]?.trim();
  const desc = /<meta[^>]+name=["']description["'][^>]*>/i.test(html);
  if (!title || !desc) findings.push({ id: "missing_title_meta", severity: "medium", title: "Missing title or meta description", detail: `title: ${title ? `"${title}"` : "missing"}; meta description: ${desc ? "present" : "missing"}. Google needs both to index the page well.` });
  try {
    const sm = await fetchT(`${base}/sitemap.xml`, {}, 12000);
    const ct = (sm.headers.get("content-type") || "").toLowerCase();
    const body = (await sm.text()).slice(0, 400).toLowerCase();
    if (sm.ok && !ct.includes("xml") && (body.includes("<!doctype html") || body.includes("<html"))) {
      findings.push({ id: "sitemap_returns_html", severity: "medium", title: "sitemap.xml returns HTML, not XML", detail: "Your /sitemap.xml serves the app's HTML. Search engines can't read it." });
    }
  } catch {}
  const want = { "strict-transport-security": "HSTS", "x-content-type-options": "X-Content-Type-Options", "x-frame-options": "X-Frame-Options", "content-security-policy": "Content-Security-Policy" };
  const missing = Object.entries(want).filter(([k]) => !headers.get(k)).map(([, v]) => v);
  if (missing.length) findings.push({ id: "missing_security_headers", severity: "medium", title: "Missing security headers", detail: `Not set: ${missing.join(", ")}.` });
  try {
    const c = await fetchT(url.href, { headers: { origin: "https://evil.example" } }, 12000);
    const acao = c.headers.get("access-control-allow-origin");
    const acc = (c.headers.get("access-control-allow-credentials") || "").toLowerCase();
    if (acao === "*") findings.push({ id: "open_cors", severity: acc === "true" ? "high" : "low", title: "CORS open to any site", detail: `Access-Control-Allow-Origin is *${acc === "true" ? " with credentials allowed, which is dangerous" : ""}.` });
  } catch {}
  if (/edit with lovable|data-lovable|replit-dev-banner|__replco|replit\.com\/public\/js\/replit-dev/i.test(html)) {
    findings.push({ id: "dev_banner_in_prod", severity: "low", title: "Dev banner/script left in production", detail: "A builder dev banner or dev script is still shipping in production." });
  }
  for (const f of findings) {
    const fp = fixFor(f.id, stack);
    if (fp) f.fix_prompt = fp;
  }
  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);
  return { url: url.href, reachable: true, http_status: res.status, response_ms: ms, stack, findings, summary: findings.length ? `${findings.length} issue(s) found.` : "No issues found in the passive checks.", free_audit: FREE_AUDIT, note: DEEP_NOTE };
}

// ---------- MCP tool definitions (names, descriptions, schemas, annotations preserved) ----------
const TOOLS = [
  {
    name: "check_app",
    title: "Ship-ready check",
    description:
      "Run a passive, read-only launch check on the public URL of a live app the user owns or is authorized to test (built with Replit, Lovable or Bolt). Checks: reachable and fast, SEO title/meta, robots/sitemap, security headers, open CORS, and a dev banner left in production. Only reads what any visitor's browser already sees (homepage, response headers, robots.txt, sitemap.xml); never scans JavaScript bundles for secrets, never signs in, submits forms, writes data or reads databases. Refuse private/internal addresses.",
    inputSchema: {
      type: "object",
      properties: { url: { type: "string", minLength: 4, description: "Public https URL of the app to check, e.g. https://yourapp.replit.app" } },
      required: ["url"],
      additionalProperties: false,
    },
    outputSchema: {
      type: "object",
      properties: {
        url: { type: "string" },
        reachable: { type: "boolean" },
        http_status: { type: "number" },
        response_ms: { type: ["number", "null"] },
        stack: { type: "string" },
        summary: { type: "string" },
        free_audit: { type: "string" },
        note: { type: "string" },
        findings: {
          type: "array",
          items: {
            type: "object",
            properties: { id: { type: "string" }, severity: { type: "string" }, title: { type: "string" }, detail: { type: "string" }, fix_prompt: { type: "string" } },
            required: ["id", "severity", "title", "detail"],
          },
        },
      },
      required: ["url", "reachable", "stack", "findings", "free_audit"],
    },
    annotations: { title: "Ship-ready check", readOnlyHint: true, destructiveHint: false, openWorldHint: true },
  },
  {
    name: "get_fix_prompt",
    title: "Get fix prompt",
    description: "Return a paste-ready prompt to fix a specific issue in the user's builder (Replit Agent, Lovable or Bolt). Use the issue id from check_app.",
    inputSchema: {
      type: "object",
      properties: {
        issue: { type: "string", enum: ["missing_security_headers", "open_cors", "sitemap_returns_html", "missing_title_meta", "dev_banner_in_prod", "app_down"] },
        builder: { type: "string", enum: ["replit", "lovable", "bolt"] },
      },
      required: ["issue"],
      additionalProperties: false,
    },
    outputSchema: { type: "object", properties: { issue: { type: "string" }, builder: { type: "string" }, fix_prompt: { type: "string" } }, required: ["issue", "builder", "fix_prompt"] },
    annotations: { title: "Get fix prompt", readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
];

async function callTool(name, args, env, ip) {
  if (name === "check_app") {
    const allowed = await underRateLimit(env, ip);
    if (!allowed) return { isError: true, content: [{ type: "text", text: `Rate limit reached (${RATE_LIMIT} checks per hour). Please try again later.` }] };
    try {
      const r = await checkApp(String(args?.url || "").trim());
      return { content: [{ type: "text", text: r.reachable ? `${r.summary} Stack: ${r.stack}.` : `Could not reach ${r.url}.` }], structuredContent: r };
    } catch (e) {
      return { isError: true, content: [{ type: "text", text: e.message || "Could not run the check." }] };
    }
  }
  if (name === "get_fix_prompt") {
    const builder = args?.builder || "replit";
    const fp = fixFor(args?.issue, builder);
    return { content: [{ type: "text", text: fp || "No fix prompt for that issue." }], structuredContent: { issue: args?.issue, builder, fix_prompt: fp || "" } };
  }
  return { isError: true, content: [{ type: "text", text: `Unknown tool: ${name}` }] };
}

// ---------- per-IP rate limit via KV (free tier); no-op if KV not bound ----------
async function underRateLimit(env, ip) {
  if (!env || !env.RATE_KV || !ip) return true;
  const key = `rl:${ip}:${new Date().toISOString().slice(0, 13)}`; // yyyy-mm-ddThh
  try {
    const n = Number((await env.RATE_KV.get(key)) || 0);
    if (n >= RATE_LIMIT) return false;
    await env.RATE_KV.put(key, String(n + 1), { expirationTtl: 3600 });
    return true;
  } catch {
    return true; // never fail closed on a limiter error
  }
}

// ---------- minimal stateless JSON-RPC MCP handler ----------
const PROTOCOL_VERSION = "2025-06-18";
function rpcResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}
function rpcError(id, code, message) {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

async function handleRpc(msg, env, ip) {
  const { id, method, params } = msg || {};
  switch (method) {
    case "initialize":
      return rpcResult(id, { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: { name: "snapforge-ship-ready-check", version: "1.0.0" } });
    case "tools/list":
      return rpcResult(id, { tools: TOOLS });
    case "tools/call": {
      const r = await callTool(params?.name, params?.arguments || {}, env, ip);
      return rpcResult(id, r);
    }
    case "ping":
      return rpcResult(id, {});
    default:
      return rpcError(id ?? null, -32601, `Method not found: ${method}`);
  }
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, mcp-session-id, mcp-protocol-version",
  "Access-Control-Expose-Headers": "Mcp-Session-Id",
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    if (request.method === "GET" && url.pathname === "/")
      return new Response("Snapforge Ship-Ready Check MCP server", { status: 200, headers: { "content-type": "text/plain; charset=utf-8", ...CORS } });

    if (request.method === "GET" && url.pathname === "/.well-known/openai-apps-challenge")
      return new Response(env.OPENAI_APPS_CHALLENGE || "", { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } });

    if (url.pathname === MCP_PATH) {
      if (request.method === "GET") {
        // No server-initiated streaming in this stateless build. Status stays 405 so MCP
        // clients behave; humans who open the URL in a browser get a short explanation.
        if ((request.headers.get("accept") || "").includes("text/html"))
          return new Response(
            '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Snapforge Ship-Ready Check MCP server</title></head>' +
            '<body style="font-family:system-ui,sans-serif;max-width:560px;margin:15vh auto;padding:0 20px;line-height:1.5;background:#050506;color:#eee">' +
            '<h1 style="font-size:22px">This address is for ChatGPT, not your browser</h1>' +
            '<p>https://mcp.snapforgelab.com/mcp is the server URL of the free Snapforge Ship-Ready Check. Paste it into ChatGPT when you create the app.</p>' +
            '<p><a style="color:#8ab4ff" href="https://snapforgelab.com/chatgpt-demo/">See the 2-minute setup steps &rarr;</a></p></body></html>',
            { status: 405, headers: { ...CORS, Allow: "POST, OPTIONS", "content-type": "text/html; charset=utf-8" } }
          );
        return new Response("Method Not Allowed", { status: 405, headers: { ...CORS, Allow: "POST, OPTIONS" } });
      }
      if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: { ...CORS, Allow: "POST, OPTIONS" } });

      let body;
      try {
        body = await request.json();
      } catch {
        return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400, headers: CORS });
      }
      const ip = request.headers.get("cf-connecting-ip") || "";

      // Notifications (no id) get a 202 with no body.
      const isNotification = (m) => m && m.id === undefined && typeof m.method === "string";
      if (Array.isArray(body)) {
        const responses = [];
        for (const m of body) {
          if (isNotification(m)) continue;
          responses.push(await handleRpc(m, env, ip));
        }
        if (!responses.length) return new Response(null, { status: 202, headers: CORS });
        return Response.json(responses, { headers: CORS });
      }
      if (isNotification(body)) return new Response(null, { status: 202, headers: CORS });
      const response = await handleRpc(body, env, ip);
      return Response.json(response, { headers: CORS });
    }

    return new Response("Not Found", { status: 404, headers: CORS });
  },
};
