// backend/utils/accountData.js — "download my data" and "delete my account" for a customer.
//
// EXPORT  buildExport(user)   -> one plain object with everything we hold about this customer.
// DELETE  deletionBlocker(user) -> a sentence explaining why the account can't be deleted yet, or "".
//         eraseAccount(user)    -> removes the personal data.
//
// What deleting does (and why):
//   - the account itself, saved addresses, reviews, newsletter subscription and contact-form messages are deleted;
//   - ORDERS ARE KEPT but made anonymous (no name, phone, address line, email, notes). The store needs the sales
//     records for accounting and for returns/refunds; after this they can no longer be tied to a person;
//   - an account with an order still on its way, or an open return, can't be deleted until that is finished,
//     otherwise a parcel could be in the courier's hands with nobody to contact.
// Every step can safely be run again, so if something fails half-way the customer just presses delete once more.
const User = require("../models/User");
const Order = require("../models/Order");
const Review = require("../models/Review");
const Subscriber = require("../models/Subscriber");
const ContactMessage = require("../models/ContactMessage");
const { refreshProductRating } = require("./reviews");
const { hydrateCart, storedLines } = require("./cart");

const ACTIVE_ORDER_STATUSES = ["pending", "processing", "shipped"];
const OPEN_RETURN_STATUSES = ["requested", "approved", "received"]; // "rejected" and "refunded" are finished

const DELETED_NAME = "Deleted customer";

/** Why this account can't be deleted right now, or "" when it can. */
async function deletionBlocker(user) {
  if (user.role === "admin") {
    return "Admin accounts can't be deleted from here. Ask another admin to change your role first.";
  }
  if (await Order.exists({ user: user._id, status: { $in: ACTIVE_ORDER_STATUSES } })) {
    return "You still have an order that hasn't been delivered or cancelled. You can delete your account once it has arrived.";
  }
  if (await Order.exists({ user: user._id, "returnRequest.status": { $in: OPEN_RETURN_STATUSES } })) {
    return "You have a return that is still being processed. You can delete your account once it is finished.";
  }
  return "";
}

/** Everything we hold about this customer, as a plain object (no password hash, no tokens). */
async function buildExport(user) {
  const email = user.email;
  const [orders, reviews, subscriber, messages, cartItems] = await Promise.all([
    Order.find({ user: user._id }).sort({ createdAt: -1 }).lean(),
    Review.find({ user: user._id }).sort({ createdAt: -1 }).populate("product", "name").lean(),
    Subscriber.findOne({ email }).lean(),
    ContactMessage.find({ email }).sort({ createdAt: -1 }).lean(),
    hydrateCart(storedLines(user.cart)),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    account: {
      name: user.name,
      email,
      emailVerified: user.emailVerified !== false,
      createdAt: user.createdAt,
    },
    addresses: (user.addresses || []).map((a) => ({
      label: a.label,
      fullName: a.fullName,
      phone: a.phone,
      line1: a.line1,
      city: a.city,
      postalCode: a.postalCode,
      isDefault: Boolean(a.isDefault),
    })),
    orders: orders.map((o) => ({
      orderNumber: o.orderNumber,
      placedAt: o.createdAt,
      status: o.status,
      items: (o.items || []).map((i) => ({ name: i.name, size: i.size, color: i.color, qty: i.qty, price: i.price })),
      discount: o.discount || 0,
      promoCode: o.promo?.code,
      total: o.total,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      shippingAddress: o.shippingAddress,
      notes: o.notes,
      courier: o.courier,
      trackingNumber: o.trackingNumber,
      deliveredAt: o.deliveredAt,
      returnRequest: o.returnRequest,
    })),
    reviews: reviews.map((r) => ({
      product: r.product?.name,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      status: r.status,
      createdAt: r.createdAt,
    })),
    newsletter: subscriber ? { subscribed: true, since: subscriber.createdAt } : { subscribed: false },
    contactMessages: messages.map((m) => ({ subject: m.subject, message: m.message, sentAt: m.createdAt })),
    cart: cartItems.map((i) => ({ product: i.name, size: i.size, color: i.color, qty: i.qty })),
    notStoredOnOurServers: "Your wishlist is kept only in your own browser.",
  };
}

/** Deletes the customer's personal data (see the top of this file). Call deletionBlocker() first. */
async function eraseAccount(user) {
  // Reviews go; the ratings shown on those products have to be worked out again without them
  const productIds = await Review.distinct("product", { user: user._id });
  await Review.deleteMany({ user: user._id });
  for (const productId of productIds) await refreshProductRating(productId);

  // Orders stay, anonymised. `city` and `country` stay so sales reports still work.
  await Order.updateMany(
    { user: user._id },
    {
      $set: { "shippingAddress.fullName": DELETED_NAME },
      $unset: {
        "shippingAddress.line1": 1,
        "shippingAddress.line2": 1,
        "shippingAddress.postalCode": 1,
        "shippingAddress.phone": 1,
        "shippingAddress.email": 1,
        notes: 1,
        "returnRequest.details": 1,
      },
    }
  );

  await Subscriber.deleteMany({ email: user.email });
  await ContactMessage.deleteMany({ email: user.email });

  // Last, so that if anything above failed the person can still sign in and try again
  await User.deleteOne({ _id: user._id });
}

module.exports = { buildExport, deletionBlocker, eraseAccount, DELETED_NAME };
