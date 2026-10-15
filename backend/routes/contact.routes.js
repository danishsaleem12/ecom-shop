// backend/routes/contact.routes.js
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const ContactMessage = require("../models/ContactMessage");
const { protect, adminOnly } = require("../middleware/auth");
const { handleRouteError } = require("../utils/errors");
const { notifyContact } = require("../utils/notify");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LIMITS = { name: 80, email: 120, subject: 80, message: 2000 };

// POST /api/contact — public. Saves the message so it shows up in the admin "Messages" page.
router.post("/", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body || {};
    for (const [k, v] of Object.entries({ name, email, subject, message })) {
      if (typeof v !== "string" || !v.trim()) {
        return res.status(400).json({ message: "Name, email, subject and message are all required" });
      }
      if (v.trim().length > LIMITS[k]) return res.status(400).json({ message: `${k} is too long` });
    }
    if (!EMAIL_RE.test(email.trim())) return res.status(400).json({ message: "Please enter a valid email" });

    await ContactMessage.create({ name, email, subject, message });
    notifyContact({ name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim() });
    res.status(201).json({ message: "Message received" });
  } catch (err) {
    handleRouteError(res, err, "Failed to send message");
  }
});

// ---- admin ----------------------------------------------------------------------------------

// GET /api/contact — all messages, newest first
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 }).limit(1000);
    res.json({ messages, unread: messages.filter((m) => !m.read).length });
  } catch (err) {
    handleRouteError(res, err, "Failed to load messages");
  }
});

// PATCH /api/contact/:id — { read: true|false }
router.patch("/:id", protect, adminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ message: "Message not found" });
    if (typeof req.body?.read !== "boolean") return res.status(400).json({ message: "read must be true or false" });
    const msg = await ContactMessage.findByIdAndUpdate(req.params.id, { $set: { read: req.body.read } }, { new: true });
    if (!msg) return res.status(404).json({ message: "Message not found" });
    res.json({ message: msg });
  } catch (err) {
    handleRouteError(res, err, "Failed to update message");
  }
});

// DELETE /api/contact/:id
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ message: "Message not found" });
    const msg = await ContactMessage.findByIdAndDelete(req.params.id);
    if (!msg) return res.status(404).json({ message: "Message not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    handleRouteError(res, err, "Failed to delete message");
  }
});

module.exports = router;
