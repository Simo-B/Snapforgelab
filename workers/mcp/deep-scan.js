// Snapforge Deep Scan — ownership-gated, read-only deep check of an app the caller owns.
//
// SEPARATE from the public MCP tool `check_app` (which never scans JS bundles).
// This module is only reachable through POST /scan-deep, which requires
// { url, ownershipConfirmed: true } from the /scan-deep/ page checkbox.
//
// What it does, read-only:
//   1. Secrets in the app's own JS bundles (same-origin scripts only), always masked.
//   2. Supabase tables readable with the public anon key (at most ONE GET ?select=*&limit=1 per table).
//   3. Auth redirects pointing at a preview / localhost host (string scan, no navigation).
//   4. Supabase Storage buckets that are publicly listable (one list call, limit 1, per bucket).
//
// Guard-rails (enforced in code, covered by test-deep.mjs):
//   - Never writes, never authenticates, never creates accounts. Only the anon / publishable key
//     already shipped in the target's own bundle is used, and only against that same project.
//   - No table row, object name or full secret is ever returned, stored or logged.
//   - A Supabase anon key, a Supabase publishable key, Firebase web config or a Stripe
//     publishable key on its own is NOT a finding.
//   - SSRF guard on every fetch (private / loopback / link-local / internal hosts and IP literals refused,
//     DNS-over-HTTPS check of the target host), redirects inspected manually.
//   - Hard caps: sub-requests, wall time, per-request timeout, scripts, bytes, tables, buckets.
//
// Nothing in this file calls console.log: no scan data reaches Worker logs.

export const LIMITS = {
  TOTAL_BUDGET_MS: 25_000,
  MAX_SUBREQUESTS: 45, // Workers free plan allows 50 per invocation
  FETCH_TIMEOUT_MS: 6_000,
  MAX_HTML_BYTES: 1_000_000,
  MAX_SCRIPT_BYTES: 2_500_000,
  MAX_TOTAL_SCRIPT_BYTES: 5_000_000, // also bounds CPU time spent on regex scanning
  MAX_SCRIPTS_SCANNED: 14,
  MAX_TABLES_PROBED: 20,
  MAX_BUCKETS_PROBED: 5,
  MAX_REDIRECTS: 3,
  RLS_QUERY: "select=*&limit=1",
};

const UA = "SnapforgeDeepScan/1.0 (+https://snapforgelab.com/scan-deep/)";
export const DEEP_RATE_LIMIT = 5; // deep scans per IP per hour

// ---------------------------------------------------------------- budget
export function makeBudget(limits = LIMITS, now = () => Date.now()) {
  const start = now();
  let subreqs = 0;
  let truncated = false;
  return {
    canFetch: () => subreqs < limits.MAX_SUBREQUESTS && now() - start < limits.TOTAL_BUDGET_MS,
    spend: () => { subreqs += 1; },
    used: () => subreqs,
    elapsed: () => now() - start,
    markTruncated: () => { truncated = true; },
    truncated: () => truncated,
  };
}

// ---------------------------------------------------------------- SSRF guard
export class GuardError extends Error {}

function ipv4Private(host) {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return null; // not an IPv4 literal
  const p = m.slice(1).map(Number);
  if (p.some((o) => o > 255)) return true;
  return (
    p[0] === 0 || p[0] === 10 || p[0] === 127 ||
    (p[0] === 100 && p[1] >= 64 && p[1] <= 127) || // CGNAT
    (p[0] === 169 && p[1] === 254) ||
    (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
    (p[0] === 192 && p[1] === 168) ||
    (p[0] === 192 && p[1] === 0 && p[2] === 0) ||
    (p[0] === 198 && (p[1] === 18 || p[1] === 19)) ||
    p[0] >= 224
  );
}

export function isPrivateAddress(ip) {
  const s = String(ip).toLowerCase().replace(/^\[|\]$/g, "");
  const v4 = ipv4Private(s);
  if (v4 !== null) return v4;
  if (s.includes(":")) {
    // Any IPv6 literal in a URL is refused by assertPublicHost; this covers DNS answers.
    if (s === "::" || s === "::1") return true;
    if (/^(fc|fd|fe8|fe9|fea|feb)/.test(s)) return true;
    const mapped = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return ipv4Private(mapped[1]) !== false;
    if (s.startsWith("::ffff:")) return true;
    return false;
  }
  return false;
}

/** Throws GuardError unless the URL is http(s) on a public hostname (no IP literals for private ranges). */
export function assertPublicHost(raw) {
  let u;
  try { u = raw instanceof URL ? raw : new URL(raw); } catch { throw new GuardError("That doesn't look like a valid URL."); }
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new GuardError("Only http and https URLs can be scanned.");
  if (u.username || u.password) throw new GuardError("URLs with credentials are not accepted.");
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  if (!host) throw new GuardError("That doesn't look like a valid URL.");
  if (host.startsWith("[")) throw new GuardError("IP addresses can't be scanned. Use the app's public domain.");
  if (
    host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
    host.endsWith(".internal") || host.endsWith(".home.arpa") || host.endsWith(".lan") ||
    host === "metadata.google.internal" || !host.includes(".")
  ) throw new GuardError("Only apps on the public internet can be scanned, not local or internal addresses.");
  if (ipv4Private(host) !== null) {
    if (ipv4Private(host)) throw new GuardError("That address is on a private network, which can't be scanned.");
    throw new GuardError("IP addresses can't be scanned. Use the app's public domain.");
  }
  return u;
}

/** DNS-over-HTTPS check: refuse a hostname that resolves to a private address. Fails open on DoH errors
 *  (Cloudflare's own fetch refuses private destinations as a second layer). */
export async function assertResolvesPublic(host, fetchImpl, budget) {
  if (!budget.canFetch()) return;
  budget.spend();
  try {
    const r = await timedFetch(fetchImpl, `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=A`, { headers: { accept: "application/dns-json" } });
    if (!r.ok) return;
    const j = await r.json();
    for (const a of j.Answer || []) {
      if ((a.type === 1 || a.type === 28) && isPrivateAddress(a.data)) throw new GuardError("That address resolves to a private network, which can't be scanned.");
    }
  } catch (e) {
    if (e instanceof GuardError) throw e;
  }
}

async function timedFetch(fetchImpl, url, init = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), LIMITS.FETCH_TIMEOUT_MS);
  try {
    return await fetchImpl(url, { ...init, redirect: "manual", signal: ctrl.signal, headers: { "user-agent": UA, ...(init.headers || {}) } });
  } finally {
    clearTimeout(t);
  }
}

/** Every target fetch goes through here: guard, budget, timeout, manual redirects. GET by default. */
export async function safeFetch(url, budget, fetchImpl, init = {}) {
  if (!budget.canFetch()) { budget.markTruncated(); throw new Error("budget-exhausted"); }
  assertPublicHost(url);
  budget.spend();
  return timedFetch(fetchImpl, url, init);
}

/** Reads at most maxBytes of a body as text, then cancels the stream. */
export async function readCapped(res, maxBytes) {
  if (!res.body || typeof res.body.getReader !== "function") {
    const t = await res.text();
    return t.length > maxBytes ? t.slice(0, maxBytes) : t;
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let out = "";
  let n = 0;
  try {
    while (n < maxBytes) {
      const { done, value } = await reader.read();
      if (done) break;
      n += value.byteLength;
      out += dec.decode(value, { stream: true });
    }
  } finally {
    try { await reader.cancel(); } catch {}
  }
  return out.length > maxBytes ? out.slice(0, maxBytes) : out;
}

/** True when a PostgREST / Storage JSON body is a non-empty array. Reads only the first bytes and keeps nothing. */
export async function bodyIsNonEmptyArray(res) {
  const head = (await readCapped(res, 64)).trimStart();
  if (!head.startsWith("[")) return false;
  return !/^\[\s*\]/.test(head) && head.length > 1;
}

// ---------------------------------------------------------------- masking
const KNOWN_PREFIXES = ["sk_live_", "rk_live_", "sk_test_", "sk-proj-", "sk-ant-", "sk-", "sb_secret_", "AKIA", "ASIA", "AIza", "ghp_", "github_pat_", "eyJ"];

/** Masks a secret: known public prefix + "…" + last 4 characters. Short values reveal nothing. */
export function maskSecret(value) {
  const v = String(value || "");
  const prefix = KNOWN_PREFIXES.find((p) => v.startsWith(p)) || "";
  if (v.length < 16) return (prefix || "") + "…(hidden)";
  return `${prefix}…${v.slice(-4)}`;
}

// ---------------------------------------------------------------- JWT / key helpers
export const JWT_RE = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;

function b64urlDecode(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return atob(s);
}

export function jwtPayload(token) {
  try { return JSON.parse(b64urlDecode(String(token).split(".")[1])); } catch { return null; }
}

const PLACEHOLDER_RE = /(your[_-]?|example|placeholder|changeme|dummy|sample|test[_-]?key|xxxx|1234567890|abcdef|<|>|\$\{|process\.env|import\.meta)/i;

function entropy(s) {
  const f = {};
  for (const c of s) f[c] = (f[c] || 0) + 1;
  let e = 0;
  for (const k in f) { const p = f[k] / s.length; e -= p * Math.log2(p); }
  return e;
}

/** Firebase web config is public by design: an AIza key with 2+ Firebase config keys nearby is not a finding. */
export function isFirebaseConfigContext(text, index) {
  const win = text.slice(Math.max(0, index - 400), index + 400);
  const keys = ["authDomain", "projectId", "messagingSenderId", "appId", "storageBucket", "measurementId", "databaseURL"];
  return keys.filter((k) => win.includes(k)).length >= 2;
}

// ---------------------------------------------------------------- 1. secrets
const SECRET_PATTERNS = [
  { id: "stripe_secret", re: /\b(?:sk|rk)_live_[0-9a-zA-Z]{16,}/g, severity: "critical", label: "Stripe live secret key" },
  { id: "stripe_test_secret", re: /\bsk_test_[0-9a-zA-Z]{16,}/g, severity: "low", label: "Stripe test secret key" },
  { id: "supabase_secret_key", re: /\bsb_secret_[A-Za-z0-9_-]{16,}/g, severity: "critical", label: "Supabase secret key" },
  { id: "llm_key", re: /\bsk-ant-[A-Za-z0-9_-]{24,}/g, severity: "critical", label: "Anthropic API key" },
  { id: "llm_key", re: /\bsk-(?:proj-)?(?!ant-)[A-Za-z0-9_-]{32,}/g, severity: "critical", label: "OpenAI API key" },
  { id: "aws_key", re: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, severity: "critical", label: "AWS access key" },
  { id: "github_token", re: /\b(?:ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{40,})/g, severity: "critical", label: "GitHub token" },
  { id: "google_api_key", re: /\bAIza[0-9A-Za-z_-]{35}/g, severity: "low", label: "Google API key" },
];
const PASSWORD_RE = /\b(?:password|passwd|db_pass|admin_pass|adminPassword|dbPassword)["']?\s*[:=]\s*["']([^"'\s]{8,64})["']/gi;

/** Scans one text blob. Returns findings with masked values only. */
export function scanTextForSecrets(text, source) {
  const out = [];
  const seen = new Set();
  const push = (f, raw) => {
    const key = f.id + ":" + raw;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(f);
  };
  for (const p of SECRET_PATTERNS) {
    p.re.lastIndex = 0;
    for (const m of text.matchAll(p.re)) {
      const raw = m[0];
      if (PLACEHOLDER_RE.test(raw)) continue;
      if (p.id === "llm_key" && (entropy(raw) < 3.5 || !/\d/.test(raw))) continue; // minified identifiers, not keys
      if (p.id === "google_api_key" && isFirebaseConfigContext(text, m.index)) continue; // public by design
      push({ id: p.id, severity: p.severity, label: p.label, masked: maskSecret(raw), source }, raw);
    }
  }
  // Supabase JWTs: anon is public and expected; only service_role is a finding.
  JWT_RE.lastIndex = 0;
  for (const m of text.matchAll(JWT_RE)) {
    const pl = jwtPayload(m[0]);
    if (pl && pl.role === "service_role") push({ id: "supabase_service_role", severity: "critical", label: "Supabase service_role key", masked: maskSecret(m[0]), source }, m[0]);
  }
  PASSWORD_RE.lastIndex = 0;
  for (const m of text.matchAll(PASSWORD_RE)) {
    const v = m[1];
    if (PLACEHOLDER_RE.test(v) || /password|passw|mot de passe|contrase|required|invalid|confirm|reset|forgot|current|new/i.test(v)) continue;
    if (!/[A-Za-z]/.test(v) || !/[\d\W_]/.test(v) || entropy(v) < 3) continue;
    push({ id: "hardcoded_password", severity: "high", label: "Hard-coded password", masked: maskSecret(v), source }, v);
  }
  return out;
}

// ---------------------------------------------------------------- script collection
function sameOrigin(a, b) {
  try { return new URL(a).origin === new URL(b).origin; } catch { return false; }
}
function abs(href, base) {
  try { return new URL(href.replace(/&amp;/g, "&"), base).href; } catch { return null; }
}

export function scriptUrlsFromHtml(html, baseUrl) {
  const urls = [];
  for (const m of html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) urls.push(abs(m[1], baseUrl));
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0];
    if (!/\brel\s*=\s*["'](?:modulepreload|preload)["']/i.test(tag)) continue;
    if (/\brel\s*=\s*["']preload["']/i.test(tag) && !/\bas\s*=\s*["']script["']/i.test(tag)) continue;
    const h = tag.match(/\bhref\s*=\s*["']([^"']+)["']/i);
    if (h) urls.push(abs(h[1], baseUrl));
  }
  return [...new Set(urls.filter((u) => u && sameOrigin(u, baseUrl) && /\.m?js$/i.test(new URL(u).pathname)))];
}

/** Lazy chunks referenced from an entry bundle (Vite/Next style), same-origin only. */
export function chunkUrlsFromScript(js, scriptUrl, origin) {
  const urls = new Set();
  for (const m of js.matchAll(/["'`]((?:\.{1,2}\/|\/)?(?:assets|_next\/static\/chunks|static\/js)\/[A-Za-z0-9._\-\/]+\.m?js)["'`]/g)) {
    const raw = m[1];
    const u = raw.startsWith(".") ? abs(raw, scriptUrl) : abs(raw.startsWith("/") ? raw : "/" + raw, origin);
    if (u && sameOrigin(u, origin)) urls.add(u);
  }
  for (const m of js.matchAll(/["'`](\.\/[A-Za-z0-9._\-]+\.m?js)["'`]/g)) {
    const u = abs(m[1], scriptUrl);
    if (u && sameOrigin(u, origin)) urls.add(u);
  }
  return [...urls];
}

// ---------------------------------------------------------------- 2. Supabase
const SUPA_URL_RE = /https:\/\/([a-z0-9]{20})\.supabase\.co\b/gi;
const PUBLISHABLE_RE = /\bsb_publishable_[A-Za-z0-9_-]{16,}/g;

/** Finds the Supabase project URL and the matching PUBLIC key (anon JWT whose ref matches, or a publishable key). */
export function extractSupabase(text) {
  const refs = [...new Set([...text.matchAll(SUPA_URL_RE)].map((m) => m[1].toLowerCase()))];
  if (!refs.length) return null;
  const anonJwts = [...text.matchAll(JWT_RE)].map((m) => m[0]).filter((t) => {
    const p = jwtPayload(t);
    return p && p.role === "anon";
  });
  for (const ref of refs) {
    const jwt = anonJwts.find((t) => (jwtPayload(t).ref || "").toLowerCase() === ref);
    if (jwt) return { ref, url: `https://${ref}.supabase.co`, key: jwt, keyType: "anon_jwt" };
  }
  const pub = (text.match(PUBLISHABLE_RE) || [])[0];
  if (pub && refs.length === 1) return { ref: refs[0], url: `https://${refs[0]}.supabase.co`, key: pub, keyType: "publishable" };
  return { ref: refs[0], url: `https://${refs[0]}.supabase.co`, key: null, keyType: null };
}

function supaHeaders(supa) {
  const h = { apikey: supa.key, accept: "application/json" };
  if (supa.keyType === "anon_jwt") h.authorization = `Bearer ${supa.key}`;
  return h;
}

const NAME_RE = /^[A-Za-z_][A-Za-z0-9_]{0,62}$/;

export function tableNamesFromBundle(text) {
  const names = new Set();
  for (const m of text.matchAll(/(\bstorage\s*)?\.from\(\s*["'`]([A-Za-z_][A-Za-z0-9_]{0,62})["'`]\s*\)/g)) {
    if (m[1]) continue; // supabase.storage.from('bucket') is a bucket, not a table
    names.add(m[2]);
  }
  for (const m of text.matchAll(/\/rest\/v1\/([A-Za-z_][A-Za-z0-9_]{0,62})\b(?!\/)/g)) if (m[1] !== "rpc") names.add(m[1]);
  return [...names];
}

export function bucketNamesFromBundle(text) {
  const names = new Set();
  for (const m of text.matchAll(/storage\/v1\/object\/(?:public|sign|authenticated)\/([a-z0-9][a-z0-9._-]{0,62})\//gi)) names.add(m[1]);
  for (const m of text.matchAll(/\bstorage\s*\.from\(\s*["'`]([a-z0-9][a-z0-9._-]{0,62})["'`]\s*\)/gi)) names.add(m[1]);
  return [...names];
}

/** Table names from the PostgREST OpenAPI root (one GET). Body is metadata (schema), never row data. */
export async function listTablesFromOpenApi(supa, budget, fetchImpl) {
  try {
    const res = await safeFetch(`${supa.url}/rest/v1/`, budget, fetchImpl, { headers: { ...supaHeaders(supa), accept: "application/openapi+json" } });
    if (res.status !== 200) { try { await res.body?.cancel(); } catch {} return []; }
    const doc = JSON.parse(await readCapped(res, 1_500_000));
    const fromPaths = Object.keys(doc.paths || {}).map((p) => p.replace(/^\//, "")).filter((p) => p && !p.startsWith("rpc/"));
    const fromDefs = Object.keys(doc.definitions || doc.components?.schemas || {});
    return [...new Set([...fromPaths, ...fromDefs])].filter((n) => NAME_RE.test(n));
  } catch { return []; }
}

const SENSITIVE_TABLE_RE = /user|profile|account|customer|client|order|payment|invoice|billing|subscri|message|chat|email|contact|lead|admin|member|patient|address|phone|token|session|secret|transaction|booking|employee/i;

/** At most ONE GET ?select=*&limit=1 per table. Returns only table names; the body is never kept. */
export async function probeRls(supa, tables, budget, fetchImpl) {
  const findings = [];
  const probed = new Set();
  for (const t of tables) {
    if (probed.size >= LIMITS.MAX_TABLES_PROBED) { budget.markTruncated(); break; }
    if (probed.has(t) || !NAME_RE.test(t)) continue;
    if (!budget.canFetch()) { budget.markTruncated(); break; }
    probed.add(t);
    try {
      const res = await safeFetch(`${supa.url}/rest/v1/${encodeURIComponent(t)}?${LIMITS.RLS_QUERY}`, budget, fetchImpl, { method: "GET", headers: supaHeaders(supa) });
      if (res.status === 200 && (await bodyIsNonEmptyArray(res))) findings.push({ table: t, sensitive: SENSITIVE_TABLE_RE.test(t) });
      else { try { await res.body?.cancel(); } catch {} }
    } catch {}
  }
  return { readable: findings, probed: probed.size };
}

/** One read-only list call (limit 1) per bucket. Object names are never read into the report. */
export async function probeBuckets(supa, buckets, budget, fetchImpl) {
  const findings = [];
  let probed = 0;
  for (const b of buckets.slice(0, LIMITS.MAX_BUCKETS_PROBED)) {
    if (!budget.canFetch()) { budget.markTruncated(); break; }
    probed++;
    try {
      const res = await safeFetch(`${supa.url}/storage/v1/object/list/${encodeURIComponent(b)}`, budget, fetchImpl, {
        method: "POST", // Storage's list endpoint is a read; nothing is created or changed
        headers: { ...supaHeaders(supa), "content-type": "application/json" },
        body: JSON.stringify({ prefix: "", limit: 1, offset: 0 }),
      });
      if (res.status === 200 && (await bodyIsNonEmptyArray(res))) findings.push({ bucket: b });
      else { try { await res.body?.cancel(); } catch {} }
    } catch {}
  }
  if (buckets.length > LIMITS.MAX_BUCKETS_PROBED) budget.markTruncated();
  return { listable: findings, probed };
}

// ---------------------------------------------------------------- 3. preview auth redirects
const PREVIEW_RE = /https?:\/\/((?:[a-z0-9-]+\.)*(?:lovable\.app|lovableproject\.com|webcontainer\.io|webcontainer-api\.io|stackblitz\.io|local-credentialless\.webcontainer-api\.io|replit\.dev|repl\.co|pike\.replit\.dev|vercel\.app|netlify\.app)|localhost(?::\d+)?|127\.0\.0\.1(?::\d+)?)/gi;
const AUTH_CTX_RE = /(redirectTo|emailRedirectTo|redirect_to|site_url|siteUrl|redirect_uri|redirectUri|callbackUrl|callback_url|returnTo|return_to|signInWithOAuth|resetPasswordForEmail|signInWithOtp)/i;
const PREVIEW_HOST_RE = /(^|\.)(?:id-preview--|preview--)|lovableproject\.com$|webcontainer|stackblitz|\.replit\.dev$|\.repl\.co$|^localhost|^127\.0\.0\.1/i;

export function maskHost(host) {
  const parts = host.split(".");
  if (parts.length < 3) return host;
  const sub = parts.slice(0, parts.length - 2).join(".");
  const shown = sub.length > 6 ? sub.slice(0, 4) + "…" : sub;
  return shown + "." + parts.slice(-2).join(".");
}

/** Returns at most one finding: high when a preview/localhost host sits near auth-redirect config, medium when a
 *  clear preview host (not the app's own host) appears elsewhere. Plain localhost outside auth config is ignored
 *  (libraries ship it everywhere). */
export function detectPreviewAuth(texts, targetHost) {
  let weak = null;
  const own = String(targetHost || "").toLowerCase();
  for (const text of texts) {
    PREVIEW_RE.lastIndex = 0;
    for (const m of text.matchAll(PREVIEW_RE)) {
      const host = m[1].toLowerCase().replace(/:\d+$/, "");
      if (host === own) continue;
      const isLocal = /^(localhost|127\.0\.0\.1)$/.test(host);
      const isPreview = isLocal || PREVIEW_HOST_RE.test(host);
      if (!isPreview) continue; // a production *.lovable.app / *.vercel.app link is not a preview
      const win = text.slice(Math.max(0, m.index - 250), m.index + m[0].length + 250);
      if (AUTH_CTX_RE.test(win)) return { severity: "high", host: isLocal ? host : maskHost(host), nearAuthConfig: true };
      if (!isLocal && !weak) weak = { severity: "medium", host: maskHost(host), nearAuthConfig: false };
    }
  }
  return weak;
}

// ---------------------------------------------------------------- stack + fix prompts
export function detectStack(html, host) {
  const h = (html || "").toLowerCase();
  if (host.endsWith(".lovable.app") || h.includes("gptengineer.js") || h.includes("cdn.gpteng.co") || h.includes("lovable-tagger") || h.includes("lovable.dev")) return "lovable";
  if (host.endsWith(".bolt.host") || /built with bolt|bolt\.new\b/.test(h)) return "bolt";
  if (host.endsWith(".replit.app") || host.endsWith(".repl.co") || h.includes("replit.com/public/js")) return "replit";
  return "unknown";
}

const FRAME = {
  lovable: (s) => s,
  bolt: (s) => s + " Add this as a Supabase migration and apply it.",
  replit: (s) => s + " If you use the Supabase SQL editor, run the statements there.",
};
function prompts(base) {
  return { lovable: FRAME.lovable(base), bolt: FRAME.bolt(base), replit: FRAME.replit(base) };
}

export function fixPrompts(id, ev = {}) {
  switch (id) {
    case "supabase_rls_open":
      return prompts(`Enable Row Level Security on the Supabase table "${ev.table}" and add policies so rows are only readable by the people who should see them. Run: ALTER TABLE public."${ev.table}" ENABLE ROW LEVEL SECURITY; then add a SELECT policy such as USING (auth.uid() = user_id) (adapt the owner column). Never give the anon role read access to private data. Show me the exact SQL and check every other public table the same way.`);
    case "supabase_service_role":
      return prompts("Remove the Supabase service_role key from all client code and from any env variable exposed to the browser (VITE_*, NEXT_PUBLIC_*). Rotate the key in the Supabase dashboard now. Move every privileged call into a server or edge function that reads the key from a server-only secret.");
    case "storage_bucket_public":
      return prompts(`Make the Supabase Storage bucket "${ev.bucket}" private unless it truly must be public, and remove any policy that lets the anon role list its files. For user files, add Storage policies keyed to auth.uid() and serve files with signed URLs.`);
    case "auth_redirect_preview":
    case "auth_redirect_preview_weak":
      return prompts("Set the Supabase Auth Site URL and the allowed Redirect URLs to my production domain only (https://<my-domain>). Remove preview, lovable.app preview, webcontainer and localhost targets from the code and from the Auth settings, so password resets and magic links never open a preview build.");
    case "google_api_key":
      return prompts("A Google API key is in my front-end bundle. Restrict it in Google Cloud Console: allow only my production domain as HTTP referrer and only the APIs the front-end needs. If it is used for anything server-side, move that call to a server function with a separate, server-only key.");
    case "hardcoded_password":
      return prompts("A password is hard-coded in my front-end code. Remove it, change that password everywhere it is used, and move any check that needs it to a server function that reads it from a server-only secret.");
    default:
      return prompts("Delete this secret key from all front-end code, rotate it in the provider's dashboard right now, and move the call that needs it behind a server or edge function that reads the key from a server-only secret.");
  }
}

// ---------------------------------------------------------------- grading
const PENALTY = { critical: 40, high: 20, medium: 10, low: 4, info: 0 };
export function grade(findings) {
  let score = 100;
  const perId = {};
  for (const f of findings) {
    perId[f.id] = (perId[f.id] || 0) + 1;
    if (perId[f.id] > 2) continue; // the same issue repeated in many tables/files counts at most twice
    score -= PENALTY[f.severity] ?? 0;
  }
  score = Math.max(0, score);
  if (findings.some((f) => f.severity === "critical")) score = Math.min(score, 59);
  const letter = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 45 ? "D" : score >= 30 ? "E" : "F";
  return { score, grade: letter };
}

// ---------------------------------------------------------------- orchestration
// Scripts whose file name suggests config / API-client code are fetched first (the Supabase
// client is often a lazy chunk), within the script cap.
const PRIORITY_NAME_RE = /supabase|client|auth|config|api|firebase|stripe|db|_app|main|index|app-|lib/i;
export function scriptPriority(u, fromHtml) {
  const name = u.split("/").pop();
  return (PRIORITY_NAME_RE.test(name) ? 3 : 0) + (fromHtml && fromHtml.has(u) ? 1 : 0);
}

async function fetchHtml(startUrl, budget, fetchImpl) {
  let url = startUrl;
  for (let i = 0; i <= LIMITS.MAX_REDIRECTS; i++) {
    const res = await safeFetch(url, budget, fetchImpl, { headers: { accept: "text/html,*/*" } });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      try { await res.body?.cancel(); } catch {}
      url = new URL(res.headers.get("location"), url).href;
      assertPublicHost(url);
      continue;
    }
    return { res, finalUrl: url, html: await readCapped(res, LIMITS.MAX_HTML_BYTES) };
  }
  throw new Error("too-many-redirects");
}

async function fetchScript(u, budget, fetchImpl) {
  try {
    const r = await safeFetch(u, budget, fetchImpl, { headers: { accept: "*/*" } });
    if (r.status !== 200) { try { await r.body?.cancel(); } catch {} return null; }
    const ct = (r.headers.get("content-type") || "").toLowerCase();
    if (ct.includes("text/html")) { try { await r.body?.cancel(); } catch {} return null; } // SPA fallback page, not a script
    return await readCapped(r, LIMITS.MAX_SCRIPT_BYTES);
  } catch { return null; }
}

const ORDER = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

/**
 * Runs the deep scan. `opts.fetchImpl` lets tests inject a fake network.
 * Returns a JSON-safe report with no table data, no object names and only masked secrets.
 */
export async function deepScan(rawUrl, opts = {}) {
  const fetchImpl = opts.fetchImpl || ((...a) => fetch(...a));
  const budget = makeBudget(LIMITS, opts.now);
  let input = String(rawUrl || "").trim();
  if (input && !/^https?:\/\//i.test(input)) input = "https://" + input;
  const target = assertPublicHost(input);
  await assertResolvesPublic(target.hostname, fetchImpl, budget);

  const findings = [];
  const checks = { secrets: "not_run", supabase_rls: "not_run", auth_redirect: "not_run", storage_buckets: "not_run" };
  const meta = { scriptsScanned: 0, tablesProbed: 0, bucketsProbed: 0, supabaseDetected: false };

  let page;
  try {
    page = await fetchHtml(target.href, budget, fetchImpl);
  } catch (e) {
    if (e instanceof GuardError) throw e;
    return finish({ url: target.href, reachable: false, stack: "unknown", findings, checks, meta, budget });
  }
  const finalUrl = page.finalUrl;
  const origin = new URL(finalUrl).origin;
  const host = new URL(finalUrl).hostname.toLowerCase();
  const stack = detectStack(page.html, host);
  if (page.res.status >= 400) {
    return finish({ url: target.href, reachable: true, httpStatus: page.res.status, stack, findings, checks, meta, budget });
  }

  // ---- 1. scripts
  const texts = [{ text: page.html, source: "homepage HTML" }];
  const fromHtml = new Set(scriptUrlsFromHtml(page.html, finalUrl));
  const queue = [...fromHtml];
  const seen = new Set();
  let totalBytes = 0;
  while (queue.length && seen.size < LIMITS.MAX_SCRIPTS_SCANNED && totalBytes < LIMITS.MAX_TOTAL_SCRIPT_BYTES) {
    queue.sort((a, b) => scriptPriority(b, fromHtml) - scriptPriority(a, fromHtml));
    const batch = [];
    while (queue.length && batch.length < 4 && seen.size + batch.length < LIMITS.MAX_SCRIPTS_SCANNED) {
      const u = queue.shift();
      if (seen.has(u) || batch.includes(u)) continue;
      batch.push(u);
    }
    if (!batch.length) break;
    batch.forEach((u) => seen.add(u));
    const bodies = await Promise.all(batch.map((u) => fetchScript(u, budget, fetchImpl)));
    bodies.forEach((js, i) => {
      if (!js) return;
      totalBytes += js.length;
      texts.push({ text: js, source: new URL(batch[i]).pathname });
      for (const c of chunkUrlsFromScript(js, batch[i], origin)) if (!seen.has(c) && !queue.includes(c)) queue.push(c);
    });
    if (!budget.canFetch()) break;
  }
  if (queue.some((u) => !seen.has(u))) budget.markTruncated();
  meta.scriptsScanned = texts.length - 1;

  const seenSecret = new Set();
  for (const { text, source } of texts) {
    for (const s of scanTextForSecrets(text, source)) {
      const k = s.id + s.masked;
      if (seenSecret.has(k)) continue;
      seenSecret.add(k);
      findings.push({
        id: s.id,
        severity: s.severity,
        title: s.id === "google_api_key" ? "Google API key in your JavaScript (check its restrictions)" : `${s.label} exposed in your JavaScript`,
        detail:
          s.id === "google_api_key"
            ? `A Google API key (${s.masked}) is in ${s.source}. Browser keys are normal for Maps and Firebase, but it must be restricted to your domain and APIs.`
            : s.id === "stripe_test_secret"
              ? `A Stripe test secret key (${s.masked}) is in ${s.source}. It can't move real money, but it should never ship to browsers.`
              : `A ${s.label} (${s.masked}) is visible to anyone who opens ${s.source}. Treat it as compromised: rotate it now and move it server-side.`,
        evidence: { masked: s.masked, file: s.source },
        fix_prompts: fixPrompts(s.id),
      });
    }
  }
  checks.secrets = meta.scriptsScanned ? "done" : "no_scripts_found";

  // ---- 3. preview auth redirects (string scan only)
  const prev = detectPreviewAuth(texts.map((t) => t.text), host);
  if (prev) {
    const id = prev.nearAuthConfig ? "auth_redirect_preview" : "auth_redirect_preview_weak";
    findings.push({
      id,
      severity: prev.severity,
      title: prev.nearAuthConfig ? "Login emails may send users to a preview or localhost address" : "A preview address is referenced in your JavaScript",
      detail: prev.nearAuthConfig
        ? `Your auth redirect settings point at ${prev.host}. Password resets and magic links can land on a preview build or a dead localhost page.`
        : `Your production code references ${prev.host}, a preview host. Check it isn't used for login redirects or API calls.`,
      evidence: { host: prev.host },
      fix_prompts: fixPrompts(id),
    });
  }
  checks.auth_redirect = "done";

  // ---- 2 + 4. Supabase
  const all = texts.map((t) => t.text).join("\n");
  const supa = extractSupabase(all);
  if (!supa) {
    checks.supabase_rls = "no_supabase_found";
    checks.storage_buckets = "no_supabase_found";
  } else {
    meta.supabaseDetected = true;
    if (!supa.key) {
      checks.supabase_rls = "no_public_key_found";
      checks.storage_buckets = "no_public_key_found";
    } else {
      const tables = [...new Set([...(await listTablesFromOpenApi(supa, budget, fetchImpl)), ...tableNamesFromBundle(all)])];
      const rls = await probeRls(supa, tables, budget, fetchImpl);
      meta.tablesProbed = rls.probed;
      for (const r of rls.readable) {
        findings.push({
          id: "supabase_rls_open",
          severity: r.sensitive ? "critical" : "high",
          title: `Table "${r.table}" is readable by anyone`,
          detail: r.sensitive
            ? `Anyone with your public key can read rows of "${r.table}" without logging in. Row Level Security is off or too open. We did not read or keep any of its data.`
            : `Anyone with your public key can read rows of "${r.table}" without logging in. Fine only if this table is meant to be public (a product catalog, a blog). We did not read or keep any of its data.`,
          evidence: { table: r.table },
          fix_prompts: fixPrompts("supabase_rls_open", { table: r.table }),
        });
      }
      checks.supabase_rls = tables.length ? "done" : "no_tables_found";

      const buckets = bucketNamesFromBundle(all);
      if (buckets.length) {
        const bk = await probeBuckets(supa, buckets, budget, fetchImpl);
        meta.bucketsProbed = bk.probed;
        for (const b of bk.listable) {
          findings.push({
            id: "storage_bucket_public",
            severity: "high",
            title: `Storage bucket "${b.bucket}" lets anyone list its files`,
            detail: `Anyone can list the files in "${b.bucket}" without logging in. We did not read any file name or content.`,
            evidence: { bucket: b.bucket },
            fix_prompts: fixPrompts("storage_bucket_public", { bucket: b.bucket }),
          });
        }
        checks.storage_buckets = "done";
      } else checks.storage_buckets = "no_buckets_found";
    }
  }

  return finish({ url: target.href, reachable: true, httpStatus: page.res.status, stack, findings, checks, meta, budget });
}

function finish({ url, reachable, httpStatus, stack, findings, checks, meta, budget }) {
  findings.sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
  for (const f of findings) f.fix_prompt = f.fix_prompts[stack] || f.fix_prompts.lovable;
  const g = reachable && !(httpStatus >= 400) ? grade(findings) : { score: null, grade: null };
  return {
    url,
    reachable,
    http_status: httpStatus ?? null,
    stack,
    grade: g.grade,
    score: g.score,
    summary: !reachable
      ? "We could not reach this app."
      : httpStatus >= 400
        ? `The app returned HTTP ${httpStatus}.`
        : findings.length
          ? `${findings.length} issue(s) found by the deep scan.`
          : "No issues found by the deep scan.",
    findings,
    checks,
    meta: { ...meta, durationMs: budget.elapsed(), subrequests: budget.used(), truncated: budget.truncated() },
    disclaimer: "Read-only scan. No data was written, no account was created, no login was used. No table rows, file names or full secrets were read into this report or stored.",
  };
}
