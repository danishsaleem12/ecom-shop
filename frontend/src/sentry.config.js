// frontend/src/sentry.config.js — the one place that decides how Sentry is set up (browser, server and edge all use it).
// Error tracking is OFF unless NEXT_PUBLIC_SENTRY_DSN is set, so a build without it behaves exactly as before.
export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || '';

export const sentryOptions = {
  dsn: SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
  // Performance tracing is off (it counts against the free quota). Set e.g. 0.1 later if you want it.
  tracesSampleRate: 0,
  sendDefaultPii: false,
};
