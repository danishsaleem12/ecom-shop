// backend/models/Subscriber.js — newsletter signups (footer + "Enter the world of Aurelia" banner)
const mongoose = require("mongoose");

const subscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 120 },
  },
  { timestamps: true }
);

subscriberSchema.index({ createdAt: -1 }); // admin list, newest first (email already has a unique index)

module.exports = mongoose.model("Subscriber", subscriberSchema);
