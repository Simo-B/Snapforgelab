// End-to-end offline test suite for the Snapforge Self-Serve flow (both worker.js and _worker.js).
// Exercises real SQLite (via Node 22 node:sqlite wrapped as Cloudflare D1) + fake network for
// target apps, Supabase, PayPal REST v2, and Resend email delivery.
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import worker from "./worker.js";
import pagesWorker from "./_worker.js";

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}${extra ? "  — " + extra : ""}`);
};

function makeD1() {
  const sqlite = new DatabaseSync(":memory:");
  // Apply the exact SQL migration file to verify its DDL too
  const ddl = readFileSync(new URL("./migrations/0001_selfserve.sql", import.meta.url), "utf8");
  sqlite.exec(ddl);
  return {
    prepare(sql) {
      let bound = [];
      return {
        bind(...args) {
          bound = args;
          return this;
        },
        async run() {
          const stmt = sqlite.prepare(sql);
          const res = stmt.run(...bound);
          return { success: true, meta: { changes: Number(res.changes || 0) } };
        },
        async first() {
          const stmt = sqlite.prepare(sql);
          const row = stmt.get(...bound);
          return row === undefined ? null : row;
        },
        async all() {
          const stmt = sqlite.prepare(sql);
          return { results: stmt.all(...bound) };
        },
      };
    },
  };
}

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const REF = "abcdefghijklmnopqrst";
const jwt = (payload) => `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}.${"s".repeat(20)}Zq9X`;
const ANON = jwt({ iss: "supabase", ref: REF, role: "anon", iat: 1700000000 });
const STRIPE_LIVE = "sk_live_" + "51HxT3stK3yValue9988" + "abcd";
const PK_TEST = "pk_test_" + "51HxT3stPubK3yValue9988xyz";

function makeFakeWorld(state) {
  return async (url, init = {}) => {
    const u = new URL(String(url));
    const method = (init.method || "GET").toUpperCase();

    // DNS-over-HTTPS
    if (u.host === "cloudflare-dns.com") {
      return Response.json({ Answer: [{ type: 1, data: "104.21.10.20" }] });
    }

    // Target vulnerable AI-built app (switches to clean mode when state.fixed === true)
    if (u.host === "leaky.lovable.app") {
      if (state.fixed) {
        if (u.pathname === "/") {
          return new Response(
            `<!doctype html><html><head><title>Clean App</title><meta name="description" content="Production app"></head><body>Ready</body></html>`,
            {
              status: 200,
              headers: {
                "content-type": "text/html",
                "strict-transport-security": "max-age=63072000",
                "content-security-policy": "default-src 'self'",
                "x-content-type-options": "nosniff",
                "x-frame-options": "DENY",
                "referrer-policy": "strict-origin-when-cross-origin",
              },
            }
          );
        }
        return new Response("not found", { status: 404 });
      }

      if (u.pathname === "/") {
        const originReq = (init.headers && (init.headers.origin || init.headers.Origin)) || "";
        const extra = originReq === "https://evil.example"
          ? { "access-control-allow-origin": "https://evil.example", "access-control-allow-credentials": "true" }
          : {};
        return new Response(
          `<!doctype html><html><head></head><body><script type="module" src="/assets/index-1.js"></script></body></html>`,
          {
            status: 200,
            headers: {
              "content-type": "text/html",
              "set-cookie": "sid=supersecretcookievalue; Path=/",
              ...extra,
            },
          }
        );
      }
      if (u.pathname === "/assets/index-1.js") {
        const js = [
          `const supa = createClient("https://${REF}.supabase.co", "${ANON}");`,
          `const stripeSecret = "${STRIPE_LIVE}";`,
          `const stripePub = "${PK_TEST}";`,
          `supa.from("customers").select("*");`,
          `supa.storage.from("invoices");`,
          `supa.auth.resetPasswordForEmail(e, { redirectTo: "https://id-preview--9988aabb.lovable.app/reset" });`,
          `//# sourceMappingURL=index-1.js.map`,
        ].join("\n");
        return new Response(js, { status: 200, headers: { "content-type": "application/javascript" } });
      }
      if (u.pathname === "/assets/index-1.js.map") {
        return new Response(`{"version":3,"sources":["src/App.tsx"]}`, { status: 200, headers: { "content-type": "application/json" } });
      }
      if (u.pathname === "/sitemap.xml") {
        return new Response(`<!doctype html><html><body>SPA fallback</body></html>`, { status: 200, headers: { "content-type": "text/html" } });
      }
      if (u.pathname === "/robots.txt") {
        return new Response("User-agent: *\nDisallow: /\n", { status: 200, headers: { "content-type": "text/plain" } });
      }
      return new Response("nf", { status: 404 });
    }

    // Clean app with 0 issues
    if (u.host === "clean.replit.app") {
      if (u.pathname === "/") {
        return new Response(
          `<!doctype html><html><head><title>Solid App</title><meta name="description" content="Clean app"></head><body>Hi</body></html>`,
          {
            status: 200,
            headers: {
              "content-type": "text/html",
              "strict-transport-security": "max-age=63072000",
              "content-security-policy": "default-src 'self'",
              "x-content-type-options": "nosniff",
              "x-frame-options": "DENY",
              "referrer-policy": "strict-origin-when-cross-origin",
            },
          }
        );
      }
      return new Response("nf", { status: 404 });
    }

    // Supabase mock
    if (u.host === `${REF}.supabase.co`) {
      if (u.pathname === "/rest/v1/") return Response.json({ paths: { "/customers": {} } });
      if (u.pathname === "/rest/v1/customers") return Response.json([{ id: 1, email: "private-customer@example.com" }]);
      if (u.pathname === "/storage/v1/object/list/invoices" && method === "POST") return Response.json([{ name: "invoice-001.pdf" }]);
    }

    // PayPal Sandbox API mock
    if (u.host === "api-m.sandbox.paypal.com") {
      if (u.pathname === "/v1/oauth2/token" && method === "POST") {
        return Response.json({ access_token: "PP_TEST_TOKEN", expires_in: 3600 });
      }
      if (u.pathname === "/v2/checkout/orders" && method === "POST") {
        const body = JSON.parse(init.body);
        state.lastPayPalCreate = body;
        const orderId = "PP_ORD_" + (++state.orderSeq);
        state.ppOrders.set(orderId, {
          id: orderId,
          customId: body.purchase_units[0].custom_id,
          amount: body.purchase_units[0].amount,
          captured: false,
        });
        return Response.json({
          id: orderId,
          status: "PAYER_ACTION_REQUIRED",
          links: [{ rel: "payer-action", href: `https://www.sandbox.paypal.com/checkoutnow?token=${orderId}` }],
        });
      }
      const capMatch = u.pathname.match(/^\/v2\/checkout\/orders\/([^/]+)\/capture$/);
      if (capMatch && method === "POST") {
        const ord = state.ppOrders.get(capMatch[1]);
        if (!ord) return new Response("nf", { status: 404 });
        if (ord.captured) return new Response('{"name":"UNPROCESSABLE_ENTITY","details":[{"issue":"ORDER_ALREADY_CAPTURED"}]}', { status: 422 });
        ord.captured = true;
        const amount = state.tamperCaptureAmount || ord.amount;
        return Response.json({
          id: ord.id,
          status: "COMPLETED",
          payer: { email_address: "paypal-buyer@example.com" },
          purchase_units: [
            {
              custom_id: ord.customId,
              payments: {
                captures: [{ id: "CAP_" + ord.id, status: "COMPLETED", custom_id: ord.customId, amount }],
              },
            },
          ],
        });
      }
      const getMatch = u.pathname.match(/^\/v2\/checkout\/orders\/([^/]+)$/);
      if (getMatch && method === "GET") {
        const ord = state.ppOrders.get(getMatch[1]);
        if (!ord) return new Response("nf", { status: 404 });
        return Response.json({
          id: ord.id,
          status: ord.captured ? "COMPLETED" : "APPROVED",
          payer: { email_address: "paypal-buyer@example.com" },
          purchase_units: [
            {
              custom_id: ord.customId,
              payments: {
                captures: ord.captured ? [{ id: "CAP_" + ord.id, status: "COMPLETED", custom_id: ord.customId, amount: ord.amount }] : [],
              },
            },
          ],
        });
      }
      if (u.pathname === "/v1/notifications/verify-webhook-signature" && method === "POST") {
        const body = JSON.parse(init.body);
        const valid = body.transmission_sig === "VALID_SIG" && body.webhook_id === "WH_TEST_123";
        return Response.json({ verification_status: valid ? "SUCCESS" : "FAILURE" });
      }
    }

    // Resend API mock
    if (u.host === "api.resend.com" && u.pathname === "/emails" && method === "POST") {
      state.emailsSent.push(JSON.parse(init.body));
      return Response.json({ id: "eml_" + state.emailsSent.length });
    }

    return new Response("unhandled " + url, { status: 404 });
  };
}

for (const [label, w] of [["worker.js", worker], ["_worker.js", pagesWorker]]) {
  const state = { fixed: false, orderSeq: 100, ppOrders: new Map(), emailsSent: [], tamperCaptureAmount: null, lastPayPalCreate: null };
  const env = {
    DB: makeD1(),
    PAYPAL_ENV: "sandbox",
    PAYPAL_CLIENT_ID: "cid_test",
    PAYPAL_CLIENT_SECRET: "csec_test_secret_123456",
    PAYPAL_WEBHOOK_ID: "WH_TEST_123",
    REPORT_SECRET: "rep_secret_abcdef0123456789abcdef0123456789",
    REPORT_PRICE_CENTS: "1900",
    REPORT_CURRENCY: "USD",
    RESEND_API_KEY: "re_test_key",
    __TEST_FETCH: makeFakeWorld(state),
  };

  const api = async (path, method = "GET", body = null, headers = {}) => {
    const req = new Request("https://mcp.snapforgelab.com" + path, {
      method,
      headers: {
        origin: "https://snapforgelab.com",
        "cf-connecting-ip": "198.51.100.42",
        ...(body ? { "content-type": "application/json" } : {}),
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const res = await w.fetch(req, env);
    const json = await res.json().catch(() => null);
    return { status: res.status, json };
  };

  // 1. Free 1-click scan returns ONLY 2 preview issues and ZERO fix prompts / leaked secrets
  const scanRes = await api("/api/scan", "POST", { url: "leaky.lovable.app", ownershipConfirmed: true });
  const prev = scanRes.json;
  const prevRaw = JSON.stringify(prev);
  ok(`${label}: POST /api/scan returns 200 with scan_id`, scanRes.status === 200 && /^scn_[a-f0-9]+$/.test(prev.scan_id));
  ok(`${label}: detects multiple surface + deep issues`, prev.findings_count >= 8, `count=${prev.findings_count}`);
  ok(`${label}: preview exposes exactly 2 real issues`, prev.preview_findings.length === 2 && prev.locked_count === prev.findings_count - 2);
  ok(
    `${label}: preview JSON leaks ZERO fix_prompts, master_prompts, row data, cookie values, or unmasked keys`,
    !/fix_prompt|master_prompt|private-customer|invoice-001|supersecretcookievalue|51HxT3stK3y/.test(prevRaw)
  );
  ok(
    `${label}: locked findings #3..N contain no detail or evidence`,
    prev.locked_findings.every((lf) => !lf.detail && !lf.evidence && !lf.title && lf.redacted_title && lf.severity)
  );
  ok(`${label}: offer is $19 USD (1900 cents)`, prev.can_unlock === true && prev.offer.amount_cents === 1900 && prev.offer.display_price === "$19");

  // 2. GET /api/scan/:id reloads the preview without re-scanning
  const reloadRes = await api(`/api/scan/${prev.scan_id}`, "GET");
  ok(`${label}: GET /api/scan/:id reloads preview`, reloadRes.status === 200 && reloadRes.json.scan_id === prev.scan_id);

  // 3. Unauthenticated GET /api/report/:id is blocked (401)
  const unauthRes = await api(`/api/report/${prev.scan_id}`, "GET");
  ok(`${label}: GET /api/report/:id rejects missing token (401)`, unauthRes.status === 401);
  const badTokRes = await api(`/api/report/${prev.scan_id}`, "GET", null, { authorization: "Bearer rk_wrong_token" });
  ok(`${label}: GET /api/report/:id rejects invalid token (401)`, badTokRes.status === 401);

  // 4. Clean app (0 issues) sets can_unlock=false and refuses checkout
  const cleanScan = await api("/api/scan", "POST", { url: "https://clean.replit.app", ownershipConfirmed: true });
  ok(`${label}: clean app has 0 findings and can_unlock=false`, cleanScan.json.findings_count === 0 && cleanScan.json.can_unlock === false);
  const cleanCheckout = await api("/api/checkout/create", "POST", { scanId: cleanScan.json.scan_id });
  ok(`${label}: checkout refused when 0 issues found (400)`, cleanCheckout.status === 400);

  // 5. Create PayPal checkout order (server enforces $19.00 even if client tries tampering)
  const createRes = await api("/api/checkout/create", "POST", {
    scanId: prev.scan_id,
    email: "founder@startup.io",
    amount: 1, // ignored tampering attempt
  });
  ok(
    `${label}: checkout/create creates $19.00 USD PayPal order`,
    createRes.status === 200 &&
      createRes.json.approveUrl.includes("checkoutnow?token=PP_ORD_") &&
      state.lastPayPalCreate.purchase_units[0].amount.value === "19.00" &&
      state.lastPayPalCreate.purchase_units[0].amount.currency_code === "USD"
  );

  // 6. Tampered capture amount is rejected
  state.tamperCaptureAmount = { currency_code: "USD", value: "1.00" };
  const badCap = await api("/api/checkout/capture", "POST", { scanId: prev.scan_id, orderId: createRes.json.orderId });
  ok(`${label}: capture rejects wrong amount (400)`, badCap.status === 400);
  state.tamperCaptureAmount = null;

  // 7. Create fresh order -> capture -> instant full report + Master Prompt + email sent once
  const createRes2 = await api("/api/checkout/create", "POST", { scanId: prev.scan_id, email: "founder@startup.io" });
  const capRes = await api("/api/checkout/capture", "POST", { scanId: prev.scan_id, orderId: createRes2.json.orderId });
  ok(
    `${label}: capture unlocks full report + rk_ key + 3 rescans`,
    capRes.status === 200 &&
      capRes.json.status === "paid" &&
      capRes.json.reportKey.startsWith("rk_") &&
      capRes.json.rescansRemaining === 3 &&
      capRes.json.report.findings.length === prev.findings_count &&
      Boolean(capRes.json.report.master_prompts?.lovable)
  );
  ok(`${label}: Resend email sent exactly once with fragment #key=`, state.emailsSent.length === 1 && state.emailsSent[0].text.includes(`#key=${capRes.json.reportKey}`));

  // 8. Replay of checkout/capture from browser is refused (409)
  const replayCap = await api("/api/checkout/capture", "POST", { scanId: prev.scan_id, orderId: createRes2.json.orderId });
  ok(`${label}: duplicate browser capture replay blocked (409)`, replayCap.status === 409 && replayCap.json.alreadyClaimed === true);

  // 9. Webhook arriving AFTER capture is verified, idempotent, and does NOT send a duplicate email
  const whPayload = {
    id: "WH-EVT-1",
    event_type: "PAYMENT.CAPTURE.COMPLETED",
    resource: {
      id: "CAP_" + createRes2.json.orderId,
      status: "COMPLETED",
      amount: { currency_code: "USD", value: "19.00" },
      supplementary_data: { related_ids: { order_id: createRes2.json.orderId } },
    },
  };
  const postWebhook = async (sig, payload) => {
    const req = new Request("https://mcp.snapforgelab.com/api/webhooks/paypal", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "paypal-auth-algo": "SHA256withRSA",
        "paypal-cert-url": "https://api.sandbox.paypal.com/cert",
        "paypal-transmission-id": "tx-1",
        "paypal-transmission-sig": sig,
        "paypal-transmission-time": "2026-11-25T00:00:00Z",
      },
      body: JSON.stringify(payload),
    });
    const r = await w.fetch(req, env);
    return { status: r.status, json: await r.json() };
  };
  const badWh = await postWebhook("FORGED_SIG", whPayload);
  ok(`${label}: webhook rejects forged signature (401)`, badWh.status === 401);
  const okWh = await postWebhook("VALID_SIG", whPayload);
  ok(`${label}: valid webhook accepted and sends no duplicate email`, okWh.status === 200 && state.emailsSent.length === 1);
  const dupWh = await postWebhook("VALID_SIG", whPayload);
  ok(`${label}: duplicate webhook event_id ignored idempotently`, dupWh.status === 200 && dupWh.json.duplicate === true);

  // 10. Webhook-first scenario (buyer closes tab before return_url): webhook captures, marks paid & emails link
  const createRes3 = await api("/api/checkout/create", "POST", { scanId: prev.scan_id, email: "closedtab@startup.io" });
  const whFirst = await postWebhook("VALID_SIG", {
    id: "WH-EVT-2",
    event_type: "CHECKOUT.ORDER.APPROVED",
    resource: { id: createRes3.json.orderId },
  });
  ok(`${label}: webhook-first captures order & emails report link`, whFirst.status === 200 && state.emailsSent.length === 2 && state.emailsSent[1].to[0] === "closedtab@startup.io");

  // 11. Authenticated GET /api/report/:id works with Bearer reportKey
  const fullGet = await api(`/api/report/${prev.scan_id}`, "GET", null, { authorization: `Bearer ${capRes.json.reportKey}` });
  ok(`${label}: GET /api/report/:id returns full findings & prompts`, fullGet.status === 200 && fullGet.json.report.findings.every((f) => f.fix_prompt && f.verify_step));

  // 12. Paid verification re-scan updates grade to A/100 after fixes and decrements quota (3 -> 2 -> 1 -> 0 -> 429)
  state.fixed = true;
  const rs1 = await api(`/api/report/${prev.scan_id}/rescan`, "POST", {}, { authorization: `Bearer ${capRes.json.reportKey}` });
  ok(`${label}: paid rescan #1 reflects fixed app (Grade A, 100/100, 2 left)`, rs1.status === 200 && rs1.json.report.score === 100 && rs1.json.report.grade === "A" && rs1.json.rescansRemaining === 2);
  await api(`/api/report/${prev.scan_id}/rescan`, "POST", {}, { authorization: `Bearer ${capRes.json.reportKey}` });
  const rs3 = await api(`/api/report/${prev.scan_id}/rescan`, "POST", {}, { authorization: `Bearer ${capRes.json.reportKey}` });
  ok(`${label}: paid rescan #3 leaves 0 remaining`, rs3.status === 200 && rs3.json.rescansRemaining === 0);
  const rs4 = await api(`/api/report/${prev.scan_id}/rescan`, "POST", {}, { authorization: `Bearer ${capRes.json.reportKey}` });
  ok(`${label}: paid rescan #4 capped at 3 (429)`, rs4.status === 429);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
