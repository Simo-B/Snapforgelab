-- Snapforge Lab Self-Serve Scan, Orders & Webhook Idempotency Schema (Cloudflare D1)
-- Apply locally:  npx wrangler d1 execute SNAPFORGE_DB --local --file=./migrations/0001_selfserve.sql
-- Apply in prod:  npx wrangler d1 execute SNAPFORGE_DB --remote --file=./migrations/0001_selfserve.sql

CREATE TABLE IF NOT EXISTS scans (
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
);

CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at);

CREATE TABLE IF NOT EXISTS orders (
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
  paid_at INTEGER,
  FOREIGN KEY (scan_id) REFERENCES scans(id)
);

CREATE INDEX IF NOT EXISTS idx_orders_scan_id ON orders(scan_id);
CREATE INDEX IF NOT EXISTS idx_orders_report_token_hash ON orders(report_token_hash);

CREATE TABLE IF NOT EXISTS webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  received_at INTEGER NOT NULL
);
