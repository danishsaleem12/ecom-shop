'use client';

/**
 * Place at: frontend/src/app/account/page.js
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { API_URL } from '@/lib/imageUrl';

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500'], variable: '--aur-serif', display: 'swap' });
const sans = Figtree({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--aur-sans', display: 'swap' });

export default function AccountPage() {
    const { user, loading: authLoading, refresh } = useAuth();
    const { count: cartCount } = useCart();
    const { count: wishlistCount } = useWishlist();

    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) setName(user.name);
    }, [user]);

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/auth/me`, {
                method: 'PUT',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, ...(password ? { password } : {}) }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to update account');
            await refresh();
            setPassword('');
            setMessage('Your details have been updated.');
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <Navbar cartCount={cartCount} wishlistCount={wishlistCount} transparent={false} />
            <main className={`${serif.variable} ${sans.variable} acc-details`}>
                <p className="acc-details__eyebrow">Account</p>
                <h1>Account details</h1>

                {!authLoading && !user && (
                    <div className="acc-details__empty">
                        <p>You need to sign in to view your account.</p>
                        <Link href="/login" className="acc-details__cta">Sign in</Link>
                    </div>
                )}

                {user && (
                    <form className="acc-details__form" onSubmit={submit}>
                        <label>
                            Name
                            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} />
                        </label>

                        <label>
                            Email
                            <input type="email" value={user.email} disabled />
                            <small>Email can&apos;t be changed here.</small>
                        </label>

                        <label>
                            New password
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Leave blank to keep current password"
                                autoComplete="new-password"
                            />
                        </label>

                        {error && <p className="acc-details__msg acc-details__msg--error">{error}</p>}
                        {message && <p className="acc-details__msg acc-details__msg--ok">{message}</p>}

                        <button type="submit" disabled={saving}>
                            {saving ? 'Saving…' : 'Save changes'}
                        </button>
                    </form>
                )}
            </main>
            <Footer />

            <style jsx global>{`
        .acc-details {
          --cream: #f6efe8;
          --ink: #181513;
          --copper: #c98a63;
          --line: rgba(24, 21, 19, 0.16);
          max-width: 480px;
          margin: 0 auto;
          padding: 140px 24px 100px;
          font-family: var(--aur-sans), system-ui, sans-serif;
          color: var(--ink);
        }
        .acc-details__eyebrow {
          margin: 0;
          font-size: 0.72rem;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: rgba(24, 21, 19, 0.5);
        }
        .acc-details h1 {
          margin: 4px 0 32px;
          font-family: var(--aur-serif), Georgia, serif;
          font-weight: 400;
          font-size: 2.2rem;
        }
        .acc-details__empty {
          display: flex;
          flex-direction: column;
          gap: 14px;
          align-items: flex-start;
        }
        .acc-details__cta {
          display: inline-flex;
          height: 46px;
          padding: 0 24px;
          align-items: center;
          border-radius: 999px;
          background: var(--ink);
          color: var(--cream);
          text-decoration: none;
          font-size: 0.9rem;
        }
        .acc-details__form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .acc-details__form label {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 0.82rem;
          color: rgba(24, 21, 19, 0.65);
        }
        .acc-details__form input {
          padding: 12px 14px;
          border-radius: 8px;
          border: 1px solid rgba(24, 21, 19, 0.22);
          background: #fff;
          color: var(--ink);
          font: inherit;
          font-size: 0.95rem;
        }
        .acc-details__form input:disabled {
          background: rgba(24, 21, 19, 0.05);
          color: rgba(24, 21, 19, 0.5);
        }
        .acc-details__form small {
          font-size: 0.75rem;
          color: rgba(24, 21, 19, 0.45);
        }
        .acc-details__msg {
          margin: 0;
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 0.85rem;
        }
        .acc-details__msg--error {
          background: rgba(164, 75, 63, 0.12);
          color: #a44b3f;
        }
        .acc-details__msg--ok {
          background: rgba(90, 140, 100, 0.15);
          color: #3f6e4a;
        }
        .acc-details__form button {
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
        .acc-details__form button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
        </>
    );
}