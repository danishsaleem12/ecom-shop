//backend/models/Product.js
const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, required: true },
    category: { type: String, default: "general" },
    stock: { type: Number, default: 0 },
    // Marketing collections this product appears under, e.g.
    // ["spring-summer", "linen"] — matches the `slug` values in
    // frontend/src/lib/collections.js. Independent of `category`
    // (a product's category is what it IS; its collections are
    // which curated groupings it shows up in).
    collections: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);