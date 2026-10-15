// backend/middleware/errorHandler.js
const multer = require("multer");
const { captureException } = require("../utils/monitoring");

/**
 * Global Express error handler (must be registered last).
 * Known errors get a specific status and one of OUR messages; everything else is a 500
 * with a generic message. err.message is never sent to the client.
 */
function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);

  // Upload problems (multer)
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ message: "Image is too large (max 5 MB)" });
    return res.status(400).json({ message: "Upload failed" });
  }
  if (err?.code === "INVALID_FILE_TYPE") {
    return res.status(400).json({ message: err.message }); // set by middleware/upload.js, safe to show
  }

  // Body parser problems
  if (err?.type === "entity.parse.failed") return res.status(400).json({ message: "Request body is not valid JSON" });
  if (err?.type === "entity.too.large") return res.status(413).json({ message: "Request body is too large" });
  if (Number.isInteger(err?.status) && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({ message: "Bad request" });
  }

  console.error("Unhandled error:", err);
  captureException(err, req); // no-op unless SENTRY_DSN is set
  return res.status(500).json({ message: "Something went wrong" });
}

module.exports = errorHandler;
