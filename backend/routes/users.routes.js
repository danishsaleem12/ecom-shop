// backend/routes/users.routes.js — the customer list and admin-account management (admin only)
//   GET   /api/users              ?role=user|admin &search= &page= &limit=  — accounts, newest first, with order count and total spent
//   GET   /api/users/:id          one account with its latest orders
//   POST  /api/users/admin        { name, email, password } — create an admin account
//   PATCH /api/users/:id/role     { role: "user" | "admin" } — promote or demote (never your own account)
// Passwords are never returned. Customers sign in on the storefront and admins on /admin/login, so a promoted
// account signs in on the admin page from then on; a demoted one is signed out everywhere and goes back to the storefront login.
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const User = require("../models/User");
const Order = require("../models/Order");
const { protect, adminOnly } = require("../middleware/auth");
const { handleRouteError } = require("../utils/errors");
const { escapeRegex, parsePaging, pageInfo, searchTerm } = require("../utils/pagination");

router.use(protect, adminOnly);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const isId = (v) => mongoose.Types.ObjectId.isValid(String(v));

const shape = (u, stats = {}) => ({
  _id: u._id,
  name: u.name,
  email: u.email,
  role: u.role,
  emailVerified: u.emailVerified !== false,
  createdAt: u.createdAt,
  orders: stats.orders || 0,
  spent: stats.spent || 0,
  lastOrderAt: stats.lastOrderAt || null,
});

// { userId: { orders, spent, lastOrderAt } } for these users. Cancelled orders don't count.
async function orderStats(userIds) {
  if (userIds.length === 0) return {};
  const rows = await Order.aggregate([
    { $match: { user: { $in: userIds }, status: { $ne: "cancelled" } } },
    { $group: { _id: "$user", orders: { $sum: 1 }, spent: { $sum: "$total" }, lastOrderAt: { $max: "$createdAt" } } },
  ]);
  return Object.fromEntries(rows.map((r) => [String(r._id), r]));
}

router.get("/", async (req, res) => {
  try {
    const paging = parsePaging(req.query);
    const filter = {};
    if (req.query.role === "user" || req.query.role === "admin") filter.role = req.query.role;
    const search = searchTerm(req.query.search);
    if (search) {
      const rx = { $regex: escapeRegex(search), $options: "i" };
      filter.$or = [{ name: rx }, { email: rx }];
    }

    const [total, admins, rows] = await Promise.all([
      User.countDocuments(filter),
      User.countDocuments({ role: "admin" }),
      User.find(filter).sort({ createdAt: -1, _id: -1 }).skip(paging.skip).limit(paging.limit).lean(),
    ]);
    const stats = await orderStats(rows.map((u) => u._id));
    res.json({ users: rows.map((u) => shape(u, stats[String(u._id)])), admins, ...pageInfo(total, paging) });
  } catch (err) {
    handleRouteError(res, err, "Failed to load accounts");
  }
});

router.post("/admin", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string" || !name.trim() || !email.trim() || !password) {
      return res.status(400).json({ message: "Name, email and password are all required" });
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_RE.test(cleanEmail) || cleanEmail.length > 120) return res.status(400).json({ message: "Please enter a valid email" });
    if (name.trim().length > 80) return res.status(400).json({ message: "Name can be at most 80 characters" });
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });

    if (await User.findOne({ email: cleanEmail })) {
      return res.status(409).json({ message: "An account with this email already exists. Find it in the list and make it an admin instead." });
    }
    const user = await User.create({ name: name.trim(), email: cleanEmail, password, role: "admin", emailVerified: true });
    res.status(201).json({ user: shape(user) });
  } catch (err) {
    handleRouteError(res, err, "Failed to create the admin account");
  }
});

router.get("/:id", async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: "Account not found" });
    const user = await User.findOne({ _id: req.params.id }).lean();
    if (!user) return res.status(404).json({ message: "Account not found" });

    const [stats, recent] = await Promise.all([
      orderStats([user._id]),
      Order.find({ user: user._id }).sort({ createdAt: -1 }).limit(10).select("orderNumber status total createdAt").lean(),
    ]);
    res.json({ user: shape(user, stats[String(user._id)]), recentOrders: recent });
  } catch (err) {
    handleRouteError(res, err, "Failed to load the account");
  }
});

router.patch("/:id/role", async (req, res) => {
  try {
    if (!isId(req.params.id)) return res.status(404).json({ message: "Account not found" });
    const { role } = req.body || {};
    if (role !== "user" && role !== "admin") return res.status(400).json({ message: 'Role must be "user" or "admin"' });
    // Your own account is off limits, so the store can never end up with no admin by accident
    if (String(req.user._id) === req.params.id) return res.status(400).json({ message: "You can't change your own role." });

    const user = await User.findOne({ _id: req.params.id });
    if (!user) return res.status(404).json({ message: "Account not found" });
    if (user.role !== role) {
      user.role = role;
      // Demoted: end every session they have, so admin access stops immediately
      if (role === "user") user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save();
    }
    res.json({ user: shape(user) });
  } catch (err) {
    handleRouteError(res, err, "Failed to change the role");
  }
});

module.exports = router;
