# Snapforge Lab

Source for [snapforgelab.com](https://snapforgelab.com/) and the free Ship-Ready Check MCP server at
`https://mcp.snapforgelab.com/mcp`. Site rules (offers, prices, copy, identity) live in [`CLAUDE.md`](CLAUDE.md);
engineering conventions and approval boundaries in [`AGENTS.md`](AGENTS.md).

## Branches

- `claude/awesome-faraday-f1lckc` is **production**: every push there deploys the site. Open PRs against it; never push to it directly.
- `main` (the GitHub default branch) only holds the initial commit and is not deployed.

## Layout

| Path | What it is | Deployed by |
|---|---|---|
| `public/` | Static site: hand-written pages plus generated guides, `sitemap.xml`, `llms.txt` | Cloudflare Worker `proud-truth-105e` (`wrangler.jsonc`) |
| `content/guides/` | Guide sources (JSON meta block + HTML body) | built into `public/guides/` by `scripts/build.py` |
| `scripts/build.py` | Builds guides, guides hub, `sitemap.xml`, `llms.txt` | run locally, output committed |
| `scripts/og.js` | Guide social images | run locally, output committed |
| `scripts/free_audit_check.py` | Passive checker used to deliver the free audit by hand (see `docs/free-audit-kit.md`) | not deployed |
| `workers/mcp/` | MCP server (`check_app`, `get_fix_prompt`) and the ownership-gated `POST /scan-deep` | Cloudflare, see [MCP Worker](#mcp-worker-mcpsnapforgelabcom) |
| `chatgpt-plugin/server.js` | Node reference implementation of the MCP tools | not deployed |
| `server.json` | MCP Registry entry `com.snapforgelab/ship-ready-check` | MCP Registry |
| `docs/` | Sales kits, audits, playbooks (French) | not deployed |
| `.claude/` | Agent prompts and skills | not deployed |

## Requirements

- Python 3.8+ (no dependencies) for `scripts/build.py`
- Node 22 for the MCP Worker tests and build script; `wrangler` (devDependency in `workers/mcp/`) only to run or deploy the Worker

## Local development

```
# Site preview (extensionless pages such as /free-audit only resolve on Cloudflare)
python3 -m http.server 8099 --directory public

# Rebuild guides, guides hub, sitemap.xml and llms.txt after editing content/guides or STATIC_PAGES
python3 scripts/build.py

# MCP Worker: tests (offline, no npm install needed)
cd workers/mcp && npm test

# MCP Worker: regenerate _worker.js after editing worker.js or deep-scan.js
cd workers/mcp && node build-pages-worker.mjs

# MCP Worker: run locally with the real runtime
cd workers/mcp && npm install && cp .env.example .dev.vars && npx wrangler dev
```

## CI

`.github/workflows/ci.yml` runs on every pull request and on pushes to the production branch:

1. `npm test` in `workers/mcp/`
2. `_worker.js` matches a fresh `node build-pages-worker.mjs`
3. `public/` matches a fresh `python3 scripts/build.py`

## Deploy

### Site (`snapforgelab.com`)

Cloudflare Worker `proud-truth-105e` serves `public/` as static assets (`wrangler.jsonc`: `workers_dev` and
preview URLs off, `not_found_handling: 404-page`). Cloudflare builds and deploys it on every push to
`claude/awesome-faraday-f1lckc`. Headers and cache rules: `public/_headers`. Redirects: `public/_redirects`.

Keep `public/google2fe8697a02dbcd50.html` (Search Console) and `public/.well-known/mcp-registry-auth`
(MCP Registry public key). The registry private key (`key.pem`) is gitignored and must never be committed.

### MCP Worker (`mcp.snapforgelab.com`)

Two entry points exist in `workers/mcp/`:

- `worker.js` + `wrangler.toml`: the Worker `snapforgelab`, deployed with `npx wrangler deploy`.
- `_worker.js`: a single-file bundle of `worker.js` + `deep-scan.js` for a Cloudflare Pages project in
  advanced mode. It is generated; never edit it by hand.

Full first-time setup (KV namespace, `OPENAI_APPS_CHALLENGE`, custom domain, verification curls) is in
[`workers/mcp/README.md`](workers/mcp/README.md).

## Environment variables

Every variable is listed in [`workers/mcp/.env.example`](workers/mcp/.env.example). Set production values with
`npx wrangler secret put NAME` or in the Cloudflare dashboard; never commit them. The static site has no
server-side variables. Its public client identifiers (PostHog project key, Formspree form id) are in
`public/assets/main.js` and are meant to be public.
