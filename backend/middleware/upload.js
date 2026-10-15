//backend/middleware/upload.js
// multer only parses and validates the upload and keeps it in memory.
// WHERE it is stored (Cloudinary or local disk) is decided by utils/imageStorage.js.
const multer = require("multer");

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

module.exports = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) =>
    ALLOWED.includes(file.mimetype)
      ? cb(null, true)
      : cb(Object.assign(new Error("Only JPG, PNG, WebP or AVIF images are allowed"), { code: "INVALID_FILE_TYPE" })),
});
