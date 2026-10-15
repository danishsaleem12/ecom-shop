'use client';

/**
 * The form behind /reset-password. Reads ?token= from the emailed link and sends it with the new password
 * to POST /api/auth/reset-password. The backend consumes the token, so each link works once.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import { API_URL } from '@/lib/imageUrl';
import '@/components/styles/Auth.css';

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500'], variable: '--aur-serif', display: 'swap' });
const sans = Figtree({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--aur-sans', display: 'swap' });

export default function ResetPasswordForm() {
  const token = useSearchParams().get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('The two passwords do not match.');

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Something went wrong. Please try again.');
      setDone(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const shell = (children) => (
    <main className={`${serif.variable} ${sans.variable} aur-auth`}>
      <div className="aur-auth__card">{children}</div>
    </main>
  );

  if (!token) {
    return shell(
      <>
        <p className="aur-auth__eyebrow">Aurelia</p>
        <h1>Link not valid</h1>
        <p className="aur-auth__sub">This reset link is incomplete. Please request a new one.</p>
        <Link href="/forgot-password" className="aur-auth__link-btn">
          Request a new link
        </Link>
      </>
    );
  }

  if (done) {
    return shell(
      <>
        <p className="aur-auth__eyebrow">Aurelia</p>
        <h1>Password updated</h1>
        <p className="aur-auth__success" role="status">
          Your password has been changed and you were signed out everywhere. Sign in with your new password.
        </p>
        <Link href="/login" className="aur-auth__link-btn">
          Sign in
        </Link>
      </>
    );
  }

  return (
    <main className={`${serif.variable} ${sans.variable} aur-auth`}>
      <form className="aur-auth__card" onSubmit={submit}>
        <p className="aur-auth__eyebrow">Aurelia</p>
        <h1>Choose a new password</h1>
        <p className="aur-auth__sub">Use at least 8 characters.</p>

        <label>
          New password
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        </label>

        <label>
          Confirm new password
          <input
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </label>

        {error && (
          <p className="aur-auth__error" role="alert">
            {error}{' '}
            {/invalid or has expired/i.test(error) && <Link href="/forgot-password">Request a new link</Link>}
          </p>
        )}

        <button type="submit" className="aur-auth__submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Update password'}
        </button>
      </form>
    </main>
  );
}
