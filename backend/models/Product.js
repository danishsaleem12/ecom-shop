//backend/models/Product.js
const mongoose = require("mongoose");

// One purchasable combination of size and/or color, with its own stock.
// A product WITH variants is bought by picking one of them; a product without any works exactly as before.
const variantSchema = new mongoose.Schema({
  size: { type: String, trim: true, maxlength: [30, "Size can be at most 30 characters"], default: "" },
  color: { type: String, trim: true, maxlength: [30, "Color can be at most 30 characters"], default: "" },
  sku: { type: String, trim: true, maxlength: [60, "SKU can be at most 60 characters"] },
  stock: {
    type: Number,
    default: 0,
    min: [0, "Stock can't be negative"],
    validate: { validator: Number.isInteger, message: "Stock must be a whole number" },
  },
});

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    // Money can't be negative or Infinity/NaN — a typo in the admin form must not reach the database
    price: {
      type: Number,
      required: true,
      min: [0, "Price can't be negative"],
      validate: { validator: Number.isFinite, message: "Price must be a valid number" },
    },
    image: { type: String, required: true }, // the cover: shown in listings, the bag and orders
    // More photos for the product page gallery (the cover is NOT repeated here), in display order.
    images: {
      type: [String],
      default: [],
      validate: { validator: (list) => list.length <= 8, message: "A product can have at most 8 extra images" },
    },
    category: { type: String, default: "general", trim: true },
    // Stock is a whole number >= 0 (the order flow also guards against going below 0 atomically)
    stock: {
      type: Number,
      default: 0,
      min: [0, "Stock can't be negative"],
      validate: { validator: Number.isInteger, message: "Stock must be a whole number" },
    },
    // Marketing collections this product appears under, e.g.
    // ["spring-summer", "linen"] — matches the `slug` values in
    // frontend/src/lib/collections.js. Independent of `category`
    // (a product's category is what it IS; its collections are
    // which curated groupings it shows up in).
    collections: { type: [String], default: [] },
    // Sizes / colors with per-variant stock. When this list is not empty, `stock` above is the SUM of the
    // variants' stock (kept in step by the validate hook below and by the order flow), so listings and
    // "sold out" badges keep working unchanged.
    variants: { type: [variantSchema], default: [] },
    // Customer rating, kept in step by the review routes (utils/reviews.js) from the published reviews.
    // Stored here so product lists can show stars and sort by rating without counting reviews each time.
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

const variantKey = (v) => `${(v.size || "").trim().toLowerCase()}|${(v.color || "").trim().toLowerCase()}`;

// No `next` callback: Mongoose 9 no longer passes one, and a synchronous hook just continues when it returns.
productSchema.pre("validate", function syncVariantStock() {
  if (this.variants && this.variants.length > 0) {
    const seen = new Set();
    for (const v of this.variants) {
      if (!v.size && !v.color) {
        this.invalidate("variants", "Each variant needs a size or a color.");
        continue;
      }
      const key = variantKey(v);
      if (seen.has(key)) this.invalidate("variants", `Duplicate variant: ${[v.size, v.color].filter(Boolean).join(" / ")}.`);
      seen.add(key);
    }
    this.stock = this.variants.reduce((n, v) => n + (v.stock || 0), 0);
  }
});

// ---- Indexes (Mongoose builds these automatically on startup) ----
productSchema.index({ collections: 1 }); // ?collection=slug  (multikey, exact match)
productSchema.index({ category: 1 }); // ?category=  (note: that filter is a case-insensitive regex)
productSchema.index({ createdAt: -1 }); // sort=featured / newest
productSchema.index({ price: 1 }); // sort=price-asc|desc and the min/max price filter
productSchema.index({ name: 1 }); // sort=name-asc
productSchema.index({ ratingAverage: -1, ratingCount: -1 }); // sort=rating

module.exports = mongoose.model("Product", productSchema);