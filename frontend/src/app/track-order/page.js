'use client';

/**
 * Place at: frontend/src/app/track-order/page.js
 */

import { useState } from 'react';
import Link from 'next/link';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { API_URL, imageSrc } from '@/lib/imageUrl';

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500'], variable: '--aur-serif', display: 'swap' });
const sans = Figtree({ subsets: ['latin'], weight: ['300', '400', '500', '600'], variable: '--aur-sans', display: 'swap' });

const money = (n) => `Rs ${Number(n || 0).toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;

const STATUS_LABEL = {
  pending: 'Pending',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export default function TrackOrderPage() {
  const { user, loading: authLoading } = useAuth();
  const { count: cartCount } = useCart();
  const { count: wishlistCount } = useWishlist();

  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [result, setResult] = useState(null); // 'not-found' | order object
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    const q = query.trim().toLowerCase();
    if (!q) return;

    setSearching(true);
    try {
      const res = await fetch(`${API_URL}/api/orders`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to look up your orders');

      const orders = data.orders || [];
      const match = orders.find((o) => o._id.toLowerCase().includes(q) || o._id.slice(-8).toLowerCase() === q);

      setResult(match || 'not-found');
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  };

  return (
    <>
      <Navbar cartCount={cartCount} wishlistCount={wishlistCount} transparent={false} />
      <main className={`${serif.variable} ${sans.variable} track`}>
        <p className="track__eyebrow">Support</p>
        <h1>Track an order</h1>

        {!authLoading && !user && (
          <div className="track__signin">
            <p>Sign in to your account to look up an order by its order number.</p>
            <Link href="/login" className="track__cta">Sign in</Link>
          </div>
        )}

        {user && (
          <>
            <p className="track__sub">
              Enter your order number (the code shown on your confirmation, e.g. <em>4F82C1A9</em>) and we&apos;ll pull up its status.
            </p>

            <form className="track__form" onSubmit={submit}>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Order number"
                autoComplete="off"
              />
              <button type="submit" disabled={searching || !query.trim()}>
                {searching ? 'Searching…' : 'Track order'}
              </button>
            </form>

            {error && <p className="track__msg track__msg--error">{error}</p>}

            {result === 'not-found' && (
              <p className="track__msg">
                We couldn&apos;t find an order matching that number on your account. Double-check the code, or{' '}
                <Link href="/account/orders">view all your orders</Link>.
              </p>
            )}

            {result && result !== 'not-found' && (
              <div className="track__card">
                <div className="track__top">
                  <div>
                    <strong>Order #{result._id.slice(-8).toUpperCase()}</strong>
                    <span>{new Date(result.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <span className={`track__badge track__badge--${result.status}`}>
                    {STATUS_LABEL[result.status] || result.status}
                  </span>
                </div>

                <ul className="track__items">
                  {result.items.map((it, i) => (
                    <li key={i}>
                      <span className="track__thumb" style={{ backgroundImage: it.image ? `url(${imageSrc(it.image)})` : undefined }} />
                      <span className="track__itemInfo">
                        <strong>{it.name}</strong>
                        <small>Qty {it.qty}</small>
                      </span>
                      <span>{money(it.price * it.qty)}</span>
                    </li>
                  ))}
                </ul>

                <div className="track__foot">
                  <span>Total</span>
                  <strong>{money(result.total)}</strong>
                </div>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />

      <style jsx global>{`
        .track {
          --cream: #f6efe8;
          --ink: #181513;
          --copper: #c98a63;
          --line: rgba(24, 21, 19, 0.14);
          max-width: 600px;
          margin: 0 auto;
          padding: 140px 24px 100px;
          font-family: var(--aur-sans), system-ui, sans-serif;
          color: var(--ink);
        }
        .track__eyebrow {
          margin: 0;
          font-size: 0.72rem;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: rgba(24, 21, 19, 0.5);
        }
        .track h1 {
          margin: 4px 0 16px;
          font-family: var(--aur-serif), Georgia, serif;
          font-weight: 400;
          font-size: 2.4rem;
        }
        .track__sub {
          margin: 0 0 28px;
          font-size: 0.95rem;
          line-height: 1.6;
          color: rgba(24, 21, 19, 0.65);
        }
        .track__sub em {
          font-style: normal;
          font-weight: 600;
          color: var(--ink);
        }
        .track__signin {
          display: flex;
          flex-direction: column;
          gap: 14px;
          align-items: flex-start;
          padding: 20px 0;
        }
        .track__cta {
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
        .track__form {
          display: flex;
          gap: 10px;
        }
        .track__form input {
          flex: 1;
          padding: 12px 14px;
          border-radius: 8px;
          border: 1px solid rgba(24, 21, 19, 0.22);
          background: #fff;
          color: var(--ink);
          font: inherit;
          font-size: 0.95rem;
        }
        .track__form input:focus {
          outline: 2px solid var(--copper);
          outline-offset: 1px;
        }
        .track__form button {
          padding: 0 22px;
          border-radius: 999px;
          border: 1px solid var(--ink);
          background: var(--ink);
          color: var(--cream);
          font: inherit;
          font-size: 0.9rem;
          cursor: pointer;
          white-space: nowrap;
        }
        .track__form button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .track__msg {
          margin: 20px 0 0;
          font-size: 0.9rem;
          color: rgba(24, 21, 19, 0.65);
        }
        .track__msg a {
          color: var(--ink);
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .track__msg--error {
          color: #a44b3f;
        }
        .track__card {
          margin-top: 26px;
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 20px 22px;
        }
        .track__top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--line);
        }
        .track__top div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .track__top span {
          font-size: 0.82rem;
          color: rgba(24, 21, 19, 0.55);
        }
        .track__badge {
          padding: 5px 12px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: capitalize;
          background: rgba(24, 21, 19, 0.08);
        }
        .track__badge--delivered {
          background: rgba(90, 140, 100, 0.15);
          color: #3f6e4a;
        }
        .track__badge--cancelled {
          background: rgba(164, 75, 63, 0.15);
          color: #a44b3f;
        }
        .track__badge--shipped,
        .track__badge--processing {
          background: rgba(201, 138, 99, 0.18);
          color: #8a5a3a;
        }
        .track__items {
          list-style: none;
          margin: 0;
          padding: 14px 0;
        }
        .track__items li {
          display: grid;
          grid-template-columns: 48px 1fr auto;
          align-items: center;
          gap: 14px;
          padding: 8px 0;
        }
        .track__thumb {
          width: 48px;
          height: 60px;
          border-radius: 8px;
          background-color: rgba(24, 21, 19, 0.06);
          background-size: cover;
          background-position: center;
        }
        .track__itemInfo {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .track__itemInfo small {
          color: rgba(24, 21, 19, 0.55);
          font-size: 0.8rem;
        }
        .track__foot {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding-top: 14px;
          border-top: 1px solid var(--line);
          font-size: 0.9rem;
        }
        .track__foot strong {
          font-family: var(--aur-serif), Georgia, serif;
          font-size: 1.4rem;
          font-weight: 400;
        }
        @media (max-width: 480px) {
          .track__form {
            flex-direction: column;
          }
        }
      `}</style>
    </>
  );
}