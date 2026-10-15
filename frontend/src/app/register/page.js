'use client';

/**
 * Place at: frontend/src/app/register/page.js
 */

import { useState } from 'react';
import Link from 'next/link';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import { useAuth } from '@/context/AuthContext';
import '@/components/styles/Auth.css';
import './register.css';

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500'], variable: '--aur-serif', display: 'swap' });
const sans = Figtree({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--aur-sans', display: 'swap' });

export default function RegisterPage() {
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sentTo, setSentTo] = useState(''); // set once the account exists: the page then says "check your email"

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setSubmitting(true);
    try {
      const created = await register(name, email, password);
      setSentTo(created?.email || email);
    } catch (err) {
      setError(err.message || 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  };

  if (sentTo) {
    return (
      <main className={`${serif.variable} ${sans.variable} aur-auth`}>
        <div className="aur-auth__card">
          <p className="aur-auth__eyebrow">Aurelia</p>
          <h1>Check your email</h1>
          <p className="aur-auth__success" role="status">
            Your account is ready. We sent a confirmation link to {sentTo}. Open it to confirm your address; you will need to do this before placing your first order.
          </p>
          <p className="aur-auth__sub">Can&apos;t find it? Check your spam folder. You can ask for a new link from your account or at checkout.</p>
          <Link href="/shop" className="aur-auth__link-btn">
            Continue shopping
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={`${serif.variable} ${sans.variable} aur-auth`}>
      <form className="aur-auth__card" onSubmit={submit}>
        <p className="aur-auth__eyebrow">Aurelia</p>
        <h1>Create account</h1>
        <p className="aur-auth__sub">Join to save your wishlist and track orders.</p>

        <label>
          Name
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" autoComplete="name" />
        </label>

        <label>
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        </label>

        <label>
          Password
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" />
        </label>

        {error && <p className="aur-auth__error">{error}</p>}

        <button type="submit" className="aur-auth__submit" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </button>

        <p className="aur-auth__switch">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </form>

    </main>
  );
}