// backend/utils/promo.js — the rules for promo codes, shared by the checkout route and the "apply code" route
// so the preview a customer sees and the order that is saved can never disagree.
const PromoCode = require("../models/PromoCode");
const Order = require("../models/Order");

const round2 = (n) => Math.round(n * 100) / 100;
const money = (n) => `Rs ${Number(n || 0).toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;

/** What the customer typed, as the stored form: trimmed, no spaces, capitals. "" when it isn't text. */
const normalizePromoCode = (v) => (typeof v === "string" ? v.trim().replace(/\s+/g, "").toUpperCase() : "");

/** How much a code takes off. `subtotal` = the items, `shipping` = the shipping fee this order would pay. */
function computeDiscount(promo, { subtotal, shipping }) {
  let off = 0;
  if (promo.type === "percent") {
    off = (subtotal * promo.value) / 100;
    if (promo.maxDiscount != null) off = Math.min(off, promo.maxDiscount);
  } else if (promo.type === "fixed") {
    off = Math.min(promo.value, subtotal);
  } else if (promo.type === "shipping") {
    off = shipping;
  }
  return round2(Math.max(0, Math.min(off, subtotal + shipping)));
}

// The same short answer for "no such code" and "switched off", so codes can't be probed for.
const NOT_VALID = "That code isn't valid.";

/**
 * Looks the code up and checks everything. Resolves to { ok: true, promo, discount } or { ok: false, message }.
 * `message` is written for the customer.
 */
async function evaluatePromo(raw, { subtotal, shipping, userId, now = new Date() }) {
  const code = normalizePromoCode(raw);
  if (!code) return { ok: false, message: "Enter a promo code." };

  const promo = await PromoCode.findOne({ code });
  if (!promo || !promo.active) return { ok: false, message: NOT_VALID };
  if (promo.startsAt && promo.startsAt > now) return { ok: false, message: "This code isn't active yet." };
  if (promo.expiresAt && promo.expiresAt < now) return { ok: false, message: "This code has expired." };
  if (promo.usageLimit != null && promo.usedCount >= promo.usageLimit) {
    return { ok: false, message: "This code has been fully redeemed." };
  }
  if (promo.minSubtotal > 0 && subtotal < promo.minSubtotal) {
    return { ok: false, message: `Spend ${money(promo.minSubtotal)} or more to use this code.` };
  }

  const discount = computeDiscount(promo, { subtotal, shipping });
  if (discount <= 0) {
    return {
      ok: false,
      message: promo.type === "shipping" ? "Your order already ships free." : "This code doesn't apply to your order.",
    };
  }

  // Per-customer limit. Cancelled orders don't count, so cancelling gives the use back.
  if (promo.perUserLimit != null && userId) {
    const used = await Order.countDocuments({ user: userId, "promo.code": promo.code, status: { $ne: "cancelled" } });
    if (used >= promo.perUserLimit) {
      return { ok: false, message: promo.perUserLimit === 1 ? "You've already used this code." : "You've used this code the maximum number of times." };
    }
  }

  return { ok: true, promo, discount };
}

/**
 * Counts one use. Only succeeds while the code is still active and under its total limit, in a single atomic
 * update, so two shoppers can't both take the last use. Resolves to true / false.
 */
async function redeemPromo(promo) {
  const filter = { _id: promo._id, active: true };
  if (promo.usageLimit != null) filter.usedCount = { $lt: promo.usageLimit };
  const r = await PromoCode.updateOne(filter, { $inc: { usedCount: 1 } });
  return r.modifiedCount === 1;
}

/** Gives a use back (checkout failed after it was counted, or the order was cancelled). */
const releasePromo = (id) => PromoCode.updateOne({ _id: id, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } });

module.exports = { normalizePromoCode, computeDiscount, evaluatePromo, redeemPromo, releasePromo };
