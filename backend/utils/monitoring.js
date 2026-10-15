// backend/utils/monitoring.js — optional error tracking with Sentry.
//
// Off unless SENTRY_DSN is set: nothing is loaded, nothing is sent, and the app (and the tests)
// behave exactly as before. The @sentry/node package is only require()d when a DSN exists.
let Sentry = null;

const isEnabled = () => Boolean(Sentry);

/** Call once, as early as possible in index.js (before the app is built). Safe to call twice. */
function initMonitoring() {
  if (Sentry || !process.env.SENTRY_DSN) return false;
  try {
    Sentry = require("@sentry/node");
  } catch {
    console.warn("SENTRY_DSN is set but @sentry/node is not installed — run `npm install @sentry/node`. Error tracking is OFF.");
    return false;
  }
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
    release: process.env.SENTRY_RELEASE || undefined,
    // Performance tracing is off by default (it counts against the free quota). 0.1 = trace 10% of requests.
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0,
    sendDefaultPii: false,
    beforeSend(event) {
      // Never ship login cookies, tokens or submitted form bodies (passwords, addresses) to a third party.
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
        if (event.request.headers) {
          for (const h of ["cookie", "authorization", "x-forwarded-for"]) delete event.request.headers[h];
        }
      }
      return event;
    },
  });
  return true;
}

/** Reports an unexpected (5xx) error. Does nothing when Sentry is off, and never throws. */
function captureException(err, req) {
  if (!Sentry) return;
  try {
    Sentry.withScope((scope) => {
      if (req?.method) scope.setTag("http.method", req.method);
      if (req?.originalUrl) scope.setTag("http.route", String(req.originalUrl).split("?")[0]); // no query string: it can hold tokens
      Sentry.captureException(err);
    });
  } catch {
    /* monitoring must never break a request */
  }
}

/** Lets Sentry send what it has queued before the process exits (used on shutdown). */
async function flushMonitoring(ms = 2000) {
  if (!Sentry) return;
  try {
    await Sentry.flush(ms);
  } catch {
    /* ignore */
  }
}

module.exports = { initMonitoring, captureException, flushMonitoring, isEnabled };
