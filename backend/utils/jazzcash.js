// backend/utils/jazzcash.js — JazzCash online payment (Hosted Checkout / "Page Redirection").
//
// The flow (this site never sees a wallet PIN or card number: the customer pays on JazzCash's own page):
//   1. startPayment(order)  builds the signed form fields; the frontend posts them to JazzCash (src/lib/payment.js).
//   2. The customer pays on JazzCash. JazzCash then sends the customer's browser back to pp_ReturnURL
//                           (<BACKEND_URL>/api/payments/jazzcash/return) with the result, signed with the integrity salt.
//   3. verifyResponse(params) checks that signature before routes/payments.routes.js marks the order paid. A request
//                           without a valid signature proves nothing and is ignored. If you also set an IPN URL in the
//                           JazzCash portal (<BACKEND_URL>/api/payments/jazzcash/ipn) it is handled the same way.
//
// !! Check these against the integration guide JazzCash gave you with your merchant account: field names, the secure
// !! hash rule and the response codes follow the "Page Redirection v1.1" guide as of writing, but JazzCash can change
// !! them or enable different options on your account. Everything that might differ is in this one file (and the
// !! address can be overridden with JAZZCASH_BASE_URL).
//
// Environment (see .env.example):
//   JAZZCASH_MERCHANT_ID, JAZZCASH_PASSWORD, JAZZCASH_INTEGRITY_SALT   from your JazzCash merchant portal (secrets!)
//   JAZZCASH_ENV            "sandbox" (default) or "live"
//   JAZZCASH_BASE_URL       optional override of the whole payment form address
//   JAZZCASH_TXN_TYPE       "MWALLET" (default: JazzCash mobile account), "MPAY" / "OTC", or "ALL" to let the customer choose
//   JAZZCASH_RETURN_BASE    optional override of the public backend address (defaults to BACKEND_URL)
//   BACKEND_URL / FRONTEND_URL  as for PayFast
const crypto = require("crypto");
const { claimAttempt } = require("./paymentResult");
const Order = require("../models/Order");

const FORM_URLS = {
  sandbox: "https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/",
  live: "https://payments.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/",
};

const SUCCESS_CODE = "000"; // pp_ResponseCode for an approved payment
const PENDING_CODES = ["124", "210"]; // still waiting for the customer (wallet approval pending): not a failure yet
const HOLD_MINUTES_DEFAULT = 60;

const env = (k) => String(process.env[k] || "").trim();
const strip = (url) => url.replace(/\/+$/, "");

function config() {
  const mode = env("JAZZCASH_ENV").toLowerCase() === "live" ? "live" : "sandbox";
  const txnType = (env("JAZZCASH_TXN_TYPE") || "MWALLET").toUpperCase();
  return {
    merchantId: env("JAZZCASH_MERCHANT_ID"),
    password: env("JAZZCASH_PASSWORD"),
    salt: env("JAZZCASH_INTEGRITY_SALT"),
    mode,
    formUrl: env("JAZZCASH_BASE_URL") || FORM_URLS[mode],
    txnType: txnType === "ALL" ? "" : txnType,
    backendUrl: strip(env("JAZZCASH_RETURN_BASE") || env("BACKEND_URL")),
    frontendUrl: strip(env("FRONTEND_URL") || "http://localhost:3000"),
  };
}

/** True when JazzCash can be offered: merchant id, API password, integrity salt and a public backend address are set. */
const isConfigured = () => {
  const c = config();
  return Boolean(c.merchantId && c.password && c.salt && c.backendUrl);
};

/** JazzCash wants whole paisa: Rs 1,350 -> "135000". */
const paisa = (rupees) => String(Math.round(Number(rupees) * 100));

/** "20261015183000": yyyyMMddHHmmss in Pakistan time (UTC+5, no daylight saving), which is what JazzCash expects. */
const pktStamp = (d = new Date()) => new Date(d.getTime() + 5 * 3600 * 1000).toISOString().slice(0, 19).replace(/[-T:]/g, "");

/** pp_TxnRefNo for attempt `n` of an order: "K7QM-4TXD" attempt 2 -> "TK7QM4TXDA2" (max 20 characters, letters and digits only). A new one per attempt. */
const txnRefFor = (order, attempt) => `T${String(order.orderNumber).replace("-", "")}A${attempt}`;

/** "TK7QM4TXDA2" -> "K7QM-4TXD" (the order number), or "" if it isn't one of ours. */
function orderNumberFromTxnRef(ref) {
  const m = /^T([A-HJ-NP-Z2-9]{4})([A-HJ-NP-Z2-9]{4})A\d{1,3}$/.exec(String(ref || ""));
  return m ? `${m[1]}-${m[2]}` : "";
}

/**
 * The pp_SecureHash: HMAC-SHA256, keyed with the integrity salt, of  salt&value1&value2...  where the values are those of
 * every non-empty pp* field (not the hash itself) sorted by field name. Upper-case hex.
 */
function secureHash(params, c = config()) {
  const values = Object.keys(params)
    .filter((k) => k.startsWith("pp") && k !== "pp_SecureHash" && params[k] !== undefined && params[k] !== null && String(params[k]) !== "")
    .sort()
    .map((k) => String(params[k]));
  return crypto.createHmac("sha256", c.salt).update([c.salt, ...values].join("&")).digest("hex").toUpperCase();
}

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a).toUpperCase());
  const y = Buffer.from(String(b).toUpperCase());
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/** The { gateway, url, method, fields } the frontend posts to JazzCash. */
function buildPayment({ order, txnRef, now = new Date() }, c = config()) {
  const holdMin = Number(process.env.PAYMENT_HOLD_MINUTES);
  const hold = Number.isFinite(holdMin) && holdMin >= 10 ? holdMin : HOLD_MINUTES_DEFAULT;
  const fields = {
    pp_Version: "1.1",
    pp_TxnType: c.txnType,
    pp_Language: "EN",
    pp_MerchantID: c.merchantId,
    pp_SubMerchantID: "",
    pp_Password: c.password,
    pp_BankID: "TBANK",
    pp_ProductID: "RETL",
    pp_TxnRefNo: txnRef,
    pp_Amount: paisa(order.total),
    pp_TxnCurrency: "PKR",
    pp_TxnDateTime: pktStamp(now),
    pp_BillReference: String(order.orderNumber).replace("-", ""),
    pp_Description: `Order ${order.orderNumber}`,
    pp_TxnExpiryDateTime: pktStamp(new Date(now.getTime() + hold * 60 * 1000)),
    pp_ReturnURL: `${c.backendUrl}/api/payments/jazzcash/return`,
    ppmpf_1: "",
    ppmpf_2: "",
    ppmpf_3: "",
    ppmpf_4: "",
    ppmpf_5: "",
  };
  fields.pp_SecureHash = secureHash(fields, c);
  return { gateway: "jazzcash", url: c.formUrl, method: "POST", fields };
}

/**
 * Issues a JazzCash form for a JazzCash order that still needs paying (new attempt number, new reference).
 * Resolves to the payment object, or null when the order can't be paid any more (cancelled, already paid, not a
 * JazzCash order) — decided by one atomic update.
 */
async function startPayment(order) {
  const c = config();
  const updated = await claimAttempt(order, "jazzcash", "jazzcash");
  if (!updated) return null;
  if (!updated.orderNumber) throw new Error("Order has no order number");
  const txnRef = txnRefFor(updated, updated.payment?.attempts || 1);
  await Order.updateOne({ _id: updated._id }, { $set: { "payment.basketId": txnRef } });
  return buildPayment({ order: updated, txnRef }, c);
}

/**
 * Checks the parameters JazzCash sent back (browser return or IPN). Returns
 *   { ok: false } when the signature is missing or wrong (not from JazzCash: ignore it), or
 *   { ok: true, paid, pending, txnRef, orderNumber, transactionId, amount, message }.
 */
function verifyResponse(params = {}, c = config()) {
  const hash = String(params.pp_SecureHash || "");
  const txnRef = String(params.pp_TxnRefNo || "");
  const code = String(params.pp_ResponseCode ?? "");
  if (!c.salt || !hash || !txnRef || !code) return { ok: false };
  if (!safeEqual(hash, secureHash(params, c))) return { ok: false };
  const cents = Number(params.pp_Amount);
  return {
    ok: true,
    paid: code === SUCCESS_CODE,
    pending: PENDING_CODES.includes(code),
    txnRef,
    orderNumber: orderNumberFromTxnRef(txnRef),
    transactionId: String(params.pp_RetreivalReferenceNo || params.pp_RetrievalReferenceNo || txnRef), // JazzCash really spells it "Retreival"
    amount: Number.isFinite(cents) ? cents / 100 : NaN,
    message: String(params.pp_ResponseMessage || "").slice(0, 200),
  };
}

module.exports = {
  config,
  isConfigured,
  paisa,
  pktStamp,
  txnRefFor,
  orderNumberFromTxnRef,
  secureHash,
  buildPayment,
  startPayment,
  verifyResponse,
  SUCCESS_CODE,
};
