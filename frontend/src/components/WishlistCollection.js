'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AURELIA · WISHLIST
 * ─────────────────────────────────────────────────────────────────────────────
 *  Place at: frontend/src/app/components/WishlistCollection.js
 *
 *  frontend/src/app/wishlist/page.js renders <Navbar /> then
 *  <WishlistCollection /> then <Footer /> — same composition pattern as
 *  the Shop and Collections pages.
 *
 *  WishlistContext only remembers which product IDs were liked (in
 *  localStorage, no backend). This component turns that list of IDs into
 *  real product data with one request:
 *    GET {NEXT_PUBLIC_API_URL}/api/products?ids=64f...,64f...,64f...
 *  (see the updated backend/routes/products.routes.js).
 *
 *  Removing a piece plays a short fade-and-shrink before it actually
 *  leaves the list, so it doesn't just vanish mid-click.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { API_URL, imageSrc } from '@/lib/imageUrl';

/* ═════════════════════════════════════════════════════════════════════════════
   FONTS
   ═════════════════════════════════════════════════════════════════════════════ */

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

/* ═════════════════════════════════════════════════════════════════════════════
   HELPERS
   ═════════════════════════════════════════════════════════════════════════════ */

const formatPKR = (n) => {
  const value = Number(n);
  if (!Number.isFinite(value)) return 'Rs —';
  return `Rs ${value.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
};

/* Time the CSS fade-out (.wish-card.is-removing transition) has to finish
   before the item is actually dropped from state. Keep in sync with the
   `transition` duration on .wish-card in the styles below. */
const REMOVE_ANIM_MS = 340;

/* ═════════════════════════════════════════════════════════════════════════════
   ICONS
   ═════════════════════════════════════════════════════════════════════════════ */

const Icon = ({ children, size = 20, stroke = 1.5 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const HeartIcon = ({ filled, ...p }) => (
  <Icon {...p}>
    <path
      d="M12 20.5s-7.5-4.6-9.2-9.4C1.7 7.8 3.6 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.3 3.3 4.2 6.6-1.7 4.8-9.2 9.4-9.2 9.4Z"
      fill={filled ? 'currentColor' : 'none'}
    />
  </Icon>
);
const BagIcon = (p) => (
  <Icon {...p}>
    <path d="M5 8h14l-1 12H6L5 8Z" />
    <path d="M9 8V6.5A3 3 0 0 1 12 3.5a3 3 0 0 1 3 3V8" />
  </Icon>
);
const CheckIcon = (p) => (
  <Icon size={13} stroke={2} {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);
const ArrowRight = (p) => (
  <Icon size={15} {...p}>
    <path d="M4 12h16M14 6l6 6-6 6" />
  </Icon>
);

/* ═════════════════════════════════════════════════════════════════════════════
   SMALL COMPONENTS
   ═════════════════════════════════════════════════════════════════════════════ */

function ProductCard({ product, index, removing, onRemove, onAdd, added }) {
  const inStock = (product.stock ?? 0) > 0;
  return (
    <div className={`wish-card ${removing ? 'is-removing' : ''}`} style={{ '--i': index }}>
      <Link href={`/shop/${product._id}`} className="wish-card__media">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageSrc(product.image)} alt={product.name} loading="lazy" />
        ) : (
          <span className="wish-card__placeholder" />
        )}
        {!inStock && <span className="wish-card__sold">Sold out</span>}
      </Link>

      <button
        type="button"
        className="wish-card__heart is-liked"
        aria-label={`Remove ${product.name} from wishlist`}
        onClick={() => onRemove(product._id)}
      >
        <HeartIcon filled size={17} />
      </button>

      <button type="button" className={`wish-card__add ${added ? 'is-added' : ''}`} disabled={!inStock} onClick={() => onAdd(product)}>
        {added ? (
          <>
            <CheckIcon /> Added
          </>
        ) : (
          <>
            <BagIcon size={16} /> {inStock ? 'Add to bag' : 'Sold out'}
          </>
        )}
      </button>

      <Link href={`/shop/${product._id}`} className="wish-card__info">
        <p className="wish-card__cat">{product.category || 'general'}</p>
        <h3>{product.name}</h3>
        <p className="wish-card__price">{formatPKR(product.price)}</p>
      </Link>
    </div>
  );
}

function GridSkeleton({ count = 6 }) {
  return (
    <div className="wish-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="wish-skel" style={{ '--i': i }}>
          <div className="wish-skel__img" />
          <div className="wish-skel__line" style={{ width: '55%' }} />
          <div className="wish-skel__line" style={{ width: '70%' }} />
          <div className="wish-skel__line" style={{ width: '35%' }} />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="wish-empty">
      <svg width="86" height="86" viewBox="0 0 86 86" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M43 74s-25.5-15.5-31.3-31.9C6.7 30 11.3 18 21 18c6.5 0 11.5 3.6 16 9.6C41.5 21.6 46.5 18 53 18c9.7 0 14.3 12 9.3 24.1C56.5 58.5 43 74 43 74Z" />
      </svg>
      <h3>Your wishlist is empty</h3>
      <p>Save the pieces you love here and come back to them anytime.</p>
      <Link href="/shop" className="wish-btn wish-btn--solid">
        Explore the collection <ArrowRight />
      </Link>
    </div>
  );
}

function ErrorState({ onRetry }) {
  return (
    <div className="wish-empty">
      <h3>Something went wrong loading your wishlist.</h3>
      <p>The backend may be offline, or the request failed.</p>
      <button type="button" className="wish-btn wish-btn--solid" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   PAGE CONTENT
   ═════════════════════════════════════════════════════════════════════════════ */

export default function WishlistCollection() {
  const { addItem } = useCart();
  const wishlist = useWishlist();

  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | empty | error
  const [attempt, setAttempt] = useState(0);
  const [removingIds, setRemovingIds] = useState([]);
  const [addedId, setAddedId] = useState(null);

  const idsKey = wishlist.ids.join(',');

  /* ── fetch the liked products whenever the saved id list changes ─────── */
  useEffect(() => {
    if (!wishlist.hydrated) return undefined; // wait for localStorage to load first

    if (wishlist.ids.length === 0) {
      setProducts([]);
      setStatus('empty');
      return undefined;
    }

    const controller = new AbortController();
    setStatus('loading');

    fetch(`${API_URL}/api/products?ids=${encodeURIComponent(idsKey)}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('failed');
        return res.json();
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setProducts(list);
        setStatus(list.length ? 'ready' : 'empty');
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setStatus('error');
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, wishlist.hydrated, attempt]);

  /* ── remove: fade the card out, then actually drop it from state ─────── */
  const handleRemove = (id) => {
    setRemovingIds((list) => (list.includes(id) ? list : [...list, id]));
    window.setTimeout(() => {
      wishlist.remove(id);
      setRemovingIds((list) => list.filter((x) => x !== id));
    }, REMOVE_ANIM_MS);
  };

  const handleAdd = (product) => {
    addItem(product, 1);
    setAddedId(product._id);
    window.setTimeout(() => setAddedId((id) => (id === product._id ? null : id)), 1800);
  };

  const count = products.length;

  return (
    <main className={`${serif.variable} ${sans.variable} wish`}>
      <div className="wish-head">
        <p className="wish-head__eyebrow">Your Wishlist</p>
        <h1>
          {status === 'loading'
            ? 'Loading your pieces…'
            : count === 0
            ? 'Nothing saved yet'
            : `${count} ${count === 1 ? 'Piece' : 'Pieces'} You Love`}
        </h1>
        <p className="wish-head__text">Everything you've hearted while browsing, kept in one place.</p>

        {count > 0 && (
          <button type="button" className="wish-head__clear" onClick={() => wishlist.clear()}>
            Clear wishlist
          </button>
        )}
      </div>

      {status === 'loading' && <GridSkeleton />}

      {status === 'error' && <ErrorState onRetry={() => setAttempt((n) => n + 1)} />}

      {status === 'empty' && <EmptyState />}

      {status === 'ready' && (
        <div className="wish-grid">
          {products.map((p, i) => (
            <ProductCard
              key={p._id}
              product={p}
              index={i}
              removing={removingIds.includes(p._id)}
              onRemove={handleRemove}
              onAdd={handleAdd}
              added={addedId === p._id}
            />
          ))}
        </div>
      )}

      <style jsx global>{`
        /* ═══════════════════════════════════════════════════════════════════
           TOKENS + BASE
           ═══════════════════════════════════════════════════════════════════ */
        .wish {
          --cream: #f6efe8;
          --paper: #f3ece3;
          --ink: #181513;
          --line: rgba(24, 21, 19, 0.13);
          --gutter: clamp(20px, 5.2vw, 96px);
          --ease-out: cubic-bezier(0.22, 0.8, 0.2, 1);
          display: block;
          min-height: 100vh;
          background: var(--paper);
          color: var(--ink);
          font-family: var(--aur-sans), system-ui, sans-serif;
          padding: clamp(120px, 13vw, 160px) var(--gutter) 100px;
        }

        /* ═══════════════════════════════════════════════════════════════════
           HEADER
           ═══════════════════════════════════════════════════════════════════ */
        .wish-head {
          position: relative;
          max-width: 640px;
          margin-bottom: 48px;
        }
        .wish-head__eyebrow {
          margin: 0 0 14px;
          font-size: 0.78rem;
          font-weight: 500;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          color: rgba(24, 21, 19, 0.5);
          opacity: 0;
          animation: wishFade 0.8s ease 0.05s forwards;
        }
        .wish-head h1 {
          margin: 0;
          font-family: var(--aur-serif), Georgia, serif;
          font-weight: 400;
          font-size: clamp(2.1rem, 3.6vw, 3rem);
          line-height: 1.12;
          opacity: 0;
          animation: wishRise 0.9s var(--ease-out) 0.12s forwards;
        }
        .wish-head__text {
          margin: 16px 0 0;
          font-size: 0.98rem;
          font-weight: 300;
          line-height: 1.7;
          color: rgba(24, 21, 19, 0.65);
          opacity: 0;
          animation: wishFade 1s ease 0.3s forwards;
        }
        .wish-head__clear {
          position: absolute;
          top: 6px;
          right: 0;
          border: 0;
          background: transparent;
          color: rgba(24, 21, 19, 0.5);
          font: inherit;
          font-size: 0.84rem;
          text-decoration: underline;
          text-underline-offset: 3px;
          cursor: pointer;
          opacity: 0;
          animation: wishFade 1s ease 0.4s forwards;
          transition: color 0.3s ease;
        }
        .wish-head__clear:hover {
          color: var(--ink);
        }
        @keyframes wishFade {
          from {
            opacity: 0;
            transform: translate3d(0, 12px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        @keyframes wishRise {
          from {
            opacity: 0;
            transform: translate3d(0, 20px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           GRID + CARD
           ═══════════════════════════════════════════════════════════════════ */
        .wish-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 26px 22px;
        }
        .wish-card {
          position: relative;
          opacity: 0;
          transform: translate3d(0, 16px, 0) scale(1);
          animation: wishCardIn 0.6s var(--ease-out) calc(var(--i) * 55ms) forwards;
          transition: opacity 0.34s ease, transform 0.34s var(--ease-out);
        }
        @keyframes wishCardIn {
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
        .wish-card.is-removing {
          opacity: 0;
          transform: scale(0.92);
          pointer-events: none;
        }

        .wish-card__media {
          position: relative;
          display: block;
          aspect-ratio: 4 / 5;
          overflow: hidden;
          border-radius: 4px;
          background: #e7ddd0;
        }
        .wish-card__media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.8s var(--ease-out);
        }
        .wish-card:hover .wish-card__media img {
          transform: scale(1.06);
        }
        .wish-card__placeholder {
          display: block;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #ece1d5, #d9c8b5);
        }
        .wish-card__sold {
          position: absolute;
          top: 12px;
          left: 12px;
          padding: 5px 12px;
          border-radius: 999px;
          background: rgba(24, 21, 19, 0.85);
          color: var(--cream);
          font-size: 0.68rem;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .wish-card__heart {
          position: absolute;
          top: 10px;
          right: 10px;
          z-index: 2;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border: 0;
          border-radius: 50%;
          background: var(--ink);
          color: #e8756a;
          cursor: pointer;
          transition: transform 0.3s var(--ease-out), background 0.3s ease;
        }
        .wish-card__heart:hover {
          transform: scale(1.08);
          background: #2a2320;
        }
        .wish-card__add {
          position: absolute;
          left: 10px;
          right: 10px;
          bottom: 10px;
          z-index: 2;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 40px;
          border: 0;
          border-radius: 999px;
          background: rgba(24, 21, 19, 0.92);
          color: var(--cream);
          font: inherit;
          font-size: 0.84rem;
          font-weight: 500;
          cursor: pointer;
          opacity: 0;
          transform: translate3d(0, 10px, 0);
          transition: opacity 0.3s ease, transform 0.4s var(--ease-out), background 0.3s ease;
        }
        .wish-card:hover .wish-card__add,
        .wish-card__add.is-added {
          opacity: 1;
          transform: none;
        }
        .wish-card__add:disabled {
          cursor: not-allowed;
          background: rgba(24, 21, 19, 0.55);
        }
        .wish-card__add.is-added {
          background: #6f8f74;
        }
        .wish-card__info {
          display: block;
          margin-top: 14px;
          text-decoration: none;
          color: var(--ink);
        }
        .wish-card__cat {
          margin: 0 0 4px;
          font-size: 0.72rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(24, 21, 19, 0.45);
        }
        .wish-card__info h3 {
          margin: 0;
          font-family: var(--aur-serif), Georgia, serif;
          font-size: 1.18rem;
          font-weight: 500;
          line-height: 1.3;
        }
        .wish-card__price {
          margin: 4px 0 0;
          font-size: 0.92rem;
          color: rgba(24, 21, 19, 0.65);
        }

        /* ═══════════════════════════════════════════════════════════════════
           SKELETON / EMPTY / ERROR
           ═══════════════════════════════════════════════════════════════════ */
        .wish-skel {
          opacity: 0;
          animation: wishFade 0.5s ease calc(var(--i) * 40ms) forwards;
        }
        .wish-skel__img,
        .wish-skel__line {
          border-radius: 8px;
          background: linear-gradient(100deg, #e9dfd2 30%, #f3ebe0 50%, #e9dfd2 70%);
          background-size: 200% 100%;
          animation: wishShimmer 1.6s ease-in-out infinite;
        }
        .wish-skel__img {
          aspect-ratio: 4 / 5;
          border-radius: 4px;
        }
        .wish-skel__line {
          height: 12px;
          margin-top: 10px;
        }
        @keyframes wishShimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        .wish-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 70px 20px 40px;
          text-align: center;
          color: rgba(24, 21, 19, 0.7);
        }
        .wish-empty svg {
          color: rgba(24, 21, 19, 0.32);
          margin-bottom: 6px;
        }
        .wish-empty h3 {
          margin: 0;
          font-family: var(--aur-serif), Georgia, serif;
          font-size: 1.6rem;
          font-weight: 500;
          color: var(--ink);
        }
        .wish-empty p {
          margin: 0 0 18px;
          max-width: 40ch;
          font-size: 0.96rem;
        }

        .wish-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          height: 48px;
          padding: 0 28px;
          border-radius: 999px;
          font: inherit;
          font-size: 0.92rem;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          transition: background 0.3s ease, color 0.3s ease, transform 0.4s var(--ease-out);
        }
        .wish-btn--solid {
          border: 1px solid var(--ink);
          background: var(--ink);
          color: var(--cream);
        }
        .wish-btn--solid:hover {
          transform: translateY(-2px);
        }

        /* ═══════════════════════════════════════════════════════════════════
           FOCUS
           ═══════════════════════════════════════════════════════════════════ */
        .wish a:focus-visible,
        .wish button:focus-visible {
          outline: 2px solid #c98a63;
          outline-offset: 3px;
        }

        /* ═══════════════════════════════════════════════════════════════════
           RESPONSIVE
           ═══════════════════════════════════════════════════════════════════ */
        @media (max-width: 1080px) {
          .wish-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
        @media (max-width: 760px) {
          .wish-head__clear {
            position: static;
            display: inline-block;
            margin-top: 14px;
          }
          .wish-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 480px) {
          .wish-grid {
            gap: 18px 14px;
          }
          .wish-card__info h3 {
            font-size: 1.02rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .wish *,
          .wish *::before {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </main>
  );
}