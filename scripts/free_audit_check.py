#!/usr/bin/env python3
"""Passive, external check of a live web app for the Snapforge Lab free audit.

It only makes the GET requests a visitor's browser would make: the page,
robots.txt, sitemap.xml, one random path (to see how missing pages are
handled), the same-site JavaScript files the page loads and their source maps,
and optionally one API URL with a foreign Origin header (CORS). It never logs
in, never submits a form and never uses a key it finds. Secrets are printed
redacted.

Run it only on apps whose owner asked for the audit.

Usage:
  python3 free_audit_check.py https://your-app.replit.app
  python3 free_audit_check.py https://your-app.replit.app --api https://your-app.replit.app/api/me -o audit.md

Python 3.8+, no dependencies. Prints a Markdown draft of the audit.
"""
import argparse
import base64
import datetime
import json
import re
import secrets
import sys
import time
import urllib.error
import urllib.request
from urllib.parse import urljoin, urlparse

UA = "SnapforgeLab-FreeAudit/1.0 (+https://snapforgelab.com/free-audit)"
MAX_BYTES = 3_000_000
MAX_SCRIPTS = 15

# (label, regex, severity). Severity "check" means: often public by design, verify it is restricted.
SECRET_PATTERNS = [
    ("Anthropic API key", r"(?<![A-Za-z0-9_-])sk-ant-[A-Za-z0-9_-]{20,}", "must"),
    ("OpenAI API key", r"(?<![A-Za-z0-9_-])sk-(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{32,}", "must"),
    ("Stripe secret key", r"(?<![A-Za-z0-9])(?:sk|rk)_live_[0-9A-Za-z]{16,}", "must"),
    ("AWS access key ID", r"(?<![A-Z0-9])AKIA[0-9A-Z]{16}(?![A-Z0-9])", "must"),
    ("GitHub token", r"(?<![A-Za-z0-9])gh[pousr]_[A-Za-z0-9]{36,}", "must"),
    ("Slack token", r"(?<![A-Za-z0-9])xox[abprs]-[A-Za-z0-9-]{10,}", "must"),
    ("SendGrid API key", r"(?<![A-Za-z0-9])SG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}", "must"),
    ("Private key", r"-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----", "must"),
    ("Database URL with password", r"(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|rediss?)://[^\s:'\"/@]+:[^\s@'\"]+@[^\s'\"]+", "must"),
    ("Google API key", r"(?<![A-Za-z0-9_-])AIza[0-9A-Za-z_-]{35}", "check"),
]
JWT = re.compile(r"eyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})\.[A-Za-z0-9_-]{10,}")


def fetch(url, headers=None, limit=MAX_BYTES):
    """GET url. Returns dict(status, headers, cookies, body, url, ms) or dict(error)."""
    req = urllib.request.Request(url, headers={"User-Agent": UA, **(headers or {})})
    start = time.time()
    try:
        resp = urllib.request.urlopen(req, timeout=20)
    except urllib.error.HTTPError as e:
        resp = e
    except Exception as e:  # DNS, TLS, timeout
        return {"error": str(e), "url": url}
    body = resp.read(limit) if resp.fp else b""
    return {"status": resp.status if hasattr(resp, "status") else resp.code,
            "headers": {k.lower(): v for k, v in resp.headers.items()},
            "cookies": resp.headers.get_all("Set-Cookie") or [],
            "body": body, "url": resp.geturl(), "ms": int((time.time() - start) * 1000)}


def redact(s):
    return f"{s[:6]}… ({len(s)} characters)"


class Audit:
    def __init__(self):
        self.items = []

    def add(self, sev, title, seen, why="", prompt=""):
        self.items.append({"sev": sev, "title": title, "seen": seen, "why": why, "prompt": prompt})


def scan_text(text, where, audit, seen_secrets):
    for label, rx, sev in SECRET_PATTERNS:
        for m in re.finditer(rx, text):
            s = m.group(0)
            if s in seen_secrets:
                continue
            if label == "OpenAI API key" and (s.startswith("sk-ant-") or not re.search(r"\d", s)):
                continue
            seen_secrets.add(s)
            if sev == "check":
                audit.add("nice", f"{label} visible in the browser code",
                          f"{redact(s)} in {where}.",
                          "Some Google keys are public by design (Maps, Firebase), but only if they are restricted to your domain and APIs.",
                          f"Check that the Google API key used in the frontend is restricted to my domain and to the APIs it needs in Google Cloud Console. If it is not meant to be public, move the calls to the server and read the key from Replit Secrets.")
            else:
                audit.add("must", f"{label} exposed in the browser code",
                          f"{redact(s)} in {where}. Anyone who opens the app can read it.",
                          "Whoever copies it can use your account and run up costs or read your data.",
                          f"A {label} is shipped to the browser. Move every call that uses it to a server route, read it from Replit Secrets on the server only, and never import it in frontend code. Then tell me which key to rotate.")
    for m in JWT.finditer(text):
        token = m.group(0)
        if token in seen_secrets:
            continue
        seen_secrets.add(token)
        try:
            payload = json.loads(base64.urlsafe_b64decode(m.group(1) + "=" * (-len(m.group(1)) % 4)))
        except Exception:
            continue
        role = payload.get("role") if isinstance(payload, dict) else None
        if role == "service_role":
            audit.add("must", "Supabase service_role key exposed in the browser code",
                      f"{redact(token)} in {where}.",
                      "The service_role key bypasses every database rule: anyone can read or change all your data.",
                      "The Supabase service_role key is in the frontend bundle. Use it only in server code read from Replit Secrets, use the anon key in the browser, and make sure Row Level Security is enabled on every table. Then I will rotate the service_role key.")
        elif role == "anon":
            audit.add("ok", "Supabase anon key in the browser (normal)",
                      f"{where} uses the public anon key. That is expected, as long as Row Level Security protects every table.")


def check(url, apis):
    audit, notes = Audit(), []
    page = fetch(url)
    if "error" in page:
        sys.exit(f"Could not load {url}: {page['error']}")
    final = page["url"]
    host = urlparse(final).hostname or ""
    html = page["body"].decode("utf-8", "replace")
    notes.append(f"{url} → {page['status']} in {page['ms']} ms ({final})")

    # Deployment basics
    if page["status"] >= 400:
        audit.add("must", f"The app answers with an error ({page['status']})", f"{final} returned HTTP {page['status']}.",
                  "Visitors see an error page instead of your app.",
                  "The deployed app returns an error on its home page. Open the deployment logs, find the first error, and fix the cause; then redeploy and confirm the home page returns 200.")
    if host.endswith(".replit.dev") or host.endswith(".repl.co"):
        audit.add("must", "You are sharing a development URL, not a deployment", f"{host} is a Replit workspace URL.",
                  "Development URLs stop when the workspace sleeps and are not meant for real users.",
                  "Publish this app as a Replit Deployment (Autoscale or Reserved VM), connect a custom domain if I have one, and use that URL instead of the workspace URL.")
    if urlparse(final).scheme != "https":
        audit.add("must", "The app is not served over HTTPS", f"Final URL: {final}.",
                  "Passwords and session cookies can be intercepted.",
                  "Serve the app over HTTPS only and redirect every http:// request to https://.")
    elif urlparse(url).scheme == "https":
        plain = fetch("http://" + urlparse(final).netloc + "/")
        if "error" not in plain and urlparse(plain["url"]).scheme != "https":
            audit.add("soon", "http:// does not redirect to https://", f"http://{host}/ stayed on http.",
                      "Visitors who type the address without https stay on an unencrypted page.",
                      "Redirect every http:// request to the https:// version of the same URL.")
    if page["ms"] > 3000:
        audit.add("soon", "Slow first response", f"The home page took {page['ms']} ms to arrive.",
                  "Slow pages lose visitors, and an Autoscale deployment may be waking up from zero.",
                  "The home page takes more than 3 seconds to respond. Find what the server does before sending the first byte (database calls, external APIs, cold start) and make that path fast.")

    # Security headers and cookies
    h = page["headers"]
    missing = [name for name, ok in (
        ("Strict-Transport-Security", "strict-transport-security" in h),
        ("Content-Security-Policy", "content-security-policy" in h),
        ("X-Content-Type-Options", "x-content-type-options" in h),
        ("X-Frame-Options or CSP frame-ancestors", "x-frame-options" in h or "frame-ancestors" in h.get("content-security-policy", "")),
        ("Referrer-Policy", "referrer-policy" in h)) if not ok]
    if missing:
        audit.add("soon", "Security headers missing", "Missing: " + ", ".join(missing) + ".",
                  "These headers block common attacks such as clickjacking and script injection.",
                  "Add security headers to every response: Strict-Transport-Security, a Content-Security-Policy that allows my own scripts and the services I use, X-Content-Type-Options: nosniff, frame-ancestors 'none' (or X-Frame-Options: DENY) and Referrer-Policy: strict-origin-when-cross-origin. Test that the app still works after adding them.")
    else:
        audit.add("ok", "Security headers present", "HSTS, CSP, nosniff, frame protection and Referrer-Policy are set.")
    if "x-powered-by" in h:
        audit.add("nice", "Server technology advertised", f"X-Powered-By: {h['x-powered-by']}.",
                  "It tells attackers what to look for. Harmless on its own.",
                  "Remove the X-Powered-By header from server responses.")
    for c in page["cookies"]:
        name = c.split("=", 1)[0]
        flags = c.lower()
        lacking = [f for f, ok in (("Secure", "secure" in flags), ("HttpOnly", "httponly" in flags), ("SameSite", "samesite" in flags)) if not ok]
        if lacking:
            audit.add("soon", f"Cookie '{name}' is missing flags", "Missing: " + ", ".join(lacking) + ".",
                      "Session cookies without these flags are easier to steal or misuse.",
                      f"Set the cookie '{name}' with Secure, HttpOnly and SameSite=Lax (or Strict).")

    # Page content
    if not re.search(r"<title>\s*\S", html, re.I):
        audit.add("nice", "No page title", "The home page has no <title>.", "Search engines and browser tabs show nothing useful.",
                  "Add a descriptive <title> and meta description to every public page.")
    if re.search(r"<meta[^>]+name=[\"']robots[\"'][^>]+noindex", html, re.I):
        audit.add("nice", "The home page asks search engines not to index it", "A robots meta tag contains noindex.",
                  "Fine for an internal tool, a problem if you want visitors from Google.",
                  "Remove the noindex robots meta tag from public pages that should appear in Google.")
    if urlparse(final).scheme == "https" and re.search(r"<(?:script|img|iframe|link)[^>]+(?:src|href)=[\"']http://", html, re.I):
        audit.add("soon", "Mixed content", "The HTTPS page loads resources over plain http://.",
                  "Browsers block or flag them, and they can be tampered with.",
                  "Load every script, stylesheet, image and iframe over https://.")
    if "pk_test_" in html:
        audit.add("must", "Stripe is in test mode on the live app", "A pk_test_ key is used by the live page.",
                  "Real customers cannot pay: test mode never charges a card.",
                  "The live app uses Stripe test keys. Switch the publishable and secret keys to live keys stored in Replit Secrets, and update the webhook endpoint and secret for live mode.")

    # robots.txt, sitemap, missing pages
    base = f"{urlparse(final).scheme}://{urlparse(final).netloc}"
    robots = fetch(base + "/robots.txt")
    if "error" not in robots and robots["status"] == 200:
        txt = robots["body"].decode("utf-8", "replace")
        if re.search(r"User-agent:\s*\*\s*(?:\n(?!User-agent).*)*\nDisallow:\s*/\s*(?:\n|$)", txt, re.I):
            audit.add("nice", "robots.txt blocks all search engines", "robots.txt has 'Disallow: /' for every crawler.",
                      "Fine for an internal tool, a problem for a public product.",
                      "Allow search engines on public pages in robots.txt and block only private areas such as /admin and /api.")
        else:
            audit.add("ok", "robots.txt present", "robots.txt exists and does not block the whole site.")
    else:
        audit.add("nice", "No robots.txt", "/robots.txt is missing.", "Search engines fall back to defaults.",
                  "Add a robots.txt that allows public pages, blocks private areas and points to the sitemap.")
    sitemap = fetch(base + "/sitemap.xml")
    if "error" in sitemap or sitemap["status"] != 200:
        audit.add("nice", "No sitemap.xml", "/sitemap.xml is missing.", "Google discovers public pages more slowly.",
                  "Generate a sitemap.xml listing the public pages and reference it in robots.txt.")
    probe = fetch(f"{base}/snapforge-audit-{secrets.token_hex(4)}")
    if "error" not in probe and probe["status"] == 200:
        audit.add("nice", "Missing pages return 200 instead of 404", "A random address answered with HTTP 200.",
                  "Google can index empty or duplicate pages (soft 404).",
                  "Make unknown routes return a real 404 status with a helpful 'page not found' screen.")

    # Same-site JavaScript and source maps
    seen = set()
    scan_text(html, "the page HTML", audit, seen)
    srcs = re.findall(r"<script[^>]+src=[\"']([^\"']+)[\"']", html, re.I)
    srcs += re.findall(r"<link[^>]+rel=[\"']modulepreload[\"'][^>]+href=[\"']([^\"']+)[\"']", html, re.I)
    scripts = []
    for s in srcs:
        u = urljoin(final, s)
        if urlparse(u).hostname == host and u not in scripts:
            scripts.append(u)
    maps = []
    for u in scripts[:MAX_SCRIPTS]:
        js = fetch(u)
        if "error" in js or js["status"] != 200:
            continue
        text = js["body"].decode("utf-8", "replace")
        if "pk_test_" in text and not any(i["title"].startswith("Stripe is in test mode") for i in audit.items):
            audit.add("must", "Stripe is in test mode on the live app", f"A pk_test_ key is used in {urlparse(u).path}.",
                      "Real customers cannot pay: test mode never charges a card.",
                      "The live app uses Stripe test keys. Switch to live keys stored in Replit Secrets and update the webhook for live mode.")
        scan_text(text, urlparse(u).path, audit, seen)
        m = re.search(r"[#@]\s*sourceMappingURL=([^\s'\"]+)", text)
        if m and not m.group(1).startswith("data:"):
            mu = urljoin(u, m.group(1))
            mres = fetch(mu, limit=200)
            if "error" not in mres and mres["status"] == 200:
                maps.append(urlparse(mu).path)
    notes.append(f"{len(scripts[:MAX_SCRIPTS])} same-site script(s) scanned")
    if maps:
        audit.add("soon", "Source maps are public", f"{len(maps)} file(s), for example {maps[0]}.",
                  "Anyone can read your original source code, comments included.",
                  "Disable source maps in the production build (for Vite: build.sourcemap = false) or stop serving .map files publicly.")
    if not any(i["sev"] == "must" and "exposed" in i["title"] for i in audit.items):
        audit.add("ok", "No secret keys found in the browser code", f"Checked the page and {len(scripts[:MAX_SCRIPTS])} script file(s) for common key formats.")

    # Optional CORS check on API URLs
    for api in apis:
        r = fetch(api, headers={"Origin": "https://cors-check.example"})
        if "error" in r:
            notes.append(f"API {api}: {r['error']}")
            continue
        acao = r["headers"].get("access-control-allow-origin", "")
        acac = r["headers"].get("access-control-allow-credentials", "").lower() == "true"
        if acao == "https://cors-check.example" and acac:
            audit.add("must", "Your API accepts credentialed requests from any website", f"{urlparse(api).path} reflects a foreign Origin with Allow-Credentials: true.",
                      "Another website can call your API as a logged-in user and read the answers.",
                      "Restrict CORS to my own domain(s): never reflect the request Origin with Access-Control-Allow-Credentials: true.")
        elif acao == "*":
            audit.add("nice", "API open to every origin", f"{urlparse(api).path} sends Access-Control-Allow-Origin: *.",
                      "Fine for public data, risky if the endpoint returns anything private.",
                      "Limit Access-Control-Allow-Origin to my own domain on endpoints that return private data.")
        else:
            audit.add("ok", "API CORS is restricted", f"{urlparse(api).path} does not allow foreign origins.")
    return host, audit, notes


def report(host, audit, notes):
    sev = lambda s: [i for i in audit.items if i["sev"] == s]
    out = [f"# Free audit: {host}", "",
           f"Date: {datetime.date.today():%B %d, %Y} · Scope: what any visitor's browser can see. No access to your code, data or accounts.", "",
           "## Verdict", "",
           f"DRAFT, rewrite in one human sentence: {len(sev('must'))} must-fix, {len(sev('soon'))} fix soon, {len(sev('nice'))} nice to have.", ""]
    for key, label in (("must", "Must-fix"), ("soon", "Fix soon"), ("nice", "Nice to have")):
        if not sev(key):
            continue
        out += [f"## {label}", ""]
        for i in sev(key):
            out += [f"### {i['title']}", "", f"- **What I saw:** {i['seen']}"]
            if i["why"]:
                out.append(f"- **Why it matters:** {i['why']}")
            if i["prompt"]:
                out += ["- **Paste into Replit Agent:**", "", f"> {i['prompt']}"]
            out.append("")
    if sev("ok"):
        out += ["## Looks good", ""] + [f"- **{i['title']}:** {i['seen']}" for i in sev("ok")] + [""]
    out += ["## Not checked from outside (needs access to the code)", "",
            "- Whether one user can read or change another user's data",
            "- Database rules, backups, and separation of development and production data",
            "- Payment webhooks and edge cases (refunds, failed payments)",
            "- Login protections: rate limits, password reset, session expiry",
            "- Limits on AI and API spending", "",
            "<!-- run notes: " + " | ".join(notes) + " -->", ""]
    return "\n".join(out)


def main():
    ap = argparse.ArgumentParser(description="Passive external check for a Snapforge Lab free audit.")
    ap.add_argument("url", help="live app URL, e.g. https://my-app.replit.app")
    ap.add_argument("--api", action="append", default=[], help="an API URL the app calls, to check CORS (repeatable)")
    ap.add_argument("-o", "--out", help="write the Markdown draft to this file")
    a = ap.parse_args()
    url = a.url if "://" in a.url else "https://" + a.url
    host, audit, notes = check(url, a.api)
    md = report(host, audit, notes)
    if a.out:
        with open(a.out, "w", encoding="utf-8") as f:
            f.write(md)
        counts = {s: sum(1 for i in audit.items if i["sev"] == s) for s in ("must", "soon", "nice", "ok")}
        print(f"Draft written to {a.out}: {counts}")
    else:
        print(md)


if __name__ == "__main__":
    main()
