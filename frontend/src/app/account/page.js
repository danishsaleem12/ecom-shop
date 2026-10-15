'use client';

/**
 * Place at: frontend/src/app/account/page.js
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import VerifyEmailNotice from '@/components/VerifyEmailNotice';
import AccountData from '@/components/AccountData';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { API_URL } from '@/lib/imageUrl';
import './account.css';

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500'], variable: '--aur-serif', display: 'swap' });
const sans = Figtree({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--aur-sans', display: 'swap' });

export default function AccountPage() {
    const { user, loading: authLoading, refresh } = useAuth();
    const { count: cartCount } = useCart();
    const { count: wishlistCount } = useWishlist();

    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
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
                body: JSON.stringify({ name, ...(password ? { password, currentPassword } : {}) }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Failed to update account');
            await refresh();
            setPassword('');
            setCurrentPassword('');
            setMessage(password ? 'Your password has been changed. Other devices have been signed out.' : 'Your details have been updated.');
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

                <nav className="acc-details__tabs" aria-label="Account">
                    <Link href="/account" aria-current="page" className="is-active">Details</Link>
                    <Link href="/account/addresses">Addresses</Link>
                    <Link href="/account/orders">Orders</Link>
                </nav>

                {!authLoading && !user && (
                    <div className="acc-details__empty">
                        <p>You need to sign in to view your account.</p>
                        <Link href="/login" className="acc-details__cta">Sign in</Link>
                    </div>
                )}

                {user && (
                    <div style={{ marginBottom: 24 }}>
                        <VerifyEmailNotice />
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
                                minLength={8}
                            />
                        </label>

                        {/* Only needed (and only shown) when a new password is being set */}
                        {password && (
                            <label>
                                Current password
                                <input
                                    type="password"
                                    required
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    autoComplete="current-password"
                                />
                                <small>We ask for it to make sure it&apos;s really you.</small>
                            </label>
                        )}

                        {error && <p className="acc-details__msg acc-details__msg--error">{error}</p>}
                        {message && <p className="acc-details__msg acc-details__msg--ok">{message}</p>}

                        <button type="submit" disabled={saving}>
                            {saving ? 'Saving…' : 'Save changes'}
                        </button>
                    </form>
                )}

                {user && <AccountData />}
            </main>
            <Footer />

        </>
    );
}