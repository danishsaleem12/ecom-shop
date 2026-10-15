// backend/routes/subscribe.routes.js
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Subscriber = require("../models/Subscriber");
const { protect, adminOnly } = require("../middleware/auth");
const { handleRouteError } = require("../utils/errors");
const { escapeRegex, parsePaging, pageInfo, searchTerm } = require("../utils/pagination");
const { isValidUnsubscribeToken, unsubscribeUrl } = require("../utils/unsubscribe");
const { notifySubscribed } = require("../utils/notify");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// POST /api/subscribe — public newsletter signup.
// Signing up twice with the same address is not an error (and doesn't reveal who is subscribed).
router.post("/", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (typeof email !== "string" || !EMAIL_RE.test(email.trim()) || email.trim().length > 120) {
      return res.status(400).json({ message: "Please enter a valid email" });
    }
    const result = await Subscriber.updateOne({ email: email.trim().toLowerCase() }, { $setOnInsert: { email: email.trim().toLowerCase() } }, { upsert: true });
    // Welcome email only for a NEW address (upsertedCount is 1), so repeating the form doesn't send repeats
    if (result?.upsertedCount === 1) notifySubscribed(email.trim().toLowerCase());
    res.status(201).json({ message: "Subscribed" });
  } catch (err) {
    handleRouteError(res, err, "Failed to subscribe");
  }
});

// POST /api/subscribe/unsubscribe — public. Body: { email, token } from the link in a newsletter email.
// The token proves the link was made by us for that address. Unsubscribing twice (or an address that was
// never on the list) also answers 200, so the response never reveals who is subscribed.
router.post("/unsubscribe", async (req, res) => {
  try {
    const { email, token } = req.body || {};
    if (typeof email !== "string" || typeof token !== "string" || !isValidUnsubscribeToken(email, token)) {
      return res.status(400).json({ message: "This unsubscribe link is not valid" });
    }
    await Subscriber.deleteOne({ email: email.trim().toLowerCase() });
    res.json({ message: "Unsubscribed" });
  } catch (err) {
    handleRouteError(res, err, "Failed to unsubscribe");
  }
});

// ---- admin ----------------------------------------------------------------------------------

// ?search=ana -> only addresses containing that text ({} when there is nothing to search for)
const searchFilter = (raw) => {
  const term = searchTerm(raw);
  return term ? { email: new RegExp(escapeRegex(term), "i") } : {};
};

// GET /api/subscribe — subscribers, newest first, one page at a time.
//   ?search=ana        addresses containing that text
//   ?page=2&limit=25   pagination (limit defaults to 25, at most 100)
// Answers { subscribers, total, page, pages, limit }. Each subscriber includes the unsubscribe link to put in
// emails sent to them.
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const paging = parsePaging(req.query, { defaultLimit: 25, maxLimit: 100 });
    const filter = searchFilter(req.query.search);
    const [total, found] = await Promise.all([
      Subscriber.countDocuments(filter),
      Subscriber.find(filter).sort({ createdAt: -1, _id: -1 }).skip(paging.skip).limit(paging.limit),
    ]);
    const subscribers = found.map((s) => ({
      _id: s._id,
      email: s.email,
      createdAt: s.createdAt,
      unsubscribeUrl: unsubscribeUrl(s.email),
    }));
    res.json({ subscribers, ...pageInfo(total, paging) });
  } catch (err) {
    handleRouteError(res, err, "Failed to load subscribers");
  }
});

// A CSV cell. Values starting with = + - @ get a leading apostrophe so a spreadsheet can't read them as a formula.
const csvCell = (v) => {
  let text = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

// GET /api/subscribe/export — EVERY subscriber (not just one page) as a CSV file; ?search= narrows it the same way
// as the list. Columns: email, subscribed_at, unsubscribe_url.
router.get("/export", protect, adminOnly, async (req, res) => {
  try {
    const found = await Subscriber.find(searchFilter(req.query.search)).sort({ createdAt: -1, _id: -1 });
    const rows = [
      "email,subscribed_at,unsubscribe_url",
      ...found.map((s) => [s.email, new Date(s.createdAt).toISOString(), unsubscribeUrl(s.email)].map(csvCell).join(",")),
    ];
    res.set("Content-Type", "text/csv; charset=utf-8");
    res.set("Content-Disposition", 'attachment; filename="subscribers.csv"');
    res.send(rows.join("\n"));
  } catch (err) {
    handleRouteError(res, err, "Failed to export subscribers");
  }
});

// DELETE /api/subscribe/:id
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ message: "Subscriber not found" });
    const sub = await Subscriber.findByIdAndDelete(req.params.id);
    if (!sub) return res.status(404).json({ message: "Subscriber not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    handleRouteError(res, err, "Failed to delete subscriber");
  }
});

module.exports = router;
