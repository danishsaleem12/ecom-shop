'use client';

/**
 * Place at: frontend/src/app/track-order/page.js
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { API_URL, imageSrc } from '@/lib/imageUrl';
import { orderRef } from '@/lib/orderRef';
import './track-order.css';

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500'], variable: '--aur-serif', display: 'swap' });
const sans = Figtree({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--aur-sans', display: 'swap' });

const money = (n) => `Rs ${Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;

const STEPS = ['pending', 'processing', 'shipped', 'delivered'];

const STATUS_LABEL = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export default function TrackOrderPage() {
  const { user } = useAuth();
  const { count: cartCount } = useCart();
  const { count: wishlistCount } = useWishlist();

  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const lookup = async (num, mail) => {
    setError('');
    setResult(null);
    setSearching(true);
    try {
      const res = await fetch(`${API_URL}/api/orders/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber: num.trim(), email: mail.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'We could not look up that order.');
      setResult(data.order);
    } catch (err) {
      setError(err instanceof TypeError ? 'Could not reach the server. Please try again.' : err.message);
    } finally {
      setSearching(false);
    }
  };

  // Links from a confirmation email can carry the details: /track-order?order=K7QM-4TXD&email=you@example.com
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const num = params.get('order') || '';
    const mail = params.get('email') || '';
    if (num) setOrderNumber(num);
    if (mail) setEmail(mail);
    if (num && mail) lookup(num, mail);
  }, []);

  // Signed-in customers get their account email pre-filled (they can still change it)
  useEffect(() => {
    if (user?.email) setEmail((current) => current || user.email);
  }, [user]);

  const submit = (e) => {
    e.preventDefault();
    if (!orderNumber.trim() || !email.trim()) return;
    lookup(orderNumber, email);
  };

  const stepIndex = result ? STEPS.indexOf(result.status) : -1;

  return (
    <>
      <Navbar cartCount={cartCount} wishlistCount={wishlistCount} transparent={false} />
      <main className={`${serif.variable} ${sans.variable} track`}>
        <p className="track__eyebrow">Support</p>
        <h1>Track an order</h1>

        <p className="track__sub">
          Enter your order number (the code on your confirmation, e.g. <em>K7QM-4TXD</em>) and the email you used when ordering.
          You don&apos;t need an account.
        </p>

        <form className="track__form" onSubmit={submit}>
          <input
            type="text"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="Order number"
            autoComplete="off"
            aria-label="Order number"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            autoComplete="email"
            aria-label="Email address"
          />
          <button type="submit" disabled={searching || !orderNumber.trim() || !email.trim()}>
            {searching ? 'Searching…' : 'Track order'}
          </button>
        </form>

        {error && <p className="track__msg track__msg--error">{error}</p>}

        {result && (
          <div className="track__card">
            <div className="track__top">
              <div>
                <strong>Order #{orderRef(result)}</strong>
                <span>{new Date(result.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
              </div>
              <span className={`track__badge track__badge--${result.status}`}>{STATUS_LABEL[result.status] || result.status}</span>
            </div>

            {result.status !== 'cancelled' && (
              <ol className="track__steps" aria-label="Order progress">
                {STEPS.map((step, i) => (
                  <li key={step} className={i <= stepIndex ? 'is-done' : ''}>
                    <i />
                    <span>{STATUS_LABEL[step]}</span>
                  </li>
                ))}
              </ol>
            )}

            <ul className="track__items">
              {result.items.map((it, i) => (
                <li key={i}>
                  <span className="track__thumb" style={{ backgroundImage: it.image ? `url(${imageSrc(it.image)})` : undefined }} />
                  <span className="track__itemInfo">
                    <strong>{it.name}</strong>
                    <small>{[it.size, it.color].filter(Boolean).join(' / ')}{it.size || it.color ? ' · ' : ''}Qty {it.qty}</small>
                  </span>
                  <span>{money(it.price * it.qty)}</span>
                </li>
              ))}
            </ul>

            {result.trackingNumber && result.status !== 'cancelled' && (
              <p className="track__tracking">
                Tracking number: <strong>{result.trackingNumber}</strong>
                {result.courier ? <> · {result.courier}</> : null}
              </p>
            )}

            <div className="track__foot">
              <span>Total</span>
              <strong>{money(result.total)}</strong>
            </div>
          </div>
        )}

        {user && (
          <p className="track__msg">
            Prefer to see everything at once? <Link href="/account/orders">View all your orders</Link>.
          </p>
        )}
      </main>
      <Footer />

    </>
  );
}