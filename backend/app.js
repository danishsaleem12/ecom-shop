// backend/app.js — builds the Express app. index.js connects to MongoDB and starts listening;
// keeping that out of here lets the tests import the app without a database or a port.
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");

const UPLOAD_DIR = require("./utils/uploadDir");
const errorHandler = require("./middleware/errorHandler");
const { cartLimiter, payLimiter, loginLimiter, registerLimiter, formLimiter, trackLimiter, promoLimiter, reviewLimiter, newsletterLimiter } = require("./middleware/rateLimit");

const productsRoutes = require("./routes/products.routes");
const authRoutes = require("./routes/auth.routes");
const ordersRoutes = require("./routes/orders.routes");
const uploadRoutes = require("./routes/upload.routes");
const contactRoutes = require("./routes/contact.routes");
const subscribeRoutes = require("./routes/subscribe.routes");
const configRoutes = require("./routes/config.routes");
const statsRoutes = require("./routes/stats.routes");
const addressesRoutes = require("./routes/addresses.routes");
const promosRoutes = require("./routes/promos.routes");
const reviewsRoutes = require("./routes/reviews.routes");
const newslettersRoutes = require("./routes/newsletters.routes");
const usersRoutes = require("./routes/users.routes");
const cartRoutes = require("./routes/cart.routes");
const paymentsRoutes = require("./routes/payments.routes");

// TRUST_PROXY: how many reverse proxies sit in front of the app (e.g. 1 on Render/Heroku/nginx).
// Without it the rate limiter would see the proxy's IP and give every visitor one shared bucket.
// Leave it unset when the app is reached directly — a wrong value lets clients fake their IP.
const parseTrustProxy = (v) => (/^\d+$/.test(v) ? Number(v) : v === "true" ? true : v);

function createApp() {
  const app = express();
  const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

  if (process.env.TRUST_PROXY) app.set("trust proxy", parseTrustProxy(process.env.TRUST_PROXY));

  app.use(helmet());

  // credentials: true is required so the browser sends/receives the auth cookie
  // exposedHeaders: without this the browser hides the pagination headers from the frontend
  // (ShopCollection.js reads them to show the total count and page count)
  app.use(
    cors({
      origin: FRONTEND_URL,
      credentials: true,
      exposedHeaders: ["X-Total-Count", "X-Total-Pages"],
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  // Serve uploaded product images.
  // helmet defaults to Cross-Origin-Resource-Policy: same-origin, which would stop the
  // frontend (another origin) from displaying these, so images are explicitly allowed cross-origin.
  app.use(
    "/uploads",
    express.static(UPLOAD_DIR, {
      setHeaders: (res) => res.setHeader("Cross-Origin-Resource-Policy", "cross-origin"),
    })
  );

  // Liveness: "the server process is up". Needs no database, so it always answers 200 while the app runs.
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Ecom-shop backend is running" });
  });

  // Readiness: "the store can actually serve customers" = the app AND MongoDB respond.
  // Point your uptime monitor at THIS one, so a lost database connection pages you instead of looking healthy.
  app.get("/api/health/ready", async (req, res) => {
    res.set("Cache-Control", "no-store");
    try {
      if (mongoose.connection.readyState !== 1) throw new Error("not connected");
      await Promise.race([
        mongoose.connection.db.admin().ping(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 3000).unref()),
      ]);
      res.json({ status: "ok", database: "up" });
    } catch {
      res.status(503).json({ status: "error", database: "down" }); // no error details: this route is public
    }
  });

  // Brute-force protection (runs before the route handlers below)
  app.post("/api/auth/login", loginLimiter());
  app.post("/api/auth/admin/login", loginLimiter());
  app.post("/api/auth/register", registerLimiter());
  // Changing a password needs the current one, so cap failed guesses too (PUT only: GET /me must stay unlimited)
  app.put("/api/auth/me", loginLimiter());
  // Deleting an account also needs the password, so failed guesses are capped the same way; exporting is capped like other heavy reads
  app.delete("/api/auth/me", loginLimiter());
  app.get("/api/auth/me/export", formLimiter());

  // Password reset: 10 emails per IP per hour; wrong/expired links count as failed attempts like a bad login
  app.post("/api/auth/forgot-password", formLimiter());
  app.post("/api/auth/reset-password", loginLimiter());

  // Email verification: wrong/expired links count as failed attempts; new confirmation emails are capped like other mail forms
  app.post("/api/auth/verify-email", loginLimiter());
  app.post("/api/auth/resend-verification", formLimiter());

  app.use("/api/cart", cartLimiter());
  app.post("/api/contact", formLimiter());
  app.post("/api/subscribe", formLimiter());
  app.post("/api/subscribe/unsubscribe", formLimiter());
  app.post("/api/orders/track", trackLimiter());
  app.post("/api/orders/:id/pay", payLimiter()); // starting (or retrying) an online payment
  app.post("/api/promos/validate", promoLimiter());
  // Reviews: 20 new or edited reviews per IP per hour (reading is unlimited)
  app.post("/api/reviews/product/:productId", reviewLimiter());
  app.put("/api/reviews/:id", reviewLimiter());
  // Newsletters (admin): a few sends and test emails per hour is plenty and stops a runaway script
  app.post("/api/newsletters", newsletterLimiter());
  app.post("/api/newsletters/test", newsletterLimiter());

  app.use("/api/auth", authRoutes);
  app.use("/api/products", productsRoutes);
  app.use("/api/orders", ordersRoutes);
  app.use("/api/payments", paymentsRoutes); // payment webhooks / return addresses (PayFast, JazzCash, Easypaisa)
  app.use("/api/addresses", addressesRoutes);
  app.use("/api/promos", promosRoutes);
  app.use("/api/reviews", reviewsRoutes);
  app.use("/api/newsletters", newslettersRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/cart", cartRoutes);
  app.use("/api/upload", uploadRoutes);
  app.use("/api/contact", contactRoutes);
  app.use("/api/subscribe", subscribeRoutes);
  app.use("/api/config", configRoutes);
  app.use("/api/admin/stats", statsRoutes);

  app.use(errorHandler);
  return app;
}

module.exports = createApp;
