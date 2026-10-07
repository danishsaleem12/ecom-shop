'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AURELIA · CART PAGE
 * ─────────────────────────────────────────────────────────────────────────────
 *  Place at: frontend/src/app/cart/page.js
 *
 *  The full-page version of the bag — same data source as Navbar's drawer
 *  (useCart()), so adding/removing here or in the drawer stays in sync
 *  automatically. This is where "View bag" in the drawer should link.
 */

import Link from 'next/link';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useCart } from '@/context/CartContext';
import { imageSrc } from '@/lib/imageUrl';

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

const FREE_SHIPPING_THRESHOLD = 15000;

const formatPKR = (n) => {
  const value = Number(n);
  return Number.isFinite(value) ? `Rs ${value.toLocaleString('en-PK', { maximumFractionDigits: 0 })}` : 'Rs —';
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
const ArrowRight = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12h16M14 6l6 6-6 6" />
  </svg>
);

export default function CartPage() {
  const { items, count, subtotal, updateQty, removeItem, hydrated } = useCart();

  const remaining = Math.max(FREE_SHIPPING_THRESHOLD - subtotal, 0);
  const progress = FREE_SHIPPING_THRESHOLD > 0 ? Math.min(subtotal / FREE_SHIPPING_THRESHOLD, 1) : 1;

  return (
    <>
      <Navbar cartCount={count} />

      <main className={`${serif.variable} ${sans.variable} aur-bag`}>
        <header className="aur-bag__head">
          <h1>
            Your bag {hydrated && <span>({count})</span>}
          </h1>
          <Link href="/shop" className="aur-bag__continue">
            Continue shopping
          </Link>
        </header>

        {!hydrated ? null : items.length === 0 ? (
          <div className="aur-bag__empty">
            <svg width="100" height="100" viewBox="0 0 92 92" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 30h52l-4 46H24l-4-46Z" />
              <path d="M34 30v-4a12 12 0 0 1 24 0v4" />
              <path d="M38 50c2 3 5 4.5 8 4.5s6-1.5 8-4.5" />
            </svg>
            <h2>Your bag is empty</h2>
            <p>Pieces you love will wait for you here.</p>
            <Link href="/shop" className="aur-btn">
              Explore the collection
            </Link>
          </div>
        ) : (
          <div className="aur-bag__layout">
            <ul className="aur-bag__list">
              {items.map((it) => (
                <li key={it.id}>
                  <Link href={`/shop/${it.id}`} className="aur-bag__thumb">
                    {it.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={imageSrc(it.image)} alt={it.name} />
                    ) : (
                      <span className="aur-bag__placeholder" />
                    )}
                  </Link>

                  <div className="aur-bag__info">
                    <Link href={`/shop/${it.id}`}>{it.name}</Link>
                    <span className="aur-bag__unit">{formatPKR(it.price)} each</span>

                    <div className="aur-bag__row">
                      <div className="aur-bag__step" role="group" aria-label={`Quantity for ${it.name}`}>
                        <button type="button" onClick={() => updateQty(it.id, Math.max(1, it.qty - 1))} aria-label="Decrease quantity">
                          <MinusIcon />
                        </button>
                        <span>{it.qty}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(it.id, it.stock > 0 ? Math.min(it.qty + 1, it.stock) : it.qty + 1)}
                          aria-label="Increase quantity"
                          disabled={it.stock > 0 && it.qty >= it.stock}
                        >
                          <PlusIcon />
                        </button>
                      </div>
                      <button type="button" className="aur-bag__remove" onClick={() => removeItem(it.id)}>
                        Remove
                      </button>
                    </div>
                  </div>

                  <span className="aur-bag__price">{formatPKR(it.price * it.qty)}</span>
                </li>
              ))}
            </ul>

            <aside className="aur-bag__summary">
              <h2>Order summary</h2>

              <div className="aur-bag__ship">
                <p>
                  {remaining > 0 ? (
                    <>
                      You&apos;re <strong>{formatPKR(remaining)}</strong> away from free shipping.
                    </>
                  ) : (
                    <>
                      <strong>Complimentary shipping</strong> unlocked on this order.
                    </>
                  )}
                </p>
                <div className="aur-bag__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
                  <i style={{ transform: `scaleX(${progress})` }} className={progress >= 1 ? 'is-full' : ''} />
                </div>
              </div>

              <div className="aur-bag__totals">
                <div>
                  <span>Subtotal</span>
                  <span>{formatPKR(subtotal)}</span>
                </div>
                <div>
                  <span>Shipping</span>
                  <span>{remaining > 0 ? 'Calculated at checkout' : 'Free'}</span>
                </div>
              </div>

              <Link href="/checkout" className="aur-btn aur-btn--full">
                Checkout <ArrowRight />
              </Link>
              <p className="aur-bag__note">Taxes and final shipping are calculated at checkout.</p>
            </aside>
          </div>
        )}
      </main>

      <Footer />

      <style jsx global>{`
        .aur-bag {
          --cream: #f6efe8;
          --ink: #181513;
          --copper: #c98a63;
          --line: rgba(24, 21, 19, 0.14);
          --gutter: clamp(20px, 5.2vw, 96px);
          --ease-out: cubic-bezier(0.22, 0.8, 0.2, 1);
          min-height: 70vh;
          background: var(--cream);
          color: var(--ink);
          font-family: var(--aur-sans), system-ui, sans-serif;
          padding: clamp(110px, 12vw, 150px) var(--gutter) 80px;
        }

        .aur-bag__head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: clamp(28px, 4vw, 44px);
        }
        .aur-bag__head h1 {
          margin: 0;
          font-family: var(--aur-serif), Georgia, serif;
          font-weight: 400;
          font-size: clamp(1.9rem, 3vw, 2.6rem);
        }
        .aur-bag__head h1 span {
          font-size: 1.1rem;
          color: rgba(24, 21, 19, 0.5);
        }
        .aur-bag__continue {
          font-size: 0.88rem;
          color: rgba(24, 21, 19, 0.65);
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .aur-bag__continue:hover {
          color: var(--ink);
        }

        /* ── empty state ────────────────────────────────────────────── */
        .aur-bag__empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 90px 12px 40px;
          text-align: center;
          color: rgba(24, 21, 19, 0.65);
        }
        .aur-bag__empty h2 {
          margin: 16px 0 0;
          font-family: var(--aur-serif), Georgia, serif;
          font-weight: 400;
          font-size: 1.9rem;
          color: var(--ink);
        }
        .aur-bag__empty p {
          margin: 0 0 22px;
        }

        /* ── shared button ──────────────────────────────────────────── */
        .aur-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          height: 52px;
          padding: 0 28px;
          border-radius: 999px;
          border: 1px solid var(--ink);
          background: var(--ink);
          color: var(--cream);
          font: inherit;
          font-size: 0.95rem;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          transition: transform 0.4s var(--ease-out), background 0.3s ease;
        }
        .aur-btn:hover {
          transform: translateY(-2px);
        }
        .aur-btn--full {
          width: 100%;
        }

        /* ── layout ─────────────────────────────────────────────────── */
        .aur-bag__layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(300px, 360px);
          gap: clamp(28px, 4vw, 56px);
          align-items: start;
        }

        .aur-bag__list {
          margin: 0;
          padding: 0;
          list-style: none;
          border-top: 1px solid var(--line);
        }
        .aur-bag__list li {
          display: grid;
          grid-template-columns: 96px minmax(0, 1fr) auto;
          gap: 18px;
          padding: 22px 0;
          border-bottom: 1px solid var(--line);
        }
        .aur-bag__thumb {
          display: block;
          width: 96px;
          height: 118px;
          border-radius: 4px;
          overflow: hidden;
          background: #e4d9cd;
        }
        .aur-bag__thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .aur-bag__placeholder {
          display: block;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #ece1d5, #d9c8b5);
        }
        .aur-bag__info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }
        .aur-bag__info > a {
          font-family: var(--aur-serif), Georgia, serif;
          font-size: 1.35rem;
          line-height: 1.15;
          color: var(--ink);
          text-decoration: none;
        }
        .aur-bag__info > a:hover {
          color: var(--copper);
        }
        .aur-bag__unit {
          font-size: 0.82rem;
          color: rgba(24, 21, 19, 0.55);
        }
        .aur-bag__row {
          display: flex;
          align-items: center;
          gap: 18px;
          margin-top: auto;
          padding-top: 10px;
        }
        .aur-bag__step {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          border: 1px solid rgba(24, 21, 19, 0.24);
        }
        .aur-bag__step button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          padding: 0;
          border: 0;
          border-radius: 50%;
          background: transparent;
          color: var(--ink);
          cursor: pointer;
        }
        .aur-bag__step button:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
        .aur-bag__step span {
          min-width: 26px;
          text-align: center;
          font-size: 0.9rem;
        }
        .aur-bag__remove {
          padding: 0;
          border: 0;
          background: transparent;
          color: rgba(24, 21, 19, 0.55);
          font: inherit;
          font-size: 0.82rem;
          text-decoration: underline;
          text-underline-offset: 3px;
          cursor: pointer;
        }
        .aur-bag__remove:hover {
          color: var(--ink);
        }
        .aur-bag__price {
          font-size: 0.95rem;
          white-space: nowrap;
        }

        /* ── summary ────────────────────────────────────────────────── */
        .aur-bag__summary {
          position: sticky;
          top: 100px;
          padding: 26px;
          border: 1px solid var(--line);
          border-radius: 6px;
          background: #fff;
        }
        .aur-bag__summary h2 {
          margin: 0 0 18px;
          font-family: var(--aur-serif), Georgia, serif;
          font-weight: 400;
          font-size: 1.3rem;
        }
        .aur-bag__ship {
          margin-bottom: 18px;
        }
        .aur-bag__ship p {
          margin: 0 0 10px;
          font-size: 0.85rem;
          color: rgba(24, 21, 19, 0.75);
        }
        .aur-bag__ship strong {
          color: var(--copper);
        }
        .aur-bag__bar {
          height: 4px;
          overflow: hidden;
          border-radius: 4px;
          background: var(--line);
        }
        .aur-bag__bar i {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: var(--copper);
          transform-origin: left;
          transition: transform 0.8s var(--ease-out);
        }
        .aur-bag__bar i.is-full {
          background: #6f8f74;
        }
        .aur-bag__totals {
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 16px 0;
          margin-bottom: 18px;
          border-top: 1px solid var(--line);
          border-bottom: 1px solid var(--line);
        }
        .aur-bag__totals div {
          display: flex;
          justify-content: space-between;
          font-size: 0.9rem;
        }
        .aur-bag__note {
          margin: 12px 0 0;
          font-size: 0.76rem;
          text-align: center;
          color: rgba(24, 21, 19, 0.5);
        }

        @media (max-width: 860px) {
          .aur-bag__layout {
            grid-template-columns: 1fr;
          }
          .aur-bag__summary {
            position: static;
          }
        }
        @media (max-width: 520px) {
          .aur-bag__list li {
            grid-template-columns: 76px minmax(0, 1fr);
          }
          .aur-bag__price {
            grid-column: 2;
          }
          .aur-bag__thumb {
            width: 76px;
            height: 96px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .aur-bag * {
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </>
  );
}