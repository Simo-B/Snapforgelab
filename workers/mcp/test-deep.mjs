// Unit + integration tests for the deep scanner (no network: a fake fetch plays the target app and Supabase).
//   node test-deep.mjs
import {
  maskSecret, scanTextForSecrets, assertPublicHost, isPrivateAddress, GuardError, extractSupabase,
  probeRls, makeBudget, LIMITS, detectPreviewAuth, grade, deepScan, scriptUrlsFromHtml, chunkUrlsFromScript,
  tableNamesFromBundle, bucketNamesFromBundle,
} from "./deep-scan.js";
import worker from "./worker.js";
import pagesWorker from "./_worker.js";

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { cond ? pass++ : fail++; console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`); };
const throwsGuard = (fn) => { try { fn(); return false; } catch (e) { return e instanceof GuardError; } };

// ---- fake JWTs (unsigned, test only)
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const REF = "abcdefghijklmnopqrst";
const jwt = (payload) => `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}.${"s".repeat(20)}Zq9X`;
const ANON = jwt({ iss: "supabase", ref: REF, role: "anon", iat: 1700000000 });
const SERVICE = jwt({ iss: "supabase", ref: REF, role: "service_role", iat: 1700000000 });
const STRIPE = "sk_live_" + "51HxT3stK3yValue9988" + "abcd";
const OPENAI = "sk-proj-" + "Ab3dEf6hIj9kLm2nOp5qRs8tUv1wXy4zAb7c";

// ================= masking
ok("mask: stripe keeps prefix + last 4", maskSecret(STRIPE) === "sk_live_…abcd", maskSecret(STRIPE));
ok("mask: never contains the middle", !maskSecret(STRIPE).includes("51HxT3"));
ok("mask: JWT shows eyJ…last4 only", maskSecret(SERVICE) === "eyJ…Zq9X", maskSecret(SERVICE));
ok("mask: short value fully hidden", maskSecret("hunter2!") === "…(hidden)");
ok("mask: openai", maskSecret(OPENAI).startsWith("sk-proj-…") && maskSecret(OPENAI).length < 16);

// ================= false-positive rules
const fp = (t) => scanTextForSecrets(t, "test.js");
ok("FP: Supabase anon JWT is not a finding", fp(`const k="${ANON}"`).length === 0);
ok("FP: Supabase publishable key is not a finding", fp(`const k="sb_publishable_AbCdEf1234567890xyz"`).length === 0);
ok("FP: Stripe publishable key is not a finding", fp(`pk_live_51HxT3stK3yValue9988abcd`).length === 0);
const firebase = `const firebaseConfig={apiKey:"AIzaSyD-9fK2mQ7xL4pW1zR8tV6bN3cJ5hY0aE2",authDomain:"x.firebaseapp.com",projectId:"x",messagingSenderId:"1",appId:"1:2:web:3"}`;
ok("FP: Firebase web config is not a finding", fp(firebase).length === 0);
ok("FP: placeholder key ignored", fp(`sk_live_your_key_here_xxxxxxxxxxxx`).length === 0);
ok("FP: password label/placeholder ignored", fp(`{password:"Password must be 8+",placeholder:"password"} password:"changeme123"`).length === 0);
ok("FP: minified sk- identifiers ignored", fp(`a.sk-container-wrapper-element-name-long-class`).length === 0);
const hits = fp(`a="${SERVICE}";b="${STRIPE}";c="${OPENAI}";d="AKIA2E0A8F3B244C9986";e="sb_secret_Qw7rT2yU9iO4pL6kJ3hG"`);
const ids = hits.map((h) => h.id).sort();
ok("secrets: service_role, stripe, openai, aws, sb_secret detected", JSON.stringify(ids) === JSON.stringify(["aws_key", "llm_key", "stripe_secret", "supabase_secret_key", "supabase_service_role"]), ids.join(","));
ok("secrets: findings carry no full value", !JSON.stringify(hits).includes(STRIPE) && !JSON.stringify(hits).includes(SERVICE) && !JSON.stringify(hits).includes(OPENAI));
ok("secrets: non-Firebase Google key is only low", fp(`maps("AIzaSyD-9fK2mQ7xL4pW1zR8tV6bN3cJ5hY0aE2")`)[0]?.severity === "low");
ok("secrets: real-looking hardcoded password flagged", fp(`const adminPassword = "Tr0ub4dor&3x"`)[0]?.id === "hardcoded_password");

// ================= SSRF guard
for (const bad of ["http://localhost:8787", "http://127.0.0.1", "http://10.0.0.5", "http://192.168.1.1", "http://172.16.0.1", "http://169.254.169.254/latest/meta-data", "http://[::1]/", "http://[::ffff:127.0.0.1]/", "http://2130706433/", "http://0x7f000001/", "http://foo.internal/", "http://printer.local/", "http://intranet/", "ftp://example.com", "file:///etc/passwd", "https://user:pw@example.com", "http://100.64.0.1", "http://8.8.8.8"])
  ok(`SSRF: refuses ${bad}`, throwsGuard(() => assertPublicHost(bad)));
ok("SSRF: accepts a public https URL", !throwsGuard(() => assertPublicHost("https://dropmax.io")));
ok("SSRF: DNS answers in private ranges detected", isPrivateAddress("10.1.2.3") && isPrivateAddress("::1") && isPrivateAddress("fd00::1") && !isPrivateAddress("104.21.3.4"));

// ================= Supabase extraction
const sb = extractSupabase(`createClient("https://${REF}.supabase.co","${ANON}")`);
ok("supabase: URL + anon key with matching ref extracted", sb?.ref === REF && sb.keyType === "anon_jwt");
const other = jwt({ ref: "zzzzzzzzzzzzzzzzzzzz", role: "anon" });
ok("supabase: anon key of another project not used", extractSupabase(`"https://${REF}.supabase.co" "${other}"`).key === null);
ok("supabase: table names from .from() exclude storage.from()", JSON.stringify(tableNamesFromBundle(`s.from("profiles");s.storage.from("avatars");s.from('orders')`)) === JSON.stringify(["profiles", "orders"]));
ok("supabase: bucket names", JSON.stringify(bucketNamesFromBundle(`s.storage.from("avatars");"https://x.supabase.co/storage/v1/object/public/docs/a.pdf"`).sort()) === JSON.stringify(["avatars", "docs"]));

// ================= one GET per table
{
  const calls = [];
  const fakeFetch = async (url, init) => {
    calls.push({ url: String(url), method: init?.method || "GET" });
    return new Response(JSON.stringify([{ id: 1, email: "secret-row@example.com" }]), { status: 200, headers: { "content-type": "application/json" } });
  };
  const supa = { url: `https://${REF}.supabase.co`, key: ANON, keyType: "anon_jwt" };
  const tables = ["profiles", "profiles", "orders", "posts", "profiles"];
  const r = await probeRls(supa, tables, makeBudget(), fakeFetch);
  const perTable = {};
  for (const c of calls) { const t = new URL(c.url).pathname.split("/").pop(); perTable[t] = (perTable[t] || 0) + 1; }
  ok("RLS: exactly one request per table (duplicates skipped)", calls.length === 3 && Object.values(perTable).every((n) => n === 1), JSON.stringify(perTable));
  ok("RLS: only GET with select=*&limit=1", calls.every((c) => c.method === "GET" && c.url.endsWith("?select=*&limit=1")));
  ok("RLS: result holds table names only, no row data", !JSON.stringify(r).includes("secret-row") && r.readable.map((x) => x.table).join() === "profiles,orders,posts");
  ok("RLS: user-data table is sensitive, posts is not", r.readable.find((x) => x.table === "profiles").sensitive && !r.readable.find((x) => x.table === "posts").sensitive);
  const many = Array.from({ length: 60 }, (_, i) => "t" + i);
  calls.length = 0;
  await probeRls(supa, many, makeBudget(), fakeFetch);
  ok(`RLS: capped at ${LIMITS.MAX_TABLES_PROBED} tables`, calls.length === LIMITS.MAX_TABLES_PROBED, String(calls.length));
  calls.length = 0;
  const emptyFetch = async (url) => { calls.push(url); return new Response("[]", { status: 200 }); };
  const r2 = await probeRls(supa, ["a"], makeBudget(), emptyFetch);
  const r3 = await probeRls(supa, ["b"], makeBudget(), async () => new Response('{"code":"42501"}', { status: 401 }));
  ok("RLS: empty array / 401 are not findings", r2.readable.length === 0 && r3.readable.length === 0);
}

// ================= preview auth
ok("preview: lovable preview near emailRedirectTo is high", detectPreviewAuth([`signUp({options:{emailRedirectTo:"https://id-preview--1234abcd.lovable.app/auth"}})`], "myapp.com")?.severity === "high");
ok("preview: localhost near redirectTo is high", detectPreviewAuth([`resetPasswordForEmail(e,{redirectTo:"http://localhost:5173/reset"})`], "myapp.com")?.severity === "high");
ok("preview: plain localhost in library code ignored", detectPreviewAuth([`var devUrl="http://localhost:3000";`], "myapp.com") === null);
ok("preview: the app's own lovable.app host ignored", detectPreviewAuth([`emailRedirectTo:"https://myapp.lovable.app/"`], "myapp.lovable.app") === null);
ok("preview: production lovable.app link elsewhere ignored", detectPreviewAuth([`href="https://other.lovable.app"`], "myapp.com") === null);
ok("preview: preview host elsewhere is medium", detectPreviewAuth([`fetch("https://preview--abc.lovable.app/api")`], "myapp.com")?.severity === "medium");

// ================= grading
ok("grade: clean is A/100", JSON.stringify(grade([])) === JSON.stringify({ score: 100, grade: "A" }));
ok("grade: one critical caps at D", grade([{ id: "x", severity: "critical" }]).grade === "D");
ok("grade: one medium is A/90", grade([{ id: "x", severity: "medium" }]).grade === "A");

// ================= script discovery
const html = `<script type="module" crossorigin src="/assets/index-AbC.js"></script><link rel="modulepreload" href="/assets/vendor-1.js"><script src="https://cdn.other.com/x.js"></script><link rel="preload" href="/f.woff2" as="font">`;
ok("scripts: same-origin only, modulepreload included", JSON.stringify(scriptUrlsFromHtml(html, "https://app.example.com/")) === JSON.stringify(["https://app.example.com/assets/index-AbC.js", "https://app.example.com/assets/vendor-1.js"]));
ok("scripts: lazy chunks found in entry", chunkUrlsFromScript(`import("./Dashboard-x1.js");const m=["assets/Settings-9.js"]`, "https://app.example.com/assets/index-AbC.js", "https://app.example.com").length === 2);

// ================= end-to-end with a fake app + fake Supabase
{
  const log = [];
  const appJs = `const s=createClient("https://${REF}.supabase.co","${ANON}");const k="${STRIPE}";s.from("profiles").select();s.from("posts");s.storage.from("avatars");` +
    `s.auth.resetPasswordForEmail(e,{redirectTo:"https://id-preview--77aa88bb.lovable.app/reset"});import("./Chunk-1.js");`;
  const fake = async (url, init = {}) => {
    const u = new URL(String(url));
    log.push({ host: u.host, path: u.pathname, search: u.search, method: init.method || "GET" });
    if (u.host === "cloudflare-dns.com") return Response.json({ Answer: [{ type: 1, data: "104.21.1.1" }] });
    if (u.host === "app.example.com" && u.pathname === "/") return new Response(`<html><script type="module" src="/assets/index-1.js"></script></html>`, { headers: { "content-type": "text/html" } });
    if (u.pathname === "/assets/index-1.js") return new Response(appJs, { headers: { "content-type": "application/javascript" } });
    if (u.pathname === "/assets/Chunk-1.js") return new Response(`const fb={apiKey:"AIzaSyD-9fK2mQ7xL4pW1zR8tV6bN3cJ5hY0aE2",authDomain:"a",projectId:"b",appId:"c"}`, { headers: { "content-type": "application/javascript" } });
    if (u.host === `${REF}.supabase.co` && u.pathname === "/rest/v1/") return Response.json({ paths: { "/": {}, "/profiles": {}, "/posts": {}, "/rpc/do_thing": {} } });
    if (u.pathname === "/rest/v1/profiles") return Response.json([{ id: "u1", email: "victim@example.com", full_name: "Jane Victim" }]);
    if (u.pathname === "/rest/v1/posts") return new Response('{"message":"permission denied"}', { status: 401 });
    if (u.pathname === "/storage/v1/object/list/avatars") return Response.json([{ name: "private-file-name.png" }]);
    return new Response("nf", { status: 404 });
  };
  const r = await deepScan("app.example.com", { fetchImpl: fake });
  const out = JSON.stringify(r);
  const fids = r.findings.map((f) => f.id);
  ok("e2e: finds stripe secret, open table, public bucket, preview redirect", ["stripe_secret", "supabase_rls_open", "storage_bucket_public", "auth_redirect_preview"].every((i) => fids.includes(i)), fids.join(","));
  ok("e2e: anon key and Firebase config not reported", !fids.includes("google_api_key") && !fids.includes("supabase_service_role"));
  ok("e2e: no row data, object names or full secrets in the report", !/victim@example|Jane Victim|private-file-name|51HxT3stK3y/.test(out) && !out.includes(ANON));
  ok("e2e: only the protected table 'posts' is not reported", r.findings.filter((f) => f.id === "supabase_rls_open").map((f) => f.evidence.table).join() === "profiles");
  const tableGets = log.filter((l) => l.path.startsWith("/rest/v1/") && l.path !== "/rest/v1/");
  ok("e2e: one GET per table", tableGets.length === 2 && tableGets.every((l) => l.method === "GET" && l.search === "?select=*&limit=1"));
  ok("e2e: no write method ever used", log.every((l) => l.method === "GET" || (l.method === "POST" && l.path.startsWith("/storage/v1/object/list/"))));
  ok("e2e: grade capped at D or worse", ["D", "E", "F"].includes(r.grade), r.grade + " " + r.score);
  ok("e2e: fix prompts present", r.findings.every((f) => f.fix_prompt && f.fix_prompts.lovable && f.fix_prompts.bolt && f.fix_prompts.replit));
  ok("e2e: subrequests within cap", r.meta.subrequests <= LIMITS.MAX_SUBREQUESTS, String(r.meta.subrequests));
  const dnsPrivate = async (url) => (String(url).includes("cloudflare-dns.com") ? Response.json({ Answer: [{ type: 1, data: "10.0.0.7" }] }) : new Response("x"));
  let refused = false;
  try { await deepScan("https://sneaky.example.com", { fetchImpl: dnsPrivate }); } catch (e) { refused = e instanceof GuardError; }
  ok("e2e: hostname resolving to private IP refused", refused);
  const redirectPrivate = async (url) => (String(url).includes("cloudflare-dns.com") ? Response.json({}) : new Response(null, { status: 302, headers: { location: "http://169.254.169.254/" } }));
  refused = false;
  try { await deepScan("https://redir.example.com", { fetchImpl: redirectPrivate }); } catch (e) { refused = e instanceof GuardError; }
  ok("e2e: redirect to metadata IP refused", refused);
}

// ================= HTTP endpoint (both worker builds)
for (const [name, w] of [["worker.js", worker], ["_worker.js", pagesWorker]]) {
  const post = (body) => w.fetch(new Request("https://mcp.snapforgelab.com/scan-deep", { method: "POST", headers: { "content-type": "application/json", origin: "https://snapforgelab.com" }, body: JSON.stringify(body) }), {});
  let res = await post({ url: "https://example.com" });
  ok(`${name}: refuses without ownership confirmation (400)`, res.status === 400 && /own this app/.test((await res.json()).error));
  res = await post({ url: "http://localhost:8787", ownershipConfirmed: true });
  ok(`${name}: refuses localhost (400)`, res.status === 400 && /local or internal/.test((await res.json()).error));
  res = await w.fetch(new Request("https://mcp.snapforgelab.com/scan-deep", { method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.9" }, body: JSON.stringify({ url: "https://example.com", ownershipConfirmed: true }) }), { RATE_KV: { get: async () => "5", put: async () => {} } });
  ok(`${name}: rate limit 429`, res.status === 429);
  res = await w.fetch(new Request("https://mcp.snapforgelab.com/mcp", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) }), {});
  const tools = (await res.json()).result.tools.map((t) => t.name).sort().join();
  ok(`${name}: MCP tools unchanged (check_app, get_fix_prompt)`, tools === "check_app,get_fix_prompt");
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
