require("dotenv").config();
const { initMonitoring, flushMonitoring } = require("./utils/monitoring");
initMonitoring(); // error tracking (Sentry) — does nothing unless SENTRY_DSN is set; keep this before the app is built
const mongoose = require("mongoose");
const createApp = require("./app");
const { scheduleUploadCleanup } = require("./utils/cleanupUploads");
const { scheduleUnpaidExpiry } = require("./utils/expireUnpaidOrders");
const payfast = require("./utils/payfast");
const jazzcash = require("./utils/jazzcash");
const easypaisa = require("./utils/easypaisa");
const { isCloudinaryEnabled } = require("./utils/imageStorage");

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.warn(
    "⚠️  No MONGODB_URI found in .env — the server will start, but /api/products will fail until you add one."
  );
}
if (!process.env.JWT_SECRET) {
  console.warn(
    "⚠️  No JWT_SECRET found in .env — set one before using /api/auth, or tokens won't verify correctly."
  );
}

if (!process.env.SENTRY_DSN && process.env.NODE_ENV === "production") {
  console.warn("⚠️  SENTRY_DSN is not set — errors in production are only written to the server log. See docs/OPERATIONS.md.");
}

if (!payfast.isConfigured()) {
  console.warn("ℹ️  PayFast is not configured (PAYFAST_MERCHANT_ID, PAYFAST_SECURED_KEY, BACKEND_URL) — the Card option will say online payment is unavailable.");
} else if (payfast.config().mode === "sandbox" && process.env.NODE_ENV === "production") {
  console.warn("⚠️  PayFast is in SANDBOX mode in production — set PAYFAST_ENV=live to take real payments.");
}

if (!jazzcash.isConfigured()) {
  console.warn("ℹ️  JazzCash is not configured (JAZZCASH_MERCHANT_ID, JAZZCASH_PASSWORD, JAZZCASH_INTEGRITY_SALT, BACKEND_URL) — the JazzCash option will say online payment is unavailable.");
} else if (jazzcash.config().mode === "sandbox" && process.env.NODE_ENV === "production") {
  console.warn("⚠️  JazzCash is in SANDBOX mode in production — set JAZZCASH_ENV=live to take real payments.");
}

if (!easypaisa.isConfigured()) {
  console.warn("ℹ️  Easypaisa is not configured (EASYPAISA_STORE_ID, EASYPAISA_HASH_KEY, EASYPAISA_ACCOUNT_NUM, EASYPAISA_USERNAME, EASYPAISA_PASSWORD, BACKEND_URL) — the Easypaisa option will say online payment is unavailable.");
} else if (easypaisa.config().mode === "sandbox" && process.env.NODE_ENV === "production") {
  console.warn("⚠️  Easypaisa is in SANDBOX mode in production — set EASYPAISA_ENV=live to take real payments.");
}

if (!isCloudinaryEnabled() && process.env.NODE_ENV === "production") {
  console.warn(
    "⚠️  Cloudinary is not configured — product images are saved on this server's disk and will be LOST on redeploy/restart. Set CLOUDINARY_URL in the environment."
  );
}

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
    scheduleUploadCleanup(); // needs the DB: it checks which images products/orders still use
    scheduleUnpaidExpiry(); // gives stock back for online orders that were never paid
  })
  .catch((err) => console.error("MongoDB connection error:", err.message));

const server = createApp().listen(PORT, () => {
  console.log(`Ecom-shop backend listening on http://localhost:${PORT}`);
});

// Hosts stop the app with SIGTERM on every deploy: finish in-flight requests and send queued error reports first.
let stopping = false;
async function shutdown(signal) {
  if (stopping) return;
  stopping = true;
  console.log(`${signal} received — shutting down`);
  server.close(async () => {
    await flushMonitoring();
    await mongoose.disconnect().catch(() => {});
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref(); // don't hang forever on a stuck connection
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
