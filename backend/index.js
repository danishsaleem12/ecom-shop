require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");

const productsRoutes = require("./routes/products.routes");
const authRoutes = require("./routes/auth.routes");
const ordersRoutes = require("./routes/orders.routes");

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const MONGODB_URI = process.env.MONGODB_URI;

// credentials: true is required so the browser sends/receives the auth cookie
app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Serve uploaded product images
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Ecom-shop backend is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productsRoutes);
app.use("/api/orders", ordersRoutes);

// Error handler (multer errors: wrong file type, file too large, etc.)
app.use((err, req, res, next) => {
  if (err) return res.status(400).json({ message: err.message });
  next();
});

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

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err.message));

app.listen(PORT, () => {
  console.log(`Ecom-shop backend listening on http://localhost:${PORT}`);
});