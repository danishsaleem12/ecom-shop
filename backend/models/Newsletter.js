// backend/models/Newsletter.js — one newsletter the admin sent (or is sending) to the subscriber list
const mongoose = require("mongoose");

const NEWSLETTER_STATUSES = ["sending", "sent", "failed"];

const newsletterSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, trim: true, maxlength: 150 },
    body: { type: String, required: true, trim: true, maxlength: 10000 }, // plain text, blank line = new paragraph
    buttonLabel: { type: String, trim: true, maxlength: 40 },
    buttonUrl: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: NEWSLETTER_STATUSES, default: "sending" },
    recipients: { type: Number, default: 0, min: 0 }, // subscribers when the send started
    sent: { type: Number, default: 0, min: 0 }, // handed to the mail server
    failed: { type: Number, default: 0, min: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    finishedAt: Date,
  },
  { timestamps: true }
);

newsletterSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Newsletter", newsletterSchema);
module.exports.NEWSLETTER_STATUSES = NEWSLETTER_STATUSES;
