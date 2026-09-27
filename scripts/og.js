// Render a 1200x630 social image per guide into public/og/<slug>.png.
// Usage: node scripts/og.js   (needs the `playwright` package), then python3 scripts/build.py
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const CONTENT = path.join(ROOT, 'content', 'guides');
const OUT = path.join(ROOT, 'public', 'og');

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const page = (g) => `<!doctype html><html><head><style>
body{margin:0;width:1200px;height:630px;background:#050506;color:#f5f5f7;overflow:hidden;position:relative;
  font-family:-apple-system,"Inter","Segoe UI",Roboto,Helvetica,Arial,sans-serif}
.glow{position:absolute;inset:-220px -120px auto;height:820px;
  background:radial-gradient(closest-side at 25% 40%,rgba(41,151,255,.34),transparent 70%),radial-gradient(closest-side at 85% 25%,rgba(124,92,255,.24),transparent 70%)}
.c{position:relative;padding:64px 80px;height:100%;box-sizing:border-box;display:flex;flex-direction:column}
.logo{display:flex;align-items:center;gap:14px;font-size:28px;font-weight:650}
.k{margin-top:auto;font-size:24px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#4aa8ff}
h1{font-size:${g.h1.length > 70 ? 56 : 64}px;line-height:1.06;letter-spacing:-2px;margin:14px 0 0;font-weight:700;max-width:1040px}
.foot{display:flex;justify-content:space-between;align-items:center;margin-top:34px;font-size:22px;color:#a1a1a6}
.pill{border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.05);padding:8px 18px;border-radius:999px;color:#d2d2d7}
</style></head><body><div class="glow"></div><div class="c">
<div class="logo"><svg width="40" height="40" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#2997ff"/><path d="M18.5 5 9 18h6.5L13.5 27 23 14h-6.5z" fill="#fff"/></svg>Snapforge Lab</div>
<div class="k">${esc(g.kicker)} · Replit guide</div>
<h1>${esc(g.h1)}</h1>
<div class="foot"><span class="pill">${g.minutes || 8} min read</span><span>snapforgelab.com/guides</span></div>
</div></body></html>`;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const tab = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const f of fs.readdirSync(CONTENT).filter((n) => n.endsWith('.html'))) {
    const m = fs.readFileSync(path.join(CONTENT, f), 'utf8').match(/<!--meta\s*([\s\S]*?)\s*-->/);
    const g = JSON.parse(m[1]);
    await tab.setContent(page(g));
    const slug = f.replace(/\.html$/, '');
    await tab.screenshot({ path: path.join(OUT, `${slug}.png`) });
    console.log('og', slug);
  }
  await browser.close();
})();
