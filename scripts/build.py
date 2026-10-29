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
ASSET_V = "21"

TOPIC_ORDER = ["Getting started", "Security", "Deployment", "Data", "Costs", "Troubleshooting"]

# Hand-written pages that belong in the sitemap (path, priority).
STATIC_PAGES = [
    ("/", "1.0", "2026-10-29"),
    ("/launch-fix-sprint/", "1.0", "2026-10-25"),
    ("/safe-to-launch/", "0.9", "2026-10-25"),
    ("/scan/", "0.9", "2026-10-18"),
    ("/scan-deep/", "0.8", "2026-10-18"),
    ("/prompt-pack/", "0.8", "2026-10-18"),
    ("/vibe-stack/", "0.7", "2026-10-20"),
    ("/replit-app-to-production/", "0.9", "2026-10-29"),
    ("/deploy-fix/", "0.9", "2026-10-17"),
    ("/fix-replit-app/", "0.8", "2026-10-29"),
    ("/hire-replit-developer/", "0.9", "2026-10-29"),
    ("/about/", "0.6", "2026-10-29"),
    ("/replit-app-to-production/example-report/", "0.7", "2026-10-29"),
    ("/privacy/", "0.2", "2026-10-17"),
    ("/terms/", "0.2", "2026-10-29"),
    ("/tools/replit-readiness-score/", "0.8", "2026-10-29"),
    ("/free-audit", "0.9", "2026-10-29"),
    ("/lovable-bolt-audit", "0.9", "2026-10-17"),
    ("/case-studies/cors-credentials-hobby-app/", "0.7", "2026-10-17"),
    ("/support/", "0.4", "2026-10-17"),
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
    image = image or f"{SITE}/og.png?v=3"
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
    <nav class="nav-links" aria-label="Primary"><a href="/launch-fix-sprint/">Launch Fix Sprint</a><a href="/#pricing">Pricing</a><a href="/guides/">Guides</a><a href="/tools/replit-readiness-score/">Readiness score</a></nav>
    <a href="/free-audit" class="btn p sm" data-cta="free-audit">Free security audit</a>
  </div>
</header>
"""


REVIEW_CTA = ("Get my free security audit", "/free-audit")  # default mobile CTA: free audit, the entry of the ladder
DEPLOY_CTA = ("Fix my deploy for $49", "/deploy-fix/")


def footer(mobile_cta=True, cta_link=REVIEW_CTA):
    cta = (f'<div class="m-cta"><a href="{cta_link[1]}" class="btn p lg">{cta_link[0]}</a></div>\n'
           if mobile_cta else "")
    return f"""{cta}
<footer>
  <div class="wrap">
    <div class="foot">
      <div><a href="/" class="logo">{LOGO_FOOT}Snapforge Lab</a>
        <p style="margin:0;max-width:40ch">Independent Replit specialist. Security audits and fixes for AI-built apps, and fixed-price business apps.</p></div>
      <div><p class="foot-h">Services</p><ul><li><a href="/free-audit">Free security audit</a></li><li><a href="/launch-fix-sprint/">Launch Fix Sprint</a></li><li><a href="/safe-to-launch/">Safe to Launch</a></li><li><a href="/lovable-bolt-audit">Lovable &amp; Bolt audit</a></li><li><a href="/replit-app-to-production/">Replit app security</a></li><li><a href="/hire-replit-developer/">Hire a Replit developer</a></li><li><a href="/#pricing">Pricing</a></li></ul></div>
      <div><p class="foot-h">Resources</p><ul><li><a href="/guides/">Replit guides</a></li><li><a href="/tools/replit-readiness-score/">Replit Readiness Score</a></li><li><a href="/prompt-pack/">Fix it yourself: Prompt Pack ($19)</a></li><li><a href="/guides/replit-agent-security-checklist/">Security checklist</a></li><li><a href="/about/">About Simo</a></li></ul></div>
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

# Default guide CTA: the offer ladder. Free audit -> 15-min call -> Launch Fix Sprint ($990),
# with Safe to Launch as the smaller option. Prices must match /launch-fix-sprint/ and /safe-to-launch/.
SPRINT_LINE = ("Then the <a class=\"link\" href=\"/launch-fix-sprint/\">Launch Fix Sprint</a>: everything the audit found, "
               "fixed for you in 5 business days, $990 flat, paid only after the fixes are verified working. "
               "Just one quick fix? <a class=\"link\" href=\"/safe-to-launch/\">Safe to Launch</a>, $149 ($49 for my first 3 clients).")
CTA_BOX = f"""<aside class="cta-box">
  <div>
    <p class="cta-kicker">Free audit · then the Launch Fix Sprint</p>
    <p class="cta-title">Want an expert to check and fix your app before real users do?</p>
    <p class="cta-text">Start with a free, read-only security audit of your live app, report within 24 hours. {SPRINT_LINE}</p>
  </div>
  <div style="display:flex;flex-direction:column;gap:10px;flex:0 0 auto">
    <a href="/free-audit" class="btn p" data-cta="free-audit">Get my free audit</a>
    <a href="/launch-fix-sprint/" class="btn g">See the Launch Fix Sprint</a>
  </div>
</aside>"""

# Readers of deployment, data and troubleshooting guides are usually blocked right now:
# offer the $49 Deploy Fix first instead of the free audit + Sprint ladder.
DEPLOY_TOPICS = {"Deployment", "Data", "Troubleshooting"}
DEPLOY_CTA_BOX = f"""<aside class="cta-box">
  <div>
    <p class="cta-kicker">Replit Deploy Fix · $49 · 48h</p>
    <p class="cta-title">Stuck on a deploy error right now?</p>
    <p class="cta-text">Send me the error. I fix one deployment or configuration blocker (failing build or publish, secrets, database connection, custom domain) within 48 hours of access, or you get a full refund. Several issues to fix before launch? Start with a <a class="link" href="/free-audit">free audit</a>, then the <a class="link" href="/launch-fix-sprint/">Launch Fix Sprint</a> ($990, 5 business days, paid after the fixes are verified).</p>
  </div>
  <a href="/deploy-fix/" class="btn p">Fix my deploy for $49</a>
</aside>"""


# Problem/fix guides ("cta": "fix" in meta): the reader is blocked now, so lead with the free
# audit and offer the $49 Deploy Fix next to it. Optional meta "agent" and "audit" name the
# builder and the free-audit page for guides about other builders (default: Replit Agent);
# "deployFix": false drops the $49 Deploy Fix offer, whose page covers Replit only.
FREE_AUDIT_CTA = ("Get a free audit", "/free-audit")
# Fix guides about security symptoms (CORS, sessions, OAuth, webhooks) lead to the sprint ladder
# instead of the Deploy Fix.
SECURITY_FIX_SLUGS = {"replit-cors-error", "replit-login-not-working-after-deploy",
                      "replit-google-oauth-redirect-uri-mismatch", "stripe-webhook-not-working-replit"}
def fix_cta_box(agent="Replit Agent", audit=FREE_AUDIT_CTA[1], deploy_fix=True, security=False):
    sprint = (" Several issues to fix before launch? The <a class=\"link\" href=\"/launch-fix-sprint/\">Launch Fix Sprint</a> "
              "fixes everything the audit found in 5 business days, $990 flat, paid after the fixes are verified.")
    if security:
        offer = sprint + " Just one quick fix? <a class=\"link\" href=\"/safe-to-launch/\">Safe to Launch</a>, $149 ($49 for my first 3 clients)."
        button = '\n    <a href="/launch-fix-sprint/" class="btn g">See the Launch Fix Sprint</a>'
    else:
        offer = (" Need it fixed now? The $49 Deploy Fix solves one deployment blocker in 48 hours, or you get a full refund." if deploy_fix else "") + sprint
        button = '\n    <a href="/deploy-fix/" class="btn g">Fix my deploy for $49</a>' if deploy_fix else '\n    <a href="/launch-fix-sprint/" class="btn g">See the Launch Fix Sprint</a>'
    return f"""<aside class="cta-box">
  <div>
    <p class="cta-kicker">Free audit · 24h</p>
    <p class="cta-title">Still stuck? Get a free audit in 24h</p>
    <p class="cta-text">Send me your live app URL. Within 24 hours you get a private audit page: what breaks in production and exact fix steps you can paste into {agent}.{offer}</p>
  </div>
  <div style="display:flex;flex-direction:column;gap:10px;flex:0 0 auto">
    <a href="{audit}" class="btn p">Get my free audit</a>{button}
  </div>
</aside>"""


# Security guides for AI-built apps ("cta": "security"): free audit first, then the sprint ladder.
SECURITY_CTA_BOX = f"""<aside class="cta-box">
  <div>
    <p class="cta-kicker">Free security audit · 24h</p>
    <p class="cta-title">Not sure what your app exposes? Get a free read-only audit</p>
    <p class="cta-text">Send me your live app URL (Lovable, Bolt, Replit or any Supabase app). Within 24 hours you get a private audit page: what is exposed and exact fix steps you can paste into your AI tool. {SPRINT_LINE}</p>
  </div>
  <div style="display:flex;flex-direction:column;gap:10px;flex:0 0 auto">
    <a href="/free-audit" class="btn p" data-cta="free-audit">Get my free audit</a>
    <a href="/launch-fix-sprint/" class="btn g">See the Launch Fix Sprint</a>
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
    audit = g.get("audit", FREE_AUDIT_CTA[1])
    box = SECURITY_CTA_BOX if sec else fix_cta_box(g.get("agent", "Replit Agent"), audit, g.get("deployFix", True), g["slug"] in SECURITY_FIX_SLUGS) if fix else DEPLOY_CTA_BOX if deploy else CTA_BOX
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
    out += footer(cta_link=(FREE_AUDIT_CTA[0], audit) if fix else DEPLOY_CTA if deploy else REVIEW_CTA)
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
    return f"{SITE}/og.png?v=3"


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
    rows.append((f"{SITE}/guides/", "0.8", max(g.get("updated", g["published"]) for g in guides)))
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
        "> Snapforge Lab is an independent studio that fixes the security and launch issues of AI-built apps (Replit, Lovable, Bolt, Cursor, Supabase). "
        "The path is simple: (1) a free read-only security audit of the live app in 24 hours (exposed Supabase tables with Row Level Security off, secrets in the JS bundle, open CORS with credentials, unverified Stripe webhooks, auth redirects to preview domains); "
        "(2) a 15-minute call to agree on what to fix; (3) the Launch Fix Sprint, the main offer: $990 flat, done for you in 5 business days, paid only after the fixes are verified working. "
        "Safe to Launch ($149, $49 founding price for the first 3 clients) is the smaller option for one quick fix in 48 hours. It also builds custom business apps on Replit on a fixed-price quote, for clients worldwide.",
        "",
        "## Main path",
        f"- [Free security audit]({SITE}/free-audit): step 1, free. Read-only security check of a live Replit, Lovable or Bolt app, private audit page with exact fix steps within 24 hours. Lovable & Bolt version: {SITE}/lovable-bolt-audit",
        "- 15-minute call: step 2, free. Agree on the list of issues to fix, fixed scope and fixed price (book by email: hello@snapforgelab.com).",
        f"- [Launch Fix Sprint]({SITE}/launch-fix-sprint/): step 3, the main offer. $990 flat, done for you in 5 business days: the top issues from the free audit fixed (security, uptime, CORS and secrets, performance, SEO basics), retested, with a written report. Paid only after the fixes are verified working, nothing upfront. Guarantee: if a fixed issue comes back within 14 days, I fix it free.",
        "",
        "## Smaller options",
        f"- [Safe to Launch]({SITE}/safe-to-launch/): the smaller fallback when only one quick fix is needed. $149 flat (founding price $49 for the first 3 clients, in exchange for a testimonial). An AI-built app (Replit, Lovable, Bolt or Cursor) checked the way an attacker would and fixed in 48 hours: exposed keys and secrets, database access rules, login and accounts, payments and webhooks, deploy and environment settings, backups. Delivers the fixes pushed and tested, a 1-page report and a 5-minute video walkthrough. Guarantee: if a fixed issue comes back within 14 days, I fix it free. If I find nothing worth fixing, you pay nothing.",
        f"- [Replit Deploy Fix]({SITE}/deploy-fix/): $49 fixed price to fix one Replit deployment or configuration blocker (failing build or publish, secrets, database connection, custom domain) in 48 hours, full refund if not fixed.",
        f"- [Ship-Ready Prompt Pack]({SITE}/prompt-pack/): $19 one-time PDF (7 pages, October 2026 edition) to fix it yourself: 16 copy-paste prompts and a 15-point checklist to fix SEO, Supabase RLS, secrets, auth redirects, Stripe webhooks and deploys on apps built with Replit Agent, Lovable and Bolt. Paid with PayPal, emailed within a few hours, full refund within 14 days if it doesn't help.",
        f"- [Replit app security]({SITE}/replit-app-to-production/): security, auth, data and deployment checks for apps built with Replit Agent: free audit in 24 hours, then the Launch Fix Sprint ($990 flat, 5 business days, paid after the fixes are verified); Safe to Launch ($149) for one quick fix.",
        "",
        "## After launch and other services",
        f"- [Care]({SITE}/#pricing) (after a fix, $249/month, cancel anytime): continuous security monitoring of a live app, with a security re-check after every release plus a monthly full pass, an alert within 1 business day if a new issue appears, fixes for what the re-check finds, bug fixes and security updates, hosting and uptime monitoring, small monthly improvements, priority support within 1 business day.",
        f"- [Starter Build]({SITE}/#contact): custom business app built from scratch, fixed-price quote within 48 hours on request.",
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
