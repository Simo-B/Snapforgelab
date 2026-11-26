// Snapforge Self-Serve Storage Layer (Cloudflare D1 primary, KV / memory fallback)
//
// Primary production store: Cloudflare D1 (`env.DB`), schema in `migrations/0001_selfserve.sql`.
// Self-heals tables on first isolate query if migrations haven't been run yet, and gracefully
// falls back to `env.RATE_KV` (30-day TTL) or an in-memory Map in local unit tests when `env.DB`
// is not bound.

const SCAN_TTL_SECONDS = 30 * 24 * 3600; // 30 days
const initializedDbs = new WeakSet();
const memStore = new Map();

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS scans (
    id TEXT PRIMARY KEY,
    target_url TEXT NOT NULL,
    stack TEXT NOT NULL DEFAULT 'unknown',
    reachable INTEGER NOT NULL DEFAULT 1,
    http_status INTEGER,
    score INTEGER,
    grade TEXT,
    findings_count INTEGER NOT NULL DEFAULT 0,
    preview_json TEXT NOT NULL,
    full_report_json TEXT NOT NULL,
    rescan_count INTEGER NOT NULL DEFAULT 0,
    ip_hash TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    scan_id TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'paypal',
    provider_order_id TEXT NOT NULL UNIQUE,
    capture_id TEXT,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    buyer_email TEXT,
    status TEXT NOT NULL DEFAULT 'created',
    token_salt TEXT NOT NULL,
    report_token_hash TEXT NOT NULL UNIQUE,
    browser_claimed_at INTEGER,
    email_sent_at INTEGER,
    created_at INTEGER NOT NULL,
    paid_at INTEGER
  )`,
  `CREATE TABLE IF NOT EXISTS webhook_events (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    received_at INTEGER NOT NULL
  )`,
];

async function ensureD1(env) {
  const db = env && env.DB;
  if (!db) return null;
  if (!initializedDbs.has(db)) {
    for (const sql of SCHEMA_STATEMENTS) {
      await db.prepare(sql).run();
    }
    initializedDbs.add(db);
  }
  return db;
}

async function kvGetJson(env, key) {
  if (env && env.RATE_KV) {
    const raw = await env.RATE_KV.get(key);
    return raw ? JSON.parse(raw) : null;
  }
  const raw = memStore.get(key);
  return raw ? JSON.parse(raw) : null;
}

async function kvPutJson(env, key, value) {
  const raw = JSON.stringify(value);
  if (env && env.RATE_KV) {
    await env.RATE_KV.put(key, raw, { expirationTtl: SCAN_TTL_SECONDS });
    return;
  }
  memStore.set(key, raw);
}

export async function saveScan(env, record) {
  const now = record.createdAt || Date.now();
  const expiresAt = now + SCAN_TTL_SECONDS * 1000;
  const db = await ensureD1(env);
  if (db) {
    await db
      .prepare(
        `INSERT INTO scans (id, target_url, stack, reachable, http_status, score, grade, findings_count, preview_json, full_report_json, rescan_count, ip_hash, created_at, updated_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`
      )
      .bind(
        record.id,
        record.targetUrl,
        record.stack || "unknown",
        record.reachable ? 1 : 0,
        record.httpStatus ?? null,
        record.score ?? null,
        record.grade ?? null,
        record.findingsCount || 0,
        JSON.stringify(record.preview),
        JSON.stringify(record.fullReport),
        record.ipHash || null,
        now,
        now,
        expiresAt
      )
      .run();
    return;
  }
  await kvPutJson(env, `scan:${record.id}`, {
    id: record.id,
    target_url: record.targetUrl,
    stack: record.stack || "unknown",
    reachable: record.reachable ? 1 : 0,
    http_status: record.httpStatus ?? null,
    score: record.score ?? null,
    grade: record.grade ?? null,
    findings_count: record.findingsCount || 0,
    preview_json: JSON.stringify(record.preview),
    full_report_json: JSON.stringify(record.fullReport),
    rescan_count: 0,
    created_at: now,
    updated_at: now,
    expires_at: expiresAt,
  });
}

export async function getScan(env, scanId) {
  if (!scanId) return null;
  const db = await ensureD1(env);
  const row = db
    ? await db.prepare(`SELECT * FROM scans WHERE id = ?`).bind(scanId).first()
    : await kvGetJson(env, `scan:${scanId}`);
  if (!row) return null;
  return {
    id: row.id,
    targetUrl: row.target_url,
    stack: row.stack,
    reachable: Boolean(row.reachable),
    httpStatus: row.http_status,
    score: row.score,
    grade: row.grade,
    findingsCount: row.findings_count,
    preview: JSON.parse(row.preview_json),
    fullReport: JSON.parse(row.full_report_json),
    rescanCount: Number(row.rescan_count || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
  };
}

export async function updateScanAfterRescan(env, scanId, fullReport, previewReport, now = Date.now()) {
  const db = await ensureD1(env);
  if (db) {
    await db
      .prepare(
        `UPDATE scans
         SET stack = ?, reachable = ?, http_status = ?, score = ?, grade = ?,
             findings_count = ?, preview_json = ?, full_report_json = ?,
             rescan_count = rescan_count + 1, updated_at = ?
         WHERE id = ?`
      )
      .bind(
        fullReport.stack || "unknown",
        fullReport.reachable ? 1 : 0,
        fullReport.http_status ?? null,
        fullReport.score ?? null,
        fullReport.grade ?? null,
        fullReport.findings_count || 0,
        JSON.stringify(previewReport),
        JSON.stringify(fullReport),
        now,
        scanId
      )
      .run();
    return;
  }
  const existing = await kvGetJson(env, `scan:${scanId}`);
  if (!existing) return;
  existing.stack = fullReport.stack || "unknown";
  existing.reachable = fullReport.reachable ? 1 : 0;
  existing.http_status = fullReport.http_status ?? null;
  existing.score = fullReport.score ?? null;
  existing.grade = fullReport.grade ?? null;
  existing.findings_count = fullReport.findings_count || 0;
  existing.preview_json = JSON.stringify(previewReport);
  existing.full_report_json = JSON.stringify(fullReport);
  existing.rescan_count = Number(existing.rescan_count || 0) + 1;
  existing.updated_at = now;
  await kvPutJson(env, `scan:${scanId}`, existing);
}

export async function createOrder(env, order) {
  const now = order.createdAt || Date.now();
  const db = await ensureD1(env);
  if (db) {
    await db
      .prepare(
        `INSERT INTO orders (id, scan_id, provider, provider_order_id, amount_cents, currency, buyer_email, status, token_salt, report_token_hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'created', ?, ?, ?)`
      )
      .bind(
        order.id,
        order.scanId,
        order.provider || "paypal",
        order.providerOrderId,
        order.amountCents,
        order.currency,
        order.buyerEmail || null,
        order.tokenSalt,
        order.reportTokenHash,
        now
      )
      .run();
    return;
  }
  const row = {
    id: order.id,
    scan_id: order.scanId,
    provider: order.provider || "paypal",
    provider_order_id: order.providerOrderId,
    capture_id: null,
    amount_cents: order.amountCents,
    currency: order.currency,
    buyer_email: order.buyerEmail || null,
    status: "created",
    token_salt: order.tokenSalt,
    report_token_hash: order.reportTokenHash,
    browser_claimed_at: null,
    email_sent_at: null,
    created_at: now,
    paid_at: null,
  };
  await kvPutJson(env, `order_pp:${order.providerOrderId}`, row);
  await kvPutJson(env, `order_tok:${order.reportTokenHash}`, { providerOrderId: order.providerOrderId });
}

function mapOrderRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    scanId: row.scan_id,
    provider: row.provider,
    providerOrderId: row.provider_order_id,
    captureId: row.capture_id,
    amountCents: Number(row.amount_cents),
    currency: row.currency,
    buyerEmail: row.buyer_email,
    status: row.status,
    tokenSalt: row.token_salt,
    reportTokenHash: row.report_token_hash,
    browserClaimedAt: row.browser_claimed_at,
    emailSentAt: row.email_sent_at,
    createdAt: row.created_at,
    paidAt: row.paid_at,
  };
}

export async function getOrderByProviderId(env, providerOrderId) {
  if (!providerOrderId) return null;
  const db = await ensureD1(env);
  const row = db
    ? await db.prepare(`SELECT * FROM orders WHERE provider_order_id = ?`).bind(providerOrderId).first()
    : await kvGetJson(env, `order_pp:${providerOrderId}`);
  return mapOrderRow(row);
}

export async function getPaidOrderByTokenHash(env, scanId, tokenHash) {
  if (!scanId || !tokenHash) return null;
  const db = await ensureD1(env);
  if (db) {
    const row = await db
      .prepare(`SELECT * FROM orders WHERE scan_id = ? AND report_token_hash = ? AND status = 'paid'`)
      .bind(scanId, tokenHash)
      .first();
    return mapOrderRow(row);
  }
  const ptr = await kvGetJson(env, `order_tok:${tokenHash}`);
  if (!ptr || !ptr.providerOrderId) return null;
  const row = await kvGetJson(env, `order_pp:${ptr.providerOrderId}`);
  if (!row || row.scan_id !== scanId || row.status !== "paid") return null;
  return mapOrderRow(row);
}

export async function markOrderPaid(env, providerOrderId, { captureId, buyerEmail, paidAt = Date.now(), claimBrowser = false }) {
  const db = await ensureD1(env);
  if (db) {
    await db
      .prepare(
        `UPDATE orders
         SET status = 'paid',
             capture_id = COALESCE(?, capture_id),
             buyer_email = COALESCE(buyer_email, ?),
             paid_at = COALESCE(paid_at, ?),
             browser_claimed_at = CASE WHEN ? = 1 THEN COALESCE(browser_claimed_at, ?) ELSE browser_claimed_at END
         WHERE provider_order_id = ?`
      )
      .bind(captureId || null, buyerEmail || null, paidAt, claimBrowser ? 1 : 0, paidAt, providerOrderId)
      .run();
    return getOrderByProviderId(env, providerOrderId);
  }
  const row = await kvGetJson(env, `order_pp:${providerOrderId}`);
  if (!row) return null;
  row.status = "paid";
  if (captureId && !row.capture_id) row.capture_id = captureId;
  if (!row.buyer_email && buyerEmail) row.buyer_email = buyerEmail;
  if (!row.paid_at) row.paid_at = paidAt;
  if (claimBrowser && !row.browser_claimed_at) row.browser_claimed_at = paidAt;
  await kvPutJson(env, `order_pp:${providerOrderId}`, row);
  return mapOrderRow(row);
}

export async function claimOrderEmailSend(env, providerOrderId, sentAt = Date.now()) {
  const db = await ensureD1(env);
  if (db) {
    const res = await db
      .prepare(`UPDATE orders SET email_sent_at = ? WHERE provider_order_id = ? AND email_sent_at IS NULL`)
      .bind(sentAt, providerOrderId)
      .run();
    return Boolean(res && res.meta && res.meta.changes > 0);
  }
  const row = await kvGetJson(env, `order_pp:${providerOrderId}`);
  if (!row || row.email_sent_at) return false;
  row.email_sent_at = sentAt;
  await kvPutJson(env, `order_pp:${providerOrderId}`, row);
  return true;
}

export async function recordWebhookEvent(env, eventId, eventType, receivedAt = Date.now()) {
  if (!eventId) return false;
  const db = await ensureD1(env);
  if (db) {
    try {
      const res = await db
        .prepare(`INSERT OR IGNORE INTO webhook_events (event_id, event_type, received_at) VALUES (?, ?, ?)`)
        .bind(eventId, eventType || "unknown", receivedAt)
        .run();
      return Boolean(res && res.meta && res.meta.changes > 0);
    } catch {
      return false;
    }
  }
  const existing = await kvGetJson(env, `wh:${eventId}`);
  if (existing) return false;
  await kvPutJson(env, `wh:${eventId}`, { event_id: eventId, event_type: eventType, received_at: receivedAt });
  return true;
}
