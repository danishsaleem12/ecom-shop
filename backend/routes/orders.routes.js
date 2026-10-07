// backend/routes/orders.routes.js
const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const { protect } = require("../middleware/auth");

// POST /api/orders — create an order from the current user's checkout
router.post("/", protect, async (req, res) => {
  try {
    const { items, total, shippingAddress } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Order must have at least one item" });
    }
    if (typeof total !== "number") {
      return res.status(400).json({ message: "Order total is required" });
    }

    const order = await Order.create({
      user: req.user._id,
      items,
      total,
      shippingAddress,
    });

    res.status(201).json({ order });
  } catch (err) {
    res.status(500).json({ message: "Failed to create order", error: err.message });
  }
});

// GET /api/orders — current user's own orders, newest first
router.get("/", protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) {
    res.status(500).json({ message: "Failed to load orders", error: err.message });
  }
});

// GET /api/orders/:id — single order, must belong to the current user
router.get("/:id", protect, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ order });
  } catch (err) {
    res.status(500).json({ message: "Failed to load order", error: err.message });
  }
});

module.exports = router;