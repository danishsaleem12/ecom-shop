// backend/utils/mailer.js — the ONE place that sends email.
//
// Configure it in .env (see .env.example): SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM.
//
// Rules this file keeps:
//   - Sending NEVER throws. A mail server that is down must not break checkout, a status change or a
//     sign-up. A failed send is logged and sendMail() resolves to false.
//   - If SMTP is not configured, nothing is sent. In development the email is printed to the console
//     (so you can click a password-reset link without a mail server); in production only a warning is
//     logged (never the body: it can contain a reset link).
//   - In tests (NODE_ENV=test) nothing happens unless a test installs a fake transport.
const pending = new Set();
let injected = null; // fake transport used by tests
let cachedTransport = null;
let warnedUnconfigured = false;

const isTest = () => process.env.NODE_ENV === "test";
const isConfigured = () => Boolean(process.env.SMTP_HOST && process.env.MAIL_FROM);

/** False means "do not even build the email" (tests without a fake transport). */
const isEnabled = () => (isTest() ? Boolean(injected) : true);

function getTransport() {
  if (injected) return injected;
  if (!isConfigured()) return null;
  if (!cachedTransport) {
    const nodemailer = require("nodemailer"); // loaded only when SMTP is really configured
    const port = Number(process.env.SMTP_PORT) || 587;
    cachedTransport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
      ...(process.env.SMTP_USER ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS || "" } } : {}),
    });
  }
  return cachedTransport;
}

// A header value must be one line, or a customer-supplied subject could inject extra headers
const oneLine = (s) => String(s ?? "").replace(/[\r\n]+/g, " ").trim();

async function deliver({ to, subject, text, html, replyTo, headers }) {
  try {
    if (!to) return false;
    const transport = getTransport();
    if (!transport) {
      if (isTest()) return false;
      if (process.env.NODE_ENV === "production") {
        if (!warnedUnconfigured) {
          warnedUnconfigured = true;
          console.warn("Email is NOT being sent: set SMTP_HOST and MAIL_FROM in the environment.");
        }
      } else {
        console.log(`\n[mail] SMTP not configured, so this email was not sent.\n  To: ${to}\n  Subject: ${oneLine(subject)}\n\n${text}\n`);
      }
      return false;
    }
    await transport.sendMail({
      from: process.env.MAIL_FROM,
      to,
      subject: oneLine(subject),
      text,
      html,
      ...(replyTo ? { replyTo: oneLine(replyTo) } : {}),
      ...(headers ? { headers } : {}), // e.g. List-Unsubscribe on newsletters
    });
    return true;
  } catch (err) {
    console.error(`Email to ${to} could not be sent:`, err?.message);
    return false;
  }
}

/** Starts sending and returns a promise that always resolves (true = handed to the mail server). */
function sendMail(mail) {
  return track(deliver(mail));
}

/** Remember a background job so tests (and a clean shutdown) can wait for it. */
function track(promise) {
  pending.add(promise);
  promise.finally(() => pending.delete(promise)).catch(() => {});
  return promise;
}

/** Waits until every email started so far has been sent or has failed. */
async function flush() {
  while (pending.size) await Promise.allSettled([...pending]);
}

/** Tests only: pass { sendMail(mail) } to capture emails, or null to remove it. */
function _setTransport(fake) {
  injected = fake;
}

module.exports = { sendMail, track, flush, isEnabled, isConfigured, _setTransport };
