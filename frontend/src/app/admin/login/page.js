'use client';

/**
 * Place at: frontend/src/app/admin/login/page.js
 * Admin-only sign in. Customers use /login; the backend rejects the wrong kind of account on each.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import { useAuth } from '@/context/AuthContext';
import './admin-login.css';

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500'], variable: '--aur-serif', display: 'swap' });
const sans = Figtree({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--aur-sans', display: 'swap' });

export default function AdminLoginPage() {
  const { adminLogin, isAdmin, loading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Already signed in as an admin? Go straight to the dashboard.
  useEffect(() => {
    if (!loading && isAdmin) router.replace('/admin');
  }, [loading, isAdmin, router]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await adminLogin(email, password);
      router.push('/admin');
    } catch (err) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={`${serif.variable} ${sans.variable} aur-auth`}>
      <form className="aur-auth__card" onSubmit={submit}>
        <p className="aur-auth__eyebrow">Aurelia · Admin</p>
        <h1>Admin sign in</h1>
        <p className="aur-auth__sub">For store administrators only.</p>

        <label>
          Email
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" autoComplete="email" />
        </label>

        <label>
          Password
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
        </label>

        {error && <p className="aur-auth__error">{error}</p>}

        <button type="submit" className="aur-auth__submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="aur-auth__switch">
          Not an admin? <Link href="/login">Customer sign in</Link>
        </p>
      </form>
    </main>
  );
}
