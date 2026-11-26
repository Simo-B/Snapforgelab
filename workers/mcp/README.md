# Snapforge Ship-Ready Check (MCP) & Self-Serve Scanner Worker

Cloudflare Worker (FREE plan) serving two isolated surfaces on `mcp.snapforgelab.com`:

1. **Public MCP Server (`POST /mcp`)** — stateless Streamable HTTP JSON-RPC (`check_app` and `get_fix_prompt`).
   - **Frozen public contract:** `check_app` is strictly surface-only (HTML, headers, `robots.txt`, `sitemap.xml`, CORS, dev banner). It never scans JS bundles or queries databases. Rate-limited to 20 calls/IP/hour via `RATE_KV`.
2. **Self-Serve Scanner, Checkout & Private Report API (`/api/*` & `/scan-deep`)** — powers `/scan/`, `/scan-deep/` and `/report/` on `snapforgelab.com`:
   - `POST /api/scan` (and `POST /scan-deep`) — runs the unified surface + deep read-only scan (`full-scan.js`) within 45 subrequests / 25s, stores the full report in Cloudflare D1, and returns **only** the score, 2 real preview findings (without fix prompts), and redacted severity/category summaries for findings `#3..N`.
   - `GET /api/scan/:scanId` — reloads a saved scan preview without re-scanning.
   - `POST /api/checkout/create` — creates a server-priced `$19.00 USD` PayPal REST v2 order (`custom_id = scanId`, `landing_page = NO_PREFERENCE` for PayPal + debit/credit card).
   - `POST /api/checkout/capture` — captures & verifies the PayPal order on browser return, unlocks the full report + Master Fix Prompt in < 2s, and triggers idempotent Resend email delivery.
   - `POST /api/webhooks/paypal` — verifies PayPal webhook signature (`CHECKOUT.ORDER.APPROVED` & `PAYMENT.CAPTURE.COMPLETED`), deduplicates via `webhook_events`, and delivers the report link even if the buyer closed their browser tab.
   - `GET /api/report/:scanId` & `POST /api/report/:scanId/rescan` — Bearer-authenticated access to the full report and up to 3 included verification re-scans.

`_worker.js` (single-file bundle for Cloudflare Pages advanced mode) is **generated** from `worker.js` + `deep-scan.js` + `full-scan.js` + `storage.js` + `paypal.js`:
```bash
node build-pages-worker.mjs
```

## Local tests (offline, zero npm install required on Node 22)

```bash
cd workers/mcp
npm test
```
Runs `test-local.mjs` (MCP JSON-RPC & SSRF), `test-deep.mjs` (deep scanner & masking), and `test-selfserve.mjs` (end-to-end D1 SQLite, server paywall, PayPal REST v2, webhook verification, Resend email, and paid re-scans against both `worker.js` and `_worker.js`).

## Production setup (one-time Cloudflare + PayPal + Resend steps)

1. **Create the Cloudflare D1 database (Free tier):**
   ```bash
   cd workers/mcp
   npx wrangler d1 create snapforge-selfserve
   ```
   Paste the returned `database_id` into `wrangler.toml` (uncomment the `[[d1_databases]]` block with `binding = "DB"`), then apply the schema:
   ```bash
   npx wrangler d1 execute snapforge-selfserve --remote --file=./migrations/0001_selfserve.sql
   ```
   *(If you deploy via Cloudflare Pages `_worker.js`, bind the D1 database under **Pages → Settings → Functions → D1 database bindings** with variable name `DB`.)*

2. **Set production secrets (`npx wrangler secret put <NAME>` or Cloudflare Dashboard → Variables & Secrets):**
   - `OPENAI_APPS_CHALLENGE` — OpenAI portal challenge token
   - `PAYPAL_CLIENT_ID` — Live REST App Client ID from `developer.paypal.com`
   - `PAYPAL_CLIENT_SECRET` — Live REST App Secret
   - `PAYPAL_WEBHOOK_ID` — Webhook ID from PayPal Developer Dashboard pointing to `https://mcp.snapforgelab.com/api/webhooks/paypal` with events **`Checkout order approved`** (`CHECKOUT.ORDER.APPROVED`) and **`Payment capture completed`** (`PAYMENT.CAPTURE.COMPLETED`)
   - `REPORT_SECRET` — 32-byte random secret (`openssl rand -hex 32`) used to HMAC-derive private report keys
   - `RESEND_API_KEY` — API key from `resend.com` (domain `snapforgelab.com` verified)

3. **Build & deploy:**
   ```bash
   node build-pages-worker.mjs
   npx wrangler deploy
   ```
