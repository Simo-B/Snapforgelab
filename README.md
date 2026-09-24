# Snapforge Lab

Static marketing site for [snapforgelab.com](https://snapforgelab.com/) — no build step.

- `public/` — deployed site (Cloudflare Pages, build output directory `public`)
  - `index.html` — landing page
  - `replit-app-to-production/` — Ship-Ready Review (SEO + X entry offer)
  - `hire-replit-developer/` — SEO service page
  - `_headers`, `_redirects`, `robots.txt`, `sitemap.xml`, `og.png`
- `docs/` — not deployed
  - `launch-checklist.md` — deploy, indexing, business decisions to confirm
  - `x-growth-kit.md` — X profile, posts, DM playbook, KPIs
  - `legacy-index.html` — previous version of the site

Local preview: `cd public && python3 -m http.server 8787`
