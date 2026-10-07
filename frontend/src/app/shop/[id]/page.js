'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AURELIA · PRODUCT DETAIL PAGE
 * ─────────────────────────────────────────────────────────────────────────────
 *  Place at: frontend/src/app/shop/[id]/page.js
 *
 *  Fetches a single product from GET {NEXT_PUBLIC_API_URL}/api/products/:id
 *  — matches backend/models/Product.js + routes/products.routes.js exactly.
 *
 *  Props (none — this is a route file). Reads the dynamic segment from
 *  Next's `params` prop, and reads NEXT_PUBLIC_API_URL the same way
 *  ProductSection.js does. If your API base ever changes, change it in
 *  both places (or better, centralize it in a small lib/api.js later).
 */

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Cormorant_Garamond, Figtree } from 'next/font/google';

const serif = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--aur-serif',
  display: 'swap',
});

const sans = Figtree({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--aur-sans',
  display: 'swap',
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const formatPKR = (n) => {
  const value = Number(n);
  if (!Number.isFinite(value)) return 'Rs —';
  return `Rs ${value.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
};

const MinusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true">
    <path d="M2 7h10" />
  </svg>
);
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true">
    <path d="M7 2v10M2 7h10" />
  </svg>
);
const ArrowLeft = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 12H4M10 6l-6 6 6 6" />
  </svg>
);

export default function ProductPage({ params, onAddToCart }) {
  const { id } = use(params);
  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error | notfound
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    setQty(1);

    fetch(`${API_URL}/api/products/${id}`, { signal: controller.signal })
      .then((res) => {
        if (res.status === 404) throw new Error('notfound');
        if (!res.ok) throw new Error('failed');
        return res.json();
      })
      .then((data) => {
        setProduct(data);
        setStatus('ready');
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setStatus(err.message === 'notfound' ? 'notfound' : 'error');
      });

    return () => controller.abort();
  }, [id, attempt]);

  const handleAdd = () => {
    setAdded(true);
    if (typeof onAddToCart === 'function' && product) onAddToCart({ ...product, qty });
    setTimeout(() => setAdded(false), 2200);
  };

  const inStock = product ? (product.stock ?? 0) > 0 : false;

  return (
    <main className={`${serif.variable} ${sans.variable} aur-pdp`}>
      <Link href="/shop" className="aur-pdp__back">
        <ArrowLeft /> Back to shop
      </Link>

      {status === 'loading' && (
        <div className="aur-pdp__layout" aria-hidden="true">
          <div className="aur-pdp__skel-img" />
          <div className="aur-pdp__skel-body">
            <div className="aur-pdp__skel-line" style={{ width: '40%', height: 14 }} />
            <div className="aur-pdp__skel-line" style={{ width: '70%', height: 40, marginTop: 18 }} />
            <div className="aur-pdp__skel-line" style={{ width: '30%', height: 24, marginTop: 20 }} />
            <div className="aur-pdp__skel-line" style={{ width: '100%', height: 90, marginTop: 28 }} />
          </div>
        </div>
      )}

      {status === 'notfound' && (
        <div className="aur-pdp__state">
          <h2>We couldn&apos;t find that piece.</h2>
          <p>It may have been removed or the link is out of date.</p>
          <Link href="/shop" className="aur-pdp__cta">
            Browse the collection
          </Link>
        </div>
      )}

      {status === 'error' && (
        <div className="aur-pdp__state">
          <h2>Something went wrong loading this piece.</h2>
          <button type="button" className="aur-pdp__cta" onClick={() => setAttempt((n) => n + 1)}>
            Try again
          </button>
        </div>
      )}

      {status === 'ready' && product && (
        <div className="aur-pdp__layout">
          <div className="aur-pdp__image">
            {product.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.image} alt={product.name} />
            ) : (
              <span className="aur-pdp__placeholder" />
            )}
            {!inStock && <span className="aur-pdp__badge">Sold out</span>}
          </div>

          <div className="aur-pdp__body">
            <p className="aur-pdp__category">{product.category || 'general'}</p>
            <h1 className="aur-pdp__name">{product.name}</h1>
            <p className="aur-pdp__price">{formatPKR(product.price)}</p>

            {product.description && <p className="aur-pdp__desc">{product.description}</p>}

            <p className="aur-pdp__stock">
              {inStock ? `${product.stock} in stock` : 'Currently unavailable'}
            </p>

            <div className="aur-pdp__actions">
              <div className="aur-pdp__step" role="group" aria-label="Quantity">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity" disabled={!inStock}>
                  <MinusIcon />
                </button>
                <span>{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(product.stock || 1, q + 1))}
                  aria-label="Increase quantity"
                  disabled={!inStock}
                >
                  <PlusIcon />
                </button>
              </div>

              <button type="button" className={`aur-pdp__add ${added ? 'is-added' : ''}`} onClick={handleAdd} disabled={!inStock}>
                {added ? 'Added to bag' : inStock ? 'Add to bag' : 'Sold out'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .aur-pdp {
          --cream: #f6efe8;
          --blush: #f0dcd2;
          --copper: #c98a63;
          --ink: #181513;
          --line: rgba(24, 21, 19, 0.14);
          --gutter: clamp(20px, 5.2vw, 96px);
          --ease-out: cubic-bezier(0.22, 0.8, 0.2, 1);
          min-height: 100vh;
          background: var(--cream);
          color: var(--ink);
          font-family: var(--aur-sans), system-ui, sans-serif;
          padding: clamp(110px, 12vw, 150px) var(--gutter) 80px;
        }
        .aur-pdp__back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: clamp(28px, 4vw, 48px);
          font-size: 0.88rem;
          color: rgba(24, 21, 19, 0.68);
          text-decoration: none;
        }
        .aur-pdp__back:hover {
          color: var(--ink);
        }

        .aur-pdp__layout {
          display: grid;
          grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
          gap: clamp(32px, 5vw, 80px);
          align-items: start;
        }

        .aur-pdp__image {
          position: relative;
          border-radius: 6px;
          overflow: hidden;
          background: #e4d9cd;
          aspect-ratio: 4 / 5;
        }
        .aur-pdp__image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .aur-pdp__placeholder {
          display: block;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #ece1d5, #d9c8b5);
        }
        .aur-pdp__badge {
          position: absolute;
          top: 18px;
          left: 18px;
          padding: 6px 14px;
          border-radius: 999px;
          background: rgba(24, 21, 19, 0.85);
          color: var(--cream);
          font-size: 0.72rem;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .aur-pdp__category {
          margin: 0 0 10px;
          font-size: 0.74rem;
          font-weight: 500;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          color: rgba(24, 21, 19, 0.5);
        }
        .aur-pdp__name {
          margin: 0;
          font-family: var(--aur-serif), Georgia, serif;
          font-weight: 400;
          font-size: clamp(2.2rem, 3.6vw, 3rem);
          line-height: 1.1;
        }
        .aur-pdp__price {
          margin: 16px 0 0;
          font-size: 1.35rem;
          color: var(--copper);
        }
        .aur-pdp__desc {
          margin: 26px 0 0;
          max-width: 52ch;
          font-size: 1rem;
          font-weight: 300;
          line-height: 1.75;
          color: rgba(24, 21, 19, 0.75);
        }
        .aur-pdp__stock {
          margin: 22px 0 0;
          font-size: 0.86rem;
          color: rgba(24, 21, 19, 0.55);
        }

        .aur-pdp__actions {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: 30px;
        }
        .aur-pdp__step {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          border: 1px solid rgba(24, 21, 19, 0.26);
        }
        .aur-pdp__step button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 44px;
          padding: 0;
          border: 0;
          background: transparent;
          color: var(--ink);
          cursor: pointer;
        }
        .aur-pdp__step button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .aur-pdp__step span {
          min-width: 30px;
          text-align: center;
          font-size: 0.95rem;
        }
        .aur-pdp__add {
          flex: 1;
          height: 52px;
          padding: 0 28px;
          border-radius: 999px;
          border: 1px solid var(--ink);
          background: var(--ink);
          color: var(--cream);
          font: inherit;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.3s ease, color 0.3s ease, transform 0.4s var(--ease-out);
        }
        .aur-pdp__add:hover:not(:disabled) {
          transform: translateY(-2px);
        }
        .aur-pdp__add.is-added {
          background: #6f8f74;
          border-color: #6f8f74;
        }
        .aur-pdp__add:disabled {
          background: transparent;
          color: rgba(24, 21, 19, 0.4);
          border-color: rgba(24, 21, 19, 0.26);
          cursor: not-allowed;
        }

        .aur-pdp__state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          padding: 80px 20px;
          text-align: center;
          color: rgba(24, 21, 19, 0.7);
        }
        .aur-pdp__state h2 {
          margin: 0;
          font-family: var(--aur-serif), Georgia, serif;
          font-weight: 400;
          font-size: 1.8rem;
          color: var(--ink);
        }
        .aur-pdp__cta {
          display: inline-flex;
          margin-top: 8px;
          padding: 12px 26px;
          border-radius: 999px;
          border: 1px solid var(--ink);
          background: transparent;
          color: var(--ink);
          font: inherit;
          font-size: 0.9rem;
          text-decoration: none;
          cursor: pointer;
        }
        .aur-pdp__cta:hover {
          background: var(--ink);
          color: var(--cream);
        }

        .aur-pdp__skel-img,
        .aur-pdp__skel-line {
          border-radius: 6px;
          background: linear-gradient(100deg, #e9dfd2 30%, #f3ebe0 50%, #e9dfd2 70%);
          background-size: 200% 100%;
          animation: aurPdpShimmer 1.6s ease-in-out infinite;
        }
        .aur-pdp__skel-img {
          aspect-ratio: 4 / 5;
        }
        @keyframes aurPdpShimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        @media (max-width: 780px) {
          .aur-pdp__layout {
            grid-template-columns: 1fr;
          }
          .aur-pdp__actions {
            flex-direction: column;
            align-items: stretch;
          }
          .aur-pdp__step {
            justify-content: center;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .aur-pdp * {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </main>
  );
}