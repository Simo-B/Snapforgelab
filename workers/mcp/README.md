# Snapforge Ship-Ready Check — MCP Worker

A Cloudflare Worker (FREE plan) that exposes an MCP server over streamable HTTP at
`/mcp`. It is the Worker port of `chatgpt-plugin/server.js`.

**What it does:** two tools, both read-only.
- `check_app` — passive launch check of a public app URL. Reads only what any
  visitor's browser already receives (homepage HTML, response headers,
  robots.txt, sitemap.xml, the CORS response header, a dev banner left in the
  HTML). It never scans JavaScript bundles, never extracts secrets, never queries
  a database or API, never signs in, submits forms or writes anything. Same class
  and scope as securityheaders.com. Private/internal addresses are refused.
- `get_fix_prompt` — returns a paste-ready fix prompt for an issue id.

A per-IP limit of 20 `check_app` calls per hour is enforced with a KV counter.

Because it is an open endpoint anyone can point at any public URL, its scope is
deliberately kept to what a security-header checker reads. Anything deeper (keys,
auth, database rules) is intentionally **not** here and is handled by the
ownership-gated free audit at https://snapforgelab.com/free-audit.

## Local test (no deploy)

```
cd workers/mcp
node test-local.mjs            # exercises JSON-RPC, the SSRF guard and get_fix_prompt
# or, with the real runtime:
npx wrangler dev               # then POST JSON-RPC to http://localhost:8787/mcp
```

## Deploy (you run these; I can't touch your Cloudflare account)

1. **Log in:** `npx wrangler login`
2. **Create the KV namespace and paste its id into `wrangler.toml`:**
   ```
   npx wrangler kv namespace create RATE_KV
   ```
   Copy the printed `id = "..."` into the `[[kv_namespaces]]` block.
3. **Set the OpenAI challenge token** (served at `/.well-known/openai-apps-challenge`).
   It is a public verification token, so a plain var is fine:
   - Dashboard: Workers & Pages → `snapforge-mcp` → Settings → Variables → add
     `OPENAI_APPS_CHALLENGE` with the value from the OpenAI portal. Or CLI:
   - `npx wrangler secret put OPENAI_APPS_CHALLENGE` (paste the token when prompted).
4. **Deploy:** `npx wrangler deploy`
5. **Attach the custom domain** so the server is at `https://mcp.snapforgelab.com/mcp`:
   Dashboard → the Worker → Settings → Domains & Routes → **Add → Custom Domain** →
   `mcp.snapforgelab.com`. (The `snapforgelab.com` zone must be on this Cloudflare
   account; Cloudflare creates the DNS record and certificate automatically.)
6. **Verify:**
   - `curl https://mcp.snapforgelab.com/` → `200`, plain text.
   - `curl https://mcp.snapforgelab.com/.well-known/openai-apps-challenge` → the token.
   - `tools/list` and a `check_app` call (see the JSON below).

## JSON-RPC examples

```
# tools/list
curl -s https://mcp.snapforgelab.com/mcp -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# check_app
curl -s https://mcp.snapforgelab.com/mcp -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"check_app","arguments":{"url":"https://snapforgelab.com"}}}'
```

No paid Cloudflare features are used (Workers free tier + KV free tier).
