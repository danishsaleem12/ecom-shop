'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AURELIA · COLLECTION DETAIL  (one dynamic page for every collection)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Place at: frontend/src/app/collections/[slug]/page.js
 *
 *  One route handles every collection — /collections/spring-summer,
 *  /collections/evening, /collections/sun-washed-neutrals, etc. There's
 *  no per-collection file; the [slug] segment picks both the banner copy
 *  (from lib/collections.js) and the products (from the backend).
 *
 *  Backend requirement: Product.collections (array of slugs) and
 *  GET /api/products?collection=<slug> — both added in this pass. A
 *  product shows up here once it's tagged with this collection's slug
 *  in the admin panel.
 *
 *  Composition matches every other page in the app:
 *    <Navbar cartCount={count} /> ... <Footer />
 */

import { useEffect, useMemo, useState, use } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Cormorant_Garamond, Figtree } from 'next/font/google';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useCart } from '@/context/CartContext';
import { API_URL, imageSrc } from '@/lib/imageUrl';
import { resolveCollectionPage, COLLECTIONS } from '@/lib/collections';
import './collection-page.css';

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

/* ═════════════════════════════════════════════════════════════════════════════
   ICONS
   ═════════════════════════════════════════════════════════════════════════════ */

const ArrowLeft = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 12H4M10 6l-6 6 6 6" />
  </svg>
);
const ArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12h16M14 6l6 6-6 6" />
  </svg>
);

/* ═════════════════════════════════════════════════════════════════════════════
   PRODUCT CARD
   ═════════════════════════════════════════════════════════════════════════════ */

function ProductCard({ product, onAdd }) {
  const inStock = (product.stock ?? 0) > 0;
  const [added, setAdded] = useState(false);

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAdd(product) === false) return; // has sizes/colors: sent to its page to choose
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <Link href={`/shop/${product._id}`} className={`cd-card ${inStock ? '' : 'is-out'}`}>
      <span className="cd-card__frame">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageSrc(product.image)} alt={product.name} loading="lazy" />
        ) : (
          <span className="cd-card__placeholder" />
        )}
        {!inStock && <span className="cd-card__badge">Sold out</span>}

        <button type="button" className={`cd-card__add ${added ? 'is-added' : ''}`} onClick={handleAdd} disabled={!inStock} aria-label={`Add ${product.name} to bag`}>
          {added ? 'Added' : inStock ? 'Quick add' : 'Sold out'}
        </button>
      </span>
      <span className="cd-card__meta">
        <strong>{product.name}</strong>
        <span>{formatPKR(product.price)}</span>
      </span>
    </Link>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   PAGE
   ═════════════════════════════════════════════════════════════════════════════ */

export default function CollectionDetailPage({ params }) {
  const { slug } = use(params);
  const meta = useMemo(() => resolveCollectionPage(slug), [slug]); // a collection OR a category (seasonal, occasions, featured)

  const { addItem, count } = useCart();
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!meta) return undefined;
    const controller = new AbortController();
    setStatus('loading');

    fetch(`${API_URL}/api/products?collection=${encodeURIComponent(meta.slugs.join(','))}&sort=newest`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('failed');
        return res.json();
      })
      .then((data) => {
        setProducts(Array.isArray(data) ? data : []);
        setStatus('ready');
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setStatus('error');
      });

    return () => controller.abort();
  }, [slug, meta, attempt]);

  // Unknown slug entirely (not one of our marketing collections) → real 404
  if (!meta) {
    notFound();
  }

  const isCategory = meta.kind === 'category';
  const otherCollections = isCategory
    ? COLLECTIONS.filter((c) => meta.slugs.includes(c.slug))
    : COLLECTIONS.filter((c) => c.slug !== slug).slice(0, 4);

  return (
    <>
      <Navbar cartCount={count} />

      <main className={`${serif.variable} ${sans.variable} cd-page`}>
        {/* ── banner ─────────────────────────────────────────────────── */}
        <section className="cd-banner" style={{ '--t1': meta.tint?.[0], '--t2': meta.tint?.[1] }}>
          <div className="cd-banner__media" aria-hidden="true">
            <MetaImage src={meta.image} tint={meta.tint} alt={meta.title} />
          </div>
          <div className="cd-banner__shade" />
          <div className="cd-banner__inner">
            <Link href="/collections" className="cd-banner__back">
              <ArrowLeft /> All collections
            </Link>
            <p className="cd-banner__label">{meta.category}</p>
            <h1 className="cd-banner__title">{meta.title}</h1>
            <p className="cd-banner__desc">{meta.description}</p>
          </div>
        </section>

        {/* ── products ───────────────────────────────────────────────── */}
        <section className="cd-products">
          <div className="cd-products__head">
            <h2>{isCategory ? `Shop ${meta.title}` : 'Shop the collection'}</h2>
            {status === 'ready' && <span>{products.length} {products.length === 1 ? 'piece' : 'pieces'}</span>}
          </div>

          {status === 'loading' && (
            <div className="cd-grid" aria-hidden="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <div className="cd-skel" key={i}>
                  <div className="cd-skel__frame" />
                  <div className="cd-skel__line" />
                </div>
              ))}
            </div>
          )}

          {status === 'error' && (
            <div className="cd-state">
              <p>We couldn&apos;t load this collection right now.</p>
              <button type="button" onClick={() => setAttempt((n) => n + 1)}>
                Try again
              </button>
            </div>
          )}

          {status === 'ready' && products.length === 0 && (
            <div className="cd-state">
              <p>No pieces are tagged to this collection yet — check back soon.</p>
              <Link href="/shop" className="cd-state__link">
                Browse the full shop <ArrowRight />
              </Link>
            </div>
          )}

          {status === 'ready' && products.length > 0 && (
            <div className="cd-grid">
              {products.map((p) => (
                <ProductCard key={p._id} product={p} onAdd={(prod) => addItem(prod, 1)} />
              ))}
            </div>
          )}
        </section>

        {/* ── explore more ──────────────────────────────────────────── */}
        {otherCollections.length > 0 && (
          <section className="cd-more">
            <h3>{isCategory ? `In ${meta.title}` : 'Explore more collections'}</h3>
            <div className="cd-more__row">
              {otherCollections.map((c) => (
                <Link href={c.href} key={c.slug} className="cd-more__item" style={{ '--t1': c.tint?.[0], '--t2': c.tint?.[1] }}>
                  <span className="cd-more__frame">
                    <MetaImage src={c.image} tint={c.tint} alt={c.title} />
                  </span>
                  <span>{c.title}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />

    </>
  );
}

/** Same graceful fallback pattern as CollectionsList.js's MediaImage. */
function MetaImage({ src, alt, tint }) {
  const [failed, setFailed] = useState(!src);
  if (failed) return <span className="cd-banner__fallback" aria-hidden="true" style={{ '--t1': tint?.[0], '--t2': tint?.[1] }} />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt || ''} onError={() => setFailed(true)} />;
}