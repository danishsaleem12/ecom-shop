// backend/utils/passwordReset.js — the rules for "forgot password" links
//
// The link holds a random token. Only a SHA-256 hash of it is stored in the database, so someone who
// reads the database (or a backup) cannot use the stored value to take over an account.
const crypto = require("crypto");

const RESET_TTL_MINUTES = 60; // how long a link works
const RESET_TTL_MS = RESET_TTL_MINUTES * 60 * 1000;
const RESEND_GAP_MS = 60 * 1000; // at most one email per account per minute (stops mail-bombing an address)

/** A fresh token (64 hex characters) to put in the emailed link. */
const newToken = () => crypto.randomBytes(32).toString("hex");
const hashToken = (token) => crypto.createHash("sha256").update(String(token)).digest("hex");
const isTokenShape = (token) => typeof token === "string" && /^[0-9a-f]{64}$/.test(token);

/** The link in the email. It opens the storefront's /reset-password page. */
const resetUrl = (token) =>
  `${(process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "")}/reset-password?token=${token}`;

module.exports = { RESET_TTL_MINUTES, RESET_TTL_MS, RESEND_GAP_MS, newToken, hashToken, isTokenShape, resetUrl };
