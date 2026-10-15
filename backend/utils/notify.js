// backend/utils/notify.js — "tell the right person about this event".
// Routes call these AFTER they have finished their real work, without await: the response never waits
// for a mail server, and an email problem can never turn a successful order into an error.
const mailer = require("./mailer");
const tpl = require("./emailTemplates");
const { isOnline } = require("./paymentMethods");

// ADMIN_NOTIFY_EMAIL = where the store owner wants alerts. Falls back to the admin login email.
const adminAddress = () => process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_EMAIL || "";

/** Runs `job` in the background; any error is logged, never thrown. Skipped entirely when mail is off. */
function background(label, job) {
  if (!mailer.isEnabled()) return;
  const run = Promise.resolve()
    .then(job)
    .catch((err) => console.error(`Email "${label}" failed:`, err?.message));
  mailer.track(run);
}

const send = (to, mail) => (mail && to ? mailer.sendMail({ to, ...mail }) : undefined);

/** Where an order's emails go: the email typed at checkout, else the account's email. */
async function customerEmail(order, fallback) {
  if (order?.shippingAddress?.email) return order.shippingAddress.email;
  if (fallback) return fallback;
  if (order?.user?.email) return order.user.email; // populated
  if (!order?.user) return "";
  const User = require("../models/User");
  const q = User.findById(order.user._id || order.user);
  const owner = await (q && q.select ? q.select("email") : q);
  return owner?.email || "";
}

/** A new order: confirmation to the customer, alert to the store owner. */
function notifyOrderPlaced(order, user) {
  background("order placed", async () => {
    await Promise.all([send(await customerEmail(order, user?.email), tpl.orderConfirmation(order)), send(adminAddress(), tpl.adminNewOrder(order))]);
  });
}

/** Order moved to shipped / delivered / cancelled. (Other statuses send nothing.) */
function notifyOrderStatus(order, fallbackEmail) {
  if (!tpl.ORDER_STATUS_EMAILS.includes(order?.status)) return;
  background("order status", async () => {
    await send(await customerEmail(order, fallbackEmail), tpl.orderStatus(order));
    // Cancelling an order the customer already paid for online means the store has money to give back
    if (order.status === "cancelled" && isOnline(order.paymentMethod) && order.paymentStatus === "paid") {
      await send(adminAddress(), tpl.adminPaymentAlert(order, "cancelledPaid"));
    }
  });
}

/** A payment arrived for an order that was already cancelled (e.g. the payment window had run out): refund needed. */
function notifyPaymentOnCancelledOrder(order) {
  background("payment on cancelled order", () => send(adminAddress(), tpl.adminPaymentAlert(order, "paidAfterCancel")));
}

/** The customer paid the same order twice: one payment has to be refunded. */
function notifyDuplicatePayment(order, transactionId) {
  background("duplicate payment", () => send(adminAddress(), tpl.adminPaymentAlert(order, "duplicate", transactionId)));
}

/** Customer asked for a return: confirmation to them, alert to the store owner. */
function notifyReturnRequested(order, user) {
  background("return requested", async () => {
    await Promise.all([send(await customerEmail(order, user?.email), tpl.returnUpdate(order)), send(adminAddress(), tpl.adminNewReturn(order))]);
  });
}

/** Admin moved a return along: tell the customer. */
function notifyReturnUpdate(order) {
  background("return update", async () => {
    await send(await customerEmail(order), tpl.returnUpdate(order));
  });
}

function notifySubscribed(email) {
  background("welcome", () => send(email, tpl.subscribeWelcome(email)));
}

function notifyContact(msg) {
  background("contact", () => send(adminAddress(), { ...tpl.adminNewContact(msg), replyTo: msg.email }));
}

function sendPasswordReset(user, url, minutes) {
  background("password reset", () => send(user.email, tpl.passwordReset(user, url, minutes)));
}

function sendEmailVerification(user, url, hours) {
  background("email verification", () => send(user.email, tpl.emailVerification(user, url, hours)));
}

function notifyPasswordChanged(user) {
  background("password changed", () => send(user.email, tpl.passwordChanged(user)));
}

function notifyAccountDeleted(user) {
  background("account deleted", () => send(user.email, tpl.accountDeleted(user)));
}

module.exports = {
  notifyOrderPlaced,
  notifyOrderStatus,
  notifyPaymentOnCancelledOrder,
  notifyDuplicatePayment,
  notifyReturnRequested,
  notifyReturnUpdate,
  notifySubscribed,
  notifyContact,
  sendPasswordReset,
  sendEmailVerification,
  notifyPasswordChanged,
  notifyAccountDeleted,
};
