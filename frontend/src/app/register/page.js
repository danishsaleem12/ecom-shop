'use client';

/**
 * Place at: frontend/src/app/register/page.js
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import { useAuth } from '@/context/AuthContext';

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500'], variable: '--aur-serif', display: 'swap' });
const sans = Figtree({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--aur-sans', display: 'swap' });

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setSubmitting(true);
    try {
      await register(name, email, password);
      router.push('/');
    } catch (err) {
      setError(err.message || 'Failed to create account');
    } finally {
      setSubmitting(false);
    }
  };

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

      <style jsx global>{`
        .aur-auth {
          --cream: #f6efe8;
          --ink: #181513;
          --copper: #c98a63;
          --line: rgba(24, 21, 19, 0.16);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--cream);
          color: var(--ink);
          font-family: var(--aur-sans), system-ui, sans-serif;
          padding: 40px 20px;
        }
        .aur-auth__card {
          width: 100%;
          max-width: 400px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .aur-auth__eyebrow {
          margin: 0;
          font-size: 0.72rem;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: rgba(24, 21, 19, 0.5);
        }
        .aur-auth__card h1 {
          margin: 4px 0 0;
          font-family: var(--aur-serif), Georgia, serif;
          font-weight: 400;
          font-size: 2.2rem;
        }
        .aur-auth__sub {
          margin: 0 0 8px;
          font-size: 0.92rem;
          color: rgba(24, 21, 19, 0.62);
        }
        .aur-auth__card label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.82rem;
          color: rgba(24, 21, 19, 0.65);
        }
        .aur-auth__card input {
          padding: 12px 14px;
          border-radius: 8px;
          border: 1px solid rgba(24, 21, 19, 0.22);
          background: #fff;
          color: var(--ink);
          font: inherit;
          font-size: 0.95rem;
        }
        .aur-auth__card input:focus {
          outline: 2px solid var(--copper);
          outline-offset: 1px;
        }
        .aur-auth__error {
          margin: 0;
          padding: 10px 12px;
          border-radius: 8px;
          background: rgba(164, 75, 63, 0.12);
          color: #a44b3f;
          font-size: 0.85rem;
        }
        .aur-auth__submit {
          height: 48px;
          margin-top: 4px;
          border-radius: 999px;
          border: 1px solid var(--ink);
          background: var(--ink);
          color: var(--cream);
          font: inherit;
          font-size: 0.95rem;
          cursor: pointer;
        }
        .aur-auth__submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .aur-auth__switch {
          margin: 6px 0 0;
          text-align: center;
          font-size: 0.88rem;
          color: rgba(24, 21, 19, 0.65);
        }
        .aur-auth__switch a {
          color: var(--ink);
          text-decoration: underline;
          text-underline-offset: 3px;
        }
      `}</style>
    </main>
  );
}