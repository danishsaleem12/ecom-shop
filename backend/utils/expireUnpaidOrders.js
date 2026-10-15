// backend/utils/expireUnpaidOrders.js
// An online order (card, JazzCash, Easypaisa) reserves stock the moment it is placed, but the customer may never finish paying (closed the payment
// tab, card declined and gave up...). Without this the stock would stay locked forever. Every few minutes this
// cancels online orders that are still unpaid (or failed) after PAYMENT_HOLD_MINUTES, which puts the stock back
// (utils/cancelOrder.js) and emails the customer that nothing was charged.
//
// Race safety: the cancel is one atomic update whose filter requires "still unpaid", so an order the webhook just
// marked paid is never cancelled. In the opposite race (the payment lands right after the order was cancelled)
// the webhook notices and alerts the store to refund it.
const { cancelOrder } = require("./cancelOrder");
const { notifyOrderStatus } = require("./notify");
const { ONLINE_METHODS } = require("./paymentMethods");

const holdMinutes = () => {
  const n = Number(process.env.PAYMENT_HOLD_MINUTES);
  return Number.isFinite(n) && n >= 10 ? n : 60; // default 1 hour; never less than 10 minutes (a payment takes a while)
};
const MAX_PER_RUN = 200;

/** Cancels the expired unpaid online orders. Resolves to how many were cancelled. */
async function expireUnpaidOrders({ now = new Date(), minutes = holdMinutes() } = {}) {
  const cutoff = new Date(now.getTime() - minutes * 60 * 1000);
  let cancelled = 0;
  for (let i = 0; i < MAX_PER_RUN; i++) {
    const order = await cancelOrder({
      paymentMethod: { $in: ONLINE_METHODS },
      paymentStatus: { $in: ["unpaid", "failed"] },
      status: "pending",
      createdAt: { $lt: cutoff },
    });
    if (!order) break;
    cancelled++;
    notifyOrderStatus(order); // "cancelled, nothing was charged"
  }
  return cancelled;
}

/** Runs the check every 10 minutes (and once right after start-up). Needs the database, so call it once connected. */
function scheduleUnpaidExpiry() {
  const run = () =>
    expireUnpaidOrders()
      .then((n) => n > 0 && console.log(`Cancelled ${n} unpaid online order(s) and put their stock back`))
      .catch((err) => console.error("Expiring unpaid orders failed:", err?.message));
  run();
  const timer = setInterval(run, 10 * 60 * 1000);
  timer.unref?.();
  return timer;
}

module.exports = { expireUnpaidOrders, scheduleUnpaidExpiry, holdMinutes };
