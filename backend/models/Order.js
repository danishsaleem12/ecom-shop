// backend/models/Order.js
const mongoose = require("mongoose");
const { generateOrderNumber } = require("../utils/orderNumber");
const { PAYMENT_METHODS } = require("../utils/paymentMethods");
const { RETURN_REASONS, RETURN_STATUSES, returnDeadline } = require("../utils/returns");

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    // Which variant was bought (absent for products without variants). size/color are copied so the
    // order still reads correctly if the variant is renamed or deleted later.
    variant: { type: mongoose.Schema.Types.ObjectId },
    size: { type: String },
    color: { type: String },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    image: { type: String },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

// A customer's request to send back items from a delivered order (one request per order)
const returnItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const returnRequestSchema = new mongoose.Schema(
  {
    status: { type: String, enum: RETURN_STATUSES, default: "requested" },
    reason: { type: String, enum: Object.keys(RETURN_REASONS), required: true },
    details: { type: String, trim: true, maxlength: 500 },
    items: { type: [returnItemSchema], default: [] }, // snapshot of what is being returned
    requestedAt: { type: Date, default: Date.now },
    resolvedAt: Date, // set when the request is rejected or refunded
    adminNote: { type: String, trim: true, maxlength: 500 }, // shown to the customer
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    // Short customer-facing number like "K7QM-4TXD", drawn automatically when the order is created.
    // "sparse" lets orders placed before this field existed (no number yet) coexist with the unique index;
    // run `npm run orders:backfill` once to give them one.
    orderNumber: { type: String, unique: true, sparse: true, default: generateOrderNumber },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    items: { type: [orderItemSchema], required: true },
    // What the customer pays (items + shipping - discount). The items' subtotal and the shipping fee are not stored:
    // they are worked out from the lines, as before; shipping = total - subtotal + discount.
    total: { type: Number, required: true, min: 0 },
    // Promo code used at checkout. `discount` is the Rs taken off; `promo` is a copy of the code as it was then,
    // so the order still reads correctly if the code is edited or deleted later.
    discount: { type: Number, default: 0, min: 0 },
    promo: {
      type: new mongoose.Schema(
        {
          id: { type: mongoose.Schema.Types.ObjectId, ref: "PromoCode" },
          code: { type: String, required: true },
          type: { type: String, enum: ["percent", "fixed", "shipping"] },
          value: Number,
        },
        { _id: false, id: false } // id: false -> keep our own `id` field (the PromoCode's _id) instead of a virtual
      ),
    },
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    shippingAddress: {
      fullName: String,
      line1: String,
      line2: String,
      city: String,
      postalCode: String,
      country: String,
      phone: String,
      // stored lowercase so guest tracking / lookups are not case-sensitive for new orders
      email: { type: String, trim: true, lowercase: true },
    },
    // "cod" = cash on delivery; online: "card" = PayFast (card or mobile wallet), "jazzcash" = JazzCash, "easypaisa" = Easypaisa
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: "cod" },
    // Only meaningful for online orders (cash on delivery orders just stay "unpaid"). Only the gateway webhook / return
    // handlers (routes/payments.routes.js) move an online order to "paid" or "failed"; "refunded" is set once the money went back.
    paymentStatus: { type: String, enum: ["unpaid", "paid", "failed", "refunded"], default: "unpaid" },
    // Details of the online payment. No card data is ever stored: PayFast takes it on its own page.
    payment: {
      type: new mongoose.Schema(
        {
          gateway: String, // "payfast" | "jazzcash" | "easypaisa"
          attempts: { type: Number, default: 0 }, // how many times a payment form was issued for this order
          basketId: String, // the reference sent to the gateway for the latest attempt, e.g. "K7QM-4TXD-2" (JazzCash: "TK7QM4TXDA2")
          transactionId: String, // the gateway's reference for the successful payment
          paidAt: Date,
          failureMessage: String, // the gateway's message for the last failed attempt
          refundedAt: Date,
        },
        { _id: false }
      ),
    },
    notes: { type: String, trim: true },
    // Set by an admin when the parcel goes out (or later). Shown to the customer on their orders page,
    // on the Track order page and in the "shipped" email.
    trackingNumber: { type: String, trim: true, maxlength: 60 },
    courier: { type: String, trim: true, maxlength: 40 }, // e.g. "TCS", "Leopards"
    deliveredAt: Date, // set when an admin marks the order delivered; starts the return window
    returnRequest: { type: returnRequestSchema },
  },
  // id: false -> only _id is sent (the frontend uses _id); virtuals -> returnableUntil is included in JSON
  { timestamps: true, id: false, toJSON: { virtuals: true } }
);

// Until when the customer may request a return. Only set for a delivered order that has no return request yet,
// so the frontend can simply show the "Request return" button while this date is in the future.
orderSchema.virtual("returnableUntil").get(function returnableUntil() {
  if (this.status !== "delivered" || this.returnRequest) return undefined;
  return returnDeadline(this) || undefined;
});

// ---- Indexes (Mongoose builds these automatically on startup) ----
orderSchema.index({ user: 1, createdAt: -1 }); // "my orders" list, newest first
orderSchema.index({ createdAt: -1 }); // admin list, newest first
orderSchema.index({ status: 1, createdAt: -1 }); // admin list filtered by status
orderSchema.index({ "shippingAddress.email": 1 }); // guest order tracking lookup
orderSchema.index({ "returnRequest.requestedAt": -1 }, { sparse: true }); // admin returns list
orderSchema.index({ user: 1, "promo.code": 1 }, { sparse: true }); // "has this customer used this code?"
orderSchema.index({ paymentMethod: 1, paymentStatus: 1, status: 1, createdAt: 1 }); // expiring unpaid online orders

module.exports = mongoose.model("Order", orderSchema);