const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

// A delivery address saved on the customer's account (max 5, see utils/addresses.js).
// Checkout copies the chosen one into the order, so editing or deleting it later never changes an old order.
const addressSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, maxlength: 30 }, // e.g. "Home", "Office"
    fullName: { type: String, required: true, trim: true, maxlength: 80 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    line1: { type: String, required: true, trim: true, maxlength: 200 },
    city: { type: String, required: true, trim: true, maxlength: 60 },
    postalCode: { type: String, trim: true, maxlength: 12 },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false }, // never returned by default
    role: { type: String, enum: ["user", "admin"], default: "user" },
    // Bumped on logout and on password change. Every login token carries the number it was issued
    // under, so bumping it instantly invalidates all older tokens (stolen cookie, old device, etc.)
    tokenVersion: { type: Number, default: 0 },
    // "Forgot password": a SHA-256 hash of the emailed token (never the token itself) and when it stops working.
    // Hidden from normal queries; cleared as soon as the link is used.
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
    addresses: { type: [addressSchema], default: [] },
    // The saved cart, so it follows the customer across devices (see utils/cart.js). Only ids and quantities are
    // stored; names, prices and stock are looked up from the product whenever the cart is read.
    cart: {
      type: [
        new mongoose.Schema(
          {
            product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
            variant: { type: mongoose.Schema.Types.ObjectId },
            qty: { type: Number, required: true, min: 1 },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    // Whether the customer has clicked the link we emailed at sign-up. It DEFAULTS to true so every account that
    // existed before this feature (and the admin account) counts as verified; only /register sets it to false.
    emailVerified: { type: Boolean, default: true },
    // A SHA-256 hash of the emailed token (never the token itself) and when it stops working. Cleared when used.
    emailVerificationToken: { type: String, select: false },
    emailVerificationExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model("User", userSchema);