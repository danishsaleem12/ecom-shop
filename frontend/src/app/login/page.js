'use client';

/**
 * Place at: frontend/src/app/login/page.js
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import { useAuth } from '@/context/AuthContext';
import './login.css';

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500'], variable: '--aur-serif', display: 'swap' });
const sans = Figtree({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--aur-sans', display: 'swap' });

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      router.push('/');
    } catch (err) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={`${serif.variable} ${sans.variable} aur-auth`}>
      <form className="aur-auth__card" onSubmit={submit}>
        <p className="aur-auth__eyebrow">Aurelia</p>
        <h1>Sign in</h1>
        <p className="aur-auth__sub">Welcome back — enter your details to continue.</p>

        <label>
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        </label>

        <label>
          Password
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
        </label>

        <p className="aur-auth__forgot">
          <Link href="/forgot-password">Forgot your password?</Link>
        </p>

        {error && <p className="aur-auth__error">{error}</p>}

        <button type="submit" className="aur-auth__submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="aur-auth__switch">
          Don&apos;t have an account? <Link href="/register">Create one</Link>
        </p>
        <p className="aur-auth__switch">
          Store admin? <Link href="/admin/login">Admin sign in</Link>
        </p>
      </form>

    </main>
  );
}