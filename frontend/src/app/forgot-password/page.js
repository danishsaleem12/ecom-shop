'use client';

/**
 * Route: /forgot-password
 * Asks the backend (POST /api/auth/forgot-password) to email a reset link.
 * The backend answers the same way whether or not the address has an account, and so does this page.
 */

import { useState } from 'react';
import Link from 'next/link';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import { API_URL } from '@/lib/imageUrl';
import '@/components/styles/Auth.css';

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500'], variable: '--aur-serif', display: 'swap' });
const sans = Figtree({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--aur-sans', display: 'swap' });

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Something went wrong. Please try again.');
      setSentTo(email.trim());
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={`${serif.variable} ${sans.variable} aur-auth`}>
      {sentTo ? (
        <div className="aur-auth__card">
          <p className="aur-auth__eyebrow">Aurelia</p>
          <h1>Check your email</h1>
          <p className="aur-auth__success" role="status">
            If an account exists for <strong>{sentTo}</strong>, we have sent a link to reset the password. It works for one hour.
          </p>
          <p className="aur-auth__hint">Nothing there? Look in your spam folder, or try again in a minute.</p>
          <Link href="/login" className="aur-auth__link-btn">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form className="aur-auth__card" onSubmit={submit}>
          <p className="aur-auth__eyebrow">Aurelia</p>
          <h1>Forgot your password?</h1>
          <p className="aur-auth__sub">Enter the email you signed up with and we will send you a link to choose a new one.</p>

          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </label>

          {error && (
            <p className="aur-auth__error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="aur-auth__submit" disabled={submitting}>
            {submitting ? 'Sending…' : 'Send reset link'}
          </button>

          <p className="aur-auth__switch">
            Remembered it? <Link href="/login">Sign in</Link>
          </p>
        </form>
      )}
    </main>
  );
}
