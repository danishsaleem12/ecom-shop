// backend/utils/errors.js
const mongoose = require("mongoose");
const { captureException } = require("./monitoring");

/**
 * Sends a safe error response from a route's catch block.
 *
 * The real error is logged on the server; the client only ever gets a message we chose,
 * so driver/stack/query details never leave the process.
 *   - mongoose validation errors  -> 400, with the schema's own field messages (useful to the caller)
 *   - bad ids / wrongly typed data -> 400
 *   - duplicate key                -> 409
 *   - anything else                -> 500 with `fallback`
 */
function handleRouteError(res, err, fallback) {
  if (err instanceof mongoose.Error.ValidationError) {
    const errors = Object.fromEntries(Object.entries(err.errors).map(([field, e]) => [field, e.message]));
    return res.status(400).json({ message: `${fallback}: ${Object.values(errors).join(" ")}`, errors });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ message: `Invalid ${err.path}` });
  }
  if (err?.code === 11000) {
    return res.status(409).json({ message: "A record with that value already exists" });
  }
  console.error(`${fallback}:`, err);
  captureException(err, res.req); // no-op unless SENTRY_DSN is set
  return res.status(500).json({ message: fallback });
}

module.exports = { handleRouteError };
