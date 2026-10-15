// backend/utils/unsubscribe.js — signed newsletter unsubscribe links
//
// Every newsletter email must carry a link that removes the reader from the list. The link holds the
// email plus a token: an HMAC of that email made with a secret only the server knows. Nobody can build a
// working link for someone else's address, and nothing extra has to be stored per subscriber (so
// subscribers who signed up before this existed are covered too).
//
// Use unsubscribeUrl(email) when you build a newsletter / welcome email. The admin subscribers list
// already includes it for each subscriber.
//
// Secret: UNSUBSCRIBE_SECRET if set, otherwise JWT_SECRET. Prefer setting UNSUBSCRIBE_SECRET once and never
// changing it: changing the secret makes every link in emails you already sent stop working.
const crypto = require("crypto");

function secret() {
  const s = process.env.UNSUBSCRIBE_SECRET || process.env.JWT_SECRET;
  if (!s) throw new Error("UNSUBSCRIBE_SECRET (or JWT_SECRET) is not set");
  return s;
}

const clean = (email) => String(email).trim().toLowerCase();

/** The token for an email address (case-insensitive, 32 hex characters). */
function unsubscribeToken(email) {
  return crypto.createHmac("sha256", secret()).update(`unsubscribe:${clean(email)}`).digest("hex").slice(0, 32);
}

/** True when `token` is the right token for `email`. Constant-time comparison. */
function isValidUnsubscribeToken(email, token) {
  if (typeof email !== "string" || typeof token !== "string") return false;
  const expected = Buffer.from(unsubscribeToken(email));
  const given = Buffer.from(token);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

/** Full link for the storefront's /unsubscribe page, e.g. http://localhost:3000/unsubscribe?email=...&token=... */
function unsubscribeUrl(email) {
  const base = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "");
  const params = new URLSearchParams({ email: clean(email), token: unsubscribeToken(email) });
  return `${base}/unsubscribe?${params.toString()}`;
}

module.exports = { unsubscribeToken, isValidUnsubscribeToken, unsubscribeUrl };
