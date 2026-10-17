// Local smoke test for worker.js: drives the fetch handler with Request objects.
// Node 22 provides global fetch/Request/Response/AbortController.
import worker from "./worker.js";

const base = "https://mcp.snapforgelab.com";
let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => { (cond ? pass++ : fail++); console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`); };

async function call(method, params, env = {}) {
  const req = new Request(base + "/mcp", { method: "POST", headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.7" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  const res = await worker.fetch(req, env);
  return { status: res.status, json: await res.json().catch(() => null) };
}

// 1. GET /
let r = await worker.fetch(new Request(base + "/"), {});
ok("GET / returns 200 text", r.status === 200 && (await r.text()).includes("MCP server"));

// 2. challenge from env var
r = await worker.fetch(new Request(base + "/.well-known/openai-apps-challenge"), { OPENAI_APPS_CHALLENGE: "TESTTOKEN123" });
const chal = await r.text();
ok("challenge returns the var verbatim", r.status === 200 && chal === "TESTTOKEN123", JSON.stringify(chal));

// 3. initialize
r = await call("initialize", {});
ok("initialize returns protocolVersion", r.json?.result?.protocolVersion && r.json.result.serverInfo?.name === "snapforge-ship-ready-check");

// 4. tools/list
r = await call("tools/list", {});
const names = (r.json?.result?.tools || []).map((t) => t.name).sort();
ok("tools/list returns both tools", JSON.stringify(names) === JSON.stringify(["check_app", "get_fix_prompt"]));
const check = (r.json?.result?.tools || []).find((t) => t.name === "check_app");
ok("check_app has readOnly annotation", check?.annotations?.readOnlyHint === true && check?.annotations?.destructiveHint === false);

// 5. get_fix_prompt
r = await call("tools/call", { name: "get_fix_prompt", arguments: { issue: "open_cors", builder: "lovable" } });
ok("get_fix_prompt returns lovable fix", r.json?.result?.structuredContent?.fix_prompt?.includes("Access-Control-Allow-Origin"));

// 6-8. SSRF / scheme guard
r = await call("tools/call", { name: "check_app", arguments: { url: "http://localhost:9" } });
ok("guard rejects localhost", r.json?.result?.isError === true && /local or internal/i.test(r.json.result.content[0].text));
r = await call("tools/call", { name: "check_app", arguments: { url: "http://169.254.169.254/latest/meta-data" } });
ok("guard rejects private IP literal", r.json?.result?.isError === true && /private network/i.test(r.json.result.content[0].text));
r = await call("tools/call", { name: "check_app", arguments: { url: "ftp://example.com" } });
ok("guard rejects non-http scheme", r.json?.result?.isError === true && /http and https/i.test(r.json.result.content[0].text));

// 9. rate limit gate (stub KV already at the cap -> refuse before any fetch)
const stubKV = { get: async () => "20", put: async () => {} };
r = await call("tools/call", { name: "check_app", arguments: { url: "https://example.com" } }, { RATE_KV: stubKV });
ok("rate limit refuses at cap", r.json?.result?.isError === true && /Rate limit/i.test(r.json.result.content[0].text));

// 10. live check against snapforgelab.com (may be blocked by the sandbox network)
r = await call("tools/call", { name: "check_app", arguments: { url: "https://snapforgelab.com" } });
const sc = r.json?.result?.structuredContent;
if (sc) {
  console.log(`\nlive check_app(https://snapforgelab.com): reachable=${sc.reachable} status=${sc.http_status ?? "-"} stack=${sc.stack} findings=${(sc.findings || []).map((f) => f.id).join(",") || "none"}`);
  console.log("  summary:", r.json.result.content[0].text);
} else {
  console.log("\nlive check_app(https://snapforgelab.com): no structured result —", JSON.stringify(r.json?.result)?.slice(0, 200));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
