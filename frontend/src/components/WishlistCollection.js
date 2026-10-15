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
import './styles/WishlistCollection.css';

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
    if (!addItem(product, 1)) return; // has sizes/colors: sent to its page to choose
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

    </main>
  );
}