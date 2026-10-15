// backend/routes/promos.routes.js
//   POST   /api/promos/validate   (signed-in customer) check a code against a subtotal — the checkout "Apply" button
//   GET    /api/promos            (admin) list, ?search=&page=&limit=
//   POST   /api/promos            (admin) create
//   PATCH  /api/promos/:id        (admin) edit (the code itself can't change: orders keep a copy of it)
//   DELETE /api/promos/:id        (admin) delete (past orders keep their discount and a copy of the code)
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const PromoCode = require("../models/PromoCode");
const { PROMO_TYPES } = require("../models/PromoCode");
const { protect, adminOnly } = require("../middleware/auth");
const { handleRouteError } = require("../utils/errors");
const { escapeRegex, parsePaging, pageInfo, searchTerm } = require("../utils/pagination");
const { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } = require("../utils/storeConfig");
const { normalizePromoCode, evaluatePromo } = require("../utils/promo");

// ---- customer: apply a code ----------------------------------------------------------------------

// Only a PREVIEW for the checkout screen: the order route runs the same checks again and prices the order itself.
router.post("/validate", protect, async (req, res) => {
  try {
    const { code, subtotal } = req.body || {};
    if (typeof code !== "string" || !normalizePromoCode(code)) {
      return res.status(400).json({ valid: false, message: "Enter a promo code." });
    }
    if (typeof subtotal !== "number" || !Number.isFinite(subtotal) || subtotal < 0) {
      return res.status(400).json({ valid: false, message: "Order subtotal is required." });
    }
    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    const r = await evaluatePromo(code, { subtotal, shipping, userId: req.user._id });
    if (!r.ok) return res.status(400).json({ valid: false, message: r.message });

    const { promo } = r;
    res.json({ valid: true, code: promo.code, type: promo.type, value: promo.value, discount: r.discount });
  } catch (err) {
    handleRouteError(res, err, "Failed to check the code");
  }
});

// ---- admin ----------------------------------------------------------------------------------------

// Turns the form body into fields for the model. Only fields that were sent are returned, with the right types;
// "" clears an optional field. Rules involving several fields (percent <= 100, end after start) live in the model.
// Returns { data } or { error }.
function readFields(body = {}, { create }) {
  const data = {};
  const bad = (error) => ({ error });

  if (create) {
    const code = normalizePromoCode(body.code);
    if (!/^[A-Z0-9_-]{3,32}$/.test(code)) return bad("A code must be 3–32 letters, numbers, - or _.");
    data.code = code;
  }

  if (body.type !== undefined) {
    if (!PROMO_TYPES.includes(body.type)) return bad(`Type must be one of: ${PROMO_TYPES.join(", ")}`);
    data.type = body.type;
  } else if (create) {
    return bad("Choose a discount type.");
  }

  if (body.description !== undefined) {
    if (body.description !== null && typeof body.description !== "string") return bad("The note must be text.");
    data.description = (body.description || "").trim();
  }

  // numbers: "" / null mean "not set" for the optional ones
  const num = (key, label, { optional = false, integer = false } = {}) => {
    if (body[key] === undefined) return null;
    if (body[key] === "" || body[key] === null) {
      if (optional) data[key] = undefined; // removed below with $unset semantics (document.set(undefined))
      return null;
    }
    const n = typeof body[key] === "string" ? Number(body[key]) : body[key];
    if (typeof n !== "number" || !Number.isFinite(n)) return `${label} must be a number.`;
    if (integer && !Number.isInteger(n)) return `${label} must be a whole number.`;
    data[key] = n;
    return null;
  };
  const problem =
    num("value", "Value") ||
    num("minSubtotal", "Minimum order") ||
    num("maxDiscount", "Maximum discount", { optional: true }) ||
    num("usageLimit", "Total uses", { optional: true, integer: true }) ||
    num("perUserLimit", "Uses per customer", { optional: true, integer: true });
  if (problem) return bad(problem);
  if (data.minSubtotal === undefined && "minSubtotal" in body && (body.minSubtotal === "" || body.minSubtotal === null)) data.minSubtotal = 0;

  for (const key of ["startsAt", "expiresAt"]) {
    if (body[key] === undefined) continue;
    if (body[key] === "" || body[key] === null) {
      data[key] = undefined;
      continue;
    }
    const d = new Date(body[key]);
    if (typeof body[key] !== "string" || Number.isNaN(d.getTime())) return bad(`${key === "startsAt" ? "Start" : "End"} date is not valid.`);
    data[key] = d;
  }

  if (body.active !== undefined) {
    if (typeof body.active !== "boolean") return bad("Active must be true or false.");
    data.active = body.active;
  }

  // Shipping codes have no amount, and only percent codes use a cap: don't keep values that mean nothing
  if (data.type === "shipping") data.value = 0;
  if (data.type && data.type !== "percent") data.maxDiscount = undefined;

  return { data };
}

// GET /api/promos — newest first, one page at a time; ?search= matches the code or the note
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const paging = parsePaging(req.query, { defaultLimit: 20, maxLimit: 100 });
    const term = searchTerm(req.query.search);
    const filter = term ? { $or: [{ code: new RegExp(escapeRegex(term), "i") }, { description: new RegExp(escapeRegex(term), "i") }] } : {};
    const [total, promos] = await Promise.all([
      PromoCode.countDocuments(filter),
      PromoCode.find(filter).sort({ createdAt: -1, _id: -1 }).skip(paging.skip).limit(paging.limit),
    ]);
    res.json({ promos, ...pageInfo(total, paging) });
  } catch (err) {
    handleRouteError(res, err, "Failed to load promo codes");
  }
});

// POST /api/promos
router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const { data, error } = readFields(req.body, { create: true });
    if (error) return res.status(400).json({ message: error });
    if (!("perUserLimit" in req.body)) data.perUserLimit = 1; // sent as "" = unlimited; not sent at all = one use each
    const promo = await PromoCode.create(data);
    res.status(201).json({ promo });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: "A promo code with that name already exists" });
    handleRouteError(res, err, "Failed to create promo code");
  }
});

// PATCH /api/promos/:id
router.patch("/:id", protect, adminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ message: "Promo code not found" });
    const { data, error } = readFields({ ...req.body, code: undefined }, { create: false });
    if (error) return res.status(400).json({ message: error });

    const promo = await PromoCode.findById(req.params.id);
    if (!promo) return res.status(404).json({ message: "Promo code not found" });
    for (const [key, value] of Object.entries(data)) promo.set(key, value); // undefined removes an optional field
    await promo.save(); // the model checks the rules that involve several fields
    res.json({ promo });
  } catch (err) {
    handleRouteError(res, err, "Failed to update promo code");
  }
});

// DELETE /api/promos/:id
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ message: "Promo code not found" });
    const promo = await PromoCode.findByIdAndDelete(req.params.id);
    if (!promo) return res.status(404).json({ message: "Promo code not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    handleRouteError(res, err, "Failed to delete promo code");
  }
});

module.exports = router;
