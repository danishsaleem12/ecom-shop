const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Product = require("../models/Product");
const upload = require("../middleware/upload");
const { protect, adminOnly } = require("../middleware/auth");
const { handleRouteError } = require("../utils/errors");
const { saveImage, removeImage } = require("../utils/imageStorage");
const Review = require("../models/Review");

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

// variants arrive as a real array (JSON body) or a JSON string (multipart form). Returns undefined when the
// field wasn't sent (leave it alone), [] to remove all variants, or a clean list. An entry's _id is kept so
// bags and past orders keep pointing at the same variant when the admin edits a product.
// Throws a RangeError with a customer-readable message for anything malformed.
const MAX_VARIANTS = 100;
const normalizeVariants = (value) => {
  if (value === undefined) return undefined;
  let list = value;
  if (typeof value === "string") {
    if (!value.trim()) return [];
    try {
      list = JSON.parse(value);
    } catch {
      throw new RangeError("Variants must be a valid list");
    }
  }
  if (!Array.isArray(list)) throw new RangeError("Variants must be a list");
  if (list.length > MAX_VARIANTS) throw new RangeError(`A product can have at most ${MAX_VARIANTS} variants`);
  return list.map((v) => {
    if (!v || typeof v !== "object") throw new RangeError("Invalid variant");
    const clean = {
      size: String(v.size ?? "").trim(),
      color: String(v.color ?? "").trim(),
      stock: v.stock === undefined || v.stock === "" ? 0 : Number(v.stock),
    };
    const sku = String(v.sku ?? "").trim();
    if (sku) clean.sku = sku;
    if (v._id && mongoose.Types.ObjectId.isValid(String(v._id))) clean._id = String(v._id);
    return clean;
  });
};

// Gallery images arrive as an array (JSON body) or a JSON string (multipart). undefined = field not sent.
// Blank entries and repeats are dropped, and the cover is never repeated inside the gallery.
const normalizeImages = (value, cover) => {
  if (value === undefined) return undefined;
  let list = value;
  if (typeof value === "string") {
    if (!value.trim()) return [];
    try {
      list = JSON.parse(value);
    } catch {
      throw new RangeError("Images must be a valid list");
    }
  }
  if (!Array.isArray(list)) throw new RangeError("Images must be a list");
  const clean = [...new Set(list.map((u) => (typeof u === "string" ? u.trim() : "")).filter(Boolean))].filter((u) => u !== cover);
  if (clean.length > 8) throw new RangeError("A product can have at most 8 extra images");
  return clean;
};

// Maps the Shop page's ?sort= value to a Mongo sort object.
// _id is the tiebreaker: products created in the same millisecond (a seed, an import) would otherwise sort in an
// unstable order and could show up on two pages, or none.
const SORT_MAP = {
  featured: { createdAt: -1, _id: -1 },
  newest: { createdAt: -1, _id: -1 },
  "price-asc": { price: 1, _id: 1 },
  "price-desc": { price: -1, _id: 1 },
  "name-asc": { name: 1, _id: 1 },
  // best rated first; products nobody has rated yet (average 0) come last
  rating: { ratingAverage: -1, ratingCount: -1, _id: 1 },
};

/**
 * GET /api/products
 *
 * Supports (all optional, all backward compatible — calling this with no
 * query params behaves exactly like before, just still an array):
 *   ?category=dresses        case-insensitive exact match on Product.category
 *   ?collection=spring-summer matches products tagged with this collection slug (comma-separate for several)
 *   ?ids=64f...,64f...        bulk-fetch specific products by _id (Wishlist page) —
 *                              invalid/malformed ids are silently dropped rather
 *                              than erroring, and an all-invalid list returns []
 *                              immediately instead of matching nothing via Mongo
 *   ?search=linen             matches name OR description, case-insensitive
 *   ?minPrice=50&maxPrice=300 inclusive price range
 *   ?sort=featured|newest|price-asc|price-desc|name-asc|rating
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
      // collections is an array field. One slug matches any doc whose array contains it; several slugs
      // separated by commas ("spring-summer,resort") match a doc tagged with ANY of them (category pages).
      const slugs = String(collection).split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
      if (slugs.length === 1) filter.collections = slugs[0];
      else if (slugs.length > 1) filter.collections = { $in: slugs };
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
    handleRouteError(res, err, "Failed to fetch products");
  }
});

// ---- bulk actions (admin) ---------------------------------------------------------------------------------

const MAX_BULK = 100; // products per bulk request (the admin page sends bigger selections in several requests)

// Product ids from a request body: a non-empty list of valid, distinct ids, at most MAX_BULK.
// Throws a RangeError with a readable message otherwise.
function parseBulkIds(value) {
  if (!Array.isArray(value) || value.length === 0) throw new RangeError("Select at least one product");
  if (value.length > MAX_BULK) throw new RangeError(`You can change at most ${MAX_BULK} products at once`);
  const ids = [...new Set(value.map((v) => String(v)))];
  if (!ids.every((id) => mongoose.Types.ObjectId.isValid(id))) throw new RangeError("Invalid product id");
  return ids;
}

const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,49}$/;
const slugList = (value, label) => {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new RangeError(`${label} must be a list`);
  const list = normalizeCollections(value);
  if (!list.every((slug) => SLUG_RE.test(slug))) throw new RangeError(`${label} has an invalid collection`);
  return [...new Set(list)];
};

// Checks the `changes` object of a bulk edit and returns a clean version with only what will be applied:
//   { category?, addCollections: [], removeCollections: [], price?: { mode, value }, stock?: number }
//   category     text, replaces the category of every selected product
//   collections  { add: [slugs], remove: [slugs] }
//   price        { mode: "set" | "increase" | "decrease", value }  (increase / decrease are percentages; the result is rounded to whole rupees)
//   stock        { mode: "set", value }  a whole number (products with sizes / colors keep the stock of their variants)
function parseBulkChanges(changes) {
  if (!changes || typeof changes !== "object" || Array.isArray(changes)) throw new RangeError("Choose at least one change");
  const out = { addCollections: [], removeCollections: [] };

  if (changes.category !== undefined) {
    const category = typeof changes.category === "string" ? changes.category.trim() : "";
    if (!category || category.length > 60) throw new RangeError("Category must be 1 to 60 characters");
    out.category = category;
  }

  if (changes.collections !== undefined) {
    const c = changes.collections;
    if (!c || typeof c !== "object" || Array.isArray(c)) throw new RangeError("Collections must be { add, remove }");
    out.addCollections = slugList(c.add, "Collections to add");
    out.removeCollections = slugList(c.remove, "Collections to remove");
    if (out.addCollections.some((slug) => out.removeCollections.includes(slug))) {
      throw new RangeError("A collection can't be both added and removed");
    }
  }

  if (changes.price !== undefined) {
    const { mode, value } = changes.price || {};
    const n = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
    if (!["set", "increase", "decrease"].includes(mode) || !Number.isFinite(n)) throw new RangeError("Invalid price change");
    if (mode === "set" && n < 0) throw new RangeError("Price can't be negative");
    if (mode === "increase" && (n <= 0 || n > 1000)) throw new RangeError("Increase must be between 0 and 1000 percent");
    if (mode === "decrease" && (n <= 0 || n >= 100)) throw new RangeError("Decrease must be between 0 and 100 percent");
    out.price = { mode, value: n };
  }

  if (changes.stock !== undefined) {
    const { mode, value } = changes.stock || {};
    const n = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
    if (mode !== "set" || !Number.isInteger(n) || n < 0) throw new RangeError("Stock must be a whole number, 0 or more");
    out.stock = n;
  }

  const any = out.category !== undefined || out.addCollections.length || out.removeCollections.length || out.price || out.stock !== undefined;
  if (!any) throw new RangeError("Choose at least one change");
  return out;
}

// PATCH /api/products/bulk — admin only. Body: { ids: [...], changes: {...} } (see parseBulkChanges).
// Each product is changed and saved on its own, so one that fails validation doesn't stop the rest.
// Answers { updated, missing, stockSkipped: [names], failed: [{ name, message }] }.
router.patch("/bulk", protect, adminOnly, async (req, res) => {
  try {
    const ids = parseBulkIds(req.body?.ids);
    const change = parseBulkChanges(req.body?.changes);

    const products = await Product.find({ _id: { $in: ids } });
    const stockSkipped = [];

    const results = await Promise.allSettled(
      products.map(async (p) => {
        if (change.category !== undefined) p.category = change.category;

        if (change.addCollections.length || change.removeCollections.length) {
          const next = [...new Set([...(p.collections || []), ...change.addCollections])];
          p.collections = next.filter((slug) => !change.removeCollections.includes(slug));
        }

        if (change.price) {
          const { mode, value } = change.price;
          const factor = mode === "increase" ? 1 + value / 100 : 1 - value / 100;
          p.price = mode === "set" ? Math.round(value * 100) / 100 : Math.round(p.price * factor);
        }

        // With sizes / colors the product's stock is the total of its variants, so a single number can't be applied
        if (change.stock !== undefined) {
          if (p.variants && p.variants.length > 0) stockSkipped.push(p.name);
          else p.stock = change.stock;
        }

        await p.save();
        return p;
      })
    );

    const failed = [];
    let updated = 0;
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        updated += 1;
        return;
      }
      const err = r.reason;
      const message = err instanceof mongoose.Error.ValidationError ? Object.values(err.errors).map((e) => e.message).join(" ") : "Could not be saved";
      if (!(err instanceof mongoose.Error.ValidationError)) console.error("Bulk edit failed for a product:", err);
      failed.push({ name: products[i].name, message });
    });

    res.json({ updated, missing: ids.length - products.length, stockSkipped, failed });
  } catch (err) {
    if (err instanceof RangeError) return res.status(400).json({ message: err.message });
    handleRouteError(res, err, "Failed to update products");
  }
});

// POST /api/products/bulk-delete — admin only. Body: { ids: [...] }. Deletes the products and their stored images.
// Answers { deleted }. Ids that no longer exist are simply ignored.
router.post("/bulk-delete", protect, adminOnly, async (req, res) => {
  try {
    const ids = parseBulkIds(req.body?.ids);
    const products = await Product.find({ _id: { $in: ids } });
    if (products.length > 0) {
      await Product.deleteMany({ _id: { $in: products.map((p) => p._id) } });
      await Review.deleteMany({ product: { $in: products.map((p) => p._id) } });
      products.forEach((p) => [p.image, ...(p.images || [])].forEach((f) => removeImage(f)));
    }
    res.json({ deleted: products.length });
  } catch (err) {
    if (err instanceof RangeError) return res.status(400).json({ message: err.message });
    handleRouteError(res, err, "Failed to delete products");
  }
});

// GET /api/products/:id
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    handleRouteError(res, err, "Failed to fetch product");
  }
});

// POST /api/products — admin only (multipart: field "image" = file, or JSON with an image URL)
router.post("/", protect, adminOnly, upload.single("image"), async (req, res) => {
  let stored; // image stored by THIS request, removed again if the product can't be saved
  try {
    const data = { ...req.body };
    delete data.ratingAverage; // set only by the review routes
    delete data.ratingCount;
    if (req.file) data.image = stored = await saveImage(req.file);
    const normalized = normalizeCollections(data.collections);
    if (normalized !== undefined) data.collections = normalized;
    const variants = normalizeVariants(data.variants);
    if (variants !== undefined) data.variants = variants;
    const gallery = normalizeImages(data.images, data.image);
    if (gallery !== undefined) data.images = gallery;
    const product = await Product.create(data);
    res.status(201).json(product);
  } catch (err) {
    removeImage(stored);
    if (err instanceof RangeError) return res.status(400).json({ message: err.message });
    handleRouteError(res, err, "Failed to create product");
  }
});

// PUT /api/products/:id — admin only (image optional; keeps the old one if none sent)
router.put("/:id", protect, adminOnly, upload.single("image"), async (req, res) => {
  let stored;
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    const oldFiles = [product.image, ...(product.images || [])];
    const data = { ...req.body };
    delete data.ratingAverage; // set only by the review routes
    delete data.ratingCount;
    if (req.file) data.image = stored = await saveImage(req.file);
    const normalized = normalizeCollections(data.collections);
    if (normalized !== undefined) data.collections = normalized;
    const variants = normalizeVariants(data.variants);
    if (variants !== undefined) data.variants = variants;
    const gallery = normalizeImages(data.images, data.image ?? product.image);
    if (gallery !== undefined) data.images = gallery;

    product.set(data);
    await product.save();

    // any image (cover or gallery) that is no longer used by this product gets deleted
    const kept = new Set([product.image, ...(product.images || [])]);
    oldFiles.filter((f) => !kept.has(f)).forEach((f) => removeImage(f));
    res.json(product);
  } catch (err) {
    removeImage(stored);
    if (err instanceof RangeError) return res.status(400).json({ message: err.message });
    handleRouteError(res, err, "Failed to update product");
  }
});

// DELETE /api/products/:id — admin only
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    await Review.deleteMany({ product: product._id });
    [product.image, ...(product.images || [])].forEach((f) => removeImage(f));
    res.json({ message: "Product deleted" });
  } catch (err) {
    handleRouteError(res, err, "Failed to delete product");
  }
});

module.exports = router;