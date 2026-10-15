// backend/utils/reviews.js — rating maths and small helpers shared by the review routes
const Review = require("../models/Review");
const Product = require("../models/Product");
const Order = require("../models/Order");

// By default only customers who received the product can review it. Set REVIEWS_REQUIRE_PURCHASE=false to let
// any signed-in (email-verified) customer review (they just won't get the "Verified purchase" label).
const requirePurchase = () => process.env.REVIEWS_REQUIRE_PURCHASE !== "false";

/** "Ayesha Khan" -> "Ayesha K."; a single name stays as it is. Never exposes the email. */
function displayName(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "Customer";
  const first = parts[0].slice(0, 30);
  return parts.length === 1 ? first : `${first} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

/** Has this customer received (a delivered order of) this product? */
async function hasPurchased(userId, productId) {
  const found = await Order.exists({ user: userId, status: "delivered", "items.product": productId });
  return Boolean(found);
}

/** { average, count, distribution: {1..5} } for the published reviews of a product. Average has one decimal. */
async function ratingSummary(productId) {
  const rows = await Review.aggregate([
    { $match: { product: productId, status: "published" } },
    { $group: { _id: "$rating", n: { $sum: 1 } } },
  ]);
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let count = 0;
  let sum = 0;
  for (const r of rows) {
    if (distribution[r._id] === undefined) continue;
    distribution[r._id] = r.n;
    count += r.n;
    sum += r._id * r.n;
  }
  return { average: count ? Math.round((sum / count) * 10) / 10 : 0, count, distribution };
}

/** Recomputes ratingAverage / ratingCount stored on the product (used by the shop cards and sorting). */
async function refreshProductRating(productId) {
  const { average, count } = await ratingSummary(productId);
  await Product.updateOne({ _id: productId }, { $set: { ratingAverage: average, ratingCount: count } });
  return { average, count };
}

module.exports = { requirePurchase, displayName, hasPurchased, ratingSummary, refreshProductRating };
