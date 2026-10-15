// backend/routes/orders.routes.js
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Order = require("../models/Order");
const Product = require("../models/Product");
const { takeStock, giveStock } = require("../utils/stock");
const User = require("../models/User");
const { protect, adminOnly } = require("../middleware/auth");
const { cancelOrder } = require("../utils/cancelOrder");
const { evaluatePromo, redeemPromo, releasePromo } = require("../utils/promo");
const { normalizeCode, isOrderCode } = require("../utils/orderNumber");
const { handleRouteError } = require("../utils/errors");
const { escapeRegex, parsePaging, pageInfo, searchTerm } = require("../utils/pagination");
const { notifyOrderPlaced, notifyOrderStatus, notifyReturnRequested, notifyReturnUpdate } = require("../utils/notify");
const { PAYMENT_METHODS, ONLINE_METHODS, isOnline, gatewayFor } = require("../utils/paymentMethods");
const { RETURN_WINDOW_DAYS, RETURN_REASONS, RETURN_STATUSES, RETURN_MOVES, returnDeadline } = require("../utils/returns");

// Shipping numbers come from utils/storeConfig.js (the website reads the same values from GET /api/config)
const { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } = require("../utils/storeConfig");
const MAX_QTY_PER_ITEM = 99;

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];
const NOT_FOUND_TRACK = "We couldn't find an order with that number and email";

const round2 = (n) => Math.round(n * 100) / 100;

// What the frontend needs to refresh a stale bag
const snapshot = (p) => ({
  id: String(p._id),
  name: p.name,
  price: p.price,
  image: p.image,
  stock: p.stock,
  variants: (p.variants || []).map((v) => ({ id: String(v._id), size: v.size, color: v.color, stock: v.stock })),
});

// "M / Black" — used in messages
const variantLabel = (v) => [v.size, v.color].filter(Boolean).join(" / ");

// Puts back stock that was taken for an order that then failed
const restoreStock = (taken) => Promise.all(taken.map((line) => giveStock(line)));

// Order numbers are random, so two orders could (very rarely) draw the same one. The unique index
// refuses the second, and we simply draw again.
async function createOrderWithNumber(data) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await Order.create(data);
    } catch (err) {
      const duplicateNumber = err?.code === 11000 && (err.keyPattern?.orderNumber || /orderNumber/.test(err.message || ""));
      if (!duplicateNumber) throw err;
    }
  }
  throw new Error("Could not generate a unique order number");
}

// POST /api/orders — create an order from the current user's checkout.
// The client only says WHAT it wants (product ids + quantities). Names, prices, shipping
// and the total are all computed here from the database; the client's `total` is used only
// to detect that the prices it showed the customer are out of date.
router.post("/", protect, async (req, res) => {
  let taken = []; // stock already decremented, so we can roll back if something fails
  let redeemed = null; // promo code use already counted, so we can give it back if the order isn't saved
  try {
    // New accounts must confirm their email first (the link is sent at sign-up). Accounts that predate this
    // feature have no emailVerified flag set to false, so they are not affected.
    if (req.user.emailVerified === false) {
      return res.status(403).json({
        code: "EMAIL_NOT_VERIFIED",
        message: "Please confirm your email address before placing an order. We sent you a link when you signed up.",
      });
    }

    const { items, total, shippingAddress, paymentMethod: requestedMethod, notes, promoCode } = req.body || {};

    // How the customer pays: cash on delivery (the default) or online (PayFast, JazzCash or Easypaisa)
    const paymentMethod = requestedMethod === undefined || requestedMethod === null || requestedMethod === "" ? "cod" : requestedMethod;
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({ message: "Unknown payment method" });
    }
    if (isOnline(paymentMethod) && !gatewayFor(paymentMethod).isConfigured()) {
      // Refuse before anything is reserved: better than an order that can never be paid
      return res.status(503).json({ message: "Online payment isn't available right now. Please choose cash on delivery or try again later." });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Order must have at least one item" });
    }
    if (typeof total !== "number") {
      return res.status(400).json({ message: "Order total is required" });
    }

    const addr = shippingAddress || {};
    if (!addr.fullName || !addr.line1 || !addr.city || !addr.phone) {
      return res.status(400).json({ message: "Name, address, city and phone are required" });
    }

    // Validate each line and merge duplicates of the same product + variant
    const wanted = new Map(); // "productId" or "productId:variantId" -> { id, variantId, qty }
    for (const it of items) {
      const id = String(it?.product || "");
      const variantId = it?.variant ? String(it.variant) : "";
      const qty = Number(it?.qty);
      if (
        !mongoose.Types.ObjectId.isValid(id) ||
        (variantId && !mongoose.Types.ObjectId.isValid(variantId)) ||
        !Number.isInteger(qty) ||
        qty < 1
      ) {
        return res.status(400).json({ message: "Invalid item in order" });
      }
      const key = variantId ? `${id}:${variantId}` : id;
      const entry = wanted.get(key) || { id, variantId, qty: 0 };
      entry.qty += qty;
      wanted.set(key, entry);
    }
    for (const { qty } of wanted.values()) {
      if (qty > MAX_QTY_PER_ITEM) {
        return res.status(400).json({ message: `You can order at most ${MAX_QTY_PER_ITEM} of one item` });
      }
    }

    const productIds = [...new Set([...wanted.values()].map((w) => w.id))];
    const products = await Product.find({ _id: { $in: productIds } });
    const byId = new Map(products.map((p) => [String(p._id), p]));

    // Anything deleted, out of stock, or short on stock? For a product with variants, the stock that
    // counts is the chosen variant's.
    const problems = new Set();
    const resolved = []; // { p, variant, qty } for lines that are fine
    for (const { id, variantId, qty } of wanted.values()) {
      const p = byId.get(id);
      if (!p) {
        problems.add("An item in your bag is no longer available");
        continue;
      }
      let variant = null;
      let label = p.name;
      let available = p.stock;
      if (p.variants && p.variants.length > 0) {
        variant = variantId ? p.variants.find((v) => String(v._id) === variantId) : null;
        if (!variant) {
          problems.add(
            variantId ? `That option of ${p.name} is no longer available` : `Please choose a size or color for ${p.name}`
          );
          continue;
        }
        label = `${p.name} (${variantLabel(variant)})`;
        available = variant.stock;
      } else if (variantId) {
        problems.add(`That option of ${p.name} is no longer available`);
        continue;
      }
      if (available <= 0) problems.add(`${label} is out of stock`);
      else if (available < qty) problems.add(`Only ${available} of ${label} left`);
      else resolved.push({ p, variant, qty });
    }
    if (problems.size > 0) {
      return res.status(409).json({
        message: `${[...problems].join(". ")}. Your bag has been updated.`,
        currentItems: products.map(snapshot),
      });
    }

    // Price everything from the database
    const lines = resolved.map(({ p, variant, qty }) => ({
      product: p._id,
      ...(variant ? { variant: variant._id, size: variant.size || undefined, color: variant.color || undefined } : {}),
      name: p.name,
      price: p.price,
      image: p.image,
      qty,
    }));
    const subtotal = round2(lines.reduce((n, l) => n + l.price * l.qty, 0));
    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;

    // Promo code (optional). Checked again here even though the checkout screen already previewed it: the code may
    // have expired, run out or been switched off since, and the customer's number is never trusted.
    let promo = null;
    let discount = 0;
    if (promoCode !== undefined && promoCode !== null && promoCode !== "") {
      const r = await evaluatePromo(promoCode, { subtotal, shipping, userId: req.user._id });
      if (!r.ok) return res.status(409).json({ code: "PROMO_INVALID", message: `${r.message} Your promo code was removed.` });
      promo = r.promo;
      discount = r.discount;
    }
    const serverTotal = round2(subtotal + shipping - discount);

    if (Math.abs(total - serverTotal) > 0.5) {
      return res.status(409).json({
        message: "Some prices changed since you added items to your bag. Your bag has been updated — please check the total.",
        currentItems: products.map(snapshot),
      });
    }

    // Take the stock. Each update only succeeds if enough is still left, so two people
    // buying the last item at the same moment can't both get it.
    for (const l of lines) {
      const line = { product: l.product, variant: l.variant, qty: l.qty };
      if (!(await takeStock(line))) {
        await restoreStock(taken);
        taken = [];
        const fresh = await Product.find({ _id: { $in: productIds } });
        const what = l.size || l.color ? `${l.name} (${variantLabel(l)})` : l.name;
        return res.status(409).json({
          message: `${what} just sold out or is low on stock. Your bag has been updated.`,
          currentItems: fresh.map(snapshot),
        });
      }
      taken.push(line);
    }

    // Count the code's use now that the stock is ours. The update only succeeds while uses are left, so two
    // customers can't both take the last one.
    if (promo) {
      if (!(await redeemPromo(promo))) {
        await restoreStock(taken);
        taken = [];
        return res.status(409).json({ code: "PROMO_INVALID", message: "This code has just been fully redeemed. Your promo code was removed." });
      }
      redeemed = promo;
    }

    const order = await createOrderWithNumber({
      user: req.user._id,
      items: lines,
      total: serverTotal,
      ...(promo ? { discount, promo: { id: promo._id, code: promo.code, type: promo.type, value: promo.value } } : {}),
      shippingAddress: addr,
      paymentMethod,
      paymentStatus: "unpaid",
      notes,
    });
    taken = []; // order saved — the stock stays taken
    redeemed = null; // ...and so does the code's use

    if (isOnline(paymentMethod)) {
      // The confirmation email and store alert wait until the gateway confirms the payment (routes/payments.routes.js).
      // If the gateway can't be reached right now the order is still saved: the order page has a "Pay now" button.
      let payment = null;
      let paymentError = "";
      try {
        payment = await gatewayFor(paymentMethod).startPayment(order, req.user);
        if (!payment) paymentError = "This order can't be paid online.";
      } catch (err) {
        console.error(`${paymentMethod}: could not start the payment:`, err?.message);
        paymentError = "We couldn't reach the payment provider. Your order is saved, you can pay from your orders page.";
      }
      return res.status(201).json({ order, ...(payment ? { payment } : { paymentError }) });
    }

    notifyOrderPlaced(order, req.user); // confirmation to the customer + alert to the store (background)
    res.status(201).json({ order });
  } catch (err) {
    if (taken.length > 0) await restoreStock(taken).catch(() => {});
    if (redeemed) await releasePromo(redeemed._id).catch(() => {});
    handleRouteError(res, err, "Failed to create order");
  }
});

// GET /api/orders — current user's own orders, newest first
router.get("/", protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ orders });
  } catch (err) {
    handleRouteError(res, err, "Failed to load orders");
  }
});

// Turns the admin's ?search= text into a Mongo filter for orders ({} when there is nothing to search for).
// Finds an order by: order number (typed any way, even partly: "k7qm", "#K7QM 4T"), the old 8-character
// reference, the name / email / phone typed at checkout, the tracking number, or the name / email of the
// account that placed it.
async function orderSearchFilter(raw) {
  const term = searchTerm(raw);
  if (!term) return {};
  const rx = new RegExp(escapeRegex(term), "i");
  const or = [
    { "shippingAddress.fullName": rx },
    { "shippingAddress.email": rx },
    { "shippingAddress.phone": rx },
    { trackingNumber: rx },
  ];

  // Order number: compare letters and digits only, allowing the hyphen anywhere ("k7qm4t" finds "K7QM-4TXD")
  const code = normalizeCode(term.replace(/^#/, ""));
  if (code.length >= 3 && code.length <= 8) {
    or.push({ orderNumber: new RegExp([...code].map(escapeRegex).join("-?"), "i") });
  }
  // Old-style reference: the last characters of the database id (hex)
  const hex = term.replace(/^#/, "").toLowerCase();
  if (/^[0-9a-f]{6,24}$/.test(hex)) {
    or.push({ $expr: { $regexMatch: { input: { $toString: "$_id" }, regex: `${hex}$` } } });
  }

  // Customers: orders placed by an account whose name or email matches
  const owners = await User.find({ $or: [{ email: rx }, { name: rx }] }).select("_id").limit(200);
  if (owners.length > 0) or.push({ user: { $in: owners.map((u) => u._id) } });

  return { $or: or };
}

// GET /api/orders/admin/all — orders for the admin, newest first, one page at a time.
//   ?status=pending      only that status
//   ?search=ana          order number, customer name / email / phone, tracking number (see orderSearchFilter)
//   ?page=2&limit=20     pagination (limit defaults to 20, at most 100)
// Answers { orders, total, page, pages, limit, counts } where `total` is the number of matching orders and
// `counts` is how many orders each status has among the ones matching the search (for the filter tabs).
// (must be registered before "/:id" or "admin" would be read as an order id)
router.get("/admin/all", protect, adminOnly, async (req, res) => {
  try {
    if (req.query.status !== undefined && !STATUSES.includes(req.query.status)) {
      return res.status(400).json({ message: "Unknown status" });
    }
    const paging = parsePaging(req.query, { defaultLimit: 20, maxLimit: 100 });
    const searchFilter = await orderSearchFilter(req.query.search);
    const filter = req.query.status !== undefined ? { ...searchFilter, status: req.query.status } : searchFilter;

    const [total, grouped, orders] = await Promise.all([
      Order.countDocuments(filter),
      Order.aggregate([{ $match: searchFilter }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
      Order.find(filter)
        .sort({ createdAt: -1, _id: -1 }) // _id breaks ties so an order can't appear on two pages
        .skip(paging.skip)
        .limit(paging.limit)
        .populate("user", "name email"),
    ]);

    const counts = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    for (const g of grouped) if (g._id in counts) counts[g._id] = g.n;
    counts.all = STATUSES.reduce((n, s) => n + counts[s], 0);

    res.json({ orders, ...pageInfo(total, paging), counts });
  } catch (err) {
    handleRouteError(res, err, "Failed to load orders");
  }
});

// GET /api/orders/admin/returns — orders with a return request (admin), newest request first.
// Optional ?status=requested. Registered before "/:id" for the same reason as admin/all.
router.get("/admin/returns", protect, adminOnly, async (req, res) => {
  try {
    const filter = { returnRequest: { $exists: true } };
    if (req.query.status !== undefined) {
      if (!RETURN_STATUSES.includes(req.query.status)) return res.status(400).json({ message: "Unknown return status" });
      filter["returnRequest.status"] = req.query.status;
    }
    const orders = await Order.find(filter).sort({ "returnRequest.requestedAt": -1 }).limit(500).populate("user", "name email");
    res.json({ orders });
  } catch (err) {
    handleRouteError(res, err, "Failed to load returns");
  }
});

// GET /api/orders/admin/:id — one order with everything the printable invoice / packing slip needs (admin).
// Registered before "/:id" (which only serves the order's own customer) and after the fixed admin/... routes above.
router.get("/admin/:id", protect, adminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ message: "Order not found" });
    const order = await Order.findById(req.params.id).populate("user", "name email");
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ order });
  } catch (err) {
    handleRouteError(res, err, "Failed to load order");
  }
});

// POST /api/orders/track — guest-friendly lookup: order number + the email on the order.
// Works without signing in (e.g. from a confirmation-email link). The email is matched against
// the email typed at checkout AND the email of the account that placed the order. A wrong number
// and a wrong email get the same answer, so this can't be used to find out who ordered what.
router.post("/track", async (req, res) => {
  try {
    const { orderNumber, email } = req.body || {};
    if (typeof orderNumber !== "string" || typeof email !== "string") {
      return res.status(400).json({ message: "Order number and email are required" });
    }
    const raw = orderNumber.trim().replace(/^#/, "");
    const mail = email.trim().toLowerCase();
    // Two formats are accepted: the order number ("K7QM-4TXD", any case, hyphen/space optional) and the
    // OLD format (last 8 hex characters of the database id) so earlier confirmations keep working.
    const code = normalizeCode(raw);
    const legacy = raw.toLowerCase();
    const isNew = isOrderCode(code);
    const isLegacy = /^[0-9a-f]{8}([0-9a-f]{16})?$/.test(legacy);
    if ((!isNew && !isLegacy) || !mail || mail.length > 120) {
      return res.status(404).json({ message: NOT_FOUND_TRACK });
    }

    const owners = await User.find({ email: mail }).select("_id");
    const candidates = await Order.find({
      $or: [{ "shippingAddress.email": new RegExp(`^${escapeRegex(mail)}$`, "i") }, { user: { $in: owners.map((u) => u._id) } }],
    })
      .sort({ createdAt: -1 })
      .limit(200);

    const order = candidates.find(
      (o) =>
        (isNew && o.orderNumber && normalizeCode(o.orderNumber) === code) ||
        (isLegacy && String(o._id).toLowerCase().endsWith(legacy))
    );
    if (!order) return res.status(404).json({ message: NOT_FOUND_TRACK });

    // Only what the customer needs: no address, phone or account details
    res.json({
      order: {
        _id: order._id,
        orderNumber: order.orderNumber, // absent on orders placed before order numbers existed
        status: order.status,
        trackingNumber: order.trackingNumber, // only present once the admin has added one
        courier: order.courier,
        total: order.total,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        items: order.items.map((i) => ({ name: i.name, size: i.size, color: i.color, price: i.price, qty: i.qty, image: i.image })),
      },
    });
  } catch (err) {
    handleRouteError(res, err, "Failed to look up order");
  }
});

// GET /api/orders/:id — single order, must belong to the current user
router.get("/:id", protect, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id });
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json({ order });
  } catch (err) {
    handleRouteError(res, err, "Failed to load order");
  }
});

// POST /api/orders/:id/pay — start (or restart) the online payment of the signed-in user's own online order.
// Answers { payment }: the form the browser posts to the gateway (PayFast, JazzCash or Easypaisa). Used by the "Pay now" buttons after a failed or
// abandoned payment. A new reference/token is issued every time, so an old payment page can't be reused.
router.post("/:id/pay", protect, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ message: "Order not found" });
    const order = await Order.findOne({ _id: id, user: req.user._id });
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (!isOnline(order.paymentMethod)) return res.status(409).json({ message: "This order is paid on delivery." });
    if (order.paymentStatus === "paid" || order.paymentStatus === "refunded") {
      return res.status(409).json({ message: "This order has already been paid." });
    }
    if (order.status === "cancelled") return res.status(409).json({ message: "This order was cancelled, so it can't be paid." });
    const gateway = gatewayFor(order.paymentMethod);
    if (!gateway.isConfigured()) {
      return res.status(503).json({ message: "Online payment isn't available right now. Please try again later." });
    }

    let payment;
    try {
      payment = await gateway.startPayment(order, req.user);
    } catch (err) {
      console.error(`${order.paymentMethod}: could not start the payment:`, err?.message);
      return res.status(502).json({ message: "We couldn't reach the payment provider. Please try again in a moment." });
    }
    if (!payment) return res.status(409).json({ message: "This order can't be paid any more." });
    res.json({ payment });
  } catch (err) {
    handleRouteError(res, err, "Failed to start the payment");
  }
});

// POST /api/orders/:id/cancel — the signed-in user cancels their own order and the stock goes back.
// Only orders that haven't shipped yet (pending / processing) can be cancelled.
const CANCELLABLE = ["pending", "processing"];

router.post("/:id/cancel", protect, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ message: "Order not found" });

    const order = await cancelOrder({ _id: id, user: req.user._id, status: { $in: CANCELLABLE } });

    if (!order) {
      // Not cancellable — say why
      const existing = await Order.findOne({ _id: id, user: req.user._id }).select("status");
      if (!existing) return res.status(404).json({ message: "Order not found" });
      return res.status(409).json({
        message:
          existing.status === "cancelled"
            ? "This order is already cancelled"
            : `This order is ${existing.status} and can no longer be cancelled`,
      });
    }

    notifyOrderStatus(order, req.user.email);
    res.json({ order });
  } catch (err) {
    handleRouteError(res, err, "Failed to cancel order");
  }
});

// PATCH /api/orders/:id/status — admin moves an order along: pending → processing → shipped → delivered.
// An order can also be cancelled (stock goes back) while it is still pending or processing.
// delivered and cancelled are final. Each change is one atomic update that only succeeds if the
// order is still in a status that is allowed to move to the new one, so two admins clicking at once
// can't skip or undo each other's change.
const MOVES = {
  processing: ["pending"],
  shipped: ["pending", "processing"],
  delivered: ["pending", "processing", "shipped"],
  cancelled: CANCELLABLE,
};

// Optional tracking details sent by the admin. Returns { trackingNumber?, courier? } with only the
// fields that were sent (trimmed; "" means clear it), or { error } when something is unusable.
const TRACKING_MAX = 60;
const COURIER_MAX = 40;
function parseTracking(body = {}) {
  const out = {};
  for (const [key, max, label] of [["trackingNumber", TRACKING_MAX, "Tracking number"], ["courier", COURIER_MAX, "Courier"]]) {
    if (body[key] === undefined || body[key] === null) continue;
    if (typeof body[key] !== "string") return { error: `${label} must be text` };
    const value = body[key].trim();
    if (value.length > max) return { error: `${label} can be at most ${max} characters` };
    out[key] = value;
  }
  return out;
}

// $set / $unset for parsed tracking fields (an empty string removes the field)
function trackingUpdate(t) {
  const $set = {};
  const $unset = {};
  for (const key of ["trackingNumber", "courier"]) {
    if (t[key] === undefined) continue;
    if (t[key] === "") $unset[key] = "";
    else $set[key] = t[key];
  }
  return { $set, $unset };
}

router.patch("/:id/status", protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ message: "Order not found" });
    if (!MOVES[status]) {
      return res.status(400).json({ message: `Status must be one of: ${Object.keys(MOVES).join(", ")}` });
    }

    // Tracking details can travel with "shipped" (and "delivered", for orders marked delivered straight away)
    const tracking = status === "shipped" || status === "delivered" ? parseTracking(req.body) : {};
    if (tracking.error) return res.status(400).json({ message: tracking.error });
    const { $set: trackSet, $unset: trackUnset } = trackingUpdate(tracking);

    // An online order can only move on (processing / shipped / delivered) once the gateway has confirmed the payment.
    // Cancelling is always allowed.
    const filter = {
      _id: id,
      status: { $in: MOVES[status] },
      ...(status !== "cancelled" ? { $nor: [{ paymentMethod: { $in: ONLINE_METHODS }, paymentStatus: { $ne: "paid" } }] } : {}),
    };
    const order =
      status === "cancelled"
        ? await cancelOrder(filter)
        // "delivered" also records when, which starts the customer's return window
        : await Order.findOneAndUpdate(
            filter,
            {
              $set: { status, ...trackSet, ...(status === "delivered" ? { deliveredAt: new Date() } : {}) },
              ...(Object.keys(trackUnset).length ? { $unset: trackUnset } : {}),
            },
            { new: true, runValidators: true }
          );

    if (!order) {
      const existing = await Order.findById(id).select("status paymentMethod paymentStatus");
      if (!existing) return res.status(404).json({ message: "Order not found" });
      if (status !== "cancelled" && isOnline(existing.paymentMethod) && existing.paymentStatus !== "paid" && MOVES[status].includes(existing.status)) {
        return res.status(409).json({ message: "This order hasn't been paid yet. Wait for the online payment before processing or shipping it." });
      }
      return res.status(409).json({
        message:
          existing.status === status
            ? `This order is already ${status}`
            : `This order is ${existing.status} and can't be changed to ${status}`,
      });
    }

    notifyOrderStatus(order); // emails the customer for shipped / delivered / cancelled
    res.json({ order });
  } catch (err) {
    handleRouteError(res, err, "Failed to update order");
  }
});

// PATCH /api/orders/:id/tracking — admin adds, fixes or removes the tracking number / courier of an order
// that has not been cancelled. Body: { trackingNumber?, courier? }; "" clears a field.
// (Setting it together with "shipped" goes through the status route above, so the shipped email has it.)
router.patch("/:id/tracking", protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ message: "Order not found" });

    const tracking = parseTracking(req.body);
    if (tracking.error) return res.status(400).json({ message: tracking.error });
    const { $set, $unset } = trackingUpdate(tracking);
    if (!Object.keys($set).length && !Object.keys($unset).length) {
      return res.status(400).json({ message: "Send a trackingNumber and/or a courier" });
    }

    const order = await Order.findOneAndUpdate(
      { _id: id, status: { $ne: "cancelled" } },
      {
        ...(Object.keys($set).length ? { $set } : {}),
        ...(Object.keys($unset).length ? { $unset } : {}),
      },
      { new: true, runValidators: true }
    );
    if (!order) {
      const existing = await Order.findById(id).select("status");
      if (!existing) return res.status(404).json({ message: "Order not found" });
      return res.status(409).json({ message: "A cancelled order can't have tracking details" });
    }
    res.json({ order });
  } catch (err) {
    handleRouteError(res, err, "Failed to update tracking");
  }
});

// POST /api/orders/:id/return — the signed-in customer asks to send items back.
// Body: { reason, details?, items: [line numbers of order.items, starting at 0] }
// Only a delivered order, only once, and only within RETURN_WINDOW_DAYS of delivery.
router.post("/:id/return", protect, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ message: "Order not found" });

    const { reason, details, items } = req.body || {};
    if (typeof reason !== "string" || !RETURN_REASONS[reason]) {
      return res.status(400).json({ message: "Please choose a reason for the return" });
    }
    if (details !== undefined && typeof details !== "string") {
      return res.status(400).json({ message: "Details must be text" });
    }
    const note = (details || "").trim();
    if (note.length > 500) return res.status(400).json({ message: "Details can be at most 500 characters" });
    if (reason === "other" && !note) {
      return res.status(400).json({ message: "Please tell us a little more about the reason" });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Select at least one item to return" });
    }

    const order = await Order.findOne({ _id: id, user: req.user._id });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status !== "delivered") {
      return res.status(409).json({ message: "Only delivered orders can be returned" });
    }
    if (order.returnRequest) {
      return res.status(409).json({ message: "A return has already been requested for this order" });
    }
    const deadline = returnDeadline(order);
    if (!deadline || new Date() > deadline) {
      return res.status(409).json({
        message: `The ${RETURN_WINDOW_DAYS}-day return window for this order has closed. Please contact us.`,
      });
    }

    // Each entry is a line number in order.items
    const picked = [...new Set(items)];
    if (!picked.every((i) => Number.isInteger(i) && i >= 0 && i < order.items.length)) {
      return res.status(400).json({ message: "One of the selected items is not part of this order" });
    }

    const returnRequest = {
      status: "requested",
      reason,
      ...(note ? { details: note } : {}),
      items: picked.map((i) => {
        const it = order.items[i];
        const label = variantLabel(it);
        return { name: label ? `${it.name} (${label})` : it.name, qty: it.qty };
      }),
      requestedAt: new Date(),
    };

    // Atomic: only succeeds if the order still has no return request, so a double click can't make two
    const updated = await Order.findOneAndUpdate(
      { _id: id, user: req.user._id, status: "delivered", returnRequest: { $exists: false } },
      { $set: { returnRequest } },
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(409).json({ message: "A return has already been requested for this order" });
    }

    notifyReturnRequested(updated, req.user);
    res.status(201).json({ order: updated });
  } catch (err) {
    handleRouteError(res, err, "Failed to request return");
  }
});

// PATCH /api/orders/:id/return — admin moves a return along:
//   requested -> approved | rejected,  approved -> received,  received -> refunded
// A note is required when rejecting (the customer sees it) and optional otherwise.
// Like the order status route, each change is one atomic update that only matches a request still in a
// status that is allowed to move to the new one.
router.patch("/:id/return", protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).json({ message: "Order not found" });

    const { status, adminNote } = req.body || {};
    if (!RETURN_MOVES[status]) {
      return res.status(400).json({ message: `Status must be one of: ${Object.keys(RETURN_MOVES).join(", ")}` });
    }
    if (adminNote !== undefined && typeof adminNote !== "string") {
      return res.status(400).json({ message: "Note must be text" });
    }
    const note = adminNote === undefined ? undefined : adminNote.trim();
    if (note && note.length > 500) return res.status(400).json({ message: "Note can be at most 500 characters" });
    if (status === "rejected" && !note) {
      return res.status(400).json({ message: "Add a short note explaining why the return was rejected" });
    }

    const set = { "returnRequest.status": status };
    if (status === "rejected" || status === "refunded") set["returnRequest.resolvedAt"] = new Date();
    if (note !== undefined) set["returnRequest.adminNote"] = note;

    const order = await Order.findOneAndUpdate(
      { _id: id, "returnRequest.status": { $in: RETURN_MOVES[status] } },
      { $set: set },
      { new: true, runValidators: true }
    );

    if (!order) {
      const existing = await Order.findById(id).select("returnRequest.status");
      if (!existing || !existing.returnRequest) return res.status(404).json({ message: "Return request not found" });
      return res.status(409).json({
        message:
          existing.returnRequest.status === status
            ? `This return is already ${status}`
            : `This return is ${existing.returnRequest.status} and can't be changed to ${status}`,
      });
    }

    notifyReturnUpdate(order);
    res.json({ order });
  } catch (err) {
    handleRouteError(res, err, "Failed to update return");
  }
});

module.exports = router;
