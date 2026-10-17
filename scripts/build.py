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
ASSET_V = "20"

TOPIC_ORDER = ["Getting started", "Security", "Deployment", "Data", "Costs", "Troubleshooting"]

# Hand-written pages that belong in the sitemap (path, priority).
STATIC_PAGES = [
    ("/", "1.0"),
    ("/replit-app-to-production/", "0.9"),
    ("/deploy-fix/", "0.9"),
    ("/hire-replit-developer/", "0.9"),
    ("/about/", "0.6"),
    ("/replit-app-to-production/example-report/", "0.7"),
    ("/privacy/", "0.2"),
    ("/terms/", "0.2"),
    ("/tools/replit-readiness-score/", "0.8"),
    ("/free-audit", "0.9"),
    ("/lovable-bolt-audit", "0.9"),
    ("/case-studies/cors-credentials-hobby-app/", "0.7"),
    ("/support/", "0.4"),
    ("/chatgpt-demo/", "0.4", "2026-10-17"),
]

def logo(gid):
    # Each inline copy needs its own gradient id: header and footer share a page.
    return ('<svg viewBox="0 0 100 100" aria-hidden="true"><defs><linearGradient id="%s" x1="0" y1="0" x2="1" y2="1">'
            '<stop offset="0" stop-color="#3884FF"/><stop offset="1" stop-color="#8B5CF6"/></linearGradient></defs>'
            '<rect width="100" height="100" rx="24" fill="url(#%s)"/>'
            '<path d="M58 16 27 56h20l-6 28 32-41H53l7-27z" fill="#fff"/></svg>') % (gid, gid)


LOGO_HEAD = logo("sfl-logo-h")
LOGO_FOOT = logo("sfl-logo-f")


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
    image = image or f"{SITE}/og.png?v=2"
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
<link rel="icon" href="/favicon.ico" sizes="32x32">
<link rel="icon" href="/logo.svg" type="image/svg+xml">
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
    <a href="/" class="logo" aria-label="Snapforge Lab home">{LOGO_HEAD}Snapforge Lab</a>
    <nav class="nav-links" aria-label="Primary"><a href="/#how">How it works</a><a href="/#pricing">Pricing</a><a href="/guides/">Guides</a><a href="/tools/replit-readiness-score/">Readiness score</a></nav>
    <a href="/replit-app-to-production/#book" class="btn p sm">Book the $199 review</a>
  </div>
</header>
"""


REVIEW_CTA = ("Book the $199 review", "/replit-app-to-production/#book")
DEPLOY_CTA = ("Fix my deploy for $49", "/deploy-fix/")


def footer(mobile_cta=True, cta_link=REVIEW_CTA):
    cta = (f'<div class="m-cta"><a href="{cta_link[1]}" class="btn p lg">{cta_link[0]}</a></div>\n'
           if mobile_cta else "")
    return f"""{cta}
<footer>
  <div class="wrap">
    <div class="foot">
      <div><a href="/" class="logo">{LOGO_FOOT}Snapforge Lab</a>
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
             "jobTitle": "Founder, Snapforge Lab", "worksFor": {"@id": f"{SITE}/#org"}, "sameAs": ["https://x.com/Simo_Bc"],
             "description": "Ranked in the top 1% of Replit Agent users. Builds and ships production apps on Replit.",
             "knowsAbout": ["Replit", "Replit Agent", "Web application security", "Deployment", "PostgreSQL"]}

AUTHOR_BOX = """<aside class="author-box" aria-label="About the author">
  <div class="avatar" aria-hidden="true">S</div>
  <div>
    <p class="author-name">Written by <a class="link" href="/about/" rel="author">Simo</a></p>
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

# Readers of deployment, data and troubleshooting guides are usually blocked right now:
# offer the $49 Deploy Fix first instead of the full review.
DEPLOY_TOPICS = {"Deployment", "Data", "Troubleshooting"}
DEPLOY_CTA_BOX = """<aside class="cta-box">
  <div>
    <p class="cta-kicker">Replit Deploy Fix · $49 · 48h</p>
    <p class="cta-title">Stuck on a deploy error right now?</p>
    <p class="cta-text">Send me the error. I fix one deployment or configuration blocker (failing build or publish, secrets, database connection, custom domain) within 48 hours of access, or you get a full refund.</p>
  </div>
  <a href="/deploy-fix/" class="btn p">Fix my deploy for $49</a>
</aside>"""


# Problem/fix guides ("cta": "fix" in meta): the reader is blocked now, so lead with the free
# audit and offer the $49 Deploy Fix next to it.
FREE_AUDIT_CTA = ("Get a free audit", "/free-audit")
FIX_CTA_BOX = """<aside class="cta-box">
  <div>
    <p class="cta-kicker">Free audit · 24h</p>
    <p class="cta-title">Still stuck? Get a free audit in 24h</p>
    <p class="cta-text">Send me your live app URL. Within 24 hours you get a private audit page: what breaks in production and exact fix steps you can paste into Replit Agent. Need it fixed now? The $49 Deploy Fix solves one deployment blocker in 48 hours, or you get a full refund.</p>
  </div>
  <div style="display:flex;flex-direction:column;gap:10px;flex:0 0 auto">
    <a href="/free-audit" class="btn p">Get my free audit</a>
    <a href="/deploy-fix/" class="btn g">Fix my deploy for $49</a>
  </div>
</aside>"""


# Security guides for AI-built apps ("cta": "security"): free audit first, then the $199 review,
# with the $49 Deploy Fix for one blocker.
SECURITY_CTA_BOX = """<aside class="cta-box">
  <div>
    <p class="cta-kicker">Free security audit · 24h</p>
    <p class="cta-title">Not sure which of your tables are open? Get a free read-only audit</p>
    <p class="cta-text">Send me your live app URL (Lovable, Bolt, Replit or any Supabase app). Within 24 hours you get a private audit page: what is exposed and exact fix steps you can paste into your AI tool. Want the full check? The $199 Ship-Ready Security Review covers RLS, grants, secrets, auth and webhooks in 48 hours. One blocker to fix now? The $49 Deploy Fix, or a full refund.</p>
  </div>
  <div style="display:flex;flex-direction:column;gap:10px;flex:0 0 auto">
    <a href="/free-audit" class="btn p">Get my free audit</a>
    <a href="/replit-app-to-production/#book" class="btn g">$199 Security Review</a>
    <a href="https://paypal.me/mbsimo/49USD" class="btn g" rel="noopener">$49 Deploy Fix</a>
  </div>
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
            "about": {"@type": "SoftwareApplication", "name": g.get("about", "Replit"), "applicationCategory": "DeveloperApplication"},
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
    steps = g.get("steps", [])
    if steps:
        graph.append({"@type": "HowTo", "name": g["h1"], "description": g["description"], "url": g["url"],
                      "step": [{"@type": "HowToStep", "position": i + 1, "name": n, "text": t,
                                "url": f'{g["url"]}#step-{i + 1}'} for i, (n, t) in enumerate(steps)]})
    if faq:
        graph.append({"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub(r"<[^>]+>", "", a)}}
            for q, a in faq]})
    ld = '<script type="application/ld+json">\n' + json.dumps({"@context": "https://schema.org", "@graph": graph}, indent=1) + "\n</script>\n"

    sec = g.get("cta") == "security"
    fix = g.get("cta") == "fix" or sec
    deploy = g.get("topic") in DEPLOY_TOPICS
    box = SECURITY_CTA_BOX if sec else FIX_CTA_BOX if fix else DEPLOY_CTA_BOX if deploy else CTA_BOX
    body = g["body"].replace("<!--cta-->", box)
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
    {box}
  </article>
</div>
{rel_html}
</main>
"""
    out += footer(cta_link=FREE_AUDIT_CTA if fix else DEPLOY_CTA if deploy else REVIEW_CTA)
    dest = PUBLIC / "guides" / g["slug"] / "index.html"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(out)


def full_title(t):
    """Append the brand only when the title stays under ~60 characters."""
    return t if "Snapforge" in t or len(t) + 16 > 60 else f"{t} | Snapforge Lab"


def og_image(g):
    """Per-guide social image (made by scripts/og.js) with the site image as fallback."""
    if (PUBLIC / "og" / f"{g['slug']}.png").exists():
        return f"{SITE}/og/{g['slug']}.png?v=2"
    return f"{SITE}/og.png?v=2"


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
               "Step-by-step fixes for Replit and Replit Agent apps: failed deployments, secrets, databases, custom domains, Stripe, login and costs.",
               url, og_type="website", extra=extra)
    out += f"""
<main id="main">
<section class="hero" style="padding-bottom:40px">
  <div class="wrap">
    <div class="kicker">Replit guides</div>
    <h1>Take your Replit app from prototype to production</h1>
    <p class="lede">Practical guides to shipping Replit Agent apps: what breaks after you publish, and how to fix it step by step, with a copy-paste prompt for Agent in every fix.</p>
    <div class="cta"><a href="/free-audit" class="btn p lg">Get a free audit in 24h <span class="arrow" aria-hidden="true">→</span></a><a href="/tools/replit-readiness-score/" class="btn g lg">Get your readiness score</a></div>
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
    rows = [(f"{SITE}{p[0]}", p[1], p[2] if len(p) > 2 else None) for p in STATIC_PAGES]
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
        "> Snapforge Lab is an independent Replit specialist studio focused on the security of AI-built apps (Replit, Lovable, Bolt, Supabase): "
        "a free read-only security audit in 24h (exposed Supabase tables with Row Level Security off, secrets in the JS bundle, open CORS with credentials, unverified Stripe webhooks, auth redirects to preview domains), "
        "then fixed-price fixes and reviews. It also builds custom business apps on Replit at fixed prices, for clients worldwide.",
        "",
        "## Services",
        f"- [Free security audit]({SITE}/free-audit): free, read-only security check of a live Replit, Lovable or Bolt app, private audit page with exact fix steps within 24 hours. Lovable & Bolt version: {SITE}/lovable-bolt-audit\n"
        f"- [Replit Deploy Fix]({SITE}/deploy-fix/): $49 fixed price to fix one Replit deployment or configuration blocker (failing build or publish, secrets, database connection, custom domain) in 48 hours, full refund if not fixed ($49 credited toward the Ship-Ready Security Review if booked within 30 days).",
        f"- [Ship-Ready Security Review]({SITE}/replit-app-to-production/): $199 security and production-readiness audit of an AI-built app (Row Level Security, secrets, CORS, Stripe webhooks, access control), delivered in 48 hours, full refund if fewer than 3 real issues are found.",
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
