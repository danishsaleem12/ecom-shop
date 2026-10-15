// backend/utils/uploadDir.js
// Single source of truth for where uploaded images live.
// UPLOAD_DIR can be overridden (the tests point it at a temp folder).
const path = require("path");

module.exports = process.env.UPLOAD_DIR || path.join(__dirname, "..", "uploads");
