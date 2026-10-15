// backend/scripts/backfill-order-numbers.js
//
// Usage (from /backend):   npm run orders:backfill
//
// Gives an order number to every order placed BEFORE order numbers existed.
// Safe to run more than once: it only touches orders that have no number yet,
// and it does not change their createdAt / updatedAt dates.
require("dotenv").config();
const mongoose = require("mongoose");
const Order = require("../models/Order");
const { generateOrderNumber } = require("../utils/orderNumber");

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is missing from .env — nothing done");
    process.exitCode = 1;
    return;
  }
  await mongoose.connect(process.env.MONGODB_URI);

  // lean(): plain documents, so the schema's default number is NOT applied to what we read
  const missing = await Order.find({ orderNumber: null }).select("_id").sort({ createdAt: 1 }).lean();
  console.log(`${missing.length} order(s) without an order number`);

  let done = 0;
  for (const { _id } of missing) {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        // The filter makes this a no-op if another process already numbered the order
        const r = await Order.updateOne(
          { _id, orderNumber: null },
          { $set: { orderNumber: generateOrderNumber() } },
          { timestamps: false } // keep updatedAt as it was
        );
        if (r.modifiedCount === 1) done += 1;
        break;
      } catch (err) {
        if (err?.code !== 11000) throw err; // a rare duplicate number: draw another
      }
    }
  }
  console.log(`Done. ${done} order(s) numbered.`);
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
