'use client';

/**
 * Place at: frontend/src/components/VerifyEmailForm.js
 * Behind /verify-email. Reads ?token= from the emailed link and confirms it with POST /api/auth/verify-email as soon
 * as the page opens. The backend consumes the token, so each link works once; if it fails we check whether the
 * account is in fact already confirmed (e.g. the link was opened twice) before showing an error.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import { useAuth } from '@/context/AuthContext';
import { API_URL } from '@/lib/imageUrl';
import '@/components/styles/Auth.css';

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500'], variable: '--aur-serif', display: 'swap' });
const sans = Figtree({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--aur-sans', display: 'swap' });

export default function VerifyEmailForm() {
  const token = useSearchParams().get('token') || '';
  const { refresh } = useAuth();
  const started = useRef(false); // React may run effects twice in development; the link must only be used once
  const [state, setState] = useState(token ? 'verifying' : 'invalid'); // verifying | done | already | invalid | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      let user = null;
      if (token) {
        try {
          const res = await fetch(`${API_URL}/api/auth/verify-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });
          const data = await res.json().catch(() => ({}));
          if (res.ok) {
            await refresh(); // a signed-in customer's account is now confirmed
            setState('done');
            return;
          }
          setMessage(data.message || '');
          if (res.status !== 400) {
            setState('error');
            return;
          }
        } catch {
          setState('error');
          return;
        }
      }
      // Link not usable: maybe they already confirmed, which is fine
      user = await refresh();
      setState(user && user.emailVerified !== false ? 'already' : 'invalid');
    })();
  }, [token, refresh]);

  return (
    <main className={`${serif.variable} ${sans.variable} aur-auth`}>
      <div className="aur-auth__card">
        <p className="aur-auth__eyebrow">Aurelia</p>

        {state === 'verifying' && (
          <>
            <h1>Confirming…</h1>
            <p className="aur-auth__sub" role="status">
              Just a moment while we confirm your email.
            </p>
          </>
        )}

        {(state === 'done' || state === 'already') && (
          <>
            <h1>{state === 'done' ? 'Email confirmed' : 'Already confirmed'}</h1>
            <p className="aur-auth__success" role="status">
              {state === 'done' ? 'Thank you! Your email address is confirmed and you can place orders.' : 'Your email address is already confirmed. You are all set.'}
            </p>
            <Link href="/shop" className="aur-auth__link-btn">
              Continue shopping
            </Link>
          </>
        )}

        {state === 'invalid' && (
          <>
            <h1>Link not valid</h1>
            <p className="aur-auth__sub">{message || 'This confirmation link is invalid or has expired.'} Sign in and we will send you a new one.</p>
            <Link href="/login" className="aur-auth__link-btn">
              Sign in
            </Link>
          </>
        )}

        {state === 'error' && (
          <>
            <h1>Something went wrong</h1>
            <p className="aur-auth__sub">We could not reach the server. Please try opening the link again in a moment.</p>
            <Link href="/" className="aur-auth__link-btn">
              Back to home
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
