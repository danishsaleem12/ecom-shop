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
import { getCollectionBySlug, COLLECTIONS } from '@/lib/collections';

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
    onAdd(product);
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
  const meta = useMemo(() => getCollectionBySlug(slug), [slug]);

  const { addItem, count } = useCart();
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!meta) return undefined;
    const controller = new AbortController();
    setStatus('loading');

    fetch(`${API_URL}/api/products?collection=${encodeURIComponent(slug)}&sort=newest`, { signal: controller.signal })
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

  const otherCollections = COLLECTIONS.filter((c) => c.slug !== slug).slice(0, 4);

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
            <h2>Shop the collection</h2>
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
            <h3>Explore more collections</h3>
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

      <style jsx global>{`
        .cd-page {
          --cream: #f6efe8;
          --ink: #181513;
          --copper: #c98a63;
          --line: rgba(24, 21, 19, 0.14);
          --gutter: clamp(20px, 5.2vw, 96px);
          --ease-out: cubic-bezier(0.22, 0.8, 0.2, 1);
          background: var(--cream);
          color: var(--ink);
          font-family: var(--aur-sans), system-ui, sans-serif;
        }

        /* ── banner ─────────────────────────────────────────────────── */
        .cd-banner {
          position: relative;
          height: clamp(340px, 42vw, 460px);
          overflow: hidden;
          color: #fff;
        }
        .cd-banner__media {
          position: absolute;
          inset: 0;
        }
        .cd-banner__media img,
        .cd-banner__fallback {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .cd-banner__fallback {
          background:
            radial-gradient(ellipse 70% 55% at 25% 20%, var(--t1, #b89b76), transparent 72%),
            linear-gradient(165deg, var(--t2, #241c15), #14100c);
        }
        .cd-banner__shade {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, rgba(14, 11, 8, 0.78) 0%, rgba(14, 11, 8, 0.4) 45%, rgba(14, 11, 8, 0.12) 100%);
        }
        .cd-banner__inner {
          position: relative;
          z-index: 2;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 100px var(--gutter) 40px;
          max-width: 640px;
        }
        .cd-banner__back {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
          font-size: 0.86rem;
          color: rgba(255, 255, 255, 0.8);
          text-decoration: none;
          width: fit-content;
        }
        .cd-banner__back:hover {
          color: #fff;
        }
        .cd-banner__label {
          margin: 0 0 10px;
          font-size: 0.7rem;
          font-weight: 500;
          letter-spacing: 0.26em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.75);
        }
        .cd-banner__title {
          margin: 0;
          font-family: var(--aur-serif), Georgia, serif;
          font-weight: 400;
          font-size: clamp(2.2rem, 4vw, 3.4rem);
          line-height: 1.08;
        }
        .cd-banner__desc {
          margin: 18px 0 0;
          max-width: 46ch;
          font-size: 0.98rem;
          font-weight: 300;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.88);
        }

        /* ── products ───────────────────────────────────────────────── */
        .cd-products {
          padding: clamp(40px, 5vw, 64px) var(--gutter) 10px;
        }
        .cd-products__head {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          margin-bottom: 28px;
        }
        .cd-products__head h2 {
          margin: 0;
          font-family: var(--aur-serif), Georgia, serif;
          font-weight: 400;
          font-size: 1.6rem;
        }
        .cd-products__head span {
          font-size: 0.85rem;
          color: rgba(24, 21, 19, 0.55);
        }

        .cd-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: clamp(16px, 2vw, 26px);
        }

        .cd-card {
          display: flex;
          flex-direction: column;
          color: inherit;
          text-decoration: none;
        }
        .cd-card__frame {
          position: relative;
          display: block;
          aspect-ratio: 3 / 4;
          overflow: hidden;
          border-radius: 4px;
          background: #e4d9cd;
        }
        .cd-card__frame img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scale(1.02);
          transition: transform 0.9s var(--ease-out);
        }
        .cd-card:hover .cd-card__frame img {
          transform: scale(1.07);
        }
        .cd-card__placeholder {
          display: block;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #ece1d5, #d9c8b5);
        }
        .cd-card__badge {
          position: absolute;
          top: 10px;
          left: 10px;
          padding: 4px 10px;
          border-radius: 999px;
          background: rgba(24, 21, 19, 0.85);
          color: var(--cream);
          font-size: 0.64rem;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }
        .cd-card__add {
          position: absolute;
          left: 10px;
          right: 10px;
          bottom: 10px;
          height: 38px;
          border: 0;
          border-radius: 999px;
          background: rgba(24, 21, 19, 0.86);
          color: var(--cream);
          font: inherit;
          font-size: 0.8rem;
          cursor: pointer;
          opacity: 0;
          transform: translate3d(0, 8px, 0);
          transition: opacity 0.3s ease, transform 0.4s var(--ease-out), background 0.3s ease;
        }
        .cd-card:hover .cd-card__add {
          opacity: 1;
          transform: none;
        }
        .cd-card__add.is-added {
          background: #6f8f74;
        }
        .cd-card__add:disabled {
          cursor: not-allowed;
          opacity: 0.9;
          background: rgba(24, 21, 19, 0.55);
        }
        .cd-card.is-out .cd-card__frame img {
          filter: grayscale(0.5);
          opacity: 0.75;
        }
        .cd-card__meta {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
          margin-top: 12px;
          font-size: 0.92rem;
        }
        .cd-card__meta strong {
          font-weight: 400;
        }
        .cd-card__meta span {
          color: rgba(24, 21, 19, 0.6);
          white-space: nowrap;
        }

        /* ── loading / empty / error ────────────────────────────────── */
        .cd-skel__frame {
          aspect-ratio: 3 / 4;
          border-radius: 4px;
          background: linear-gradient(100deg, #e9dfd2 30%, #f3ebe0 50%, #e9dfd2 70%);
          background-size: 200% 100%;
          animation: cdShimmer 1.6s ease-in-out infinite;
        }
        .cd-skel__line {
          height: 12px;
          width: 70%;
          margin-top: 12px;
          border-radius: 4px;
          background: linear-gradient(100deg, #e9dfd2 30%, #f3ebe0 50%, #e9dfd2 70%);
          background-size: 200% 100%;
          animation: cdShimmer 1.6s ease-in-out infinite;
        }
        @keyframes cdShimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        .cd-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          padding: 60px 20px;
          text-align: center;
          color: rgba(24, 21, 19, 0.6);
        }
        .cd-state button {
          padding: 10px 22px;
          border-radius: 999px;
          border: 1px solid rgba(24, 21, 19, 0.28);
          background: transparent;
          color: var(--ink);
          font: inherit;
          cursor: pointer;
        }
        .cd-state__link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--copper);
          text-decoration: none;
        }

        /* ── explore more ───────────────────────────────────────────── */
        .cd-more {
          padding: 20px var(--gutter) clamp(60px, 7vw, 96px);
        }
        .cd-more h3 {
          margin: 0 0 20px;
          font-family: var(--aur-serif), Georgia, serif;
          font-weight: 400;
          font-size: 1.35rem;
        }
        .cd-more__row {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
          gap: 16px;
        }
        .cd-more__item {
          display: flex;
          flex-direction: column;
          gap: 10px;
          color: inherit;
          text-decoration: none;
          font-size: 0.86rem;
        }
        .cd-more__frame {
          display: block;
          aspect-ratio: 1;
          overflow: hidden;
          border-radius: 4px;
        }
        .cd-more__frame img,
        .cd-more__frame .cd-banner__fallback {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.7s var(--ease-out);
        }
        .cd-more__item:hover .cd-more__frame img {
          transform: scale(1.06);
        }

        @media (max-width: 640px) {
          .cd-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .cd-page * {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
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