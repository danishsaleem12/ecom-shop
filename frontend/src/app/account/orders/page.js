'use client';

/**
 * Place at: frontend/src/app/account/orders/page.js
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

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const { count: cartCount } = useCart();
  const { count: wishlistCount } = useWishlist();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/orders`, { credentials: 'include' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to load orders');
        setOrders(data.orders || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, authLoading]);

  return (
    <>
      <Navbar cartCount={cartCount} wishlistCount={wishlistCount} transparent={false} />
      <main className={`${serif.variable} ${sans.variable} acc-orders`}>
        <div className="acc-orders__head">
          <p className="acc-orders__eyebrow">Account</p>
          <h1>Your orders</h1>
        </div>

        {!authLoading && !user && (
          <div className="acc-orders__empty">
            <p>You need to sign in to see your orders.</p>
            <Link href="/login" className="acc-orders__cta">Sign in</Link>
          </div>
        )}

        {user && loading && <p className="acc-orders__status">Loading your orders…</p>}
        {user && error && <p className="acc-orders__status acc-orders__status--error">{error}</p>}

        {user && !loading && !error && orders.length === 0 && (
          <div className="acc-orders__empty">
            <p>You haven&apos;t placed any orders yet.</p>
            <Link href="/shop" className="acc-orders__cta">Start shopping</Link>
          </div>
        )}

        {user && !loading && orders.length > 0 && (
          <ul className="acc-orders__list">
            {orders.map((order) => (
              <li key={order._id} className="acc-orders__card">
                <div className="acc-orders__top">
                  <div>
                    <strong>Order #{order._id.slice(-8).toUpperCase()}</strong>
                    <span>{new Date(order.createdAt).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <span className={`acc-orders__badge acc-orders__badge--${order.status}`}>
                    {STATUS_LABEL[order.status] || order.status}
                  </span>
                </div>

                <ul className="acc-orders__items">
                  {order.items.map((it, i) => (
                    <li key={i}>
                      <span className="acc-orders__thumb" style={{ backgroundImage: it.image ? `url(${imageSrc(it.image)})` : undefined }} />
                      <span className="acc-orders__itemInfo">
                        <strong>{it.name}</strong>
                        <small>Qty {it.qty}</small>
                      </span>
                      <span>{money(it.price * it.qty)}</span>
                    </li>
                  ))}
                </ul>

                <div className="acc-orders__foot">
                  <span>Total</span>
                  <strong>{money(order.total)}</strong>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />

      <style jsx global>{`
        .acc-orders {
          --cream: #f6efe8;
          --ink: #181513;
          --copper: #c98a63;
          --line: rgba(24, 21, 19, 0.14);
          max-width: 860px;
          margin: 0 auto;
          padding: 140px 24px 100px;
          font-family: var(--aur-sans), system-ui, sans-serif;
          color: var(--ink);
        }
        .acc-orders__eyebrow {
          margin: 0;
          font-size: 0.72rem;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: rgba(24, 21, 19, 0.5);
        }
        .acc-orders__head h1 {
          margin: 4px 0 40px;
          font-family: var(--aur-serif), Georgia, serif;
          font-weight: 400;
          font-size: 2.4rem;
        }
        .acc-orders__status {
          font-size: 0.95rem;
          color: rgba(24, 21, 19, 0.6);
        }
        .acc-orders__status--error {
          color: #a44b3f;
        }
        .acc-orders__empty {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 14px;
          padding: 40px 0;
        }
        .acc-orders__cta {
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
        .acc-orders__list {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .acc-orders__card {
          border: 1px solid var(--line);
          border-radius: 18px;
          padding: 20px 22px;
        }
        .acc-orders__top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--line);
        }
        .acc-orders__top div {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .acc-orders__top span {
          font-size: 0.82rem;
          color: rgba(24, 21, 19, 0.55);
        }
        .acc-orders__badge {
          padding: 5px 12px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: capitalize;
          background: rgba(24, 21, 19, 0.08);
        }
        .acc-orders__badge--delivered {
          background: rgba(90, 140, 100, 0.15);
          color: #3f6e4a;
        }
        .acc-orders__badge--cancelled {
          background: rgba(164, 75, 63, 0.15);
          color: #a44b3f;
        }
        .acc-orders__badge--shipped,
        .acc-orders__badge--processing {
          background: rgba(201, 138, 99, 0.18);
          color: #8a5a3a;
        }
        .acc-orders__items {
          list-style: none;
          margin: 0;
          padding: 14px 0;
        }
        .acc-orders__items li {
          display: grid;
          grid-template-columns: 48px 1fr auto;
          align-items: center;
          gap: 14px;
          padding: 8px 0;
        }
        .acc-orders__thumb {
          width: 48px;
          height: 60px;
          border-radius: 8px;
          background-color: rgba(24, 21, 19, 0.06);
          background-size: cover;
          background-position: center;
        }
        .acc-orders__itemInfo {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .acc-orders__itemInfo small {
          color: rgba(24, 21, 19, 0.55);
          font-size: 0.8rem;
        }
        .acc-orders__foot {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          padding-top: 14px;
          border-top: 1px solid var(--line);
          font-size: 0.9rem;
        }
        .acc-orders__foot strong {
          font-family: var(--aur-serif), Georgia, serif;
          font-size: 1.4rem;
          font-weight: 400;
        }
      `}</style>
    </>
  );
}