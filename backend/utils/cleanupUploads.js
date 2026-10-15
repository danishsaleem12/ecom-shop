// backend/utils/cleanupUploads.js
//
// Admin image uploads happen BEFORE the product is saved (POST /api/upload returns a URL, the
// product form saves it later). If the admin never saves, the file would sit on disk forever.
// This sweeps the uploads folder (and the Cloudinary folder, when Cloudinary is configured) and deletes files that
//   1. are older than a grace period (so an upload that's about to be saved isn't touched), and
//   2. are not referenced by any product or by any order line (orders keep a copy of the image path).
const fs = require("fs/promises");
const path = require("path");
const Product = require("../models/Product");
const Order = require("../models/Order");
const DEFAULT_DIR = require("./uploadDir");
const { FOLDER, isCloudinaryEnabled, cloudinaryPublicId, client } = require("./imageStorage");

const HOUR = 60 * 60 * 1000;
const DEFAULT_MAX_AGE_MS = 24 * HOUR;
const SWEEP_EVERY_MS = 6 * HOUR;

// "/uploads/abc.png" or "http://host/uploads/abc.png" -> "abc.png"; anything else -> null
const toFileName = (value) =>
  typeof value === "string" && value.includes("/uploads/") ? path.basename(value.split("?")[0]) : null;

/** Deletes unreferenced uploads older than maxAgeMs. Returns the names it deleted. */
async function cleanupUploads({ dir = DEFAULT_DIR, maxAgeMs = DEFAULT_MAX_AGE_MS, now = Date.now() } = {}) {
  // Look up what is in use FIRST. If this throws we abort and delete nothing.
  const [productImages, galleryImages, orderImages] = await Promise.all([
    Product.distinct("image"),
    Product.distinct("images"),
    Order.distinct("items.image"),
  ]);
  const inUse = new Set([...productImages, ...galleryImages, ...orderImages].map(toFileName).filter(Boolean));

  let names;
  try {
    names = await fs.readdir(dir);
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }

  const deleted = [];
  for (const name of names) {
    if (name.startsWith(".") || inUse.has(name)) continue; // dotfiles (.gitkeep) and files in use
    const file = path.join(dir, name);
    try {
      const stat = await fs.stat(file);
      if (!stat.isFile() || now - stat.mtimeMs < maxAgeMs) continue;
      await fs.unlink(file);
      deleted.push(name);
    } catch (err) {
      console.error(`Upload cleanup: could not remove ${name}:`, err.message);
    }
  }
  return deleted;
}

/** Same sweep for Cloudinary: deletes unreferenced images in our folder older than maxAgeMs. Returns the public ids. */
async function cleanupCloudinaryUploads({ maxAgeMs = DEFAULT_MAX_AGE_MS, now = Date.now() } = {}) {
  if (!isCloudinaryEnabled()) return [];
  const [productImages, galleryImages, orderImages] = await Promise.all([
    Product.distinct("image"),
    Product.distinct("images"),
    Order.distinct("items.image"),
  ]);
  const inUse = new Set([...productImages, ...galleryImages, ...orderImages].map(cloudinaryPublicId).filter(Boolean));

  const api = client().api;
  const deleted = [];
  let cursor;
  do {
    const page = await api.resources({ type: "upload", resource_type: "image", prefix: `${FOLDER}/`, max_results: 100, next_cursor: cursor });
    for (const r of page.resources) {
      if (inUse.has(r.public_id) || now - new Date(r.created_at).getTime() < maxAgeMs) continue;
      try {
        await client().uploader.destroy(r.public_id, { resource_type: "image", invalidate: true });
        deleted.push(r.public_id);
      } catch (err) {
        console.error(`Upload cleanup: could not remove ${r.public_id}:`, err.message || err);
      }
    }
    cursor = page.next_cursor;
  } while (cursor);
  return deleted;
}

/** Runs the sweep now and then every few hours. Call once, after MongoDB is connected. */
function scheduleUploadCleanup() {
  const hours = Number(process.env.UPLOAD_MAX_AGE_HOURS);
  const maxAgeMs = hours > 0 ? hours * HOUR : DEFAULT_MAX_AGE_MS;

  const report = (deleted) => deleted.length && console.log(`Upload cleanup: removed ${deleted.length} unused file(s)`);
  const run = () => {
    cleanupUploads({ maxAgeMs }).then(report).catch((err) => console.error("Upload cleanup failed:", err.message));
    cleanupCloudinaryUploads({ maxAgeMs }).then(report).catch((err) => console.error("Cloudinary cleanup failed:", err.message || err));
  };

  run();
  setInterval(run, SWEEP_EVERY_MS).unref(); // unref: never keeps the process alive on its own
}

module.exports = { cleanupUploads, cleanupCloudinaryUploads, scheduleUploadCleanup };
