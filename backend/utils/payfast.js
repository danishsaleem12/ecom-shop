// backend/utils/payfast.js — PayFast Pakistan (APPS / GoPayFast) online payment.
//
// The flow (nothing here ever sees a card number: the customer pays on PayFast's own page):
//   1. startPayment(order)  asks PayFast for a one-time access token for this order, then returns the form fields
//                           the browser must POST to PayFast (the frontend does that, see frontend/src/lib/payment.js).
//   2. The customer pays on PayFast. PayFast then calls our webhook (CHECKOUT_URL, routes/payments.routes.js) from
//                           its servers and sends the customer's browser back to the order page.
//   3. verifyCallback(params) checks the webhook really came from PayFast (the validation_hash) before the route
//                           marks the order paid. The browser being sent back to us proves nothing.
//
// !! Check these against the "Merchant Integration Guide" PayFast gave you with your merchant account: the token
// !! and form field names, the validation_hash formula and the error codes below follow that guide as of writing,
// !! but PayFast can change them. Everything that might differ is in this one file (and the URLs can be overridden
// !! with PAYFAST_BASE_URL).
//
// Environment (see .env.example):
//   PAYFAST_MERCHANT_ID, PAYFAST_SECURED_KEY   from your PayFast merchant dashboard (the key is a secret!)
//   PAYFAST_MERCHANT_NAME                      shown to the customer on the PayFast page (default "Aurelia")
//   PAYFAST_STORE_ID                           optional, only if PayFast gave you one
//   PAYFAST_ENV                                "sandbox" (default) or "live"
//   PAYFAST_BASE_URL                           optional override of the PayFast host
//   BACKEND_URL                                the PUBLIC https address of THIS backend, so PayFast can reach the webhook
//   FRONTEND_URL                               where the customer is sent back to (already used by CORS)
const crypto = require("crypto");
const Order = require("../models/Order");

const HOSTS = { sandbox: "https://ipguat.apps.net.pk", live: "https://ipg1.apps.net.pk" };
const API_PATH = "/Ecommerce/api/Transaction";
const SUCCESS_CODES = ["000", "00"]; // err_code values that mean "payment completed"
const TOKEN_TIMEOUT_MS = 15000;

const env = (k) => String(process.env[k] || "").trim();
const strip = (url) => url.replace(/\/+$/, "");

function config() {
  const mode = env("PAYFAST_ENV").toLowerCase() === "live" ? "live" : "sandbox";
  return {
    merchantId: env("PAYFAST_MERCHANT_ID"),
    securedKey: env("PAYFAST_SECURED_KEY"),
    merchantName: env("PAYFAST_MERCHANT_NAME") || "Aurelia",
    storeId: env("PAYFAST_STORE_ID"),
    mode,
    host: strip(env("PAYFAST_BASE_URL") || HOSTS[mode]),
    backendUrl: strip(env("BACKEND_URL")),
    frontendUrl: strip(env("FRONTEND_URL") || "http://localhost:3000"),
  };
}

/** True when online payment can be offered: merchant id, secret key and a public backend address are all set. */
const isConfigured = () => {
  const c = config();
  return Boolean(c.merchantId && c.securedKey && c.backendUrl);
};

const amountString = (n) => (Math.round(Number(n) * 100) / 100).toFixed(2);

/** "2026-10-15 15:20:00" in the store's timezone-free form PayFast expects. */
const orderDate = (d = new Date()) => d.toISOString().slice(0, 19).replace("T", " ");

/** BASKET_ID for attempt `n` of an order: "K7QM-4TXD-2". A new id per attempt, so a retry is never refused as a duplicate. */
const basketIdFor = (order, attempt) => `${order.orderNumber}-${attempt}`;

/** "K7QM-4TXD-2" -> "K7QM-4TXD" (the order number), or "" if it isn't one of ours. */
function orderNumberFromBasket(basketId) {
  const m = /^([A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4})-\d{1,3}$/.exec(String(basketId || ""));
  return m ? m[1] : "";
}

/** Asks PayFast for the one-time token that goes with this basket and amount. Throws if PayFast says no. */
async function getAccessToken({ basketId, amount }, c = config()) {
  const body = new URLSearchParams({
    MERCHANT_ID: c.merchantId,
    SECURED_KEY: c.securedKey,
    BASKET_ID: basketId,
    TXNAMT: amountString(amount),
    CURRENCY_CODE: "PKR",
  });
  const res = await fetch(`${c.host}${API_PATH}/GetAccessToken`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(TOKEN_TIMEOUT_MS),
  });
  const data = await res.json().catch(() => ({}));
  const token = data?.ACCESS_TOKEN;
  if (!res.ok || !token) throw new Error(`PayFast refused the token request (HTTP ${res.status})`);
  return String(token);
}

/** The { gateway, url, method, fields } the frontend posts to PayFast. */
function buildPayment({ order, basketId, token, customer = {} }, c = config()) {
  const a = order.shippingAddress || {};
  const back = `${c.frontendUrl}/order-success/${order._id}`;
  const fields = {
    CURRENCY_CODE: "PKR",
    MERCHANT_ID: c.merchantId,
    MERCHANT_NAME: c.merchantName,
    TOKEN: token,
    BASKET_ID: basketId,
    TXNAMT: amountString(order.total),
    ORDER_DATE: orderDate(),
    SUCCESS_URL: back,
    FAILURE_URL: `${back}?payment=failed`,
    CHECKOUT_URL: `${c.backendUrl}/api/payments/payfast/ipn`, // the webhook
    CUSTOMER_EMAIL_ADDRESS: a.email || customer.email || "",
    CUSTOMER_MOBILE_NO: a.phone || "",
    SIGNATURE: crypto.randomBytes(8).toString("hex"), // PayFast only wants a unique value here
    VERSION: "AURELIA-1.0",
    TXNDESC: `Order ${order.orderNumber}`,
    PROCCODE: "00",
    TRAN_TYPE: "ECOMM_PURCHASE",
    ...(c.storeId ? { STORE_ID: c.storeId } : {}),
  };
  return { gateway: "payfast", url: `${c.host}${API_PATH}/PostTransaction`, method: "POST", fields };
}

/**
 * Issues a PayFast form for a card order that still needs paying (new attempt number, new token).
 * Resolves to the payment object, or null when the order can't be paid any more (cancelled, already paid, not a
 * card order) — decided by one atomic update, so a payment can't be started on an order that just got cancelled.
 * Throws when PayFast can't be reached; the order itself is untouched in that case.
 */
async function startPayment(order, customer) {
  const c = config();
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, paymentMethod: "card", paymentStatus: { $in: ["unpaid", "failed"] }, status: { $ne: "cancelled" } },
    { $inc: { "payment.attempts": 1 }, $set: { "payment.gateway": "payfast" } },
    { new: true }
  );
  if (!updated) return null;
  if (!updated.orderNumber) throw new Error("Order has no order number");

  const basketId = basketIdFor(updated, updated.payment?.attempts || 1);
  const token = await getAccessToken({ basketId, amount: updated.total }, c);
  await Order.updateOne({ _id: updated._id }, { $set: { "payment.basketId": basketId } });
  return buildPayment({ order: updated, basketId, token, customer }, c);
}

/** The hash PayFast sends with every webhook: SHA-256 of "basket_id|secured_key|merchant_id|err_code". */
function validationHash({ basketId, errCode }, c = config()) {
  return crypto.createHash("sha256").update(`${basketId}|${c.securedKey}|${c.merchantId}|${errCode}`).digest("hex");
}

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a).toLowerCase());
  const y = Buffer.from(String(b).toLowerCase());
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/**
 * Checks a webhook's parameters. Returns
 *   { ok: false } when the hash is missing or wrong (not from PayFast: ignore it), or
 *   { ok: true, paid, basketId, transactionId, amount, message } with PayFast's verdict.
 */
function verifyCallback(params = {}, c = config()) {
  const basketId = String(params.basket_id || "");
  const errCode = String(params.err_code ?? "");
  const hash = String(params.validation_hash || "");
  if (!c.securedKey || !c.merchantId || !basketId || !errCode || !hash) return { ok: false };
  if (!safeEqual(hash, validationHash({ basketId, errCode }, c))) return { ok: false };
  return {
    ok: true,
    paid: SUCCESS_CODES.includes(errCode),
    basketId,
    transactionId: String(params.transaction_id || ""),
    amount: params.transaction_amount === undefined ? NaN : Number(params.transaction_amount),
    message: String(params.err_msg || "").slice(0, 200),
  };
}

module.exports = {
  config,
  isConfigured,
  amountString,
  basketIdFor,
  orderNumberFromBasket,
  getAccessToken,
  buildPayment,
  startPayment,
  validationHash,
  verifyCallback,
  SUCCESS_CODES,
};
