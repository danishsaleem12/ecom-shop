// frontend/src/instrumentation-client.js — Next.js runs this file in the browser before the app starts.
// It reports crashes that customers hit (a page that failed to render, a broken script) to Sentry.
import * as Sentry from '@sentry/nextjs';
import { SENTRY_DSN, sentryOptions } from '@/sentry.config';

if (SENTRY_DSN) {
  Sentry.init({
    ...sentryOptions,
    // Browser noise that is not a bug in the store (extensions, flaky mobile networks, resize loops).
    ignoreErrors: ['ResizeObserver loop limit exceeded', 'ResizeObserver loop completed with undelivered notifications', 'Non-Error promise rejection captured'],
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
