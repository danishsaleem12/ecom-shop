// backend/utils/stock.js
// Stock moves for one order line. A line is { product, variant?, qty }.
// A line with a variant changes that variant's stock AND the product total (the total is the sum of its
// variants); a line without one changes the product stock only. Every take is a single atomic update that
// only succeeds if enough is left, so two people buying the last item can't both get it.
const Product = require("../models/Product");

/** Takes stock. Resolves to true when it worked, false when there wasn't enough. */
async function takeStock({ product, variant, qty }) {
  const r = variant
    ? await Product.updateOne(
        { _id: product, variants: { $elemMatch: { _id: variant, stock: { $gte: qty } } } },
        { $inc: { "variants.$.stock": -qty, stock: -qty } }
      )
    : await Product.updateOne({ _id: product, stock: { $gte: qty } }, { $inc: { stock: -qty } });
  return r.modifiedCount === 1;
}

/** Puts stock back (cancelled order, failed checkout). A variant that no longer exists is skipped. */
function giveStock({ product, variant, qty }) {
  return variant
    ? Product.updateOne({ _id: product, "variants._id": variant }, { $inc: { "variants.$.stock": qty, stock: qty } })
    : Product.updateOne({ _id: product }, { $inc: { stock: qty } });
}

module.exports = { takeStock, giveStock };
