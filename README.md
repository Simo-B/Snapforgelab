# Snapforge Lab

Static marketing site for [snapforgelab.com](https://snapforgelab.com/) — no build step.

- `public/` — deployed site (Cloudflare Worker `proud-truth-105e`, static assets from `public/` via `wrangler.jsonc`, auto-deployed on push to `claude/awesome-faraday-f1lckc`)
  - `index.html` — landing page
  - `replit-app-to-production/` — Ship-Ready Review (SEO + X entry offer)
  - `hire-replit-developer/` — SEO service page
  - `_headers`, `_redirects`, `robots.txt`, `sitemap.xml`, `og.png`
- `docs/` — not deployed
  - `launch-checklist.md` — deploy, indexing, business decisions to confirm
  - `x-growth-kit.md` — X profile, posts, DM playbook, KPIs
  - `legacy-index.html` — previous version of the site

Build guides: `python3 scripts/build.py` (regenerates `public/guides/`, `sitemap.xml`, `llms.txt`)

Local preview: `cd public && python3 -m http.server 8787`
