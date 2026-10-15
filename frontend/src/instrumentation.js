// frontend/src/instrumentation.js — Next.js runs register() once when the server starts.
// It makes server-side errors (a page or route that throws while rendering) reach Sentry.
import * as Sentry from '@sentry/nextjs';
import { SENTRY_DSN, sentryOptions } from '@/sentry.config';

export async function register() {
  if (SENTRY_DSN) Sentry.init(sentryOptions); // same options for the Node and Edge runtimes
}

// Next.js calls this for every error it catches while handling a request on the server.
export const onRequestError = Sentry.captureRequestError;
