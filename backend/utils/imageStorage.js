// backend/utils/imageStorage.js
//
// Single place that decides WHERE product images live.
//   - Cloudinary configured (CLOUDINARY_URL, or CLOUDINARY_CLOUD_NAME + API_KEY + API_SECRET)
//       -> images go to Cloudinary and the product stores the full https URL.
//   - Not configured (local development, the test suite)
//       -> images are written to the uploads/ folder and the product stores "/uploads/<file>".
//
// The frontend needs no change: imageSrc() already leaves https:// URLs untouched.
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { v2: cloudinary } = require("cloudinary");
const UPLOAD_DIR = require("./uploadDir");

const FOLDER = process.env.CLOUDINARY_FOLDER || "aurelia/products";

const EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
};

// Read at call time (not load time) so tests / late dotenv loading still work.
const isCloudinaryEnabled = () =>
  Boolean(
    process.env.CLOUDINARY_URL ||
      (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
  );

let configuredFor = null;
function client() {
  const key = process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME;
  if (configuredFor !== key) {
    // With CLOUDINARY_URL set the SDK configures itself; otherwise use the three separate variables.
    if (!process.env.CLOUDINARY_URL) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
    }
    cloudinary.config({ secure: true });
    configuredFor = key;
  }
  return cloudinary;
}

/**
 * "https://res.cloudinary.com/<cloud>/image/upload/v123/aurelia/products/abc.jpg" -> "aurelia/products/abc"
 * Returns null for anything that is not one of OUR Cloudinary images (local paths, Unsplash, other clouds).
 */
function cloudinaryPublicId(url) {
  if (!isCloudinaryEnabled() || typeof url !== "string") return null;
  const cloudName = client().config().cloud_name;
  const m = url.split("?")[0].match(/^https?:\/\/res\.cloudinary\.com\/([^/]+)\/image\/upload\/(?:v\d+\/)?(.+)\.[A-Za-z0-9]+$/);
  if (!m || m[1] !== cloudName) return null;
  return m[2].startsWith(`${FOLDER}/`) ? m[2] : null; // never touch images outside our folder
}

function uploadToCloudinary(buffer) {
  return new Promise((resolve, reject) => {
    const stream = client().uploader.upload_stream(
      { folder: FOLDER, resource_type: "image", use_filename: false, unique_filename: true, overwrite: false },
      (err, result) => (err ? reject(err) : resolve(result.secure_url))
    );
    stream.end(buffer);
  });
}

async function saveToDisk(file) {
  await fsp.mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${EXT[file.mimetype]}`;
  await fsp.writeFile(path.join(UPLOAD_DIR, name), file.buffer);
  return `/uploads/${name}`;
}

/** Stores a multer memory file and returns the string to save in Product.image. */
function saveImage(file) {
  return isCloudinaryEnabled() ? uploadToCloudinary(file.buffer) : saveToDisk(file);
}

/** Best-effort delete of an image we stored (local file or Cloudinary asset). Never throws. */
async function removeImage(value) {
  if (!value || typeof value !== "string") return;
  try {
    if (value.startsWith("/uploads/")) {
      await fsp.unlink(path.join(UPLOAD_DIR, path.basename(value)));
      return;
    }
    const publicId = cloudinaryPublicId(value);
    if (publicId) await client().uploader.destroy(publicId, { resource_type: "image", invalidate: true });
  } catch (err) {
    if (err.code !== "ENOENT") console.error("Could not remove image:", err.message || err);
  }
}

module.exports = { FOLDER, isCloudinaryEnabled, saveImage, removeImage, cloudinaryPublicId, client };
