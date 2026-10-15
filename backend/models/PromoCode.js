// backend/models/PromoCode.js — discount codes the customer types at checkout.
//
//   type "percent"  -> `value` % off the items (optionally capped by maxDiscount)
//   type "fixed"    -> `value` Rs off the items (never more than the items cost)
//   type "shipping" -> the shipping fee is waived (`value` is ignored)
//
// A code works while it is `active`, between startsAt and expiresAt (both optional), while usedCount is
// below usageLimit (null = unlimited), and only when the items total reaches minSubtotal.
// perUserLimit is how many (not cancelled) orders one customer may place with it (null = unlimited).
const mongoose = require("mongoose");

const PROMO_TYPES = ["percent", "fixed", "shipping"];
const CODE_PATTERN = /^[A-Z0-9_-]{3,32}$/;

const promoSchema = new mongoose.Schema(
  {
    // Always stored in capitals, so "summer10" and "SUMMER10" are the same code.
    code: {
      type: String,
      required: [true, "A code is required."],
      unique: true,
      trim: true,
      uppercase: true,
      match: [CODE_PATTERN, "A code must be 3–32 letters, numbers, - or _."],
    },
    description: { type: String, trim: true, maxlength: [120, "The note can be at most 120 characters."] }, // for the admin only
    type: { type: String, enum: { values: PROMO_TYPES, message: "Choose a valid discount type." }, required: true },
    value: { type: Number, default: 0, min: [0, "The value can't be negative."] },
    minSubtotal: { type: Number, default: 0, min: [0, "The minimum order can't be negative."] },
    maxDiscount: { type: Number, min: [1, "The maximum discount must be at least Rs 1."] }, // percent codes only
    startsAt: Date,
    expiresAt: Date,
    usageLimit: { type: Number, min: [1, "The total uses must be at least 1."], validate: { validator: Number.isInteger, message: "The total uses must be a whole number." } },
    // No schema default on purpose: a missing value means "unlimited", and Mongoose would fill a default back in
    // when it loads a code. A NEW code gets 1 from the create route (see routes/promos.routes.js).
    perUserLimit: { type: Number, min: [1, "Uses per customer must be at least 1."], validate: { validator: Number.isInteger, message: "Uses per customer must be a whole number." } },
    usedCount: { type: Number, default: 0, min: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Rules that depend on more than one field (run on create and on every save)
promoSchema.pre("validate", function checkPromo() {
  if (this.type === "percent" && !(this.value > 0 && this.value <= 100)) {
    this.invalidate("value", "A percentage must be between 1 and 100.");
  }
  if (this.type === "fixed" && !(this.value > 0)) {
    this.invalidate("value", "The discount amount must be more than Rs 0.");
  }
  if (this.startsAt && this.expiresAt && this.expiresAt <= this.startsAt) {
    this.invalidate("expiresAt", "The end date must be after the start date.");
  }
});

promoSchema.index({ createdAt: -1 }); // admin list, newest first (code already has a unique index)

module.exports = mongoose.model("PromoCode", promoSchema);
module.exports.PROMO_TYPES = PROMO_TYPES;
