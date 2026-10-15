// backend/middleware/rateLimit.js
const { rateLimit } = require("express-rate-limit");

const make = (opts) =>
  rateLimit({
    standardHeaders: "draft-7", // sends RateLimit-* headers so clients can back off
    legacyHeaders: false,
    message: { message: "Too many attempts. Please try again later." },
    ...opts,
  });

// Created per app (not shared module-level) so every app instance starts with fresh counters.
// Login: 10 FAILED attempts per IP per 15 minutes. Successful logins aren't counted, so a
// real user who signs in and out isn't locked out by their own activity.
const loginLimiter = () => make({ windowMs: 15 * 60 * 1000, limit: 10, skipSuccessfulRequests: true });

// Register: 10 sign-ups per IP per hour.
const registerLimiter = () => make({ windowMs: 60 * 60 * 1000, limit: 10 });

// Public forms (contact message, newsletter signup): 10 per IP per hour, so nobody can flood the admin inbox.
const formLimiter = () => make({ windowMs: 60 * 60 * 1000, limit: 10 });

// Guest order lookup: 30 tries per IP per 15 minutes, so order numbers can't be guessed in bulk.
const trackLimiter = () => make({ windowMs: 15 * 60 * 1000, limit: 30 });

// Promo code check: 20 WRONG codes per IP per 15 minutes (valid ones aren't counted), so codes can't be guessed in bulk.
const promoLimiter = () => make({ windowMs: 15 * 60 * 1000, limit: 20, skipSuccessfulRequests: true });

// Writing / editing reviews: 20 per IP per hour, so nobody can flood a product with ratings.
const reviewLimiter = () => make({ windowMs: 60 * 60 * 1000, limit: 20 });

// Newsletter sends and test emails (admin): 30 per IP per hour.
const newsletterLimiter = () => make({ windowMs: 60 * 60 * 1000, limit: 30 });

// Cart sync: the storefront saves the cart a moment after every change, so this is generous (300 per IP per 15 minutes).
const cartLimiter = () => make({ windowMs: 15 * 60 * 1000, limit: 300 });

// Starting an online payment: 20 per IP per 15 minutes (each one asks PayFast for a token), plenty for real retries.
const payLimiter = () => make({ windowMs: 15 * 60 * 1000, limit: 20 });

module.exports = { cartLimiter, payLimiter, loginLimiter, registerLimiter, formLimiter, trackLimiter, promoLimiter, reviewLimiter, newsletterLimiter };
