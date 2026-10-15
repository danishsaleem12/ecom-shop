'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AURELIA · SHOP COLLECTION (the Shop page's content)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Place at: frontend/src/app/components/ShopCollection.js
 *
 *  This holds everything the Shop page shows — hero, category scroller,
 *  filters, grid, pagination. frontend/src/app/shop/page.js just renders
 *  <Navbar /> then <ShopCollection /> then <Footer />; Navbar and Footer
 *  are not duplicated in here.
 *
 *  Every Navbar link still lands here because it's the same route as
 *  before, just split into pieces:
 *    /shop                       → everything
 *    /shop?category=dresses      → Dresses only
 *    /shop?sort=new              → New arrivals (mapped to sort=newest below)
 *    /shop?search=linen          → whatever the Navbar search overlay typed
 *
 *  Talks to your real backend:
 *    GET {NEXT_PUBLIC_API_URL}/api/products
 *      ?category=&search=&minPrice=&maxPrice=&sort=&page=&limit=
 *    → array of products, with X-Total-Count / X-Total-Pages response
 *      headers for pagination.
 *
 *  Product model only has: name, description, price, image, category,
 *  stock — no size/color fields yet — so the sidebar only filters by
 *  Category, Price and Sort.
 *
 *  Wishlist state now comes from the shared WishlistContext (same
 *  "aurelia-wishlist" localStorage key as before), so hearting a piece
 *  here, on the Wishlist page, or anywhere else, stays in sync — including
 *  the Navbar's wishlist badge.
 */

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import { API_URL, imageSrc } from '@/lib/imageUrl';
import Stars from '@/components/Stars';
import './styles/ShopCollection.css';

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
   DATA / CONSTANTS
   ═════════════════════════════════════════════════════════════════════════════ */

const unsplash = (id, width = 1000) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=78`;

/**
 * Single source for every category the storefront knows about — used by
 * BOTH the sidebar filter checkboxes AND the category scroller below, so
 * there's one list to update instead of two. `slug` is sent to the
 * backend as ?category=slug (case-insensitive there). `special: 'newest'`
 * marks "New arrivals" as a sort, not a real category — selecting it
 * sends ?sort=newest instead of ?category=new. Keep this in sync with
 * admin/products/page.js's CATEGORY_CHOICES and Navbar.js's mega menu.
 */
const CATEGORY_OPTIONS = [
  { slug: 'new', label: 'New arrivals', special: 'newest', image: unsplash('photo-1595777457583-95e059d581b8') },
  { slug: 'dresses', label: 'Dresses', image: unsplash('photo-1595777457583-95e059d581b8') },
  { slug: 'tops', label: 'Shirts & tops', image: unsplash('photo-1578747522731-9e5a179b02f7') },
  { slug: 'trousers', label: 'Trousers', image: unsplash('photo-1622445275576-721325763afe') },
  { slug: 'knitwear', label: 'Knitwear', image: unsplash('photo-1638247025967-b4e38f787b76') },
  { slug: 'outerwear', label: 'Outerwear', image: unsplash('photo-1591047139829-d91aecb6caea') },
  { slug: 'bags', label: 'Bags', image: unsplash('photo-1584917865442-de89df76afd3') },
  { slug: 'shoes', label: 'Shoes', image: unsplash('photo-1560769629-975ec94e6a86') },
  { slug: 'jewellery', label: 'Jewellery', image: unsplash('photo-1611591437281-460bfbe1220a') },
  { slug: 'scarves', label: 'Scarves', image: unsplash('photo-1601924994987-69e26d50dc26') },
];

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: Low to High' },
  { value: 'price-desc', label: 'Price: High to Low' },
  { value: 'name-asc', label: 'Name: A–Z' },
  { value: 'rating', label: 'Top rated' },
];

/**
 * Upper bound for the price slider. There's no min/max-price endpoint on
 * the backend yet, so this is a guess — raise or lower it to match your
 * actual catalog's price range.
 */
const PRICE_CEILING = 10000;
const PAGE_SIZE = 12;

const formatPKR = (n) => {
  const value = Number(n);
  if (!Number.isFinite(value)) return 'Rs —';
  return `Rs ${value.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
};

const categoryLabel = (slug) => {
  const found = CATEGORY_OPTIONS.find((c) => c.slug === slug);
  return found ? found.label : null;
};

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
const ChevronDown = (p) => (
  <Icon size={14} {...p}>
    <path d="m5 8 5 5 5-5" />
  </Icon>
);
const CloseIcon = (p) => (
  <Icon {...p}>
    <path d="M5 5l14 14M19 5 5 19" />
  </Icon>
);
const ArrowLeft = (p) => (
  <Icon size={15} {...p}>
    <path d="M20 12H4M10 6l-6 6 6 6" />
  </Icon>
);
const ArrowRight = (p) => (
  <Icon size={15} {...p}>
    <path d="M4 12h16M14 6l6 6-6 6" />
  </Icon>
);
const CheckIcon = (p) => (
  <Icon size={13} stroke={2} {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);
const SlidersIcon = (p) => (
  <Icon {...p}>
    <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
    <circle cx="16" cy="7" r="2.2" />
    <circle cx="8" cy="17" r="2.2" />
  </Icon>
);

/* ═════════════════════════════════════════════════════════════════════════════
   HOOKS
   ═════════════════════════════════════════════════════════════════════════════ */

/** Locks page scroll while the mobile filter drawer is open. */
function useScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}

/** Debounces a fast-changing value (the price slider) before it drives a fetch. */
function useDebounced(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/* ═════════════════════════════════════════════════════════════════════════════
   SMALL COMPONENTS
   ═════════════════════════════════════════════════════════════════════════════ */

/**
 * Horizontal, draggable, snap-scrolling category rail — all 10 categories,
 * not just the first 6. Arrow buttons + edge fades show up only when
 * there's more to scroll in that direction; works with mouse drag, touch
 * swipe, or the arrows.
 */
function CategoryScroller({ active, onSelect }) {
  const trackRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);
  const drag = useRef({ down: false, moved: false, startX: 0, startScroll: 0 });

  const updateEdges = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    updateEdges();
    const el = trackRef.current;
    if (!el) return undefined;
    el.addEventListener('scroll', updateEdges, { passive: true });
    window.addEventListener('resize', updateEdges);
    return () => {
      el.removeEventListener('scroll', updateEdges);
      window.removeEventListener('resize', updateEdges);
    };
  }, [updateEdges]);

  const scrollByAmount = (dir) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(360, el.clientWidth * 0.72), behavior: 'smooth' });
  };

  const onPointerDown = (e) => {
    const el = trackRef.current;
    if (!el) return;
    drag.current = { down: true, moved: false, startX: e.clientX, startScroll: el.scrollLeft };
    el.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!drag.current.down) return;
    const el = trackRef.current;
    if (!el) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 3) drag.current.moved = true;
    el.scrollLeft = drag.current.startScroll - dx;
  };
  const endDrag = () => {
    drag.current.down = false;
  };
  // A click that followed a real drag shouldn't also select the category.
  const onItemClick = (c) => {
    if (drag.current.moved) {
      drag.current.moved = false;
      return;
    }
    onSelect(c);
  };

  return (
    <div className="shop-scroller">
      <button
        type="button"
        className="shop-scroller__arrow shop-scroller__arrow--left"
        onClick={() => scrollByAmount(-1)}
        aria-label="Scroll categories left"
        disabled={!canLeft}
      >
        <ArrowLeft />
      </button>

      <div
        className="shop-scroller__track"
        ref={trackRef}
        role="tablist"
        aria-label="Shop by category"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
      >
        {CATEGORY_OPTIONS.map((c, i) => {
          const isActive = c.special ? active.sort === c.special : active.category === c.slug;
          return (
            <button
              key={c.slug}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`shop-scroller__item ${isActive ? 'is-active' : ''}`}
              style={{ '--i': i }}
              onClick={() => onItemClick(c)}
            >
              <span className="shop-scroller__img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.image} alt="" loading="lazy" draggable={false} />
                <span className="shop-scroller__ring" />
              </span>
              <span className="shop-scroller__label">{c.label}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="shop-scroller__arrow shop-scroller__arrow--right"
        onClick={() => scrollByAmount(1)}
        aria-label="Scroll categories right"
        disabled={!canRight}
      >
        <ArrowRight />
      </button>

      <span className={`shop-scroller__fade shop-scroller__fade--left ${canLeft ? 'is-on' : ''}`} aria-hidden="true" />
      <span className={`shop-scroller__fade shop-scroller__fade--right ${canRight ? 'is-on' : ''}`} aria-hidden="true" />
    </div>
  );
}

/** Single price-ceiling slider: "Rs 0 — Rs {value}". */
function PriceSlider({ value, onChange }) {
  const pct = Math.round((value / PRICE_CEILING) * 100);
  return (
    <div className="shop-price">
      <div className="shop-price__track">
        <i style={{ width: `${pct}%` }} />
        <input
          type="range"
          min={0}
          max={PRICE_CEILING}
          step={50}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Maximum price"
        />
      </div>
      <div className="shop-price__labels">
        <span>Rs 0</span>
        <span>
          {formatPKR(value)}
          {value >= PRICE_CEILING ? '+' : ''}
        </span>
      </div>
    </div>
  );
}

/** The Category / Price panel. Shared between desktop sidebar and mobile drawer. */
function FilterPanel({ filters, onCategory, onPrice, onClear, idPrefix }) {
  const hasActive = Boolean(filters.category) || filters.sort === 'newest' || filters.maxPrice < PRICE_CEILING;

  return (
    <div className="shop-filters">
      <div className="shop-filters__head">
        <h3>Filter</h3>
        {hasActive && (
          <button type="button" onClick={onClear}>
            Clear all
          </button>
        )}
      </div>

      <div className="shop-filters__group">
        <h4>Category</h4>
        <ul>
          {CATEGORY_OPTIONS.map((c) => {
            const checked = c.special ? filters.sort === c.special : filters.category === c.slug;
            return (
              <li key={c.slug}>
                <label htmlFor={`${idPrefix}-${c.slug}`}>
                  <input
                    id={`${idPrefix}-${c.slug}`}
                    type="checkbox"
                    checked={checked}
                    onChange={() => onCategory(c)}
                  />
                  <span className="shop-filters__box">
                    <CheckIcon />
                  </span>
                  <span>{c.label}</span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="shop-filters__group">
        <h4>Price</h4>
        <PriceSlider value={filters.maxPrice} onChange={onPrice} />
      </div>
    </div>
  );
}

/** The "The New Collection" promo tile that sits under the sidebar filters. */
function PromoTile() {
  return (
    <Link href="/collections/spring-summer" className="shop-promo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={unsplash('photo-1517841905240-472988babdf9')} alt="" loading="lazy" />
      <span className="shop-promo__fade" />
      <span className="shop-promo__body">
        <strong>The New Collection</strong>
        <span>
          Explore Now <ArrowRight />
        </span>
      </span>
    </Link>
  );
}

/** One product card in the grid. */
function ProductCard({ product, index, liked, onToggleLike, onAdd, added }) {
  const inStock = (product.stock ?? 0) > 0;
  return (
    <div className="shop-card" style={{ '--i': index % PAGE_SIZE }}>
      <Link href={`/shop/${product._id}`} className="shop-card__media">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageSrc(product.image)} alt={product.name} loading="lazy" />
        ) : (
          <span className="shop-card__placeholder" />
        )}
        {!inStock && <span className="shop-card__sold">Sold out</span>}
      </Link>

      <button
        type="button"
        className={`shop-card__heart ${liked ? 'is-liked' : ''}`}
        aria-pressed={liked}
        aria-label={liked ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
        onClick={() => onToggleLike(product._id)}
      >
        <HeartIcon filled={liked} size={17} />
      </button>

      <button
        type="button"
        className={`shop-card__add ${added ? 'is-added' : ''}`}
        disabled={!inStock}
        onClick={() => onAdd(product)}
      >
        {added ? (
          <>
            <CheckIcon /> Added
          </>
        ) : (
          <>
            <BagIcon size={16} /> {inStock ? 'Quick add' : 'Sold out'}
          </>
        )}
      </button>

      <Link href={`/shop/${product._id}`} className="shop-card__info">
        <p className="shop-card__cat">{product.category || 'general'}</p>
        <h3>{product.name}</h3>
        {product.ratingCount > 0 && (
          <p className="shop-card__rating">
            <Stars value={product.ratingAverage} count={product.ratingCount} size={13} />
            <span aria-hidden="true">({product.ratingCount})</span>
          </p>
        )}
        <p className="shop-card__price">{formatPKR(product.price)}</p>
      </Link>
    </div>
  );
}

function GridSkeleton({ count = PAGE_SIZE }) {
  return (
    <div className="shop-grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="shop-skel" style={{ '--i': i }}>
          <div className="shop-skel__img" />
          <div className="shop-skel__line" style={{ width: '55%' }} />
          <div className="shop-skel__line" style={{ width: '70%' }} />
          <div className="shop-skel__line" style={{ width: '35%' }} />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onClear }) {
  return (
    <div className="shop-empty">
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="30" cy="30" r="16" />
        <path d="M42 42 62 62" />
      </svg>
      <h3>No pieces match these filters</h3>
      <p>Try a different category or widen the price range.</p>
      <button type="button" className="shop-btn shop-btn--ghost" onClick={onClear}>
        Clear filters
      </button>
    </div>
  );
}

function ErrorState({ onRetry }) {
  return (
    <div className="shop-empty">
      <h3>Something went wrong loading the shop.</h3>
      <p>The backend may be offline, or the request failed.</p>
      <button type="button" className="shop-btn shop-btn--solid" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

function Pagination({ page, pages, onChange }) {
  const nums = useMemo(() => {
    const set = new Set([1, pages, page - 1, page, page + 1]);
    return Array.from(set)
      .filter((n) => n >= 1 && n <= pages)
      .sort((a, b) => a - b);
  }, [page, pages]);

  if (pages <= 1) return null;

  const withGaps = [];
  nums.forEach((n, i) => {
    if (i > 0 && n - nums[i - 1] > 1) withGaps.push('…');
    withGaps.push(n);
  });

  return (
    <nav className="shop-pagi" aria-label="Pagination">
      <button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
        <ArrowLeft />
      </button>
      {withGaps.map((n, i) =>
        n === '…' ? (
          <span key={`gap-${i}`} className="shop-pagi__gap">
            …
          </span>
        ) : (
          <button key={n} type="button" className={n === page ? 'is-active' : ''} onClick={() => onChange(n)} aria-current={n === page ? 'page' : undefined}>
            {n}
          </button>
        )
      )}
      <button type="button" onClick={() => onChange(page + 1)} disabled={page >= pages} aria-label="Next page">
        <ArrowRight />
      </button>
    </nav>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   PAGE CONTENT
   ═════════════════════════════════════════════════════════════════════════════ */

function ShopCollectionInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addItem } = useCart();
  const wishlist = useWishlist();

  const urlCategory = searchParams.get('category') || '';
  const urlSort = searchParams.get('sort') === 'new' ? 'newest' : searchParams.get('sort') || 'featured';
  const urlSearch = searchParams.get('search') || '';
  const urlPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);

  const [maxPrice, setMaxPrice] = useState(PRICE_CEILING);
  const debouncedMaxPrice = useDebounced(maxPrice, 450);

  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | empty | error
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [addedId, setAddedId] = useState(null);
  const [sortOpen, setSortOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const sortRef = useRef(null);
  const gridTopRef = useRef(null);
  const heroRef = useRef(null);

  useScrollLock(drawerOpen);

  const filters = { category: urlCategory, sort: urlSort, search: urlSearch, maxPrice, page: urlPage };

  /* ── close the sort dropdown on outside click ────────────────────────── */
  useEffect(() => {
    if (!sortOpen) return undefined;
    const onDown = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) setSortOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [sortOpen]);

  /* ── close the mobile drawer on Escape ───────────────────────────────── */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ── hero mouse-parallax (background layer only — the zoom keyframe
         below stays on the <img> itself, so the two never fight) ───────── */
  const onHeroMove = (e) => {
    const el = heroRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--hx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    el.style.setProperty('--hy', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  };
  const onHeroLeave = () => {
    const el = heroRef.current;
    if (el) {
      el.style.setProperty('--hx', '0');
      el.style.setProperty('--hy', '0');
    }
  };

  /* ── helpers to update the URL (which drives the fetch below) ───────── */
  const pushParams = useCallback(
    (next, { resetPage = true } = {}) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(next).forEach(([key, val]) => {
        if (val === null || val === undefined || val === '') params.delete(key);
        else params.set(key, String(val));
      });
      if (resetPage) params.delete('page');
      router.push(`/shop${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false });
    },
    [router, searchParams]
  );

  const handleCategoryToggle = (c) => {
    setDrawerOpen(false);
    if (c.special) {
      // "New arrivals" is a sort, not a category — turn it off if already active.
      if (urlSort === c.special) pushParams({ sort: null });
      else pushParams({ sort: c.special, category: null });
      return;
    }
    if (urlCategory === c.slug) pushParams({ category: null });
    else pushParams({ category: c.slug, sort: urlSort === 'newest' ? null : urlSort });
  };

  const handleSort = (value) => {
    setSortOpen(false);
    pushParams({ sort: value === 'featured' ? null : value }, { resetPage: false });
  };

  const handlePage = (n) => {
    pushParams({ page: n === 1 ? null : n }, { resetPage: false });
    if (gridTopRef.current) gridTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const clearAll = () => {
    setDrawerOpen(false);
    setMaxPrice(PRICE_CEILING);
    router.push('/shop', { scroll: false });
  };

  const clearSearch = () => pushParams({ search: null });

  /* ── fetch products whenever a filter changes ────────────────────────── */
  useEffect(() => {
    const controller = new AbortController();
    setStatus('loading');

    const qs = new URLSearchParams();
    if (urlCategory) qs.set('category', urlCategory);
    if (urlSearch) qs.set('search', urlSearch);
    if (urlSort !== 'featured') qs.set('sort', urlSort);
    if (debouncedMaxPrice < PRICE_CEILING) qs.set('maxPrice', String(debouncedMaxPrice));
    qs.set('page', String(urlPage));
    qs.set('limit', String(PAGE_SIZE));

    fetch(`${API_URL}/api/products?${qs.toString()}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error('failed');
        const total = Number(res.headers.get('X-Total-Count') || 0);
        const pages = Number(res.headers.get('X-Total-Pages') || 1);
        return res.json().then((data) => ({ data, total, pages }));
      })
      .then(({ data, total, pages }) => {
        const list = Array.isArray(data) ? data : [];
        setProducts(list);
        setTotalCount(total || list.length);
        setTotalPages(Math.max(1, pages || 1));
        setStatus(list.length ? 'ready' : 'empty');
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setStatus('error');
      });

    return () => controller.abort();
  }, [urlCategory, urlSort, urlSearch, debouncedMaxPrice, urlPage, attempt]);

  /* ── "Added" pulse on the quick-add button ───────────────────────────── */
  const handleAdd = (product) => {
    if (!addItem(product, 1)) return; // has sizes/colors: sent to its page to choose
    setAddedId(product._id);
    window.setTimeout(() => setAddedId((id) => (id === product._id ? null : id)), 1800);
  };

  const heading = urlSearch
    ? `Results for “${urlSearch}”`
    : urlSort === 'newest'
    ? 'New Arrivals'
    : categoryLabel(urlCategory) || 'Timeless Pieces for a More Beautiful Tomorrow';

  const subheading = urlSearch
    ? `${totalCount} ${totalCount === 1 ? 'piece' : 'pieces'} found`
    : urlSort === 'newest'
    ? 'The very latest to arrive at Aurelia.'
    : categoryLabel(urlCategory)
    ? `Curated ${categoryLabel(urlCategory).toLowerCase()}, chosen for how they wear as much as how they look.`
    : 'Discover our curated collection of elegant, versatile pieces designed for modern life.';

  const activeCrumb = urlSearch ? 'Search' : urlSort === 'newest' ? 'New Arrivals' : categoryLabel(urlCategory) || 'Shop';

  return (
    <main className={`${serif.variable} ${sans.variable} shop`}>
      {/* ── Hero banner ──────────────────────────────────────────────── */}
      <section className="shop-hero" ref={heroRef} onMouseMove={onHeroMove} onMouseLeave={onHeroLeave}>
        <div className="shop-hero__media" aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={unsplash('photo-1517841905240-472988babdf9', 1800)} alt="" />
          <span className="shop-hero__shade" />
        </div>

        <div className="shop-hero__inner">
          <p className="shop-hero__eyebrow">Shop</p>
          <h1 key={heading}>{heading}</h1>
          <p className="shop-hero__text" key={`sub-${subheading}`}>
            {subheading}
          </p>

          <nav className="shop-hero__crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span>/</span>
            {activeCrumb === 'Shop' ? (
              <span aria-current="page">Shop</span>
            ) : (
              <>
                <Link href="/shop">Shop</Link>
                <span>/</span>
                <span aria-current="page">{activeCrumb}</span>
              </>
            )}
          </nav>
        </div>
      </section>

      {/* ── Category scroller (all 10 categories) ───────────────────── */}
      <CategoryScroller active={filters} onSelect={handleCategoryToggle} />

      <div className="shop-body" ref={gridTopRef}>
        {/* ── Sidebar (desktop) ─────────────────────────────────────── */}
        <aside className="shop-sidebar">
          <FilterPanel filters={filters} onCategory={handleCategoryToggle} onPrice={setMaxPrice} onClear={clearAll} idPrefix="d" />
          <PromoTile />
        </aside>

        {/* ── Main column ──────────────────────────────────────────── */}
        <div className="shop-main">
          <div className="shop-toolbar">
            <button type="button" className="shop-toolbar__filter" onClick={() => setDrawerOpen(true)}>
              <SlidersIcon size={17} /> Filters
            </button>

            <p className="shop-toolbar__count">
              {status === 'loading' ? 'Loading…' : `Showing ${products.length ? (urlPage - 1) * PAGE_SIZE + 1 : 0}–${(urlPage - 1) * PAGE_SIZE + products.length} of ${totalCount}`}
            </p>

            {urlSearch && (
              <button type="button" className="shop-toolbar__clear-search" onClick={clearSearch}>
                Clear search <CloseIcon size={13} />
              </button>
            )}

            <div className="shop-sort" ref={sortRef}>
              <span>Sort by:</span>
              <button type="button" onClick={() => setSortOpen((o) => !o)} aria-expanded={sortOpen}>
                {SORT_OPTIONS.find((s) => s.value === urlSort)?.label || 'Featured'}
                <ChevronDown />
              </button>
              <div className={`shop-sort__menu ${sortOpen ? 'is-open' : ''}`} role="listbox">
                {SORT_OPTIONS.map((s) => (
                  <button key={s.value} type="button" className={s.value === urlSort ? 'is-active' : ''} onClick={() => handleSort(s.value)} role="option" aria-selected={s.value === urlSort}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {status === 'loading' && <GridSkeleton />}

          {status === 'error' && <ErrorState onRetry={() => setAttempt((n) => n + 1)} />}

          {status === 'empty' && <EmptyState onClear={clearAll} />}

          {status === 'ready' && (
            <div className="shop-grid">
              {products.map((p, i) => (
                <ProductCard
                  key={p._id}
                  product={p}
                  index={i}
                  liked={wishlist.has(p._id)}
                  onToggleLike={wishlist.toggle}
                  onAdd={handleAdd}
                  added={addedId === p._id}
                />
              ))}
            </div>
          )}

          <Pagination page={urlPage} pages={totalPages} onChange={handlePage} />
        </div>
      </div>

      {/* ── Mobile filter drawer ─────────────────────────────────────── */}
      <div className={`shop-drawer ${drawerOpen ? 'is-open' : ''}`} aria-hidden={!drawerOpen}>
        <div className="shop-drawer__backdrop" onClick={() => setDrawerOpen(false)} />
        <div className="shop-drawer__panel" role="dialog" aria-modal="true" aria-label="Filters">
          <div className="shop-drawer__head">
            <h3>Filter &amp; Sort</h3>
            <button type="button" onClick={() => setDrawerOpen(false)} aria-label="Close filters">
              <CloseIcon />
            </button>
          </div>
          <div className="shop-drawer__body">
            <FilterPanel filters={filters} onCategory={handleCategoryToggle} onPrice={setMaxPrice} onClear={clearAll} idPrefix="m" />
            <div className="shop-drawer__sort">
              <h4>Sort by</h4>
              <ul>
                {SORT_OPTIONS.map((s) => (
                  <li key={s.value}>
                    <label>
                      <input type="radio" name="mobile-sort" checked={s.value === urlSort} onChange={() => handleSort(s.value)} />
                      <span>{s.label}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="shop-drawer__foot">
            <button type="button" className="shop-btn shop-btn--solid" onClick={() => setDrawerOpen(false)}>
              Show {totalCount} results
            </button>
          </div>
        </div>
      </div>

    </main>
  );
}

/**
 * useSearchParams() needs a Suspense boundary in the App Router, or Next
 * throws a build error. The fallback only flashes for a moment since this
 * whole page is a client component anyway.
 */
export default function ShopCollection() {
  return (
    <Suspense fallback={null}>
      <ShopCollectionInner />
    </Suspense>
  );
}