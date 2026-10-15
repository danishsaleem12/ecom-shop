// backend/scripts/migrate-uploads-to-cloudinary.js
//
// Usage (from /backend, with CLOUDINARY_URL set in .env):
//   npm run images:migrate -- --dry-run     show what would happen, change nothing
//   npm run images:migrate                  upload every local image and rewrite the database
//
// One-time move of images that were saved on disk ("/uploads/abc.png", or an absolute URL containing /uploads/)
// to Cloudinary. Updates products AND the image copies kept inside orders. Safe to run twice:
// images already on Cloudinary are skipped, and a missing local file is reported and left untouched.
require("dotenv").config();
const fs = require("fs/promises");
const path = require("path");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const Order = require("../models/Order");
const UPLOAD_DIR = require("../utils/uploadDir");
const { isCloudinaryEnabled, saveImage } = require("../utils/imageStorage");

const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif" };

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing from .env");
  if (!isCloudinaryEnabled()) throw new Error("Cloudinary is not configured — set CLOUDINARY_URL in .env first");
  await mongoose.connect(process.env.MONGODB_URI);

  const [productImages, orderImages] = await Promise.all([Product.distinct("image"), Order.distinct("items.image")]);
  const local = [...new Set([...productImages, ...orderImages])].filter((v) => typeof v === "string" && v.includes("/uploads/"));
  console.log(`${local.length} local image(s) to migrate${dryRun ? " (dry run)" : ""}`);

  let moved = 0;
  for (const value of local) {
    const name = path.basename(value.split("?")[0]);
    const mimetype = MIME[path.extname(name).toLowerCase()];
    let buffer;
    try {
      buffer = await fs.readFile(path.join(UPLOAD_DIR, name));
    } catch {
      console.warn(`  SKIP ${value} — file not found in ${UPLOAD_DIR}`);
      continue;
    }
    if (!mimetype) {
      console.warn(`  SKIP ${value} — unsupported extension`);
      continue;
    }
    if (dryRun) {
      console.log(`  would upload ${name}`);
      continue;
    }
    const url = await saveImage({ buffer, mimetype });
    const p = await Product.updateMany({ image: value }, { $set: { image: url } });
    const o = await Order.updateMany({ "items.image": value }, { $set: { "items.$[it].image": url } }, { arrayFilters: [{ "it.image": value }] });
    console.log(`  ${name} -> ${url}  (${p.modifiedCount} product(s), ${o.modifiedCount} order(s))`);
    moved++;
  }
  console.log(dryRun ? "Dry run finished — nothing changed." : `Done: ${moved} image(s) moved. The local files in uploads/ were left in place; delete them once you've checked the site.`);
}

main()
  .catch((err) => {
    console.error("Migration failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
