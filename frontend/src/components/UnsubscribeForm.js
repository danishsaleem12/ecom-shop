'use client';

/**
 * Place at: frontend/src/components/UnsubscribeForm.js   (used by app/unsubscribe/page.js)
 *
 * The page behind the "Unsubscribe" link in newsletter emails: /unsubscribe?email=...&token=...
 * It does NOT unsubscribe on load (mail apps and link scanners often open links automatically), the reader
 * confirms with a button. POST /api/subscribe/unsubscribe checks that the token matches the email.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import { API_URL } from '@/lib/imageUrl';
import { STORE } from '@/lib/store';
import './styles/UnsubscribeForm.css';

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500'], variable: '--aur-serif', display: 'swap' });
const sans = Figtree({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--aur-sans', display: 'swap' });

export default function UnsubscribeForm() {
  const params = useSearchParams();
  const email = (params.get('email') || '').trim();
  const token = (params.get('token') || '').trim();

  const [status, setStatus] = useState('idle'); // idle | working | done | error
  const [error, setError] = useState('');

  const hasLink = Boolean(email && token);

  const confirm = async () => {
    setStatus('working');
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/subscribe/unsubscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Something went wrong. Please try again.');
      setStatus('done');
    } catch (err) {
      setError(err instanceof TypeError ? 'Could not reach the server. Please try again.' : err.message);
      setStatus('error');
    }
  };

  return (
    <main className={`${serif.variable} ${sans.variable} aur-unsub`}>
      <div className="aur-unsub__card">
        <p className="aur-unsub__eyebrow">{STORE.name}</p>

        {status === 'done' ? (
          <>
            <h1>You’re unsubscribed</h1>
            <p className="aur-unsub__text">
              <strong>{email}</strong> has been removed from our newsletter. You will not receive any more emails from the list.
            </p>
            <p className="aur-unsub__text">Changed your mind? You can sign up again any time from the footer of our website.</p>
            <Link href="/" className="aur-unsub__btn">
              Back to the store
            </Link>
          </>
        ) : hasLink ? (
          <>
            <h1>Unsubscribe</h1>
            <p className="aur-unsub__text">
              Stop sending the {STORE.name} newsletter to <strong>{email}</strong>?
            </p>
            {error && (
              <p className="aur-unsub__error" role="alert">
                {error}
              </p>
            )}
            <button type="button" className="aur-unsub__btn" onClick={confirm} disabled={status === 'working'}>
              {status === 'working' ? 'Unsubscribing…' : 'Yes, unsubscribe me'}
            </button>
            <Link href="/" className="aur-unsub__link">
              No, take me back
            </Link>
          </>
        ) : (
          <>
            <h1>This link looks incomplete</h1>
            <p className="aur-unsub__text">
              Please open the unsubscribe link from your email again. If it still does not work, write to{' '}
              <a href={`mailto:${STORE.supportEmail}`}>{STORE.supportEmail}</a> and we will remove you by hand.
            </p>
            <Link href="/" className="aur-unsub__link">
              Back to the store
            </Link>
          </>
        )}
      </div>

    </main>
  );
}
