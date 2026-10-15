'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AURELIA · NEW ARRIVALS  ("Curated Selection" — horizontal product carousel)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Place at: frontend/src/components/NewArrivalsSection.js
 *  Use:      <NewArrivalsSection />   (e.g. in src/app/page.js)
 *
 *  Same visual/animation language as Hero.js / ProductSection.js /
 *  CollectionsSection.js / StorySection.js / FeaturedProductSection.js:
 *   • Reveals once when scrolled into view: letter-stagger eyebrow, masked
 *     heading lines, description + "view all" fading up in sequence
 *   • 25 products, paged 5-at-a-time (5 pages) — changing page wipes the new
 *     row in from the side you moved toward, each card wiping open with a
 *     stagger + Ken Burns settle, exactly like ProductSection's row
 *   • Floating circular prev/next arrows either side of the grid, magnetic
 *   • A real page indicator bottom-left: "01 — 05" + an animated progress rail
 *   • Sand backdrop with drifting window-light, swaying leaf shadows, a soft
 *     rock silhouette in the corner and animated film grain, same motifs as
 *     CollectionsSection
 *   • Per-card "quick add" (+) that swaps to a check mark briefly
 *   • Drag / swipe / ← → keys change page; reduced-motion + touch fallbacks
 *
 *  Images
 *   Point each product's `image` at your own file, e.g.
 *   '/images/new-arrivals/linen-maxi-dress.jpg'. Until a file exists there,
 *   it shows a warm tinted gradient placeholder so nothing breaks.
 *
 *  Props (all optional — 25 default Aurelia products are filled in)
 *   eyebrow, titleLine1, titleLine2 ([{ text, accent }]), description
 *   viewAllLabel, viewAllHref, tagline
 *   products: [{ name, price, image, alt, tint: [from, to], href, isNew }]
 *   perPage (default 5)
 *   onQuickAdd(product)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import './styles/Newarrivalssection.css';

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
   DATA — 25 products, 5 pages of 5. Edit copy / images here.
   ═════════════════════════════════════════════════════════════════════════════ */

const IMG = '/images/new-arrivals';
const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const RAW_PRODUCTS = [
  // page 1
  { name: 'Linen Maxi Dress', price: 420, tint: ['#cdbca0', '#372b1e'] },
  { name: 'The Aurelia Bag', price: 680, tint: ['#b8a184', '#2b2015'] },
  { name: 'Cashmere Knit', price: 380, tint: ['#d6c7a9', '#3a2d1d'] },
  { name: 'Strappy Heels', price: 320, tint: ['#c7b491', '#2f2416'] },
  { name: 'Gold Jewellery Set', price: 260, tint: ['#c9a25a', '#2a2013'] },
  // page 2
  { name: 'Silk Wrap Dress', price: 450, tint: ['#c3a98d', '#332619'] },
  { name: 'Woven Tote Bag', price: 310, tint: ['#ad9673', '#251c12'] },
  { name: 'Merino Cardigan', price: 340, tint: ['#d0bfa2', '#362a1b'] },
  { name: 'Suede Ankle Boots', price: 360, tint: ['#a2846a', '#231a11'] },
  { name: 'Pearl Drop Earrings', price: 180, tint: ['#ddd0ba', '#372c1e'] },
  // page 3
  { name: 'Tailored Linen Trousers', price: 260, tint: ['#c8bca6', '#362b1d'] },
  { name: 'Structured Crossbody', price: 290, tint: ['#b09772', '#241a10'] },
  { name: 'Cotton Poplin Shirt', price: 210, tint: ['#e0d5bf', '#3a2e1e'] },
  { name: 'Block Heel Sandals', price: 300, tint: ['#c2a988', '#2c2114'] },
  { name: 'Layered Chain Necklace', price: 220, tint: ['#cba362', '#291f12'] },
  // page 4
  { name: 'Satin Slip Dress', price: 390, tint: ['#c9b6a6', '#332619'] },
  { name: 'Woven Straw Hat', price: 150, tint: ['#d9c48f', '#362913'] },
  { name: 'Alpaca Wool Sweater', price: 360, tint: ['#b7a58a', '#291f14'] },
  { name: 'Leather Loafers', price: 340, tint: ['#8f6d4c', '#1f160e'] },
  { name: 'Statement Hoop Earrings', price: 190, tint: ['#c9a05a', '#271d10'] },
  // page 5
  { name: 'Belted Trench Coat', price: 520, tint: ['#a68f6e', '#241b11'] },
  { name: 'Quilted Mini Bag', price: 270, tint: ['#b39b78', '#251c11'] },
  { name: 'Ribbed Knit Top', price: 180, tint: ['#d8cdb6', '#382c1c'] },
  { name: 'Espadrille Wedges', price: 250, tint: ['#c9b28d', '#2c2114'] },
  { name: 'Beaded Bracelet Set', price: 160, tint: ['#c39f68', '#281f12'] },
];

const DEFAULT_PRODUCTS = RAW_PRODUCTS.map((p) => ({
  ...p,
  image: `${IMG}/${slugify(p.name)}.jpg`,
  alt: p.name,
  href: `/shop/${slugify(p.name)}`,
  isNew: true,
}));

const pad = (n) => String(n).padStart(2, '0');
const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

/* ═════════════════════════════════════════════════════════════════════════════
   ICONS
   ═════════════════════════════════════════════════════════════════════════════ */

const ArrowRight = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12h16M14 6l6 6-6 6" />
  </svg>
);

const ArrowLeft = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 12H4M10 6l-6 6 6 6" />
  </svg>
);

const PlusIcon = () => (
  <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true">
    <path d="M6 1.5v9M1.5 6h9" />
  </svg>
);

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

/* ═════════════════════════════════════════════════════════════════════════════
   HOOKS + SMALL COMPONENTS
   ═════════════════════════════════════════════════════════════════════════════ */

/** Element leans toward the cursor when it gets close. */
function useMagnetic(strength = 0.35, radius = 50) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (window.matchMedia('(pointer: coarse)').matches) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    let active = false;

    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      const reach = Math.max(rect.width, rect.height) / 2 + radius;

      if (Math.hypot(dx, dy) < reach) {
        active = true;
        el.classList.add('is-magnet');
        el.style.transform = `translate3d(${(dx * strength).toFixed(1)}px, ${(dy * strength).toFixed(1)}px, 0)`;
      } else if (active) {
        active = false;
        el.classList.remove('is-magnet');
        el.style.transform = '';
      }
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [strength, radius]);

  return ref;
}

function Magnetic({ children, strength = 0.35, radius = 50, className = '' }) {
  const ref = useMagnetic(strength, radius);
  return (
    <span ref={ref} className={`aur-magnet ${className}`}>
      {children}
    </span>
  );
}

/** Letters fade + rise one after another. */
function SplitLetters({ text, step = 34, start = 0 }) {
  return (
    <span aria-label={text}>
      {text.split('').map((ch, i) => (
        <span key={`${ch}-${i}`} className="aur-letter" aria-hidden="true" style={{ animationDelay: `${start + i * step}ms` }}>
          {ch === ' ' ? '\u00A0' : ch}
        </span>
      ))}
    </span>
  );
}

/** Photo with a graceful gradient fallback when the file doesn't exist yet. */
function MediaImage({ src, alt, tint }) {
  const [failed, setFailed] = useState(!src);
  const ref = useRef(null);

  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) return <span className="aur-na__fallback" aria-hidden="true" style={{ '--t1': tint?.[0], '--t2': tint?.[1] }} />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={ref} src={src} alt={alt || ''} loading="lazy" draggable={false} onError={() => setFailed(true)} />
  );
}

/** Blurred foliage silhouette that sways, like leaves in front of a window. */
function Leaves({ className }) {
  const leaves = [
    [372, 40, -30], [340, 62, 40], [318, 84, -50], [292, 100, 30], [262, 130, -60],
    [238, 150, 20], [214, 182, -40], [188, 204, 50], [160, 236, -20], [132, 262, 60],
  ];
  return (
    <svg className={className} viewBox="0 0 400 340" aria-hidden="true">
      <path d="M400 10C330 44 260 96 190 190S90 300 60 340" fill="none" stroke="currentColor" strokeWidth="3" />
      {leaves.map(([x, y, r], i) => (
        <ellipse key={i} cx="0" cy="-20" rx="11" ry="26" fill="currentColor" transform={`translate(${x} ${y}) rotate(${r})`} />
      ))}
    </svg>
  );
}

/** Soft ring that follows the mouse; grows over links and shows data-cursor labels. */
function SectionCursor({ rootRef, enabled }) {
  const ringRef = useRef(null);
  const dotRef = useRef(null);
  const [label, setLabel] = useState('');
  const [grow, setGrow] = useState(false);
  const [visible, setVisible] = useState(false);
  const [fine, setFine] = useState(false);

  useEffect(() => {
    setFine(window.matchMedia('(pointer: fine)').matches);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !fine || !enabled) return undefined;

    let tx = 0;
    let ty = 0;
    let rx = 0;
    let ry = 0;
    let raf = 0;

    const onMove = (e) => {
      tx = e.clientX;
      ty = e.clientY;
      if (dotRef.current) dotRef.current.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      const target = e.target.closest ? e.target.closest('a, button, [data-cursor]') : null;
      setGrow(Boolean(target));
      setLabel(target ? target.getAttribute('data-cursor') || '' : '');
    };
    const onEnter = () => setVisible(true);
    const onLeave = () => setVisible(false);

    const loop = () => {
      rx += (tx - rx) * 0.16;
      ry += (ty - ry) * 0.16;
      if (ringRef.current) ringRef.current.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      raf = requestAnimationFrame(loop);
    };

    root.addEventListener('mousemove', onMove, { passive: true });
    root.addEventListener('mouseenter', onEnter);
    root.addEventListener('mouseleave', onLeave);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      root.removeEventListener('mousemove', onMove);
      root.removeEventListener('mouseenter', onEnter);
      root.removeEventListener('mouseleave', onLeave);
    };
  }, [rootRef, fine, enabled]);

  if (!fine) return null;

  return (
    <>
      <div ref={ringRef} className={`aur-cursor ${visible ? 'is-visible' : ''} ${grow ? 'is-grow' : ''} ${label ? 'has-label' : ''}`} aria-hidden="true">
        <span className="aur-cursor__label">{label}</span>
      </div>
      <div ref={dotRef} className={`aur-cursor-dot ${visible ? 'is-visible' : ''} ${grow ? 'is-grow' : ''}`} aria-hidden="true" />
    </>
  );
}

/** One product card: image, NEW badge, name / price, quick-add. */
function ProductCard({ product, index, onQuickAdd }) {
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return undefined;
    const t = setTimeout(() => setAdded(false), 2000);
    return () => clearTimeout(t);
  }, [added]);

  const handleAdd = () => {
    setAdded(true);
    if (typeof onQuickAdd === 'function') onQuickAdd(product);
  };

  return (
    <article className="aur-na__card" style={{ '--i': index }}>
      <Link href={product.href} className="aur-na__frame" aria-label={product.name} data-cursor="View">
        {product.isNew && <span className="aur-na__badge">New</span>}
        <span className="aur-na__par">
          <span className="aur-na__kb">
            <MediaImage src={product.image} alt={product.alt} tint={product.tint} />
          </span>
        </span>
      </Link>

      <div className="aur-na__meta">
        <Link href={product.href} className="aur-na__name">
          {product.name}
        </Link>
        <button
          type="button"
          className={`aur-na__add ${added ? 'is-added' : ''}`}
          aria-label={added ? `${product.name} added` : `Quick add ${product.name}`}
          data-cursor="Add"
          onClick={handleAdd}
        >
          {added ? <CheckIcon /> : <PlusIcon />}
        </button>
      </div>
      <p className="aur-na__price">${product.price}</p>
    </article>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   NEW ARRIVALS SECTION
   ═════════════════════════════════════════════════════════════════════════════ */

export default function NewArrivalsSection({
  eyebrow = 'New Arrivals',
  titleLine1 = 'Fresh Pieces for',
  titleLine2 = [
    { text: 'a ', accent: false },
    { text: 'Brighter', accent: true },
    { text: ' Season.', accent: false },
  ],
  description = 'Discover our latest arrivals — thoughtfully curated pieces that bring timeless elegance to your everyday.',
  viewAllLabel = 'View All New Arrivals',
  viewAllHref = '/new-arrivals',
  tagline = ['Timeless pieces.', 'For modern life.'],
  products = DEFAULT_PRODUCTS,
  perPage = 5,
  onQuickAdd,
}) {
  const rootRef = useRef(null);
  const dragStart = useRef(null);
  const justDragged = useRef(false);

  const [state, setState] = useState({ page: 0, dir: 1 });
  const [revealed, setRevealed] = useState(false);
  const [onScreen, setOnScreen] = useState(false);

  const { page, dir } = state;

  const prevMagnet = useMagnetic(0.32, 40);
  const nextMagnet = useMagnetic(0.32, 40);

  const groups = useMemo(() => chunk(products, perPage), [products, perPage]);
  const total = groups.length;
  const current = groups[page] || [];

  const goTo = useCallback(
    (to) => {
      setState((s) => {
        const clamped = (to + total) % total;
        if (clamped === s.page) return s;
        return { page: clamped, dir: clamped > s.page ? 1 : -1 };
      });
    },
    [total]
  );

  const next = useCallback(() => goTo(page + 1), [goTo, page]);
  const previous = useCallback(() => goTo(page - 1), [goTo, page]);

  /* ── in view: reveal once + pause work when off screen ───────────────── */
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setRevealed(true);
      setOnScreen(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        setOnScreen(entry.isIntersecting);
        if (entry.isIntersecting) setRevealed(true);
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* ── keyboard ────────────────────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (!onScreen) return;
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') previous();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, previous, onScreen]);

  /* ── pointer: drag / swipe to change page ─────────────────────────────── */
  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (!e.target.closest || !e.target.closest('.aur-na__row')) return;
    dragStart.current = e.clientX;
  };

  const onPointerUp = (e) => {
    if (dragStart.current == null) return;
    const dx = e.clientX - dragStart.current;
    dragStart.current = null;
    if (Math.abs(dx) > 70) {
      justDragged.current = true;
      setTimeout(() => {
        justDragged.current = false;
      }, 60);
      if (dx < 0) next();
      else previous();
    }
  };

  const onClickCapture = (e) => {
    if (justDragged.current) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <section
      ref={rootRef}
      className={`${serif.variable} ${sans.variable} aur-na ${revealed ? 'is-in' : ''} ${onScreen ? '' : 'is-offscreen'}`}
      aria-label="New arrivals"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        dragStart.current = null;
      }}
      onClickCapture={onClickCapture}
    >
      <div className="aur-na__rock" aria-hidden="true" />
      <Leaves className="aur-na__leaves" />
      <Leaves className="aur-na__leaves aur-na__leaves--b" />

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="aur-na__head">
        <div className="aur-na__heading">
          <p className="aur-na__eyebrow">
            <SplitLetters text={eyebrow} start={100} />
          </p>
          <h2 className="aur-na__title">
            <span className="aur-line">
              <span className="aur-line__in" style={{ animationDelay: '200ms' }}>
                {titleLine1}
              </span>
            </span>
            <span className="aur-line">
              <span className="aur-line__in" style={{ animationDelay: '340ms' }}>
                {titleLine2.map((part, i) => (
                  <span key={i} className={part.accent ? 'aur-na__accent' : undefined}>
                    {part.text}
                  </span>
                ))}
              </span>
            </span>
          </h2>
        </div>

        <div className="aur-na__desc">
          <p>{description}</p>
        </div>

        <Link href={viewAllHref} className="aur-na__all" data-cursor="Shop">
          <span>{viewAllLabel}</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* ── Carousel ─────────────────────────────────────────────────── */}
      <div className="aur-na__carousel">
        {total > 1 && (
          <Magnetic strength={0.4} radius={44} className="aur-na__arrow aur-na__arrow--prev">
            <button type="button" onClick={previous} aria-label="Previous products" data-cursor="Prev">
              <ArrowLeft />
            </button>
          </Magnetic>
        )}

        <div className={`aur-na__row ${dir === -1 ? 'is-prev' : 'is-next'}`} key={page}>
          {current.map((p, i) => (
            <ProductCard key={p.href || `${p.name}-${i}`} product={p} index={i} onQuickAdd={onQuickAdd} />
          ))}
        </div>

        {total > 1 && (
          <Magnetic strength={0.4} radius={44} className="aur-na__arrow aur-na__arrow--next">
            <button type="button" onClick={next} aria-label="Next products" data-cursor="Next">
              <ArrowRight size={16} />
            </button>
          </Magnetic>
        )}
      </div>

      {/* ── Footer: pagination + tagline ─────────────────────────────── */}
      <div className="aur-na__foot">
        <div className="aur-na__pager" aria-live="polite">
          <span>{pad(page + 1)}</span>
          <i>—</i>
          <span>{pad(total)}</span>
          <div className="aur-na__track">
            <div className="aur-na__track-fill" style={{ transform: `scaleX(${(page + 1) / total})` }} />
          </div>
        </div>

        <div className="aur-na__tagline">
          <i />
          <p>
            {tagline.map((l, i) => (
              <span key={i}>{l}</span>
            ))}
          </p>
        </div>
      </div>

      <SectionCursor rootRef={rootRef} enabled={revealed} />

      {/* Rules whose class names are defined differently in other sections stay here: see src/components/styles/README.md */}
      <style jsx global>{`
        .aur-line {
          display: block;
          overflow: hidden;
          padding: 0.04em 0.06em 0.14em 0;
          margin-bottom: -0.1em;
        }

        /* ═══════════════════════════════════════════════════════════════════
           ARROWS
           ═══════════════════════════════════════════════════════════════════ */
        .aur-magnet {
          display: inline-block;
          transition: transform 0.7s var(--ease-out);
          will-change: transform;
        }
        .aur-magnet.is-magnet {
          transition-duration: 0.22s;
        }

        /* ═══════════════════════════════════════════════════════════════════
           CURSOR
           ═══════════════════════════════════════════════════════════════════ */
        .aur-cursor,
        .aur-cursor-dot {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 200;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.35s ease;
        }
        .aur-cursor::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 42px;
          height: 42px;
          margin: -21px 0 0 -21px;
          border-radius: 50%;
          border: 1px solid rgba(36, 28, 20, 0.5);
          background: rgba(36, 28, 20, 0);
          transition: transform 0.5s var(--ease-out), background 0.4s ease, border-color 0.4s ease;
        }
        .aur-cursor.is-grow::before {
          transform: scale(1.5);
          background: rgba(36, 28, 20, 0.06);
          border-color: rgba(36, 28, 20, 0.8);
        }
        .aur-cursor.has-label::before {
          transform: scale(1.9);
          background: rgba(24, 18, 13, 0.72);
          border-color: transparent;
          -webkit-backdrop-filter: blur(6px);
          backdrop-filter: blur(6px);
        }
        .aur-cursor__label {
          position: absolute;
          top: 0;
          left: 0;
          transform: translate(-50%, -50%);
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: 0.64rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #f6efe8;
          white-space: nowrap;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .aur-cursor-dot::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 6px;
          height: 6px;
          margin: -3px 0 0 -3px;
          border-radius: 50%;
          background: var(--ink);
          transition: transform 0.3s ease;
        }

        @media (pointer: coarse) {
          .aur-cursor,
          .aur-cursor-dot {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}