// backend/routes/reviews.routes.js
//   GET    /api/reviews/product/:productId        (public)    published reviews + rating summary, ?sort=newest|highest|lowest&page=&limit=
//   GET    /api/reviews/product/:productId/mine   (signed in) the customer's own review of it + whether they may write one
//   POST   /api/reviews/product/:productId        (signed in) write a review: { rating 1-5, title?, comment? }
//   PUT    /api/reviews/:id                       (author)    edit own review
//   DELETE /api/reviews/:id                       (author or admin)
//   GET    /api/reviews/admin/all                 (admin)     every review, ?status=&search=&page=&limit=
//   PATCH  /api/reviews/:id/status                (admin)     { status: "published" | "hidden" }
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Review = require("../models/Review");
const { REVIEW_STATUSES } = require("../models/Review");
const Product = require("../models/Product");
const { protect, adminOnly } = require("../middleware/auth");
const { handleRouteError } = require("../utils/errors");
const { escapeRegex, parsePaging, pageInfo, searchTerm } = require("../utils/pagination");
const { requirePurchase, displayName, hasPurchased, ratingSummary, refreshProductRating } = require("../utils/reviews");

const isId = (v) => mongoose.Types.ObjectId.isValid(String(v));
const toId = (v) => new mongoose.Types.ObjectId(String(v));

const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  highest: { rating: -1, createdAt: -1, _id: -1 },
  lowest: { rating: 1, createdAt: -1, _id: -1 },
};

// What the public sees of a review: no user id, no email, no moderation status.
const publicReview = (r) => ({
  _id: r._id,
  authorName: r.authorName,
  rating: r.rating,
  title: r.title || "",
  comment: r.comment || "",
  verifiedPurchase: Boolean(r.verifiedPurchase),
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
});

// Reads rating / title / comment from a request body. Returns { data } or { error } (a message for the customer).
function readFields(body = {}, { requireRating }) {
  const data = {};
  if (body.rating !== undefined || requireRating) {
    const n = typeof body.rating === "number" ? body.rating : typeof body.rating === "string" && body.rating.trim() !== "" ? Number(body.rating) : NaN;
    if (!Number.isInteger(n) || n < 1 || n > 5) return { error: "Please choose a rating from 1 to 5." };
    data.rating = n;
  }
  for (const [field, max, label] of [["title", 100, "Title"], ["comment", 2000, "Review"]]) {
    if (body[field] === undefined) continue;
    if (typeof body[field] !== "string") return { error: `${label} must be text.` };
    const text = body[field].trim();
    if (text.length > max) return { error: `${label} can be at most ${max} characters.` };
    data[field] = text;
  }
  return { data };
}

// ---- public: a product's reviews ------------------------------------------------------------------------

router.get("/product/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    if (!isId(productId)) return res.status(404).json({ message: "Product not found" });
    const pid = toId(productId);

    const paging = parsePaging(req.query, { defaultLimit: 10, maxLimit: 50 });
    const sort = SORTS[req.query.sort] || SORTS.newest;
    const filter = { product: pid, status: "published" };

    const [summary, rows] = await Promise.all([
      ratingSummary(pid),
      Review.find(filter).sort(sort).skip(paging.skip).limit(paging.limit).lean(),
    ]);

    res.json({ reviews: rows.map(publicReview), summary, ...pageInfo(summary.count, paging) });
  } catch (err) {
    handleRouteError(res, err, "Failed to fetch reviews");
  }
});

// ---- customer -------------------------------------------------------------------------------------------

// The product page asks this once the customer is signed in, to decide between "write a review",
// "edit your review" and "only customers who received this product can review it".
router.get("/product/:productId/mine", protect, async (req, res) => {
  try {
    const { productId } = req.params;
    if (!isId(productId)) return res.status(404).json({ message: "Product not found" });
    const pid = toId(productId);

    const [mine, purchased] = await Promise.all([Review.findOne({ product: pid, user: req.user._id }).lean(), hasPurchased(req.user._id, pid)]);
    const verified = req.user.emailVerified !== false;
    res.json({
      review: mine ? { ...publicReview(mine), status: mine.status } : null,
      purchased,
      canReview: !mine && verified && (purchased || !requirePurchase()),
      needsPurchase: !mine && requirePurchase() && !purchased,
      needsVerification: !mine && !verified,
    });
  } catch (err) {
    handleRouteError(res, err, "Failed to check your review");
  }
});

router.post("/product/:productId", protect, async (req, res) => {
  try {
    const { productId } = req.params;
    if (!isId(productId)) return res.status(404).json({ message: "Product not found" });
    const pid = toId(productId);

    if (req.user.emailVerified === false) {
      return res.status(403).json({ code: "EMAIL_NOT_VERIFIED", message: "Please confirm your email address before writing a review." });
    }

    const { data, error } = readFields(req.body, { requireRating: true });
    if (error) return res.status(400).json({ message: error });

    if (!(await Product.exists({ _id: pid }))) return res.status(404).json({ message: "Product not found" });

    const purchased = await hasPurchased(req.user._id, pid);
    if (requirePurchase() && !purchased) {
      return res.status(403).json({ code: "PURCHASE_REQUIRED", message: "Only customers who have received this product can review it." });
    }

    let review;
    try {
      review = await Review.create({ ...data, product: pid, user: req.user._id, authorName: displayName(req.user.name), verifiedPurchase: purchased });
    } catch (err) {
      if (err?.code === 11000) return res.status(409).json({ message: "You have already reviewed this product. You can edit your review instead." });
      throw err;
    }

    const stats = await refreshProductRating(pid);
    res.status(201).json({ review: { ...publicReview(review), status: review.status }, summary: stats });
  } catch (err) {
    handleRouteError(res, err, "Failed to save your review");
  }
});

router.put("/:id", protect, async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: "Review not found" });
    const review = await Review.findById(req.params.id);
    // Someone else's review looks the same as a missing one, so ids can't be probed
    if (!review || String(review.user) !== String(req.user._id)) return res.status(404).json({ message: "Review not found" });

    const { data, error } = readFields(req.body, { requireRating: false });
    if (error) return res.status(400).json({ message: error });
    if (Object.keys(data).length === 0) return res.status(400).json({ message: "Nothing to change." });

    review.set(data);
    await review.save();
    await refreshProductRating(review.product);
    res.json({ review: { ...publicReview(review), status: review.status } });
  } catch (err) {
    handleRouteError(res, err, "Failed to update your review");
  }
});

router.delete("/:id", protect, async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: "Review not found" });
    const review = await Review.findById(req.params.id);
    const isOwner = review && String(review.user) === String(req.user._id);
    if (!review || (!isOwner && req.user.role !== "admin")) return res.status(404).json({ message: "Review not found" });

    await Review.deleteOne({ _id: review._id });
    await refreshProductRating(review.product);
    res.json({ message: "Review deleted" });
  } catch (err) {
    handleRouteError(res, err, "Failed to delete the review");
  }
});

// ---- admin ----------------------------------------------------------------------------------------------

router.get("/admin/all", protect, adminOnly, async (req, res) => {
  try {
    const paging = parsePaging(req.query);
    const filter = {};
    if (REVIEW_STATUSES.includes(req.query.status)) filter.status = req.query.status;
    const search = searchTerm(req.query.search);
    if (search) {
      const rx = { $regex: escapeRegex(search), $options: "i" };
      filter.$or = [{ authorName: rx }, { title: rx }, { comment: rx }];
    }

    const [total, hidden, rows] = await Promise.all([
      Review.countDocuments(filter),
      Review.countDocuments({ status: "hidden" }),
      Review.find(filter).sort(SORTS.newest).skip(paging.skip).limit(paging.limit).populate("product", "name image").lean(),
    ]);
    res.json({ reviews: rows, hidden, ...pageInfo(total, paging) });
  } catch (err) {
    handleRouteError(res, err, "Failed to fetch reviews");
  }
});

router.patch("/:id/status", protect, adminOnly, async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: "Review not found" });
    const { status } = req.body || {};
    if (!REVIEW_STATUSES.includes(status)) return res.status(400).json({ message: `Status must be one of: ${REVIEW_STATUSES.join(", ")}` });

    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: "Review not found" });
    review.status = status;
    await review.save();
    await refreshProductRating(review.product);
    res.json({ review });
  } catch (err) {
    handleRouteError(res, err, "Failed to update the review");
  }
});

module.exports = router;
