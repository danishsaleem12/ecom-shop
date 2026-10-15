// backend/utils/easypaisa.js — Easypaisa online payment (Easypay hosted checkout).
//
// The flow (this site never sees a wallet PIN or card number: the customer pays on Easypay's own page):
//   1. startPayment(order)  builds the signed form fields; the frontend posts them to Easypay (src/lib/payment.js).
//   2. The customer pays on Easypay. Easypay sends the customer's browser back to postBackURL
//                           (<BACKEND_URL>/api/payments/easypaisa/return). If it comes back with an auth_token, the
//                           route posts it on to Easypay's confirm address (confirmForm below) to finish the payment.
//   3. NOTHING in that browser trip is trusted. Whatever arrives (return, confirm, or an IPN call to
//                           <BACKEND_URL>/api/payments/easypaisa/ipn), the route asks Easypay's server directly
//                           "was order X paid, and for how much?" (inquire below) and only that answer marks the
//                           order paid.
//
// !! Check these against the merchant integration kit Easypaisa gave you (merchantsupport@easypaisa.com.pk): the form
// !! field names, the merchantHashedReq rule, the confirm address, the inquiry address/headers and the status names
// !! follow the Easypay guide as of writing, but Easypaisa can change them or enable different options on your
// !! account. Everything that might differ is in this one file (addresses can be overridden in the environment).
//
// Environment (see .env.example):
//   EASYPAISA_STORE_ID, EASYPAISA_HASH_KEY       from your Easypay merchant portal (the hash key is a secret!)
//   EASYPAISA_ACCOUNT_NUM                        the Easypaisa account the money lands in (needed by the inquiry)
//   EASYPAISA_USERNAME, EASYPAISA_PASSWORD       API credentials for the inquiry (secrets!)
//   EASYPAISA_ENV                                "sandbox" (default) or "live"
//   EASYPAISA_BASE_URL                           optional override of the Easypay host
//   EASYPAISA_PAYMENT_METHOD                     "MA_PAYMENT_METHOD" (default: Easypaisa mobile account), "CC_PAYMENT_METHOD" (card),
//                                                "OTC_PAYMENT_METHOD", or "ALL" to let the customer choose
//   BACKEND_URL / FRONTEND_URL                   as for PayFast
const crypto = require("crypto");
const { claimAttempt } = require("./paymentResult");
const Order = require("../models/Order");

const HOSTS = {
  sandbox: "https://easypaystg.easypaisa.com.pk",
  live: "https://easypay.easypaisa.com.pk",
};
const CHECKOUT_PATH = "/easypay/Index.jsf";
const CONFIRM_PATH = "/easypay/Confirm.jsf";
const INQUIRY_PATH = "/easypay-service/rest/v4/inquire-transaction";
const INQUIRY_TIMEOUT_MS = 15000;
const HOLD_MINUTES_DEFAULT = 60;

const PAID_STATUSES = ["PAID"];
const FAILED_STATUSES = ["FAILED", "DECLINED", "REJECTED", "EXPIRED", "CANCELLED", "CANCELED"];

const env = (k) => String(process.env[k] || "").trim();
const strip = (url) => url.replace(/\/+$/, "");

function config() {
  const mode = env("EASYPAISA_ENV").toLowerCase() === "live" ? "live" : "sandbox";
  const method = (env("EASYPAISA_PAYMENT_METHOD") || "MA_PAYMENT_METHOD").toUpperCase();
  return {
    storeId: env("EASYPAISA_STORE_ID"),
    hashKey: env("EASYPAISA_HASH_KEY"),
    accountNum: env("EASYPAISA_ACCOUNT_NUM"),
    username: env("EASYPAISA_USERNAME"),
    password: env("EASYPAISA_PASSWORD"),
    mode,
    host: strip(env("EASYPAISA_BASE_URL") || HOSTS[mode]),
    paymentMethod: method === "ALL" ? "" : method,
    backendUrl: strip(env("BACKEND_URL")),
    frontendUrl: strip(env("FRONTEND_URL") || "http://localhost:3000"),
  };
}

/** True when Easypaisa can be offered: store id, hash key, inquiry credentials and a public backend address are set. */
const isConfigured = () => {
  const c = config();
  return Boolean(c.storeId && c.hashKey && c.accountNum && c.username && c.password && c.backendUrl);
};

/** Easypay amounts carry one decimal at least: Rs 1,350 -> "1350.0", Rs 99.5 -> "99.5". */
const amountString = (n) => {
  const v = Math.round(Number(n) * 100) / 100;
  return Number.isInteger(v) ? v.toFixed(1) : String(v);
};

/** "20261015 183000": yyyyMMdd HHmmss in Pakistan time (UTC+5), the expiry format Easypay expects. */
const expiryStamp = (d) => {
  const s = new Date(d.getTime() + 5 * 3600 * 1000).toISOString().slice(0, 19).replace(/[-:]/g, "");
  return `${s.slice(0, 8)} ${s.slice(9)}`;
};

/** orderRefNum for attempt `n` of an order: "K7QM-4TXD-2". A new one per attempt, so a retry is never refused as a duplicate. */
const orderRefFor = (order, attempt) => `${order.orderNumber}-${attempt}`;

/** "K7QM-4TXD-2" -> "K7QM-4TXD" (the order number), or "" if it isn't one of ours. */
function orderNumberFromRef(ref) {
  const m = /^([A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4})-\d{1,3}$/.exec(String(ref || ""));
  return m ? m[1] : "";
}

/** The merchantHashedReq: AES-128-ECB (PKCS7 padding) of "key=value&..." (non-empty fields, sorted by name), base64. */
function hashedRequest(fields, c = config()) {
  const text = Object.keys(fields)
    .filter((k) => fields[k] !== undefined && fields[k] !== null && String(fields[k]) !== "")
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join("&");
  const cipher = crypto.createCipheriv("aes-128-ecb", Buffer.from(c.hashKey, "utf8"), null);
  return Buffer.concat([cipher.update(text, "utf8"), cipher.final()]).toString("base64");
}

/** The { gateway, url, method, fields } the frontend posts to Easypay. */
function buildPayment({ order, orderRef, customer = {}, now = new Date() }, c = config()) {
  const a = order.shippingAddress || {};
  const holdMin = Number(process.env.PAYMENT_HOLD_MINUTES);
  const hold = Number.isFinite(holdMin) && holdMin >= 10 ? holdMin : HOLD_MINUTES_DEFAULT;
  const signed = {
    storeId: c.storeId,
    amount: amountString(order.total),
    postBackURL: `${c.backendUrl}/api/payments/easypaisa/return`,
    orderRefNum: orderRef,
    expiryDate: expiryStamp(new Date(now.getTime() + hold * 60 * 1000)),
    autoRedirect: "1",
    paymentMethod: c.paymentMethod,
    emailAddr: a.email || customer.email || "",
    mobileNum: String(a.phone || "").replace(/[^\d]/g, ""),
  };
  const fields = { ...signed, merchantHashedReq: hashedRequest(signed, c) };
  // Empty optional fields are left out of the form altogether (they are also left out of the hash)
  for (const k of Object.keys(fields)) if (fields[k] === "") delete fields[k];
  return { gateway: "easypaisa", url: `${c.host}${CHECKOUT_PATH}`, method: "POST", fields };
}

/**
 * Issues an Easypay form for an Easypaisa order that still needs paying (new attempt number, new reference).
 * Resolves to the payment object, or null when the order can't be paid any more — decided by one atomic update.
 */
async function startPayment(order, customer) {
  const c = config();
  const updated = await claimAttempt(order, "easypaisa", "easypaisa");
  if (!updated) return null;
  if (!updated.orderNumber) throw new Error("Order has no order number");
  const orderRef = orderRefFor(updated, updated.payment?.attempts || 1);
  await Order.updateOne({ _id: updated._id }, { $set: { "payment.basketId": orderRef } });
  return buildPayment({ order: updated, orderRef, customer }, c);
}

/**
 * When Easypay sends the browser back with an auth_token, the payment is finished by posting that token on to Easypay's
 * confirm address. Returns the same { url, method, fields } shape as a payment, or null if there is no usable token.
 * `postBackURL` is where Easypay should send the customer after confirming (our return address again).
 */
function confirmForm(params = {}, c = config()) {
  const token = String(params.auth_token || "").trim();
  if (!token || token.length > 500) return null;
  return {
    url: `${c.host}${CONFIRM_PATH}`,
    method: "POST",
    fields: { auth_token: token, postBackURL: `${c.backendUrl}/api/payments/easypaisa/return` },
  };
}

/** The order reference Easypay mentions in a return / IPN request (it has used several spellings). */
const refFromParams = (params = {}) =>
  String(params.orderRefNumber || params.orderRefNum || params.orderId || params.order_ref_num || "").trim();

/**
 * Asks Easypay's server whether this order reference was paid. Resolves to
 *   { ok: true, state: "paid" | "failed" | "pending", transactionId, amount, message }
 * or throws when Easypay can't be reached or answers something unusable (the caller leaves the order untouched).
 */
async function inquire(orderRef, c = config()) {
  const res = await fetch(`${c.host}${INQUIRY_PATH}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Credentials: Buffer.from(`${c.username}:${c.password}`).toString("base64"),
    },
    body: JSON.stringify({ orderId: orderRef, storeId: c.storeId, accountNum: c.accountNum }),
    signal: AbortSignal.timeout(INQUIRY_TIMEOUT_MS),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || typeof data !== "object") throw new Error(`Easypaisa inquiry failed (HTTP ${res.status})`);

  const status = String(data.transactionStatus || data.status || "").trim().toUpperCase();
  // The answer must be about the order we asked for, never a different one
  if (data.orderId !== undefined && String(data.orderId) !== String(orderRef)) throw new Error("Easypaisa inquiry answered for a different order");
  const state = PAID_STATUSES.includes(status) ? "paid" : FAILED_STATUSES.includes(status) ? "failed" : "pending";
  return {
    ok: true,
    state,
    transactionId: String(data.transactionId || data.transactionID || orderRef),
    amount: Number(data.transactionAmount ?? data.amount),
    message: String(data.responseDesc || data.transactionStatus || "").slice(0, 200),
  };
}

module.exports = {
  config,
  isConfigured,
  amountString,
  expiryStamp,
  orderRefFor,
  orderNumberFromRef,
  hashedRequest,
  buildPayment,
  startPayment,
  confirmForm,
  refFromParams,
  inquire,
};
