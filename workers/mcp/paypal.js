// Snapforge PayPal REST v2 Checkout, Webhook Verification, Crypto Tokens & Resend Delivery
//
// Zero external dependencies (uses Web Crypto + fetch on Cloudflare Workers).
// Money rules:
//   - Price is decided exclusively on the server (default 1900 cents = $19.00 USD).
//   - Capture verifies status === "COMPLETED", currency, integer cents, and custom_id === scanId.
//   - Report access key is derived deterministically via HMAC-SHA256(secret, scanId:orderId:salt)
//     so only its SHA-256 hash is stored in D1, eliminating webhook-vs-redirect race conditions.

export const DEFAULT_PRICE_CENTS = 1900;
export const DEFAULT_CURRENCY = "USD";

let tokenCache = { key: "", token: "", expiresAt: 0 };

export function getPricing(env = {}) {
  const rawCents = Number(env.REPORT_PRICE_CENTS || DEFAULT_PRICE_CENTS);
  const amountCents = Number.isInteger(rawCents) && rawCents >= 100 && rawCents <= 100000 ? rawCents : DEFAULT_PRICE_CENTS;
  const currency = String(env.REPORT_CURRENCY || DEFAULT_CURRENCY).toUpperCase() === "EUR" ? "EUR" : "USD";
  const valueStr = (amountCents / 100).toFixed(2);
  const whole = amountCents % 100 === 0 ? String(amountCents / 100) : valueStr;
  const displayPrice = currency === "EUR" ? `${whole}€` : `$${whole}`;
  return { amountCents, currency, valueStr, displayPrice };
}

export function randomHex(bytes = 16) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

function toBase64Url(bytes) {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function sha256Hex(input) {
  const data = new TextEncoder().encode(String(input));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function deriveReportKey(env, scanId, providerOrderId, tokenSalt) {
  const secret = (env && (env.REPORT_SECRET || env.PAYPAL_CLIENT_SECRET)) || "";
  if (!secret) throw new Error("Server secret not configured.");
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(`snapforge-report:v1:${scanId}:${providerOrderId}:${tokenSalt}`));
  return "rk_" + toBase64Url(new Uint8Array(sig));
}

export function paypalApiBase(env = {}) {
  return String(env.PAYPAL_ENV || "live").toLowerCase() === "sandbox"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";
}

export function allowedSiteBase(requestOrigin, env = {}) {
  if (requestOrigin === "https://snapforgelab.com" || requestOrigin === "https://www.snapforgelab.com") {
    return requestOrigin;
  }
  if (
    String(env.PAYPAL_ENV || "").toLowerCase() === "sandbox" &&
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(requestOrigin || "")
  ) {
    return requestOrigin;
  }
  return "https://snapforgelab.com";
}

export async function getPayPalAccessToken(env, fetchImpl = fetch) {
  const clientId = env && env.PAYPAL_CLIENT_ID;
  const clientSecret = env && env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PayPal checkout is not configured yet.");
  }
  const base = paypalApiBase(env);
  const cacheKey = `${base}:${clientId}`;
  if (tokenCache.key === cacheKey && tokenCache.token && Date.now() < tokenCache.expiresAt) {
    return tokenCache.token;
  }
  const basic = btoa(`${clientId}:${clientSecret}`);
  const res = await fetchImpl(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      authorization: `Basic ${basic}`,
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    throw new Error(`PayPal authentication failed (${res.status}).`);
  }
  const data = await res.json();
  const expiresInMs = Math.max(60, Number(data.expires_in || 300) - 60) * 1000;
  tokenCache = { key: cacheKey, token: data.access_token, expiresAt: Date.now() + expiresInMs };
  return data.access_token;
}

export async function createPayPalOrder(env, { scanId, targetUrl, siteBase }, fetchImpl = fetch) {
  const pricing = getPricing(env);
  const accessToken = await getPayPalAccessToken(env, fetchImpl);
  const base = paypalApiBase(env);
  let hostLabel = "your app";
  try { hostLabel = new URL(targetUrl).hostname; } catch {}

  const returnUrl = `${siteBase}/report/?scan=${encodeURIComponent(scanId)}`;
  const cancelUrl = `${siteBase}/scan/?scan=${encodeURIComponent(scanId)}&canceled=1`;

  const payload = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: scanId,
        custom_id: scanId,
        description: `Snapforge Full Security Report & Fix Prompts (${hostLabel})`.slice(0, 127),
        amount: {
          currency_code: pricing.currency,
          value: pricing.valueStr,
        },
      },
    ],
    payment_source: {
      paypal: {
        experience_context: {
          brand_name: "Snapforge Lab",
          shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW",
          landing_page: "NO_PREFERENCE",
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      },
    },
  };

  const res = await fetchImpl(`${base}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      accept: "application/json",
      "paypal-request-id": `create-${scanId}-${randomHex(8)}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`Could not start PayPal checkout (${res.status}).`);
  }
  const order = await res.json();
  const links = Array.isArray(order.links) ? order.links : [];
  const approveLink =
    links.find((l) => l.rel === "payer-action") ||
    links.find((l) => l.rel === "approve");
  if (!order.id || !approveLink || !approveLink.href) {
    throw new Error("PayPal order response missing approval link.");
  }
  return {
    providerOrderId: order.id,
    approveUrl: approveLink.href,
    pricing,
  };
}

function parseCents(valueStr) {
  const m = String(valueStr || "").trim().match(/^(\d+)(?:\.(\d{1,2}))?$/);
  if (!m) return -1;
  const whole = Number(m[1]);
  const frac = Number((m[2] || "").padEnd(2, "0"));
  return whole * 100 + frac;
}

function extractVerifiedPayment(orderJson) {
  const status = String(orderJson && orderJson.status || "");
  const pu = Array.isArray(orderJson && orderJson.purchase_units) ? orderJson.purchase_units[0] : null;
  const captures = pu && pu.payments && Array.isArray(pu.payments.captures) ? pu.payments.captures : [];
  const cap = captures.find((c) => c.status === "COMPLETED") || captures[0] || null;
  const amountObj = (cap && cap.amount) || (pu && pu.amount) || {};
  const customId = (cap && cap.custom_id) || (pu && pu.custom_id) || (pu && pu.reference_id) || "";
  const payerEmail = (orderJson && orderJson.payer && orderJson.payer.email_address) || null;
  return {
    completed: status === "COMPLETED" && Boolean(cap && cap.status === "COMPLETED"),
    captureId: (cap && cap.id) || null,
    currency: String(amountObj.currency_code || "").toUpperCase(),
    amountCents: parseCents(amountObj.value),
    customId,
    payerEmail,
  };
}

export async function captureAndVerifyPayPalOrder(env, providerOrderId, expected, fetchImpl = fetch) {
  const accessToken = await getPayPalAccessToken(env, fetchImpl);
  const base = paypalApiBase(env);
  const url = `${base}/v2/checkout/orders/${encodeURIComponent(providerOrderId)}`;

  let res = await fetchImpl(`${url}/capture`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      accept: "application/json",
    },
  });

  let orderJson = null;
  if (res.status === 422) {
    // Handle idempotent re-check when PayPal already captured the order (e.g. webhook race)
    const getRes = await fetchImpl(url, {
      method: "GET",
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (getRes.ok) orderJson = await getRes.json();
  } else if (res.ok) {
    orderJson = await res.json();
  }

  if (!orderJson) {
    throw new Error("Payment capture did not complete. If you were charged, email hello@snapforgelab.com.");
  }

  const info = extractVerifiedPayment(orderJson);
  if (!info.completed) {
    throw new Error("PayPal payment is not completed yet.");
  }
  if (expected.scanId && info.customId && info.customId !== expected.scanId) {
    throw new Error("Payment scan mismatch.");
  }
  if (info.currency !== expected.currency || info.amountCents !== expected.amountCents) {
    throw new Error("Payment amount or currency mismatch.");
  }
  return info;
}

export async function verifyPayPalWebhook(request, rawBodyText, env, fetchImpl = fetch) {
  const webhookId = env && env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;
  const authAlgo = request.headers.get("paypal-auth-algo");
  const certUrl = request.headers.get("paypal-cert-url");
  const transmissionId = request.headers.get("paypal-transmission-id");
  const transmissionSig = request.headers.get("paypal-transmission-sig");
  const transmissionTime = request.headers.get("paypal-transmission-time");
  if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
    return false;
  }
  let webhookEvent;
  try {
    webhookEvent = JSON.parse(rawBodyText);
  } catch {
    return false;
  }
  const accessToken = await getPayPalAccessToken(env, fetchImpl);
  const base = paypalApiBase(env);
  const res = await fetchImpl(`${base}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      auth_algo: authAlgo,
      cert_url: certUrl,
      transmission_id: transmissionId,
      transmission_sig: transmissionSig,
      transmission_time: transmissionTime,
      webhook_id: webhookId,
      webhook_event: webhookEvent,
    }),
  });
  if (!res.ok) return false;
  const out = await res.json();
  return out && out.verification_status === "SUCCESS";
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export async function sendReportEmail(env, { to, targetUrl, score, grade, findingsCount, reportUrl }, fetchImpl = fetch) {
  const apiKey = env && env.RESEND_API_KEY;
  if (!apiKey || !to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    return { sent: false };
  }
  const from = (env && env.RESEND_FROM) || "Simo — Snapforge Lab <hello@snapforgelab.com>";
  let host = targetUrl;
  try { host = new URL(targetUrl).hostname; } catch {}

  const subject = `Your Snapforge security report & fix prompts for ${host}`;
  const text = [
    `Hi,`,
    ``,
    `Thank you for your purchase. Your full security & launch report for ${host} is ready:`,
    `${reportUrl}`,
    ``,
    `Summary: Grade ${grade || "-"} (${score ?? "-"}/100) · ${findingsCount} issue(s) with paste-ready fix prompts for Lovable, Bolt and Replit Agent, a Master Fix Prompt, and 3 free verification re-scans.`,
    ``,
    `Bookmark that private link—it stays active for 30 days and does not require an account.`,
    ``,
    `Need help or want me to fix everything for you in 5 business days? Just reply to this email.`,
    `14-day refund guarantee: if the report doesn't help, reply within 14 days for a full refund.`,
    ``,
    `— Simo, Snapforge Lab`,
    `https://snapforgelab.com`,
  ].join("\n");

  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;line-height:1.55">
  <p style="margin:0 0 16px">Thank you for your purchase. Your full security &amp; launch report for <strong>${escapeHtml(host)}</strong> is unlocked:</p>
  <p style="margin:0 0 20px"><a href="${escapeHtml(reportUrl)}" style="display:inline-block;background:#006edb;color:#fff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:999px">Open my full report &amp; fix prompts →</a></p>
  <p style="margin:0 0 14px;font-size:14px;color:#444"><strong>Score:</strong> ${escapeHtml(score ?? "–")}/100 (Grade ${escapeHtml(grade || "–")}) · <strong>${escapeHtml(findingsCount)} issue${findingsCount === 1 ? "" : "s"}</strong> with paste-ready prompts for Lovable, Bolt &amp; Replit Agent + <strong>3 free verification re-scans</strong>.</p>
  <p style="margin:0 0 14px;font-size:13px;color:#555">Private link (bookmark it): <br><a href="${escapeHtml(reportUrl)}" style="color:#006edb;word-break:break-all">${escapeHtml(reportUrl)}</a></p>
  <hr style="border:0;border-top:1px solid #e5e5ea;margin:24px 0">
  <p style="margin:0;font-size:13px;color:#666">14-day full refund guarantee: if the prompts don't help, simply reply to this email. Want me to fix everything for you instead? Ask about the <a href="https://snapforgelab.com/launch-fix-sprint/" style="color:#006edb">Launch Fix Sprint</a>.<br>— Simo, Snapforge Lab</p>
</div>`;

  const res = await fetchImpl("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: "hello@snapforgelab.com",
      subject,
      text,
      html,
    }),
  });
  return { sent: res.ok, status: res.status };
}
