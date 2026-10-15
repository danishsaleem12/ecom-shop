// backend/utils/paymentMethods.js — the ways a customer can pay, in one place.
//
//   cod        cash on delivery (no gateway)
//   card       PayFast Pakistan (card or mobile wallet on PayFast's own page)   -> utils/payfast.js
//   jazzcash   JazzCash hosted checkout                                         -> utils/jazzcash.js
//   easypaisa  Easypaisa (Easypay) hosted checkout                              -> utils/easypaisa.js
//
// Every method except "cod" is an "online" method: the order is saved unpaid, the customer pays on the gateway's
// page, and only the backend (webhook / return handler, verified) marks it paid.
const ONLINE_METHODS = ["card", "jazzcash", "easypaisa"];
const PAYMENT_METHODS = ["cod", ...ONLINE_METHODS];

const isOnline = (method) => ONLINE_METHODS.includes(method);

/** Display name of the gateway behind a method ("PayFast", "JazzCash", "Easypaisa"). */
const GATEWAY_NAME = { card: "PayFast", jazzcash: "JazzCash", easypaisa: "Easypaisa" };
const gatewayName = (method) => GATEWAY_NAME[method] || "the payment provider";

/** "paid online by card" / "paid online by JazzCash" / "cash on delivery" — used in emails. */
const payNote = (method) => (method === "card" ? "paid online by card" : isOnline(method) ? `paid online by ${gatewayName(method)}` : "cash on delivery");

/** The gateway module for a method (loaded lazily so a broken gateway file can't stop the others). */
function gatewayFor(method) {
  if (method === "card") return require("./payfast");
  if (method === "jazzcash") return require("./jazzcash");
  if (method === "easypaisa") return require("./easypaisa");
  return null;
}

/**
 * Which online methods are switched on right now: { card: bool, jazzcash: bool, easypaisa: bool }.
 * A method is on only when its gateway has all its keys in the environment (isConfigured()). Until then the
 * checkout shows it as "Coming soon" and the order route refuses it, so only cash on delivery can be used.
 */
function availableMethods() {
  const out = {};
  for (const m of ONLINE_METHODS) {
    try {
      out[m] = Boolean(gatewayFor(m).isConfigured());
    } catch {
      out[m] = false; // a broken gateway file must never take the checkout down
    }
  }
  return out;
}

module.exports = { ONLINE_METHODS, PAYMENT_METHODS, isOnline, gatewayName, payNote, gatewayFor, availableMethods };
