// Snapforge Unified Self-Serve Scanner & Prompt Generator
//
// SEPARATE from the public MCP tool `check_app` (which remains surface-only and untouched).
// Used by POST /api/scan (and POST /scan-deep) for the 1-click self-serve flow:
//   1. Runs surface + deep read-only checks within a single 45-subrequest / 25s budget.
//   2. Generates contextual paste-ready fix prompts per issue + a consolidated Master Fix Prompt
//      for Lovable, Bolt and Replit Agent, plus a concrete verification step per issue.
//   3. Builds a strict server-gated preview (at most 2 real findings without fix prompts;
//      findings #3..N redacted to severity + category only) so full findings & prompts
//      never reach the client before payment.
//
// Safety & privacy:
//   - Read-only GET requests only (plus Supabase Storage's read-only object/list endpoint, limit 1).
//   - Never logs in, never submits forms, never writes data, never stores or logs row data,
//     bucket file names, cookie values or unmasked secrets.

import {
  LIMITS,
  makeBudget,
  GuardError,
  assertPublicHost,
  assertResolvesPublic,
  safeFetch,
  readCapped,
  scanTextForSecrets,
  scriptUrlsFromHtml,
  chunkUrlsFromScript,
  scriptPriority,
  extractSupabase,
  listTablesFromOpenApi,
  tableNamesFromBundle,
  probeRls,
  bucketNamesFromBundle,
  probeBuckets,
  detectPreviewAuth,
  detectStack,
  grade,
} from "./deep-scan.js";

const ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
const MAX_SOURCEMAP_PROBES = 2;
const STRIPE_PK_TEST_RE = /\bpk_test_[0-9A-Za-z]{16,}\b/;
const PLACEHOLDER_KEY_RE = /(your[_-]?|example|placeholder|dummy|sample|xxxx|1234567890)/i;

export const CATEGORIES = {
  SECRETS: "Secrets & API Keys",
  DATA: "Database & Storage",
  AUTH: "Auth, CORS & Headers",
  LAUNCH: "Payments, Build & SEO",
};

function builderPrompts({ lovable, bolt, replit }) {
  return { lovable, bolt: bolt || lovable, replit: replit || lovable };
}

export function buildIssuePrompt(id, ev = {}) {
  switch (id) {
    case "app_down":
      return {
        category: CATEGORIES.LAUNCH,
        why: "Visitors and search engines hit a dead or error page instead of your product.",
        verify: "Open your production URL in an incognito window and confirm it loads with HTTP 200 in under 3 seconds.",
        prompts: builderPrompts({
          replit: `My deployed app at ${ev.url || "production"} ${ev.status ? `returns HTTP ${ev.status}` : "is not reachable"}. Check the deployment logs, verify the start command binds to 0.0.0.0 on process.env.PORT, confirm all required Replit Secrets are present in the Deployment environment, and tell me the exact fix to get HTTP 200 live.`,
          lovable: `My live app at ${ev.url || "production"} ${ev.status ? `returns HTTP ${ev.status}` : "is not loading"}. Inspect the latest publish/build output, custom domain DNS settings, and runtime startup errors, then give me the exact fix so the homepage responds with HTTP 200.`,
          bolt: `My deployed app at ${ev.url || "production"} ${ev.status ? `returns HTTP ${ev.status}` : "is not reachable"}. Check the Netlify/Vercel deploy logs, build output directory, and environment variables, then show the exact fix to restore HTTP 200.`,
        }),
      };

    case "supabase_rls_open": {
      const t = ev.table || "table";
      const base = `Row Level Security is off or too permissive on the Supabase table public."${t}", allowing anyone with the public anon key to read rows without logging in. Write a SQL migration that:\n1. Runs ALTER TABLE public."${t}" ENABLE ROW LEVEL SECURITY;\n2. Revokes any overly broad anon SELECT policy unless the table is intentionally public;\n3. Adds least-privilege policies tied to auth.uid() (inspect the schema of "${t}" first to use the exact user/owner column, e.g. user_id or id) for SELECT, INSERT, UPDATE and DELETE so authenticated users only access their own records;\n4. Audits every other table in the public schema for the same gap without breaking existing logged-in screens.`;
      return {
        category: CATEGORIES.DATA,
        why: ev.sensitive
          ? `Anyone can query "${t}" directly from Browser DevTools using your public Supabase URL and anon key—exposing private customer or account records.`
          : `Anyone can read rows from "${t}" without signing in. Unless "${t}" is public catalog content, lock it down with Row Level Security.`,
        verify: `Re-scan your app from this report (or call GET /rest/v1/${t}?select=*&limit=1 with only the anon key) and confirm it returns [] or 401.`,
        prompts: builderPrompts({
          lovable: base,
          bolt: `${base}\nSave this as a new Supabase migration file and apply it.`,
          replit: `${base}\nGive me the exact SQL statements to run in the Supabase SQL Editor and verify the frontend queries still work when signed in.`,
        }),
      };
    }

    case "supabase_service_role":
    case "supabase_secret_key": {
      const f = ev.file || "the frontend bundle";
      return {
        category: CATEGORIES.SECRETS,
        why: "A privileged Supabase secret bypasses every Row Level Security policy—anyone who copies it from DevTools has full read/write/delete admin access to your database.",
        verify: "Rotate the secret key in Supabase Dashboard → Project Settings → API, redeploy, and re-scan to confirm zero secret keys remain in your JS bundles.",
        prompts: builderPrompts({
          lovable: `A privileged Supabase key (${ev.masked || "service_role / sb_secret"}) is bundled into client code (${f}). Remove every reference to service_role or sb_secret keys from src/ and from any VITE_* environment variables. Move all privileged operations into a Supabase Edge Function that reads SUPABASE_SERVICE_ROLE_KEY from server secrets and verifies the caller's JWT first. List every file changed so I can rotate the leaked key immediately after redeploying.`,
          bolt: `A privileged Supabase key (${ev.masked || "service_role / sb_secret"}) is exposed in ${f}. Strip it from all browser code and VITE_*/NEXT_PUBLIC_* env vars, move privileged database operations into a Supabase Edge Function or backend route using server-only secrets, and list the changed files so I can rotate the key in Supabase right away.`,
          replit: `A privileged Supabase key (${ev.masked || "service_role / sb_secret"}) is shipped to the browser in ${f}. Remove it from all frontend files and VITE_* env vars, keep only the anon key on the client, and move privileged Supabase calls to an Express/server route reading SUPABASE_SERVICE_ROLE_KEY from Replit Secrets. Show every file changed so I can rotate the key in Supabase.`,
        }),
      };
    }

    case "storage_bucket_public": {
      const b = ev.bucket || "bucket";
      return {
        category: CATEGORIES.DATA,
        why: `A visitor can enumerate files stored in "${b}" without logging in, making user uploads discoverable.`,
        verify: `Re-scan your app after updating Storage policies and confirm "${b}" no longer allows anonymous file listing.`,
        prompts: builderPrompts({
          lovable: `The Supabase Storage bucket "${b}" allows anonymous file listing. Update Storage configuration and storage.objects RLS policies so:\n1. If "${b}" holds private user files (invoices, avatars, documents), set public = false, scope access to (storage.foldername(name))[1] = auth.uid()::text, and serve files with createSignedUrl();\n2. If "${b}" intentionally serves public assets by URL, drop the broad SELECT policy that lets the anon role list all objects in "${b}". Show the exact SQL migration and any frontend upload/download updates.`,
          bolt: `Lock down the Supabase Storage bucket "${b}" so anonymous callers cannot list its files. Add a Supabase SQL migration updating storage.buckets and storage.objects policies for "${b}" (private + signed URLs for user uploads, or non-listable if public assets), and update any client storage calls if needed.`,
          replit: `The Supabase Storage bucket "${b}" lets anyone list its files without logging in. Give me the exact SQL for Supabase SQL Editor to make "${b}" private (or remove anonymous list permission on storage.objects) and update my app code to use signed URLs where appropriate.`,
        }),
      };
    }

    case "stripe_secret":
    case "stripe_test_secret":
    case "llm_key":
    case "aws_key":
    case "github_token":
    case "hardcoded_password": {
      const f = ev.file || "your frontend JavaScript";
      const label = ev.label || "secret credential";
      return {
        category: CATEGORIES.SECRETS,
        why: `Anyone opening Browser DevTools can copy ${label.toLowerCase()} (${ev.masked || "masked"}) from ${f} and spend your quota, move money, or access backend resources.`,
        verify: `Rotate/revoke the credential in the provider dashboard, redeploy, and re-scan to confirm ${f} is clean.`,
        prompts: builderPrompts({
          replit: `CRITICAL: A ${label} (${ev.masked || "secret"}) is exposed in the browser bundle (${f}).\n1. Find every place this credential or VITE_*/NEXT_PUBLIC_* variable is referenced in frontend code and remove it completely.\n2. Create a server-side API endpoint (with auth + per-user rate limiting) that reads the secret from Replit Secrets (process.env) on the server only.\n3. Update the frontend to call that server endpoint instead.\nShow me the exact files changed so I can rotate the compromised credential immediately.`,
          lovable: `CRITICAL: A ${label} (${ev.masked || "secret"}) is exposed in client code (${f}).\n1. Remove this credential from all frontend files and any VITE_* variables.\n2. Create a Supabase Edge Function that reads the secret from Supabase Edge Function Secrets, checks the authenticated user (if applicable), and performs the API call server-side.\n3. Update the React client to invoke that Edge Function.\nList every modified file so I can rotate the key right after publishing.`,
          bolt: `CRITICAL: A ${label} (${ev.masked || "secret"}) is bundled in ${f}.\n1. Remove it from all client code and VITE_*/NEXT_PUBLIC_* env variables.\n2. Move the external API call into a server route / Supabase Edge Function / serverless function reading a server-only secret.\n3. Update the client to call that server endpoint.\nShow the exact diff so I can rotate the leaked secret immediately.`,
        }),
      };
    }

    case "google_api_key": {
      const f = ev.file || "your frontend JavaScript";
      return {
        category: CATEGORIES.SECRETS,
        why: "Unrestricted Google API keys in browser code can be abused on third-party sites and run up unexpected Google Cloud charges.",
        verify: "In Google Cloud Console → Credentials, verify HTTP referrer restrictions allow only your production domain and API restrictions allow only the exact APIs used.",
        prompts: builderPrompts({
          replit: `Check how the Google API key (${ev.masked || "AIza…"}) in ${f} is used. If it calls server-side APIs (Gemini, Places Web Service, Geocoding without Maps JS, Cloud Vision), move those calls to an Express server route using a server-only Replit Secret. If it is strictly for Maps JS in the browser, keep it client-side and list the exact HTTP referrer and API restrictions I must enable in Google Cloud Console.`,
          lovable: `Audit how the Google API key (${ev.masked || "AIza…"}) in ${f} is used. If it calls Gemini or backend Google APIs, move those calls into a Supabase Edge Function with a server-only secret. If it is only for Maps JS, tell me the exact HTTP referrer and API restrictions to set in Google Cloud Console.`,
          bolt: `Check every call using the Google API key (${ev.masked || "AIza…"}) in ${f}. Move any Gemini or backend Google API usage into a server function with a server-only key, or list the exact domain + API restrictions to lock down in Google Cloud Console.`,
        }),
      };
    }

    case "stripe_test_mode_live":
      return {
        category: CATEGORIES.LAUNCH,
        why: "Your live production app is initialized with a Stripe test publishable key (pk_test_…), which means real customers cannot pay you with real cards.",
        verify: "Redeploy with live keys (pk_live_… on client, sk_live_… + live webhook secret on server) and run a real $1 checkout + refund test.",
        prompts: builderPrompts({
          replit: `My live production app is still shipping a Stripe test key (pk_test_… in ${ev.file || "production"}). Check how Stripe publishable and secret keys are loaded across dev vs production: read the publishable key from an environment variable (not hard-coded), ensure production Deployment secrets use pk_live_…, sk_live_… and the live STRIPE_WEBHOOK_SECRET, and verify webhook signature checking uses express.raw({ type: "application/json" }). Show me what to change and which Deployment secrets to set.`,
          lovable: `My published app is still using a Stripe test key (pk_test_… in ${ev.file || "production"}). Replace any hard-coded pk_test_ key with clean config, ensure my Supabase Edge Functions read the live STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET from secrets, and give me a checklist to switch Stripe Checkout + Webhooks cleanly to live mode.`,
          bolt: `My deployed app ships a Stripe test key (pk_test_… in ${ev.file || "production"}). Remove any hard-coded pk_test_ key, wire publishable/secret/webhook keys cleanly from production environment variables, and list the exact env vars I need to set for live payments.`,
        }),
      };

    case "cors_reflected_credentials":
      return {
        category: CATEGORIES.AUTH,
        why: "Reflecting arbitrary Origin headers alongside Access-Control-Allow-Credentials: true lets a malicious website make authenticated requests as your logged-in users and read private responses.",
        verify: `Run curl -i -H "Origin: https://evil.example" ${ev.url || "your URL"} and confirm Access-Control-Allow-Origin is NOT https://evil.example.`,
        prompts: builderPrompts({
          replit: `SECURITY CRITICAL: My server reflects foreign Origin headers with Access-Control-Allow-Credentials: true. Replace the CORS configuration with an explicit allowlist containing ONLY my exact production domain(s) (and http://localhost:<port> when NODE_ENV !== "production"). Never use origin: true with credentials: true. Show the exact server code change.`,
          lovable: `SECURITY CRITICAL: My endpoint reflects arbitrary Origin headers with Access-Control-Allow-Credentials: true. Update my CORS middleware / Edge Functions to check the request Origin against a strict allowlist of only my production domain(s) before setting Access-Control-Allow-Origin. Show the exact code change.`,
          bolt: `SECURITY CRITICAL: My server reflects arbitrary Origin headers with Access-Control-Allow-Credentials: true. Lock CORS down to a strict allowlist of my production domain(s) only (never origin: true with credentials). Show the exact change.`,
        }),
      };

    case "open_cors":
      return {
        category: CATEGORIES.AUTH,
        why: ev.credentials
          ? "Wildcard CORS combined with credentials headers signals a misconfigured CORS policy on sensitive routes."
          : "Access-Control-Allow-Origin: * allows any website to read responses from your origin.",
        verify: `Run curl -sI -H "Origin: https://evil.example" ${ev.url || "your URL"} and confirm Access-Control-Allow-Origin only allows your own domain.`,
        prompts: builderPrompts({
          replit: `My server responds with Access-Control-Allow-Origin: *. Replace wildcard CORS on application/API routes with an explicit allowlist of my production domain(s) (plus localhost in development only). Show the exact Express/server CORS configuration.`,
          lovable: `My app/functions return Access-Control-Allow-Origin: *. Restrict CORS headers on private or authenticated endpoints to an explicit allowlist of my production domain(s). Show the exact change.`,
          bolt: `My app responds with Access-Control-Allow-Origin: *. Restrict CORS to an allowlist of my production domain(s) in my server/functions or hosting headers config. Show the exact change.`,
        }),
      };

    case "auth_redirect_preview":
    case "auth_redirect_preview_weak": {
      const h = ev.host || "a preview/localhost URL";
      return {
        category: CATEGORIES.AUTH,
        why: "Magic links, OAuth callbacks, and password-reset emails can send real users to a dead localhost URL or an unprotected preview deployment.",
        verify: "Trigger a password-reset or magic-link email in production and verify the link points to your live production domain.",
        prompts: builderPrompts({
          lovable: `My production bundle references ${h} ${id === "auth_redirect_preview" ? "inside auth redirect configuration" : "in client code"}. Replace any hard-coded preview/localhost redirectTo or emailRedirectTo URLs with window.location.origin (or my production URL env var), and tell me the exact Site URL + Redirect URLs allowlist to set in Supabase Dashboard → Authentication → URL Configuration.`,
          bolt: `My production build references ${h} ${id === "auth_redirect_preview" ? "in auth redirect settings" : "in client code"}. Update all OAuth, magic-link, and resetPasswordForEmail redirect URLs to use my production origin dynamically, and list the exact Supabase/Auth redirect settings to update.`,
          replit: `My production build references ${h} ${id === "auth_redirect_preview" ? "in authentication redirect code" : "in client code"}. Replace hard-coded dev/preview callback and redirect URLs (.replit.dev, .repl.co, localhost) with my production domain via environment config, and list any OAuth provider / Supabase redirect settings I need to update.`,
        }),
      };
    }

    case "missing_security_headers": {
      const missing = (ev.missing && ev.missing.length ? ev.missing : ["Strict-Transport-Security", "Content-Security-Policy", "X-Frame-Options", "X-Content-Type-Options", "Referrer-Policy"]).join(", ");
      return {
        category: CATEGORIES.AUTH,
        why: "Without browser security headers, your app is exposed to clickjacking (iframe overlays), MIME sniffing, and cross-site script injection.",
        verify: "Re-scan your app after deploying and confirm Missing security headers disappears.",
        prompts: builderPrompts({
          replit: `Add the missing HTTP security headers (${missing}) to every response my server sends:\n- Strict-Transport-Security: max-age=63072000; includeSubDomains\n- X-Content-Type-Options: nosniff\n- X-Frame-Options: DENY\n- Referrer-Policy: strict-origin-when-cross-origin\n- A Content-Security-Policy tailored to the exact external domains my app loads (inspect index.html and my API/Supabase/Stripe/font domains first so nothing breaks).\nShow me the exact middleware change.`,
          lovable: `My live app is missing these HTTP security headers: ${missing}. Add a hosting headers configuration (e.g. public/_headers or vercel.json / netlify.toml depending on how this project deploys) setting Strict-Transport-Security, X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy: strict-origin-when-cross-origin, and a Content-Security-Policy that permits my app's own scripts, styles, fonts, and Supabase/Stripe endpoints without breaking runtime behavior.`,
          bolt: `Add the missing HTTP security headers (${missing}) via public/_headers, netlify.toml, or vercel.json: Strict-Transport-Security, X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy: strict-origin-when-cross-origin, and a non-breaking Content-Security-Policy allowing my app's Supabase/API/CDN origins. Show the exact file to add or update.`,
        }),
      };
    }

    case "insecure_cookies": {
      const detail = ev.cookies || "session cookies";
      return {
        category: CATEGORIES.AUTH,
        why: "Cookies set without HttpOnly, Secure, and SameSite flags are vulnerable to XSS theft, plain-HTTP interception, or cross-site request forgery.",
        verify: "Inspect the Set-Cookie header in DevTools → Network on your homepage/login response and confirm Secure, HttpOnly, and SameSite=Lax (or Strict) are present.",
        prompts: builderPrompts({
          replit: `My server sets cookie(s) missing security attributes (${detail}). Update my session/cookie configuration (e.g. express-session / cookie-parser / auth cookies) in production so every session cookie sets httpOnly: true, secure: true (with app.set("trust proxy", 1) behind Replit's proxy!), and sameSite: "lax". Show the exact server change.`,
          lovable: `Cookies returned by my app are missing security flags (${detail}). Update any custom cookie or auth session configuration so cookies always include Secure, HttpOnly, and SameSite=Lax in production.`,
          bolt: `Cookies set by my app are missing security attributes (${detail}). Update server/function cookie options to set httpOnly: true, secure: true, and sameSite: "lax" in production. Show the exact change.`,
        }),
      };
    }

    case "public_source_maps": {
      const mapPath = ev.map || ".map files";
      return {
        category: CATEGORIES.LAUNCH,
        why: "Public JavaScript source maps let anyone reconstruct your full unminified TypeScript/React source code, internal comments, and route logic.",
        verify: `Open ${mapPath} in your browser after redeploying and confirm it returns 404 (not JSON).`,
        prompts: builderPrompts({
          replit: `My production build publicly serves JavaScript source maps (e.g. ${mapPath}). Update vite.config / build config so production builds set build.sourcemap = false (or block *.map files from static serving in Express), then rebuild. Show the exact config change.`,
          lovable: `My published app exposes JavaScript source maps (${mapPath}) publicly. Update vite.config.ts so build.sourcemap is false in production builds, ensuring *.map files are not shipped publicly.`,
          bolt: `My production deployment serves public source maps (${mapPath}). Set build.sourcemap = false in vite.config / next.config for production builds so original source files aren't exposed.`,
        }),
      };
    }

    case "mixed_content":
      return {
        category: CATEGORIES.AUTH,
        why: "Loading http:// scripts, stylesheets, or images inside an https:// page triggers browser security warnings or blocked assets.",
        verify: "Open Browser DevTools → Console on your homepage and confirm zero Mixed Content warnings.",
        prompts: builderPrompts({
          replit: "My HTTPS homepage references plain http:// asset URLs (scripts, stylesheets, iframes, or images). Find every http:// asset URL in index.html and components and upgrade them to https://.",
          lovable: "My HTTPS homepage loads one or more resources over plain http://. Search the codebase for http:// in src/ and index.html and switch all asset/resource URLs to https://.",
          bolt: "My HTTPS homepage contains plain http:// resource URLs. Upgrade all http:// script, link, img, and iframe URLs in index.html and components to https://.",
        }),
      };

    case "sitemap_returns_html":
      return {
        category: CATEGORIES.LAUNCH,
        why: "Your SPA catch-all route serves index.html at /sitemap.xml, so Google Search Console rejects your sitemap.",
        verify: "Visit /sitemap.xml in your browser and confirm it renders valid XML with Content-Type: application/xml.",
        prompts: builderPrompts({
          replit: "My /sitemap.xml currently returns my app's HTML instead of XML because the SPA catch-all route swallows it. Serve a valid static or generated XML sitemap at /sitemap.xml with Content-Type: application/xml BEFORE the catch-all route, and reference it in /robots.txt. Show the exact change.",
          lovable: "My /sitemap.xml serves the SPA HTML instead of XML. Add a valid public/sitemap.xml listing my public canonical URLs and ensure hosting serves static files before the SPA fallback, plus reference it in public/robots.txt.",
          bolt: "My /sitemap.xml returns SPA HTML instead of XML. Create public/sitemap.xml with valid XML + public/robots.txt pointing to it, and make sure rewrite rules don't override static files.",
        }),
      };

    case "robots_blocks_all":
      return {
        category: CATEGORIES.LAUNCH,
        why: "Your /robots.txt has Disallow: / for all crawlers, preventing Google from indexing your app.",
        verify: "Open /robots.txt and confirm public routes are allowed (`Allow: /`) while only private paths (like `/api` or `/admin`) are disallowed.",
        prompts: builderPrompts({
          replit: "My /robots.txt currently blocks all search engines with Disallow: /. Update robots.txt to allow public pages, disallow only private/admin/API routes, and point Sitemap: to my production /sitemap.xml.",
          lovable: "My public/robots.txt blocks all search crawlers with Disallow: /. Update it to allow crawling of public pages and link to /sitemap.xml.",
          bolt: "My robots.txt has Disallow: / for User-agent: *. Update public/robots.txt so search engines can index public pages and find /sitemap.xml.",
        }),
      };

    case "homepage_noindex":
      return {
        category: CATEGORIES.LAUNCH,
        why: "A noindex meta tag on your homepage tells Google to drop your site from search results completely.",
        verify: "View page source on your homepage and confirm `<meta name=\"robots\">` allows indexing (`index, follow`).",
        prompts: builderPrompts({
          replit: "My homepage HTML contains a `<meta name=\"robots\" content=\"...noindex...\">` tag. Remove `noindex` from public marketing pages so Google can index my site.",
          lovable: "My index.html or SEO head component sets `noindex` on the homepage. Change public pages to `index, follow`.",
          bolt: "My homepage includes a `noindex` robots meta tag. Remove `noindex` on public pages so search engines can index the site.",
        }),
      };

    case "missing_title_meta":
      return {
        category: CATEGORIES.LAUNCH,
        why: "Without a descriptive <title> and <meta name=\"description\">, search results and social shares look unfinished and hurt click-through rates.",
        verify: "View page source (Ctrl+U) on your homepage and confirm both `<title>` (≤ 60 chars) and `<meta name=\"description\">` (140–160 chars) are present.",
        prompts: builderPrompts({
          replit: "My homepage is missing a complete `<title>` and/or `<meta name=\"description\">` in initial HTML. Add a clear, specific `<title>` (under 60 chars), `<meta name=\"description\">` (140–160 chars), and matching Open Graph tags in index.html.",
          lovable: "My homepage is missing a clear `<title>` or `<meta name=\"description\">` in index.html. Add a concise `<title>` (≤ 60 chars), `<meta name=\"description\">` (140–160 chars), and Open Graph tags in index.html.",
          bolt: "Add a clear `<title>` (≤ 60 chars), `<meta name=\"description\">` (140–160 chars), and Open Graph metadata to index.html so search engines and link previews display properly.",
        }),
      };

    case "dev_banner_in_prod":
      return {
        category: CATEGORIES.LAUNCH,
        why: "Shipping builder dev banners or injected dev scripts in production slows page load and signals an unfinished prototype to paying customers.",
        verify: "View page source on your live URL and confirm no builder dev banner or dev script tags remain.",
        prompts: builderPrompts({
          replit: "My live production HTML still includes the Replit dev banner / dev script (`replit-dev-banner` / `replit.com/public/js`). Ensure my production Deployment runs a clean production build (`NODE_ENV=production`) and remove any hard-coded dev banner script from index.html.",
          lovable: "My published site still includes dev-only Lovable badge/tagger attributes or scripts (`lovable-tagger` / `Edit with Lovable`). Ensure dev-only plugins only run in development mode (`mode === 'development'` in vite.config.ts) and rebuild.",
          bolt: "My production site still includes dev-only builder scripts or banners. Strip dev-only scripts/plugins from the production build in vite.config and index.html.",
        }),
      };

    default:
      return {
        category: CATEGORIES.SECRETS,
        why: "This issue exposes sensitive configuration or weakens your production security posture.",
        verify: "Deploy the fix and run a verification re-scan from your report to confirm the issue is resolved.",
        prompts: builderPrompts({
          lovable: "Remove this exposed secret or insecure setting from client code, move privileged logic into a server/edge function using server-only secrets, and rotate any exposed key.",
          bolt: "Remove this exposed secret or insecure configuration from client code, move privileged logic server-side, and rotate any exposed key.",
          replit: "Remove this exposed secret or insecure configuration from frontend code, move privileged calls to Express server routes using Replit Secrets, and rotate any exposed key.",
        }),
      };
  }
}

export function generateMasterPrompts(url, findings) {
  if (!findings || !findings.length) {
    const clean = `No external launch or security issues were detected on ${url}. Keep Row Level Security enabled on every new table and never put secret keys in VITE_* or NEXT_PUBLIC_* client variables.`;
    return { lovable: clean, bolt: clean, replit: clean };
  }
  const builders = ["lovable", "bolt", "replit"];
  const out = {};
  const builderLabel = { lovable: "Lovable", bolt: "Bolt", replit: "Replit Agent" };

  for (const b of builders) {
    const lines = [
      `I ran a production security & launch audit on my live app (${url}). Fix ALL ${findings.length} issue${findings.length > 1 ? "s" : ""} below in priority order without breaking any existing user-facing feature or layout:`,
      "",
    ];
    findings.forEach((f, idx) => {
      const p = (f.fix_prompts && f.fix_prompts[b]) || f.fix_prompt || "";
      lines.push(`### ${idx + 1}. [${f.severity.toUpperCase()}] ${f.title}`);
      lines.push(`Context: ${f.detail}`);
      lines.push(`Action: ${p}`);
      lines.push("");
    });
    lines.push("### Final check before finishing");
    lines.push(`1. Do not break any working login, payment, or database screen for legitimate signed-in users.`);
    lines.push(`2. List every modified file, any SQL migration created, and any secret/key I must rotate manually in my dashboard (${builderLabel[b]} / Supabase / Stripe).`);
    out[b] = lines.join("\n");
  }
  return out;
}

function attachPromptMetadata(finding, stack) {
  const meta = buildIssuePrompt(finding.id, { ...(finding.evidence || {}), label: finding.label, sensitive: finding.sensitive, credentials: finding.credentials });
  const chosenStack = ["lovable", "bolt", "replit"].includes(stack) ? stack : "replit";
  return {
    id: finding.id,
    severity: finding.severity,
    category: meta.category,
    title: finding.title,
    detail: finding.detail,
    why_it_matters: meta.why,
    verify_step: meta.verify,
    evidence: finding.evidence || {},
    fix_prompts: meta.prompts,
    fix_prompt: meta.prompts[chosenStack] || meta.prompts.replit,
  };
}

function getSetCookies(headers) {
  if (!headers) return [];
  if (typeof headers.getSetCookie === "function") {
    try {
      const arr = headers.getSetCookie();
      if (Array.isArray(arr) && arr.length) return arr;
    } catch {}
  }
  const single = headers.get("set-cookie");
  return single ? [single] : [];
}

function inspectCookies(headers) {
  const rawCookies = getSetCookies(headers);
  const weak = [];
  for (const raw of rawCookies) {
    const name = (raw.split("=", 1)[0] || "").trim();
    if (!name || /^(__cf_bm|_cfuvid|cf_clearance)$/i.test(name)) continue; // infra cookies, not app session cookies
    const low = raw.toLowerCase();
    const missing = [];
    if (!/\bsecure\b/.test(low)) missing.push("Secure");
    if (!/\bhttponly\b/.test(low)) missing.push("HttpOnly");
    if (!/\bsamesite\s*=/.test(low)) missing.push("SameSite");
    if (missing.length) weak.push(`${name} (missing ${missing.join(", ")})`);
  }
  return weak;
}

async function fetchHtmlWithRedirects(startUrl, budget, fetchImpl) {
  let url = startUrl;
  const t0 = Date.now();
  for (let i = 0; i <= LIMITS.MAX_REDIRECTS; i++) {
    const res = await safeFetch(url, budget, fetchImpl, { headers: { accept: "text/html,*/*" } });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      try { await res.body?.cancel(); } catch {}
      url = new URL(res.headers.get("location"), url).href;
      assertPublicHost(url);
      continue;
    }
    const html = await readCapped(res, LIMITS.MAX_HTML_BYTES);
    return { res, finalUrl: url, html, responseMs: Date.now() - t0 };
  }
  throw new Error("too-many-redirects");
}

async function fetchScriptBody(u, budget, fetchImpl) {
  try {
    const r = await safeFetch(u, budget, fetchImpl, { headers: { accept: "*/*" } });
    if (r.status !== 200) { try { await r.body?.cancel(); } catch {} return null; }
    const ct = (r.headers.get("content-type") || "").toLowerCase();
    if (ct.includes("text/html")) { try { await r.body?.cancel(); } catch {} return null; }
    return await readCapped(r, LIMITS.MAX_SCRIPT_BYTES);
  } catch {
    return null;
  }
}

/**
 * Runs the unified surface + deep read-only scan within a single 45-subrequest / 25s budget.
 */
export async function fullScan(rawUrl, opts = {}) {
  const fetchImpl = opts.fetchImpl || ((...a) => fetch(...a));
  const budget = makeBudget(LIMITS, opts.now);
  let input = String(rawUrl || "").trim();
  if (input && !/^https?:\/\//i.test(input)) input = "https://" + input;
  const target = assertPublicHost(input);
  await assertResolvesPublic(target.hostname, fetchImpl, budget);

  const rawFindings = [];
  const checks = {
    surface: "not_run",
    secrets: "not_run",
    supabase_rls: "not_run",
    auth_redirect: "not_run",
    storage_buckets: "not_run",
  };
  const meta = {
    scriptsScanned: 0,
    tablesProbed: 0,
    bucketsProbed: 0,
    supabaseDetected: false,
    responseMs: null,
  };

  let page;
  try {
    page = await fetchHtmlWithRedirects(target.href, budget, fetchImpl);
  } catch (e) {
    if (e instanceof GuardError) throw e;
    const down = attachPromptMetadata({
      id: "app_down",
      severity: "critical",
      title: "App is not reachable in production",
      detail: `We could not connect to ${target.href}. Visitors see a connection error.`,
      evidence: { url: target.href },
    }, "unknown");
    return finalizeFullReport({
      url: target.href,
      reachable: false,
      httpStatus: null,
      stack: "unknown",
      findings: [down],
      checks,
      meta,
      budget,
    });
  }

  meta.responseMs = page.responseMs;
  const finalUrl = page.finalUrl;
  const parsedFinal = new URL(finalUrl);
  const origin = parsedFinal.origin;
  const host = parsedFinal.hostname.toLowerCase();
  let stack = detectStack(page.html, host);
  if (stack === "unknown" && (page.res.headers.get("server") || "").toLowerCase().includes("replit")) {
    stack = "replit";
  }

  if (page.res.status >= 400) {
    const errFinding = attachPromptMetadata({
      id: "app_down",
      severity: "critical",
      title: `App returned HTTP ${page.res.status}`,
      detail: `Your live homepage at ${finalUrl} answered with HTTP ${page.res.status}, so visitors see an error screen.`,
      evidence: { url: finalUrl, status: page.res.status },
    }, stack);
    return finalizeFullReport({
      url: finalUrl,
      reachable: true,
      httpStatus: page.res.status,
      stack,
      findings: [errFinding],
      checks,
      meta,
      budget,
    });
  }

  // ---- 1. Zero-subrequest surface & HTML hygiene checks
  const headers = page.res.headers;
  const csp = headers.get("content-security-policy") || "";
  const wantHeaders = [
    ["Strict-Transport-Security", Boolean(headers.get("strict-transport-security"))],
    ["Content-Security-Policy", Boolean(csp)],
    ["X-Content-Type-Options", Boolean(headers.get("x-content-type-options"))],
    ["X-Frame-Options", Boolean(headers.get("x-frame-options") || /frame-ancestors/i.test(csp))],
    ["Referrer-Policy", Boolean(headers.get("referrer-policy"))],
  ];
  const missingHeaders = wantHeaders.filter(([, ok]) => !ok).map(([name]) => name);
  if (missingHeaders.length) {
    rawFindings.push({
      id: "missing_security_headers",
      severity: "medium",
      title: `Missing ${missingHeaders.length} HTTP security header${missingHeaders.length > 1 ? "s" : ""}`,
      detail: `Not set on ${host}: ${missingHeaders.join(", ")}.`,
      evidence: { missing: missingHeaders },
    });
  }

  const weakCookies = inspectCookies(headers);
  if (weakCookies.length) {
    rawFindings.push({
      id: "insecure_cookies",
      severity: "medium",
      title: "Cookies set without full security flags",
      detail: `Cookies missing flags on ${host}: ${weakCookies.join("; ")}.`,
      evidence: { cookies: weakCookies.join("; ") },
    });
  }

  const titleMatch = (page.html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]?.trim();
  const hasDesc = /<meta\b[^>]*name=["']description["'][^>]*content=["'][^"']+["']/i.test(page.html) ||
    /<meta\b[^>]*content=["'][^"']+["'][^>]*name=["']description["']/i.test(page.html);
  if (!titleMatch || !hasDesc) {
    rawFindings.push({
      id: "missing_title_meta",
      severity: "low",
      title: "Missing page title or meta description",
      detail: `Homepage title is ${titleMatch ? `"${titleMatch.slice(0, 60)}"` : "missing"}; meta description is ${hasDesc ? "present" : "missing"}.`,
      evidence: { titlePresent: Boolean(titleMatch), descriptionPresent: hasDesc },
    });
  }

  if (/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(page.html)) {
    rawFindings.push({
      id: "homepage_noindex",
      severity: "low",
      title: "Homepage asks search engines not to index it (noindex)",
      detail: "A robots meta tag with noindex is set on the homepage, hiding your app from Google.",
      evidence: {},
    });
  }

  if (parsedFinal.protocol === "https:" && /<(?:script|iframe|link|img)\b[^>]+\b(?:src|href)\s*=\s*["']http:\/\//i.test(page.html)) {
    rawFindings.push({
      id: "mixed_content",
      severity: "medium",
      title: "HTTPS page loads insecure http:// resources",
      detail: "One or more scripts, stylesheets, images, or iframes use plain http:// on an HTTPS page.",
      evidence: {},
    });
  }

  if (/edit with lovable|data-lovable|replit-dev-banner|__replco|replit\.com\/public\/js\/replit-dev/i.test(page.html)) {
    rawFindings.push({
      id: "dev_banner_in_prod",
      severity: "low",
      title: "Builder dev banner or dev script left in production",
      detail: "Development-only builder UI or scripts are still shipping on your live domain.",
      evidence: {},
    });
  }

  // ---- 2. Surface probes (CORS, sitemap.xml, robots.txt — 3 subrequests)
  await Promise.all([
    (async () => {
      if (!budget.canFetch()) return;
      try {
        const c = await safeFetch(finalUrl, budget, fetchImpl, { headers: { origin: "https://evil.example" } });
        const acao = (c.headers.get("access-control-allow-origin") || "").trim();
        const acac = (c.headers.get("access-control-allow-credentials") || "").toLowerCase() === "true";
        try { await c.body?.cancel(); } catch {}
        if (acao === "https://evil.example" && acac) {
          rawFindings.push({
            id: "cors_reflected_credentials",
            severity: "critical",
            title: "CORS reflects arbitrary origins with credentials enabled",
            detail: `${host} echoed Origin: https://evil.example with Access-Control-Allow-Credentials: true.`,
            credentials: true,
            evidence: { url: finalUrl },
          });
        } else if (acao === "*") {
          rawFindings.push({
            id: "open_cors",
            severity: acac ? "high" : "low",
            title: "CORS open to any website (*)",
            detail: `Access-Control-Allow-Origin is *${acac ? " alongside Allow-Credentials: true" : ""}.`,
            credentials: acac,
            evidence: { url: finalUrl },
          });
        }
      } catch {}
    })(),
    (async () => {
      if (!budget.canFetch()) return;
      try {
        const sm = await safeFetch(`${origin}/sitemap.xml`, budget, fetchImpl, { headers: { accept: "application/xml,text/xml,*/*" } });
        const ct = (sm.headers.get("content-type") || "").toLowerCase();
        const head = (await readCapped(sm, 400)).toLowerCase();
        if (sm.status === 200 && !ct.includes("xml") && (head.includes("<!doctype html") || head.includes("<html"))) {
          rawFindings.push({
            id: "sitemap_returns_html",
            severity: "low",
            title: "/sitemap.xml returns HTML instead of XML",
            detail: "Your catch-all SPA route serves your app's HTML at /sitemap.xml, which search engines reject.",
            evidence: {},
          });
        }
      } catch {}
    })(),
    (async () => {
      if (!budget.canFetch()) return;
      try {
        const rb = await safeFetch(`${origin}/robots.txt`, budget, fetchImpl, { headers: { accept: "text/plain,*/*" } });
        if (rb.status === 200) {
          const txt = await readCapped(rb, 4096);
          if (/User-agent:\s*\*\s*(?:\r?\n(?!User-agent).*)*\r?\nDisallow:\s*\/\s*(?:\r?\n|$)/i.test(txt)) {
            rawFindings.push({
              id: "robots_blocks_all",
              severity: "low",
              title: "/robots.txt blocks all search engines",
              detail: "robots.txt contains 'Disallow: /' for User-agent: *, blocking Google indexing.",
              evidence: {},
            });
          }
        } else {
          try { await rb.body?.cancel(); } catch {}
        }
      } catch {}
    })(),
  ]);
  checks.surface = "done";

  // ---- 3. Same-origin JavaScript bundles + lazy chunks
  const texts = [{ text: page.html, source: "homepage HTML", url: finalUrl }];
  const fromHtml = new Set(scriptUrlsFromHtml(page.html, finalUrl));
  const queue = [...fromHtml];
  const seenScripts = new Set();
  let totalScriptBytes = 0;

  while (queue.length && seenScripts.size < LIMITS.MAX_SCRIPTS_SCANNED && totalScriptBytes < LIMITS.MAX_TOTAL_SCRIPT_BYTES) {
    queue.sort((a, b) => scriptPriority(b, fromHtml) - scriptPriority(a, fromHtml));
    const batch = [];
    while (queue.length && batch.length < 4 && seenScripts.size + batch.length < LIMITS.MAX_SCRIPTS_SCANNED) {
      const u = queue.shift();
      if (seenScripts.has(u) || batch.includes(u)) continue;
      batch.push(u);
    }
    if (!batch.length || !budget.canFetch()) break;
    batch.forEach((u) => seenScripts.add(u));
    const bodies = await Promise.all(batch.map((u) => fetchScriptBody(u, budget, fetchImpl)));
    bodies.forEach((js, i) => {
      if (!js) return;
      totalScriptBytes += js.length;
      texts.push({ text: js, source: new URL(batch[i]).pathname, url: batch[i] });
      for (const c of chunkUrlsFromScript(js, batch[i], origin)) {
        if (!seenScripts.has(c) && !queue.includes(c)) queue.push(c);
      }
    });
    if (!budget.canFetch()) break;
  }
  if (queue.some((u) => !seenScripts.has(u))) budget.markTruncated();
  meta.scriptsScanned = texts.length - 1;

  // Scan HTML + JS for secrets, pk_test_ in live app, and public source maps
  const seenSecret = new Set();
  let stripeTestReported = false;
  const candidateMaps = [];

  for (const { text, source, url: blobUrl } of texts) {
    for (const s of scanTextForSecrets(text, source)) {
      const k = s.id + s.masked;
      if (seenSecret.has(k)) continue;
      seenSecret.add(k);
      rawFindings.push({
        id: s.id,
        severity: s.severity,
        label: s.label,
        title: s.id === "google_api_key" ? "Google API key in your JavaScript (verify restrictions)" : `${s.label} exposed in your JavaScript`,
        detail:
          s.id === "google_api_key"
            ? `A Google API key (${s.masked}) is in ${s.source}. Browser keys are normal for Maps, but must be restricted to your domain and APIs.`
            : s.id === "stripe_test_secret"
              ? `A Stripe test secret key (${s.masked}) is in ${s.source}. Secret keys must never ship to browsers.`
              : `A ${s.label} (${s.masked}) is visible to anyone who opens ${s.source}. Rotate it immediately and move it server-side.`,
        evidence: { masked: s.masked, file: s.source },
      });
    }

    if (!stripeTestReported) {
      const pkMatch = text.match(STRIPE_PK_TEST_RE);
      if (pkMatch && !PLACEHOLDER_KEY_RE.test(pkMatch[0])) {
        stripeTestReported = true;
        rawFindings.push({
          id: "stripe_test_mode_live",
          severity: "high",
          title: "Stripe is still in test mode on your live app",
          detail: `A Stripe test publishable key (pk_test_…${pkMatch[0].slice(-4)}) is loaded in ${source}. Real cards will be declined until switched to live keys.`,
          evidence: { file: source },
        });
      }
    }

    if (blobUrl && source !== "homepage HTML" && candidateMaps.length < MAX_SOURCEMAP_PROBES) {
      const smMatch = text.match(/[#@]\s*sourceMappingURL=([^\s'"]+)/);
      if (smMatch && !smMatch[1].startsWith("data:")) {
        try {
          const mapUrl = new URL(smMatch[1], blobUrl).href;
          if (new URL(mapUrl).origin === origin && !candidateMaps.includes(mapUrl)) {
            candidateMaps.push(mapUrl);
          }
        } catch {}
      }
    }
  }
  checks.secrets = meta.scriptsScanned ? "done" : "no_scripts_found";

  for (const mapUrl of candidateMaps) {
    if (!budget.canFetch()) break;
    try {
      const mr = await safeFetch(mapUrl, budget, fetchImpl, { headers: { accept: "application/json,*/*" } });
      const head = (await readCapped(mr, 80)).trimStart();
      if (mr.status === 200 && head.startsWith("{")) {
        const mapPath = new URL(mapUrl).pathname;
        rawFindings.push({
          id: "public_source_maps",
          severity: "medium",
          title: "Source maps (.map) are publicly downloadable",
          detail: `${mapPath} is publicly accessible in production, exposing your original source files.`,
          evidence: { map: mapPath },
        });
        break;
      }
    } catch {}
  }

  // ---- 4. Preview / localhost auth redirects
  const prev = detectPreviewAuth(texts.map((t) => t.text), host);
  if (prev) {
    const id = prev.nearAuthConfig ? "auth_redirect_preview" : "auth_redirect_preview_weak";
    rawFindings.push({
      id,
      severity: prev.severity,
      title: prev.nearAuthConfig ? "Login emails may redirect users to a preview or localhost URL" : "A preview domain is referenced in production JavaScript",
      detail: prev.nearAuthConfig
        ? `Auth redirect config references ${prev.host}. Password resets and magic links can land on a preview build or dead localhost page.`
        : `Production code references ${prev.host}, a preview domain. Verify it isn't used for auth callbacks or API requests.`,
      evidence: { host: prev.host },
    });
  }
  checks.auth_redirect = "done";

  // ---- 5. Supabase RLS & Storage buckets
  const allCode = texts.map((t) => t.text).join("\n");
  const supa = extractSupabase(allCode);
  if (!supa) {
    checks.supabase_rls = "no_supabase_found";
    checks.storage_buckets = "no_supabase_found";
  } else {
    meta.supabaseDetected = true;
    if (!supa.key) {
      checks.supabase_rls = "no_public_key_found";
      checks.storage_buckets = "no_public_key_found";
    } else {
      const tables = [...new Set([...(await listTablesFromOpenApi(supa, budget, fetchImpl)), ...tableNamesFromBundle(allCode)])];
      const rls = await probeRls(supa, tables, budget, fetchImpl);
      meta.tablesProbed = rls.probed;
      for (const r of rls.readable) {
        rawFindings.push({
          id: "supabase_rls_open",
          severity: r.sensitive ? "critical" : "high",
          sensitive: r.sensitive,
          title: `Supabase table "${r.table}" is readable by anyone`,
          detail: r.sensitive
            ? `Anyone with your public anon key can read rows of "${r.table}" without logging in. Row Level Security is off or too open. No row data was read or stored.`
            : `Anyone with your public anon key can read rows of "${r.table}" without logging in. Safe only if "${r.table}" is meant to be public. No row data was read or stored.`,
          evidence: { table: r.table },
        });
      }
      checks.supabase_rls = tables.length ? "done" : "no_tables_found";

      const buckets = bucketNamesFromBundle(allCode);
      if (buckets.length) {
        const bk = await probeBuckets(supa, buckets, budget, fetchImpl);
        meta.bucketsProbed = bk.probed;
        for (const b of bk.listable) {
          rawFindings.push({
            id: "storage_bucket_public",
            severity: "high",
            title: `Storage bucket "${b.bucket}" lets anyone list its files`,
            detail: `Anyone can list files inside "${b.bucket}" without signing in. No file names or contents were read or stored.`,
            evidence: { bucket: b.bucket },
          });
        }
        checks.storage_buckets = "done";
      } else {
        checks.storage_buckets = "no_buckets_found";
      }
    }
  }

  rawFindings.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
  const enrichedFindings = rawFindings.map((f) => attachPromptMetadata(f, stack));

  return finalizeFullReport({
    url: finalUrl,
    reachable: true,
    httpStatus: page.res.status,
    stack,
    findings: enrichedFindings,
    checks,
    meta,
    budget,
  });
}

function finalizeFullReport({ url, reachable, httpStatus, stack, findings, checks, meta, budget }) {
  findings.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
  const g = !reachable ? { score: 10, grade: "F" } : httpStatus >= 400 ? { score: 15, grade: "F" } : grade(findings);
  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) {
    if (severityCounts[f.severity] !== undefined) severityCounts[f.severity] += 1;
  }
  return {
    url,
    reachable,
    http_status: httpStatus ?? null,
    stack,
    grade: g.grade,
    score: g.score,
    findings_count: findings.length,
    severity_counts: severityCounts,
    summary: !reachable
      ? "We could not reach this app."
      : httpStatus >= 400
        ? `The app returned HTTP ${httpStatus}.`
        : findings.length
          ? `${findings.length} issue${findings.length > 1 ? "s" : ""} found across surface and deep security checks.`
          : "No issues found across surface and deep security checks.",
    findings,
    master_prompts: generateMasterPrompts(url, findings),
    checks,
    meta: { ...meta, durationMs: budget.elapsed(), subrequests: budget.used(), truncated: budget.truncated() },
    disclaimer:
      "Read-only scan. No data was written, no account was created, and no login was used. No table rows, file names, cookie values, or full secrets were read into this report or stored.",
  };
}

/**
 * Builds the public preview returned BEFORE payment:
 *   - Shows up to 2 real findings (title, detail, why_it_matters), WITHOUT fix prompts or verify steps.
 *   - Redacts findings #3..N to { index, severity, category, redactedTitle } ONLY (zero table/file names or details).
 *   - Never includes master_prompts.
 */
export function buildPreviewReport(scanId, fullReport, pricing = { amountCents: 1900, currency: "USD", displayPrice: "$19" }) {
  const all = fullReport.findings || [];
  const previewFindings = all.slice(0, 2).map((f, idx) => ({
    index: idx + 1,
    id: f.id,
    severity: f.severity,
    category: f.category,
    title: f.title,
    detail: f.detail,
    why_it_matters: f.why_it_matters,
  }));

  const sevLabel = { critical: "Critical", high: "High-severity", medium: "Medium-severity", low: "Low-severity" };
  const lockedFindings = all.slice(2).map((f, idx) => ({
    index: idx + 3,
    severity: f.severity,
    category: f.category,
    redacted_title: `${sevLabel[f.severity] || "Security"} issue in ${f.category}`,
  }));

  const canUnlock = all.length > 0;
  return {
    scan_id: scanId,
    url: fullReport.url,
    reachable: fullReport.reachable,
    http_status: fullReport.http_status,
    stack: fullReport.stack,
    grade: fullReport.grade,
    score: fullReport.score,
    findings_count: all.length,
    preview_count: previewFindings.length,
    locked_count: lockedFindings.length,
    severity_counts: fullReport.severity_counts,
    summary: fullReport.summary,
    preview_findings: previewFindings,
    locked_findings: lockedFindings,
    can_unlock: canUnlock,
    offer: canUnlock
      ? {
          amount_cents: pricing.amountCents,
          currency: pricing.currency,
          display_price: pricing.displayPrice,
          includes_rescans: 3,
        }
      : null,
    checks: fullReport.checks,
    meta: fullReport.meta,
    disclaimer: fullReport.disclaimer,
  };
}
