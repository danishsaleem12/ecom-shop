// backend/utils/cancelOrder.js
const Order = require("../models/Order");
const { giveStock } = require("./stock");
const { releasePromo } = require("./promo");

/**
 * Cancels ONE order that matches `filter` and puts its stock back.
 * Used by both the customer cancel route and the admin status route, so the rules are identical.
 *
 * The status flip is a single atomic update; only the request that wins it restores stock, so a
 * double click or two open tabs can never put the stock back twice. If putting stock back fails
 * half-way, what was already restored is undone and the old status comes back, so stock and
 * order status never disagree.
 *
 * Returns the order (status already "cancelled"), or null when nothing matched the filter.
 */
async function cancelOrder(filter) {
  // findOneAndUpdate returns the order as it was BEFORE the update
  const order = await Order.findOneAndUpdate(filter, { $set: { status: "cancelled" } });
  if (!order) return null;

  const restored = [];
  try {
    for (const it of order.items) {
      if (!it.product) continue;
      await giveStock({ product: it.product, variant: it.variant, qty: it.qty });
      restored.push(it);
    }
  } catch (err) {
    await Promise.all(restored.map((it) => giveStock({ product: it.product, variant: it.variant, qty: -it.qty }))).catch(
      () => {}
    );
    await Order.updateOne({ _id: order._id, status: "cancelled" }, { $set: { status: order.status } }).catch(() => {});
    throw err;
  }

  // A cancelled order doesn't use up a promo code (best effort: the order is cancelled either way)
  if (order.promo?.id) await releasePromo(order.promo.id).catch(() => {});

  order.status = "cancelled";
  return order;
}

module.exports = { cancelOrder };
