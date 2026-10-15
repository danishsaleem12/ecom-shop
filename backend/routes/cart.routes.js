// backend/routes/cart.routes.js — the signed-in customer's saved cart (follows them across devices)
//   GET  /api/cart         the saved cart, with current names / prices / stock; gone or sold-out items are left out
//   PUT  /api/cart         { items: [{ product, variant?, qty }] }  replace the saved cart (an empty list empties it)
//   POST /api/cart/merge   { items: [...] }  add this browser's cart to the saved one (bigger quantity wins when an
//                          item is in both), save the result and answer with it. Called once right after signing in.
// Every route only touches the caller's own account.
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { protect } = require("../middleware/auth");
const { handleRouteError } = require("../utils/errors");
const { parseCartLines, mergeLines, storedLines, hydrateCart, toLines } = require("../utils/cart");

router.use(protect);

const save = (user, lines) => User.updateOne({ _id: user._id }, { $set: { cart: lines } });

router.get("/", async (req, res) => {
  try {
    res.json({ items: await hydrateCart(storedLines(req.user.cart)) });
  } catch (err) {
    handleRouteError(res, err, "Failed to load your cart");
  }
});

router.put("/", async (req, res) => {
  try {
    const { lines, error } = parseCartLines(req.body?.items);
    if (error) return res.status(400).json({ message: error });
    await save(req.user, lines);
    res.json({ saved: lines.length });
  } catch (err) {
    handleRouteError(res, err, "Failed to save your cart");
  }
});

router.post("/merge", async (req, res) => {
  try {
    const { lines, error } = parseCartLines(req.body?.items);
    if (error) return res.status(400).json({ message: error });

    const items = await hydrateCart(mergeLines(storedLines(req.user.cart), lines));
    await save(req.user, toLines(items)); // saved without the items that no longer exist
    res.json({ items });
  } catch (err) {
    handleRouteError(res, err, "Failed to sync your cart");
  }
});

module.exports = router;
