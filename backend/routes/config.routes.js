// backend/routes/config.routes.js
const express = require("express");
const router = express.Router();
const { publicConfig } = require("../utils/storeConfig");

// GET /api/config — public. Shipping fee, free-shipping threshold and return window, so the website never
// keeps its own copy of them. Safe to cache briefly: these numbers change rarely.
router.get("/", (req, res) => {
  res.set("Cache-Control", "public, max-age=60");
  res.json(publicConfig());
});

module.exports = router;
