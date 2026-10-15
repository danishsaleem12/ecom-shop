// backend/models/Review.js
const mongoose = require("mongoose");

const REVIEW_STATUSES = ["published", "hidden"];

// One customer's rating (and optional written review) of one product. A customer can review a product once.
const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Shown publicly instead of the full name / email, e.g. "Ayesha K." — copied when the review is written
    authorName: { type: String, required: true, trim: true, maxlength: 60 },
    rating: {
      type: Number,
      required: [true, "Please choose a rating from 1 to 5"],
      min: [1, "Rating must be between 1 and 5"],
      max: [5, "Rating must be between 1 and 5"],
      validate: { validator: Number.isInteger, message: "Rating must be a whole number" },
    },
    title: { type: String, trim: true, maxlength: [100, "Title can be at most 100 characters"], default: "" },
    comment: { type: String, trim: true, maxlength: [2000, "Review can be at most 2000 characters"], default: "" },
    // True when the customer has a delivered order containing this product
    verifiedPurchase: { type: Boolean, default: false },
    // Admins can hide a review (spam, abuse). Hidden reviews are not shown and do not count towards the rating.
    status: { type: String, enum: REVIEW_STATUSES, default: "published" },
  },
  { timestamps: true }
);

// ---- Indexes ----
reviewSchema.index({ product: 1, user: 1 }, { unique: true }); // one review per customer per product
reviewSchema.index({ product: 1, status: 1, createdAt: -1 }); // the product page list
reviewSchema.index({ createdAt: -1 }); // admin list

module.exports = mongoose.model("Review", reviewSchema);
module.exports.REVIEW_STATUSES = REVIEW_STATUSES;
