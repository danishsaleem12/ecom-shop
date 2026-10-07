const express = require("express");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const router = express.Router();
const Product = require("../models/Product");
const upload = require("../middleware/upload");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

// Deletes a file from /uploads. Ignores external URLs.
const removeLocalImage = (imagePath) => {
  if (!imagePath || !imagePath.startsWith("/uploads/")) return;
  fs.unlink(path.join(UPLOAD_DIR, path.basename(imagePath)), () => {});
};

// Escapes user input before it goes into a RegExp (prevents regex injection
// and "$" / "." style special chars breaking the query).
const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// collections can arrive as a real array (JSON body), a comma-separated
// string ("spring-summer,linen"), a single string, or be absent entirely.
// Always normalize to a clean array of lowercase slugs before saving.
const normalizeCollections = (value) => {
  if (value === undefined) return undefined; // don't touch the field if it wasn't sent
  const list = Array.isArray(value) ? value : String(value).split(",");
  return list.map((s) => s.trim().toLowerCase()).filter(Boolean);
};

// Maps the Shop page's ?sort= value to a Mongo sort object.
const SORT_MAP = {
  featured: { createdAt: -1 },
  newest: { createdAt: -1 },
  "price-asc": { price: 1 },
  "price-desc": { price: -1 },
  "name-asc": { name: 1 },
};

/**
 * GET /api/products
 *
 * Supports (all optional, all backward compatible — calling this with no
 * query params behaves exactly like before, just still an array):
 *   ?category=dresses        case-insensitive exact match on Product.category
 *   ?collection=spring-summer matches products tagged with this collection slug
 *   ?ids=64f...,64f...        bulk-fetch specific products by _id (Wishlist page) —
 *                              invalid/malformed ids are silently dropped rather
 *                              than erroring, and an all-invalid list returns []
 *                              immediately instead of matching nothing via Mongo
 *   ?search=linen             matches name OR description, case-insensitive
 *   ?minPrice=50&maxPrice=300 inclusive price range
 *   ?sort=featured|newest|price-asc|price-desc|name-asc
 *   ?page=2&limit=12          pagination (limit capped at 60)
 *
 * The response BODY stays a plain array (so existing pages like
 * ProductSection.js / Newarrivalssection.js keep working unchanged).
 * Pagination metadata goes in headers instead:
 *   X-Total-Count  → total matching products (before pagination)
 *   X-Total-Pages  → total pages at the current limit
 *
 * NOTE: if your backend's CORS setup restricts response headers, add
 *   exposedHeaders: ["X-Total-Count", "X-Total-Pages"]
 * to the cors() options in your server entry file, or the frontend won't
 * be able to read these two headers cross-origin.
 */
router.get("/", async (req, res) => {
  try {
    const { category, collection, ids, search, minPrice, maxPrice, sort, page, limit } = req.query;

    const filter = {};

    if (ids) {
      const idList = String(ids)
        .split(",")
        .map((s) => s.trim())
        .filter((s) => mongoose.Types.ObjectId.isValid(s));

      // Every id was malformed (or the list was empty after trimming) —
      // short-circuit to an empty result instead of letting Mongo run a
      // query that would match nothing anyway. Keeps the Wishlist page's
      // "0 saved" case cheap and explicit.
      if (idList.length === 0) {
        res.set("X-Total-Count", "0");
        res.set("X-Total-Pages", "1");
        return res.json([]);
      }
      filter._id = { $in: idList };
    }

    if (category && category !== "all") {
      filter.category = { $regex: new RegExp(`^${escapeRegex(category)}$`, "i") };
    }

    if (collection) {
      // collections is an array field — this matches any doc whose array
      // contains this exact slug (Mongo does this natively, no $in needed)
      filter.collections = String(collection).trim().toLowerCase();
    }

    if (search) {
      const term = escapeRegex(search);
      filter.$or = [
        { name: { $regex: term, $options: "i" } },
        { description: { $regex: term, $options: "i" } },
      ];
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice && !Number.isNaN(Number(minPrice))) filter.price.$gte = Number(minPrice);
      if (maxPrice && !Number.isNaN(Number(maxPrice))) filter.price.$lte = Number(maxPrice);
      if (Object.keys(filter.price).length === 0) delete filter.price;
    }

    const sortQuery = SORT_MAP[sort] || SORT_MAP.featured;

    // No pagination params at all → old behaviour: every match, no slicing.
    const isPaginated = page !== undefined || limit !== undefined;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(60, Math.max(1, parseInt(limit, 10) || 12));

    const total = await Product.countDocuments(filter);

    let query = Product.find(filter).sort(sortQuery);
    if (isPaginated) {
      query = query.skip((pageNum - 1) * limitNum).limit(limitNum);
    }

    const products = await query;

    res.set("X-Total-Count", String(total));
    res.set("X-Total-Pages", String(isPaginated ? Math.max(1, Math.ceil(total / limitNum)) : 1));
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch products", error: err.message });
  }
});

// GET /api/products/:id
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch product", error: err.message });
  }
});

// POST /api/products (multipart: field "image" = file, or JSON with an image URL)
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) data.image = `/uploads/${req.file.filename}`;
    const normalized = normalizeCollections(data.collections);
    if (normalized !== undefined) data.collections = normalized;
    const product = await Product.create(data);
    res.status(201).json(product);
  } catch (err) {
    if (req.file) removeLocalImage(`/uploads/${req.file.filename}`);
    res.status(400).json({ message: "Failed to create product", error: err.message });
  }
});

// PUT /api/products/:id (image optional; keeps the old one if none sent)
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      if (req.file) removeLocalImage(`/uploads/${req.file.filename}`);
      return res.status(404).json({ message: "Product not found" });
    }

    const oldImage = product.image;
    const data = { ...req.body };
    if (req.file) data.image = `/uploads/${req.file.filename}`;
    const normalized = normalizeCollections(data.collections);
    if (normalized !== undefined) data.collections = normalized;

    product.set(data);
    await product.save();

    if (req.file) removeLocalImage(oldImage); // replaced, so delete the old file
    res.json(product);
  } catch (err) {
    if (req.file) removeLocalImage(`/uploads/${req.file.filename}`);
    res.status(400).json({ message: "Failed to update product", error: err.message });
  }
});

// DELETE /api/products/:id
router.delete("/:id", async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    removeLocalImage(product.image);
    res.json({ message: "Product deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete product", error: err.message });
  }
});

module.exports = router;