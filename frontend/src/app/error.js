'use client';

/**
 * Place at: frontend/src/app/error.js
 * Catches an unexpected error while a page is rendering, so the customer sees this instead of a blank screen.
 * The Navbar and Footer are part of each page, so if the problem is inside one of them this page can fail too;
 * app/global-error.js is the last safety net for that case.
 */

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import StatusPage from '@/components/StatusPage';

// `unstable_retry` is the newer name Next.js uses for the retry function; older versions call it `reset`.
export default function ErrorPage({ error, reset, unstable_retry: retry }) {
  useEffect(() => {
    console.error(error); // shows in the browser console
    Sentry.captureException(error); // reaches Sentry when NEXT_PUBLIC_SENTRY_DSN is set; otherwise does nothing
  }, [error]);

  const tryAgain = retry || reset;

  return (
    <StatusPage
      title="Something went wrong"
      text="We hit an unexpected problem loading this page. It is not your fault. Please try again, and if it keeps happening, contact us."
      primary={tryAgain ? { label: 'Try again', onClick: () => tryAgain() } : { label: 'Back to home', href: '/' }}
      secondary={tryAgain ? { label: 'Back to home', href: '/' } : undefined}
      links={[
        { label: 'Contact us', href: '/contact' },
        { label: 'Help', href: '/help' },
      ]}
      reference={error?.digest}
    />
  );
}
