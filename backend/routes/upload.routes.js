// backend/routes/upload.routes.js
const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const { protect, adminOnly } = require("../middleware/auth");
const { saveImage } = require("../utils/imageStorage");
const { handleRouteError } = require("../utils/errors");

// POST /api/upload — admin only. Multipart, field name "image".
// protect + adminOnly run BEFORE multer, so a non-admin's file is never read or stored.
// Returns { url } — a Cloudinary https URL (or "/uploads/<file>" in local dev). Save it as the product's `image`.
router.post("/", protect, adminOnly, upload.single("image"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image received (the form field must be named "image")' });
  }
  try {
    res.status(201).json({ url: await saveImage(req.file) });
  } catch (err) {
    handleRouteError(res, err, "Image upload failed");
  }
});

module.exports = router;
