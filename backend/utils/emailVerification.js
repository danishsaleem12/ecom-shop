// backend/utils/emailVerification.js — the rules for the "confirm your email" link sent at sign-up
//
// Same approach as password-reset links (utils/passwordReset.js): the link holds a random token and only a
// SHA-256 hash of it is stored, so a leaked database can't be used to verify accounts.
const { newToken, hashToken, isTokenShape } = require("./passwordReset");

const VERIFY_TTL_HOURS = 24; // how long a link works
const VERIFY_TTL_MS = VERIFY_TTL_HOURS * 60 * 60 * 1000;
const RESEND_GAP_MS = 60 * 1000; // at most one email per account per minute

/** The link in the email. It opens the storefront's /verify-email page. */
const verifyUrl = (token) =>
  `${(process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "")}/verify-email?token=${token}`;

/** A new token plus the two values to store for it: { token, fields: { emailVerificationToken, emailVerificationExpires } } */
function issueVerification() {
  const token = newToken();
  return {
    token,
    fields: { emailVerificationToken: hashToken(token), emailVerificationExpires: new Date(Date.now() + VERIFY_TTL_MS) },
  };
}

module.exports = { VERIFY_TTL_HOURS, VERIFY_TTL_MS, RESEND_GAP_MS, hashToken, isTokenShape, verifyUrl, issueVerification };
