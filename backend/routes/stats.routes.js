// backend/routes/stats.routes.js
// GET /api/admin/stats — everything the admin dashboard shows, in one request (admin only).
//
// Rules for the numbers:
//   - "sales" and "orders" leave out cancelled orders, and sales also leave out orders whose return was refunded
//   - days are the store's own calendar days (STORE_TIMEZONE, default Asia/Karachi), not UTC days
//   - low stock = a product (or one of its sizes/colors) with LOW_STOCK_THRESHOLD units or fewer (default 5)
//   - top products = best sellers by units over the last 30 days
const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Product = require("../models/Product");
const { protect, adminOnly } = require("../middleware/auth");
const { handleRouteError } = require("../utils/errors");
const { ONLINE_METHODS } = require("../utils/paymentMethods");

const TZ = process.env.STORE_TIMEZONE || "Asia/Karachi";
const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS = 30;

const lowStockThreshold = () => {
  const n = Number(process.env.LOW_STOCK_THRESHOLD);
  return Number.isInteger(n) && n >= 0 ? n : 5;
};

// "2026-10-15" for a moment, in the store's time zone
const dayKey = (date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const sum = (days, field) => round2(days.reduce((n, d) => n + d[field], 0));

// An online order only counts as a sale once the gateway has confirmed the payment (cash on delivery orders count straight away)
const notUnpaidCard = { $nor: [{ paymentMethod: { $in: ONLINE_METHODS }, paymentStatus: { $in: ["unpaid", "failed"] } }] };

// A refunded return takes the sale back out of the revenue
const netTotal = { $cond: [{ $eq: ["$returnRequest.status", "refunded"] }, 0, "$total"] };

router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const now = new Date();
    const since = new Date(now.getTime() - (DAYS + 1) * DAY_MS);
    const threshold = lowStockThreshold();

    const [facets] = await Order.aggregate([
      {
        $facet: {
          daily: [
            { $match: { createdAt: { $gte: since }, status: { $ne: "cancelled" }, ...notUnpaidCard } },
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ } },
                orders: { $sum: 1 },
                revenue: { $sum: netTotal },
              },
            },
          ],
          allTime: [
            { $match: { status: { $ne: "cancelled" }, ...notUnpaidCard } },
            { $group: { _id: null, orders: { $sum: 1 }, revenue: { $sum: netTotal } } },
          ],
          byStatus: [{ $group: { _id: "$status", n: { $sum: 1 } } }],
          openReturns: [{ $match: { "returnRequest.status": "requested" } }, { $count: "n" }],
          top: [
            {
              $match: {
                createdAt: { $gte: new Date(now.getTime() - DAYS * DAY_MS) },
                status: { $ne: "cancelled" },
                ...notUnpaidCard,
                "returnRequest.status": { $ne: "refunded" },
              },
            },
            { $unwind: "$items" },
            {
              $group: {
                _id: "$items.product",
                name: { $first: "$items.name" },
                image: { $first: "$items.image" },
                units: { $sum: "$items.qty" },
                revenue: { $sum: { $multiply: ["$items.price", "$items.qty"] } },
              },
            },
            { $sort: { units: -1, revenue: -1 } },
            { $limit: 5 },
          ],
          recent: [
            { $sort: { createdAt: -1 } },
            { $limit: 6 },
            { $project: { orderNumber: 1, status: 1, total: 1, createdAt: 1, "shippingAddress.fullName": 1 } },
          ],
        },
      },
    ]);

    // One entry per day for the last 30 days (oldest first), zero-filled
    const byDay = new Map((facets.daily || []).map((d) => [d._id, d]));
    const days = [];
    for (let i = DAYS - 1; i >= 0; i--) {
      const key = dayKey(new Date(now.getTime() - i * DAY_MS));
      if (days.length && days[days.length - 1].date === key) continue; // clock change: never repeat a day
      const d = byDay.get(key);
      days.push({ date: key, orders: d?.orders || 0, revenue: round2(d?.revenue) });
    }
    const last7 = days.slice(-7);
    const prev7 = days.slice(-14, -7);
    const all = facets.allTime?.[0] || { orders: 0, revenue: 0 };
    const status = Object.fromEntries((facets.byStatus || []).map((s) => [s._id, s.n]));

    const lowProducts = await Product.find({
      $or: [
        { $and: [{ $or: [{ variants: { $exists: false } }, { variants: { $size: 0 } }] }, { stock: { $lte: threshold } }] },
        { "variants.stock": { $lte: threshold } },
      ],
    })
      .select("name image stock variants")
      .sort({ stock: 1, name: 1 })
      .limit(30);

    const lowStock = lowProducts.map((p) => {
      const variants = (p.variants || []).filter((v) => v.stock <= threshold).map((v) => ({ size: v.size, color: v.color, stock: v.stock }));
      return { _id: p._id, name: p.name, image: p.image, stock: p.stock, variants: (p.variants || []).length ? variants : undefined };
    });

    res.json({
      generatedAt: now,
      timezone: TZ,
      lowStockThreshold: threshold,
      today: days[days.length - 1],
      week: { orders: sum(last7, "orders"), revenue: sum(last7, "revenue"), prevOrders: sum(prev7, "orders"), prevRevenue: sum(prev7, "revenue") },
      month: { orders: sum(days, "orders"), revenue: sum(days, "revenue") },
      allTime: { orders: all.orders, revenue: round2(all.revenue) },
      days,
      attention: { pendingOrders: status.pending || 0, openReturns: facets.openReturns?.[0]?.n || 0, lowStock: lowStock.length },
      byStatus: status,
      topProducts: (facets.top || []).map((t) => ({ _id: t._id, name: t.name, image: t.image, units: t.units, revenue: round2(t.revenue) })),
      lowStock,
      recentOrders: facets.recent || [],
    });
  } catch (err) {
    handleRouteError(res, err, "Failed to load dashboard");
  }
});

module.exports = router;
