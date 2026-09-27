#!/usr/bin/env python3
"""Build SEO guide pages, the guides hub, sitemap.xml and llms.txt.

Content lives in content/guides/<slug>.html:
    <!--meta
    { "title": ..., "h1": ..., "description": ..., "kicker": ..., "published": "YYYY-MM-DD",
      "updated": "YYYY-MM-DD", "tldr": [...], "faq": [[q, a], ...], "related": [slug, ...] }
    -->
    <h2>…</h2> body HTML …

Run:  python3 scripts/build.py   (no dependencies). Output goes to public/.
"""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / "public"
CONTENT = ROOT / "content" / "guides"
SITE = "https://snapforgelab.com"
ASSET_V = "16"

TOPIC_ORDER = ["Getting started", "Security", "Deployment", "Data", "Costs", "Troubleshooting"]

# Hand-written pages that belong in the sitemap (path, priority).
STATIC_PAGES = [
    ("/", "1.0"),
    ("/replit-app-to-production/", "0.9"),
    ("/hire-replit-developer/", "0.9"),
    ("/about/", "0.6"),
    ("/replit-app-to-production/example-report/", "0.7"),
    ("/privacy/", "0.2"),
    ("/terms/", "0.2"),
    ("/tools/replit-readiness-score/", "0.8"),
]

LOGO = ('<svg viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#2997ff"/>'
        '<path d="M18.5 5 9 18h6.5L13.5 27 23 14h-6.5z" fill="#fff"/></svg>')


def esc(s):
    return html.escape(s, quote=True)


def load_guides():
    guides = []
    for f in sorted(CONTENT.glob("*.html")):
        raw = f.read_text()
        m = re.match(r"\s*<!--meta\s*(.*?)\s*-->\s*(.*)", raw, re.S)
        if not m:
            raise SystemExit(f"{f.name}: missing <!--meta --> block")
        meta = json.loads(m.group(1))
        meta["slug"] = f.stem
        meta["body"] = m.group(2)
        meta["url"] = f"{SITE}/guides/{f.stem}/"
        guides.append(meta)
    guides.sort(key=lambda g: g.get("order", 99))
    return guides


def head(title, description, canonical, og_type="article", extra="", image=None):
    image = image or f"{SITE}/og.png"
    return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(title)}</title>
<meta name="description" content="{esc(description)}">
<link rel="canonical" href="{canonical}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta name="theme-color" content="#050506">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta property="og:type" content="{og_type}">
<meta property="og:site_name" content="Snapforge Lab">
<meta property="og:url" content="{canonical}">
<meta property="og:title" content="{esc(title.split(' | ')[0])}">
<meta property="og:description" content="{esc(description)}">
<meta property="og:image" content="{image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{esc(title.split(' | ')[0])}">
<meta name="twitter:description" content="{esc(description)}">
<meta name="twitter:image" content="{image}">
<link rel="stylesheet" href="/assets/styles.css?v={ASSET_V}">
<script>document.documentElement.classList.add('js')</script>
{extra}</head>
<body>
<a class="skip" href="#main">Skip to content</a>
<header class="nav">
  <div class="inner">
    <a href="/" class="logo" aria-label="Snapforge Lab home">{LOGO}Snapforge Lab</a>
    <nav class="nav-links" aria-label="Primary"><a href="/#how">How it works</a><a href="/#pricing">Pricing</a><a href="/guides/">Guides</a><a href="/tools/replit-readiness-score/">Readiness score</a></nav>
    <a href="/replit-app-to-production/" class="btn p sm">Get a $199 review</a>
  </div>
</header>
"""


def footer(mobile_cta=True):
    cta = ('<div class="m-cta"><a href="/replit-app-to-production/" class="btn p lg">Get a $199 ship-ready review</a></div>\n'
           if mobile_cta else "")
    return f"""{cta}
<footer>
  <div class="wrap">
    <div class="foot">
      <div><a href="/" class="logo">{LOGO}Snapforge Lab</a>
        <p style="margin:0;max-width:40ch">Independent Replit specialist. Productized, fixed-price business apps for growing teams worldwide.</p></div>
      <div><p class="foot-h">Services</p><ul><li><a href="/replit-app-to-production/">Replit Agent app to production</a></li><li><a href="/hire-replit-developer/">Hire a Replit developer</a></li><li><a href="/#pricing">Pricing</a></li></ul></div>
      <div><p class="foot-h">Resources</p><ul><li><a href="/guides/">Replit guides</a></li><li><a href="/tools/replit-readiness-score/">Replit Readiness Score</a></li><li><a href="/guides/replit-agent-security-checklist/">Security checklist</a></li><li><a href="/about/">About Simo</a></li></ul></div>
      <div><p class="foot-h">Contact</p><ul><li><a href="mailto:hello@snapforgelab.com">hello@snapforgelab.com</a></li><li><a href="/#contact">Get a fixed quote</a></li></ul></div>
    </div>
    <p class="copy">© <span data-year>2026</span> Snapforge Lab. Replit is a trademark of Replit, Inc. Snapforge Lab is an independent studio, not affiliated with Replit, Inc. · <a href="/privacy/">Privacy</a> · <a href="/terms/">Terms</a></p>
  </div>
</footer>
<script src="/assets/main.js?v={ASSET_V}" defer></script>
</body>
</html>
"""


AUTHOR_LD = {"@type": "Person", "@id": f"{SITE}/about/#simo", "name": "Simo", "url": f"{SITE}/about/",
             "jobTitle": "Founder, Snapforge Lab", "worksFor": {"@id": f"{SITE}/#org"},
             "description": "Ranked in the top 1% of Replit Agent users. Builds and ships production apps on Replit.",
             "knowsAbout": ["Replit", "Replit Agent", "Web application security", "Deployment", "PostgreSQL"]}

AUTHOR_BOX = """<aside class="author-box" aria-label="About the author">
  <div class="avatar" aria-hidden="true">S</div>
  <div>
    <p class="author-name">Written by <a href="/about/" rel="author">Simo</a></p>
    <p class="author-bio">Founder of Snapforge Lab, ranked in the top 1% of Replit Agent users. Simo builds, reviews and ships production apps on Replit, and writes these guides from that daily work.</p>
  </div>
</aside>"""

CTA_BOX = """<aside class="cta-box">
  <div>
    <p class="cta-kicker">Ship-Ready Review · $199 · 48h</p>
    <p class="cta-title">Want an expert to check your Replit app before real users do?</p>
    <p class="cta-text">Security, auth, data, costs and deployment. Prioritized fix list and a video walkthrough in 48 hours. Fewer than 3 real issues found? Full refund.</p>
  </div>
  <a href="/replit-app-to-production/" class="btn p">See the $199 review</a>
</aside>"""


def build_guide(g, by_slug):
    faq = g.get("faq", [])
    related = [by_slug[s] for s in g.get("related", []) if s in by_slug]
    graph = [
        {
            "@type": "TechArticle",
            "headline": g["h1"],
            "description": g["description"],
            "url": g["url"],
            "mainEntityOfPage": g["url"],
            "datePublished": g["published"],
            "dateModified": g.get("updated", g["published"]),
            "image": og_image(g),
            "inLanguage": "en",
            "about": {"@type": "SoftwareApplication", "name": "Replit", "applicationCategory": "DeveloperApplication"},
            "author": AUTHOR_LD,
            "publisher": {"@type": "Organization", "@id": f"{SITE}/#org", "name": "Snapforge Lab",
                          "logo": {"@type": "ImageObject", "url": f"{SITE}/apple-touch-icon.png"}},
        },
        {
            "@type": "BreadcrumbList",
            "itemListElement": [
                {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{SITE}/"},
                {"@type": "ListItem", "position": 2, "name": "Guides", "item": f"{SITE}/guides/"},
                {"@type": "ListItem", "position": 3, "name": g["h1"], "item": g["url"]},
            ],
        },
    ]
    if faq:
        graph.append({"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub(r"<[^>]+>", "", a)}}
            for q, a in faq]})
    ld = '<script type="application/ld+json">\n' + json.dumps({"@context": "https://schema.org", "@graph": graph}, indent=1) + "\n</script>\n"

    body = g["body"].replace("<!--cta-->", CTA_BOX)
    tldr = "".join(f"<li>{t}</li>" for t in g.get("tldr", []))
    faq_html = ""
    if faq:
        faq_html = '<h2 id="faq">FAQ</h2>\n' + "\n".join(f"<h3>{esc(q)}</h3>\n<p>{a}</p>" for q, a in faq)
    rel_html = ""
    if related:
        items = "".join(f'<a class="rel" href="/guides/{r["slug"]}/"><span class="rel-k">{esc(r["kicker"])}</span><span class="rel-t">{esc(r["h1"])}</span></a>' for r in related)
        rel_html = f'<section class="related" aria-labelledby="rel-title"><div class="wrap narrow"><h2 id="rel-title">Keep reading</h2><div class="rel-grid">{items}</div></div></section>'

    updated = g.get("updated", g["published"])
    out = head(full_title(g["title"]), g["description"], g["url"], extra=ld, image=og_image(g))
    out += f"""
<main id="main">
<div class="wrap narrow">
  <nav class="crumbs" aria-label="Breadcrumb"><a href="/">Home</a> / <a href="/guides/">Guides</a> / {esc(g["kicker"])}</nav>
  <article class="article">
    <div class="kicker">{esc(g["kicker"])}</div>
    <h1>{esc(g["h1"])}</h1>
    <p class="byline">By <a href="/about/" rel="author">Simo</a>, founder of Snapforge Lab · Updated <time datetime="{updated}">{format_date(updated)}</time> · {g.get("minutes", 8)} min read</p>
    <div class="tldr"><p class="tldr-t">Short answer</p><ul>{tldr}</ul></div>
    <div class="prose">
{body}
{faq_html}
    </div>
    {AUTHOR_BOX}
    {CTA_BOX}
  </article>
</div>
{rel_html}
</main>
"""
    out += footer()
    dest = PUBLIC / "guides" / g["slug"] / "index.html"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(out)


def full_title(t):
    """Append the brand only when the title stays under ~60 characters."""
    return t if "Snapforge" in t or len(t) + 16 > 60 else f"{t} | Snapforge Lab"


def og_image(g):
    """Per-guide social image (made by scripts/og.js) with the site image as fallback."""
    if (PUBLIC / "og" / f"{g['slug']}.png").exists():
        return f"{SITE}/og/{g['slug']}.png"
    return f"{SITE}/og.png"


def format_date(d):
    y, m, day = d.split("-")
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return f"{months[int(m) - 1]} {int(day)}, {y}"


def build_hub(guides):
    url = f"{SITE}/guides/"
    ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "CollectionPage", "name": "Replit guides", "url": url,
         "description": "Practical guides to take Replit and Replit Agent apps to production.",
         "publisher": {"@id": f"{SITE}/#org"}},
        {"@type": "ItemList", "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "url": g["url"], "name": g["h1"]} for i, g in enumerate(guides)]},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": f"{SITE}/"},
            {"@type": "ListItem", "position": 2, "name": "Guides", "item": url}]},
    ]}
    extra = '<script type="application/ld+json">\n' + json.dumps(ld, indent=1) + "\n</script>\n"
    groups = {}
    for g in guides:
        groups.setdefault(g.get("topic", g["kicker"]), []).append(g)
    sections = ""
    for topic in TOPIC_ORDER + [t for t in groups if t not in TOPIC_ORDER]:
        if topic not in groups:
            continue
        cards = "".join(
            f'<a class="card guide-card" href="/guides/{g["slug"]}/"><span class="kicker">{esc(g["kicker"])}</span>'
            f'<h3>{esc(g["h1"])}</h3><p>{esc(g["description"])}</p><span class="more">Read the guide →</span></a>'
            for g in groups[topic])
        sections += f'<div class="topic"><h2 class="topic-h">{esc(topic)}</h2><div class="cards guides-grid">{cards}</div></div>'
    out = head("Replit Guides: Ship Your Replit Agent App to Production",
               "Practical, no-fluff guides to ship Replit and Replit Agent apps to production: security, deployment, databases, costs and fixing broken apps.",
               url, og_type="website", extra=extra)
    out += f"""
<main id="main">
<section class="hero" style="padding-bottom:40px">
  <div class="wrap">
    <div class="kicker">Replit guides</div>
    <h1>Take your Replit app from prototype to production</h1>
    <p class="lede">Practical guides to shipping Replit Agent apps: what breaks with real users, and how to fix it.</p>
    <div class="cta"><a href="/tools/replit-readiness-score/" class="btn p lg">Get your readiness score, free <span class="arrow" aria-hidden="true">→</span></a></div>
  </div>
</section>
<section style="padding-top:40px">
  <div class="wrap">{sections}</div>
</section>
</main>
"""
    out += footer()
    (PUBLIC / "guides").mkdir(parents=True, exist_ok=True)
    (PUBLIC / "guides" / "index.html").write_text(out)


def build_sitemap(guides):
    rows = [(f"{SITE}{p}", pr, None) for p, pr in STATIC_PAGES]
    rows.append((f"{SITE}/guides/", "0.8", None))
    rows += [(g["url"], "0.7", g.get("updated", g["published"])) for g in guides]
    items = "\n".join(
        f"  <url><loc>{u}</loc>{f'<lastmod>{lm}</lastmod>' if lm else ''}<priority>{pr}</priority></url>"
        for u, pr, lm in rows)
    (PUBLIC / "sitemap.xml").write_text(
        f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{items}\n</urlset>\n')


def build_llms(guides):
    lines = [
        "# Snapforge Lab",
        "",
        "> Snapforge Lab is an independent Replit specialist studio. We review, fix and deploy Replit and Replit Agent apps, "
        "and build custom business apps (dashboards, CRMs, client portals, AI assistants) on Replit at fixed prices, for clients worldwide.",
        "",
        "## Services",
        f"- [Ship-Ready Review]({SITE}/replit-app-to-production/): $199 production-readiness audit of a Replit Agent app, delivered in 48 hours, full refund if fewer than 3 real issues are found.",
        f"- [Ship-It Sprint]({SITE}/replit-app-to-production/): $990 fixed price to fix a Replit app and deploy it to production in 5 days (review fee credited).",
        f"- [Starter Build]({SITE}/#pricing): custom business app on Replit, $2,500 fixed ($1,500 for founding clients), live in about 7 days.",
        f"- [Care]({SITE}/#pricing): $249/month hosting, monitoring and improvements.",
        f"- [Hire a Replit developer]({SITE}/hire-replit-developer/)",
        "",
        "## Free tools",
        f"- [Replit Readiness Score]({SITE}/tools/replit-readiness-score/): 2-minute self-assessment that scores whether a Replit app is ready for real users.",
        "",
        "## Guides",
    ]
    lines += [f"- [{g['h1']}]({g['url']}): {g['description']}" for g in guides]
    lines += ["", "## About", f"- [Simo]({SITE}/about/): founder of Snapforge Lab, ranked in the top 1% of Replit Agent users. Writes every guide on this site."]
    lines += ["", "## Contact", "- Email: hello@snapforgelab.com", f"- Website: {SITE}/", ""]
    (PUBLIC / "llms.txt").write_text("\n".join(lines))


def main():
    guides = load_guides()
    by_slug = {g["slug"]: g for g in guides}
    for g in guides:
        build_guide(g, by_slug)
    build_hub(guides)
    build_sitemap(guides)
    build_llms(guides)
    print(f"built {len(guides)} guides + hub, sitemap.xml, llms.txt")


if __name__ == "__main__":
    main()
