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
import { useCart, hasVariants } from '@/context/CartContext';
import { imageSrc } from '@/lib/imageUrl';
import Stars from '@/components/Stars';
import ProductReviews from '@/components/ProductReviews';
import RelatedProducts from '@/components/RelatedProducts';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import './product-page.css';

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

export default function ProductPage({ params }) {
  const { id } = use(params);
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error | notfound
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [shot, setShot] = useState(0); // which gallery photo is showing
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [rating, setRating] = useState({ average: 0, count: 0 }); // from the product, then kept fresh by the reviews block

  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');
    setQty(1);
    setShot(0);
    setSize('');
    setColor('');

    fetch(`${API_URL}/api/products/${id}`, { signal: controller.signal })
      .then((res) => {
        if (res.status === 404) throw new Error('notfound');
        if (!res.ok) throw new Error('failed');
        return res.json();
      })
      .then((data) => {
        setProduct(data);
        setRating({ average: data.ratingAverage || 0, count: data.ratingCount || 0 });
        setStatus('ready');
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setStatus(err.message === 'notfound' ? 'notfound' : 'error');
      });

    return () => controller.abort();
  }, [id, attempt]);

  // ── gallery: the cover first, then the extra photos ──────────────────────────
  const photos = product ? [product.image, ...(Array.isArray(product.images) ? product.images : [])].filter(Boolean) : [];
  const shotIndex = Math.min(shot, Math.max(photos.length - 1, 0));
  const go = (dir) => setShot((i) => (Math.min(i, photos.length - 1) + dir + photos.length) % photos.length);
  const onGalleryKey = (e) => {
    if (photos.length < 2) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(-1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(1);
    }
  };

  // ── sizes / colors ──────────────────────────────────────────────────────────
  const withOptions = hasVariants(product);
  const variants = withOptions ? product.variants : [];
  const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))];
  const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))];

  // Pick a size/color automatically when there is only one to pick from
  const effSize = size || (sizes.length === 1 ? sizes[0] : '');
  const effColor = color || (colors.length === 1 ? colors[0] : '');

  // The variant that matches the choices so far (a dimension the product doesn't use matches ''), or null
  const selected = withOptions
    ? variants.find((v) => (v.size || '') === (sizes.length ? effSize : '') && (v.color || '') === (colors.length ? effColor : '')) || null
    : null;

  // An option is greyed out when nothing in stock matches it together with what is already chosen
  const optionAvailable = (kind, value) =>
    variants.some(
      (v) =>
        v.stock > 0 &&
        (kind === 'size' ? v.size === value : v.size === effSize || !effSize || !sizes.length) &&
        (kind === 'color' ? v.color === value : v.color === effColor || !effColor || !colors.length)
    );

  const needsChoice = withOptions && !selected;
  const available = withOptions ? (selected ? selected.stock : 0) : product?.stock ?? 0;
  const inStock = product ? (withOptions ? product.stock > 0 : available > 0) : false;
  const canBuy = withOptions ? !!selected && selected.stock > 0 : inStock;

  const handleAdd = () => {
    if (!product || !canBuy) return;
    if (addItem(product, qty, selected)) {
      setAdded(true);
      setTimeout(() => setAdded(false), 2200);
    }
  };

  const chooseSize = (v) => {
    setSize(v === size ? '' : v);
    setQty(1);
  };
  const chooseColor = (v) => {
    setColor(v === color ? '' : v);
    setQty(1);
  };

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
          <div className="aur-pdp__gallery" onKeyDown={onGalleryKey}>
            <div className="aur-pdp__image">
              {photos.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageSrc(photos[shotIndex])} alt={`${product.name} — photo ${shotIndex + 1} of ${photos.length}`} />
              ) : (
                <span className="aur-pdp__placeholder" />
              )}
              {!inStock && <span className="aur-pdp__badge">Sold out</span>}
              {photos.length > 1 && (
                <>
                  <button type="button" className="aur-pdp__nav aur-pdp__nav--prev" onClick={() => go(-1)} aria-label="Previous photo">
                    <ArrowLeft />
                  </button>
                  <button type="button" className="aur-pdp__nav aur-pdp__nav--next" onClick={() => go(1)} aria-label="Next photo">
                    <ArrowLeft />
                  </button>
                  <span className="aur-pdp__count" aria-hidden="true">
                    {shotIndex + 1} / {photos.length}
                  </span>
                </>
              )}
            </div>
            {photos.length > 1 && (
              <div className="aur-pdp__thumbs" role="group" aria-label="Product photos">
                {photos.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    className={`aur-pdp__thumb ${i === shotIndex ? 'is-on' : ''}`}
                    aria-label={`Show photo ${i + 1}`}
                    aria-current={i === shotIndex}
                    onClick={() => setShot(i)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageSrc(url)} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="aur-pdp__body">
            <p className="aur-pdp__category">{product.category || 'general'}</p>
            <h1 className="aur-pdp__name">{product.name}</h1>
            <a href="#reviews" className="aur-pdp__rating">
              {rating.count > 0 ? (
                <>
                  <Stars value={rating.average} count={rating.count} size={16} />
                  <span>
                    {rating.average.toFixed(1)} · {rating.count} {rating.count === 1 ? 'review' : 'reviews'}
                  </span>
                </>
              ) : (
                <span>No reviews yet</span>
              )}
            </a>
            <p className="aur-pdp__price">{formatPKR(product.price)}</p>

            {product.description && <p className="aur-pdp__desc">{product.description}</p>}

            {withOptions && sizes.length > 0 && (
              <fieldset className="aur-pdp__opts">
                <legend>Size{effSize ? <strong>: {effSize}</strong> : null}</legend>
                <Link href="/size-guide" className="aur-pdp__sizeguide">
                  Size guide
                </Link>
                <div className="aur-pdp__chips">
                  {sizes.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={`aur-pdp__chip ${effSize === v ? 'is-on' : ''}`}
                      aria-pressed={effSize === v}
                      disabled={!optionAvailable('size', v)}
                      onClick={() => chooseSize(v)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {withOptions && colors.length > 0 && (
              <fieldset className="aur-pdp__opts">
                <legend>Color{effColor ? <strong>: {effColor}</strong> : null}</legend>
                <div className="aur-pdp__chips">
                  {colors.map((v) => (
                    <button
                      key={v}
                      type="button"
                      className={`aur-pdp__chip ${effColor === v ? 'is-on' : ''}`}
                      aria-pressed={effColor === v}
                      disabled={!optionAvailable('color', v)}
                      onClick={() => chooseColor(v)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            <p className="aur-pdp__stock">
              {!inStock
                ? 'Currently unavailable'
                : needsChoice
                  ? `Choose ${[sizes.length && !effSize ? 'a size' : '', colors.length && !effColor ? 'a color' : ''].filter(Boolean).join(' and ') || 'an option'}`
                  : available > 0
                    ? `${available} in stock`
                    : 'This option is sold out'}
            </p>

            <div className="aur-pdp__actions">
              <div className="aur-pdp__step" role="group" aria-label="Quantity">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity" disabled={!canBuy}>
                  <MinusIcon />
                </button>
                <span>{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(available || 1, q + 1))}
                  aria-label="Increase quantity"
                  disabled={!canBuy}
                >
                  <PlusIcon />
                </button>
              </div>

              <button type="button" className={`aur-pdp__add ${added ? 'is-added' : ''}`} onClick={handleAdd} disabled={!canBuy}>
                {added ? 'Added to bag' : !inStock ? 'Sold out' : needsChoice ? 'Choose an option' : canBuy ? 'Add to bag' : 'Sold out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {status === 'ready' && product && <RelatedProducts productId={product._id} category={product.category} />}

      {status === 'ready' && product && <ProductReviews productId={product._id} onSummary={setRating} />}

    </main>
  );
}