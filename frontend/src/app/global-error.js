'use client';

/**
 * Place at: frontend/src/app/global-error.js
 * The last safety net: used only when the root layout itself fails (so no providers, fonts or styles exist).
 * It replaces the whole page, which is why it must bring its own <html> and <body> and use plain inline styles.
 */

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({ error, reset, unstable_retry: retry }) {
  useEffect(() => {
    console.error(error);
    Sentry.captureException(error); // does nothing unless NEXT_PUBLIC_SENTRY_DSN is set
  }, [error]);

  const tryAgain = retry || reset;
  const button = {
    height: 48,
    padding: '0 26px',
    borderRadius: 999,
    border: '1px solid #181513',
    background: '#181513',
    color: '#f6efe8',
    font: 'inherit',
    fontSize: 15,
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
  };

  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#f6efe8', color: '#181513', fontFamily: 'system-ui, Arial, sans-serif' }}>
        <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
          <p style={{ margin: 0, fontFamily: 'Georgia, serif', fontSize: 22, letterSpacing: '0.3em', textTransform: 'uppercase' }}>Aurelia</p>
          <h1 style={{ margin: '28px 0 0', fontFamily: 'Georgia, serif', fontWeight: 400, fontSize: 34 }}>Something went wrong</h1>
          <p style={{ maxWidth: 420, margin: '14px 0 28px', lineHeight: 1.6, color: 'rgba(24,21,19,0.68)' }}>
            The store could not load. Please try again in a moment.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            {tryAgain && (
              <button type="button" style={button} onClick={() => tryAgain()}>
                Try again
              </button>
            )}
            {/* a plain link (not next/link) so it reloads everything from scratch */}
            <a href="/" style={{ ...button, background: 'transparent', color: '#181513' }}>
              Back to home
            </a>
          </div>
          {error?.digest && <p style={{ marginTop: 32, fontSize: 12, color: 'rgba(24,21,19,0.4)' }}>Reference: {error.digest}</p>}
        </main>
      </body>
    </html>
  );
}
