// backend/utils/paymentResult.js — what happens to an order when a gateway reports a payment result.
// Shared by the PayFast webhook and the JazzCash / Easypaisa handlers (routes/payments.routes.js), so every gateway
// follows the same safety rules:
//   - the amount the gateway took must match the order total (1 rupee tolerance for rounding);
//   - only the FIRST successful report flips the order to paid (one atomic update), repeats are harmless;
//   - a failed attempt never undoes a payment that already went through;
//   - a payment that lands on an already cancelled order, or a second payment, alerts the store to refund.
const Order = require("../models/Order");
const { notifyOrderPlaced, notifyPaymentOnCancelledOrder, notifyDuplicatePayment } = require("./notify");

/**
 * Claims the next payment attempt of an order that still needs paying: one atomic update that fails when the order
 * was cancelled or paid in the meantime. Resolves to the updated order, or null when it can't be paid any more.
 */
function claimAttempt(order, method, gateway) {
  return Order.findOneAndUpdate(
    { _id: order._id, paymentMethod: method, paymentStatus: { $in: ["unpaid", "failed"] }, status: { $ne: "cancelled" } },
    { $inc: { "payment.attempts": 1 }, $set: { "payment.gateway": gateway } },
    { new: true }
  );
}

/**
 * Applies a verified result from a gateway.
 *   { method, orderNumber, paid, amount, transactionId, message, label, lookupOnly }
 * Resolves to { code, message?, order? }: code 200 = handled (also for repeats), 400/404 = refused.
 */
async function applyPaymentResult({ method, orderNumber, paid, amount, transactionId = "", message = "", label = "Payment", lookupOnly = false }) {
  const order = orderNumber ? await Order.findOne({ orderNumber, paymentMethod: method }) : null;
  if (!order) return { code: 404, message: "Order not found" };
  if (lookupOnly) return { code: 200, order }; // only find the order (a result that says nothing yet, e.g. "still pending")

  if (!paid) {
    // A failed attempt never undoes a payment that already went through
    await Order.updateOne(
      { _id: order._id, paymentStatus: { $in: ["unpaid", "failed"] } },
      { $set: { paymentStatus: "failed", "payment.failureMessage": message || "Payment was not completed" } }
    );
    return { code: 200, order };
  }

  // Paid. The amount must be what the order costs (a 1 rupee tolerance covers rounding).
  if (!Number.isFinite(amount) || Math.abs(amount - order.total) > 1) {
    console.error(`${label}: amount mismatch for order ${orderNumber}: paid ${amount}, expected ${order.total}`);
    return { code: 400, message: "Amount does not match the order" };
  }

  // One atomic update: only the first successful notification flips the order, later copies find it already paid
  const done = await Order.findOneAndUpdate(
    { _id: order._id, paymentStatus: { $in: ["unpaid", "failed"] } },
    {
      $set: { paymentStatus: "paid", "payment.transactionId": transactionId, "payment.paidAt": new Date() },
      $unset: { "payment.failureMessage": "" },
    },
    { new: true }
  );

  if (!done) {
    // Already paid before. Same transaction = the gateway retrying (fine). A different one = the customer paid twice.
    if (order.paymentStatus === "paid" && transactionId && order.payment?.transactionId !== transactionId) {
      notifyDuplicatePayment(order, transactionId);
    }
    return { code: 200, order };
  }

  if (done.status === "cancelled") {
    notifyPaymentOnCancelledOrder(done); // paid after the order was cancelled/expired: the store must refund it
  } else {
    notifyOrderPlaced(done); // the confirmation + new-order alert are sent now, once the money is really in
  }
  return { code: 200, order: done };
}

module.exports = { claimAttempt, applyPaymentResult };
