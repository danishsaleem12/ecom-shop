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
import { usePolicy } from '@/context/PolicyContext';
import { imageSrc } from '@/lib/imageUrl';
import './cart.css';

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
  const { freeShippingThreshold: FREE_SHIPPING_THRESHOLD } = usePolicy(); // from the backend (GET /api/config)
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
                <li key={it.key || it.id}>
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
                    {(it.size || it.color) && <span className="aur-bag__unit">{[it.size, it.color].filter(Boolean).join(' / ')}</span>}
                    <span className="aur-bag__unit">{formatPKR(it.price)} each</span>

                    <div className="aur-bag__row">
                      <div className="aur-bag__step" role="group" aria-label={`Quantity for ${it.name}`}>
                        <button type="button" onClick={() => updateQty(it.key || it.id, Math.max(1, it.qty - 1))} aria-label="Decrease quantity">
                          <MinusIcon />
                        </button>
                        <span>{it.qty}</span>
                        <button
                          type="button"
                          onClick={() => updateQty(it.key || it.id, it.stock > 0 ? Math.min(it.qty + 1, it.stock) : it.qty + 1)}
                          aria-label="Increase quantity"
                          disabled={it.stock > 0 && it.qty >= it.stock}
                        >
                          <PlusIcon />
                        </button>
                      </div>
                      <button type="button" className="aur-bag__remove" onClick={() => removeItem(it.key || it.id)}>
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

      {/* Rules whose class names are defined differently in other sections stay here: see src/components/styles/README.md */}
      <style jsx global>{`
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
      `}</style>
    </>
  );
}