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

      <style jsx global>{`
        /* ═══════════════════════════════════════════════════════════════════
           ROOT
           ═══════════════════════════════════════════════════════════════════ */
        .aur-na {
          --sand-1: #d8cab0;
          --sand-2: #c9b899;
          --sand-3: #b8a37f;
          --ink: #241c14;
          --ink-soft: rgba(36, 28, 20, 0.72);
          --line: rgba(36, 28, 20, 0.3);
          --copper: #a56a41;
          --gutter: clamp(20px, 4.6vw, 84px);
          --ease-out: cubic-bezier(0.22, 0.8, 0.2, 1);
          --ease-expo: cubic-bezier(0.19, 1, 0.22, 1);
          --ease-wipe: cubic-bezier(0.76, 0, 0.18, 1);
          position: relative;
          overflow: hidden;
          isolation: isolate;
          color: var(--ink);
          font-family: var(--aur-sans), system-ui, sans-serif;
          padding: clamp(48px, 5vw, 76px) var(--gutter) clamp(40px, 4.6vw, 64px);
          background:
            radial-gradient(ellipse 60% 50% at 15% 0%, rgba(255, 244, 222, 0.45), transparent 68%),
            radial-gradient(ellipse 55% 45% at 100% 100%, rgba(120, 95, 62, 0.28), transparent 65%),
            linear-gradient(165deg, var(--sand-1) 0%, var(--sand-2) 55%, var(--sand-3) 100%);
        }
        .aur-na a,
        .aur-na button {
          -webkit-tap-highlight-color: transparent;
        }

        /* film grain */
        .aur-na::before {
          content: '';
          position: absolute;
          inset: -10%;
          z-index: -1;
          pointer-events: none;
          opacity: 0.14;
          mix-blend-mode: multiply;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
          animation: aurNaGrain 1.2s steps(6) infinite;
        }
        @keyframes aurNaGrain {
          0% {
            transform: translate3d(0, 0, 0);
          }
          20% {
            transform: translate3d(-3%, 2%, 0);
          }
          40% {
            transform: translate3d(2%, -3%, 0);
          }
          60% {
            transform: translate3d(-2%, -1%, 0);
          }
          80% {
            transform: translate3d(3%, 3%, 0);
          }
          100% {
            transform: translate3d(0, 0, 0);
          }
        }

        /* rock silhouette, bottom-left */
        .aur-na__rock {
          position: absolute;
          z-index: -1;
          pointer-events: none;
          left: -60px;
          bottom: -70px;
          width: min(34vw, 420px);
          height: 220px;
          background: radial-gradient(120% 140% at 30% 100%, rgba(18, 13, 8, 0.55), transparent 70%);
          filter: blur(1px);
        }

        /* leaf shadows */
        .aur-na__leaves {
          position: absolute;
          z-index: -1;
          pointer-events: none;
          top: -30px;
          right: -20px;
          width: min(40vw, 560px);
          color: rgba(20, 14, 8, 0.28);
          filter: blur(5px);
          transform-origin: 100% 0;
          animation: aurNaSway 9s ease-in-out infinite alternate;
        }
        .aur-na__leaves--b {
          top: auto;
          bottom: -60px;
          right: -80px;
          width: min(30vw, 400px);
          color: rgba(20, 14, 8, 0.2);
          filter: blur(8px);
          transform: scaleY(-1);
          animation-duration: 12s;
          animation-direction: alternate-reverse;
        }
        @keyframes aurNaSway {
          from {
            transform: rotate(-1.8deg) translate3d(0, 0, 0);
          }
          to {
            transform: rotate(2.2deg) translate3d(-8px, 6px, 0);
          }
        }
        .aur-na__leaves--b {
          animation-name: aurNaSwayB;
        }
        @keyframes aurNaSwayB {
          from {
            transform: scaleY(-1) rotate(-1.8deg) translate3d(0, 0, 0);
          }
          to {
            transform: scaleY(-1) rotate(2.2deg) translate3d(-8px, -6px, 0);
          }
        }

        @keyframes aurNaFade {
          from {
            opacity: 0;
            transform: translate3d(0, 16px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        @keyframes aurNaGrowX {
          to {
            transform: scaleX(1);
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           HEADER
           ═══════════════════════════════════════════════════════════════════ */
        .aur-na__head {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: end;
          column-gap: clamp(28px, 3.2vw, 48px);
          row-gap: 20px;
          margin-bottom: clamp(30px, 3.4vw, 46px);
        }
        .aur-na__eyebrow {
          margin: 0 0 clamp(12px, 1.4vw, 18px);
          font-size: 0.66rem;
          font-weight: 500;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: var(--ink);
        }
        .aur-letter {
          display: inline-block;
          opacity: 0;
        }
        .aur-na.is-in .aur-letter {
          animation: aurNaLetter 0.9s var(--ease-expo) both;
        }
        @keyframes aurNaLetter {
          from {
            opacity: 0;
            transform: translate3d(0, 60%, 0);
            filter: blur(4px);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
            filter: blur(0);
          }
        }

        .aur-na__title {
          display: flex;
          flex-direction: column;
          margin: 0;
          font-family: var(--aur-serif), Georgia, serif;
          font-weight: 400;
          font-size: clamp(2.2rem, 3.6vw, 3.4rem);
          line-height: 1.05;
          letter-spacing: -0.012em;
        }
        .aur-line {
          display: block;
          overflow: hidden;
          padding: 0.04em 0.06em 0.14em 0;
          margin-bottom: -0.1em;
        }
        .aur-line__in {
          display: inline-block;
          transform: translate3d(0, 115%, 0) rotate(3deg);
          transform-origin: left bottom;
        }
        .aur-na.is-in .aur-line__in {
          animation: aurNaRise 1.3s var(--ease-expo) both;
        }
        .aur-na__accent {
          font-style: italic;
          color: var(--copper);
        }
        @keyframes aurNaRise {
          from {
            transform: translate3d(0, 115%, 0) rotate(3deg);
          }
          to {
            transform: translate3d(0, 0, 0) rotate(0);
          }
        }

        .aur-na__desc {
          position: relative;
          align-self: center;
          margin-top: clamp(18px, 2vw, 26px);
          padding-left: clamp(18px, 2vw, 26px);
          opacity: 0;
        }
        .aur-na__desc::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 1px;
          background: var(--line);
          transform: scaleY(0);
          transform-origin: top;
        }
        .aur-na.is-in .aur-na__desc {
          animation: aurNaFade 1.2s ease 0.65s both;
        }
        .aur-na.is-in .aur-na__desc::before {
          animation: aurNaGrowY 1.2s var(--ease-out) 0.55s both;
        }
        @keyframes aurNaGrowY {
          to {
            transform: scaleY(1);
          }
        }
        .aur-na__desc p {
          margin: 0;
          max-width: 26ch;
          font-size: clamp(0.86rem, 0.95vw, 0.94rem);
          line-height: 1.55;
          color: var(--ink-soft);
        }

        .aur-na__all {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          font-size: 0.78rem;
          letter-spacing: 0.02em;
          color: var(--ink);
          text-decoration: none;
          white-space: nowrap;
          opacity: 0;
        }
        .aur-na.is-in .aur-na__all {
          animation: aurNaFade 1.2s ease 0.85s both;
        }
        .aur-na__all svg {
          transition: transform 0.45s var(--ease-out);
        }
        .aur-na__all:hover svg {
          transform: translateX(5px);
        }

        /* ═══════════════════════════════════════════════════════════════════
           CAROUSEL
           ═══════════════════════════════════════════════════════════════════ */
        .aur-na__carousel {
          position: relative;
          z-index: 2;
        }
        .aur-na__row {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: clamp(12px, 1.4vw, 22px);
          touch-action: pan-y;
        }

        .aur-na__card {
          display: flex;
          flex-direction: column;
        }

        .aur-na__frame {
          position: relative;
          display: block;
          aspect-ratio: 3 / 4;
          overflow: hidden;
          background: #23190f;
          clip-path: inset(0 0 0 100%);
        }
        .aur-na__row.is-next .aur-na__frame {
          clip-path: inset(0 0 0 100%);
        }
        .aur-na__row.is-prev .aur-na__frame {
          clip-path: inset(0 100% 0 0);
        }
        .aur-na.is-in .aur-na__frame {
          animation: aurNaWipeNext 1.4s var(--ease-wipe) calc(var(--i) * 110ms + 120ms) both;
        }
        .aur-na.is-in .aur-na__row.is-prev .aur-na__frame {
          animation-name: aurNaWipePrev;
        }
        @keyframes aurNaWipeNext {
          from {
            clip-path: inset(0 0 0 100%);
          }
          to {
            clip-path: inset(0 0 0 0);
          }
        }
        @keyframes aurNaWipePrev {
          from {
            clip-path: inset(0 100% 0 0);
          }
          to {
            clip-path: inset(0 0 0 0);
          }
        }

        .aur-na__badge {
          position: absolute;
          z-index: 2;
          top: 12px;
          left: 12px;
          padding: 4px 10px;
          font-size: 0.6rem;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #f6efe8;
          background: rgba(20, 15, 10, 0.55);
          -webkit-backdrop-filter: blur(3px);
          backdrop-filter: blur(3px);
        }

        .aur-na__par {
          position: absolute;
          inset: -6%;
        }
        .aur-na__kb {
          position: absolute;
          inset: 0;
          transform: scale(1.18);
        }
        .aur-na.is-in .aur-na__kb {
          animation: aurNaKB 2.2s var(--ease-out) calc(var(--i) * 110ms + 160ms) both;
        }
        @keyframes aurNaKB {
          from {
            transform: scale(1.18) translate3d(1.4%, 0.8%, 0);
          }
          to {
            transform: scale(1) translate3d(0, 0, 0);
          }
        }
        .aur-na__kb img,
        .aur-na__fallback {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scale(1);
          transition: transform 1.1s var(--ease-out);
          -webkit-user-drag: none;
        }
        .aur-na__fallback {
          background:
            linear-gradient(120deg, transparent 32%, rgba(255, 226, 180, 0.13) 46%, transparent 60%),
            radial-gradient(ellipse 80% 55% at 30% 22%, var(--t1, #b89b76), transparent 72%),
            linear-gradient(165deg, var(--t2, #241c15), #14100c);
        }
        .aur-na__frame:hover .aur-na__kb img,
        .aur-na__frame:hover .aur-na__fallback {
          transform: scale(1.06);
        }

        .aur-na__meta {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
          margin-top: 14px;
          opacity: 0;
        }
        .aur-na.is-in .aur-na__meta {
          animation: aurNaFade 1s ease calc(var(--i) * 110ms + 620ms) both;
        }
        .aur-na__name {
          font-family: var(--aur-serif), Georgia, serif;
          font-size: 1.02rem;
          font-weight: 400;
          line-height: 1.3;
          color: var(--ink);
          text-decoration: none;
          background: linear-gradient(currentColor, currentColor) 0 100% / 0 1px no-repeat;
          transition: background-size 0.5s var(--ease-out);
        }
        .aur-na__card:hover .aur-na__name {
          background-size: 100% 1px;
        }
        .aur-na__add {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          width: 26px;
          height: 26px;
          margin-top: 2px;
          padding: 0;
          border-radius: 50%;
          border: 1px solid var(--line);
          background: transparent;
          color: var(--ink);
          cursor: pointer;
          transition: background 0.3s ease, color 0.3s ease, border-color 0.3s ease, transform 0.4s var(--ease-out);
        }
        .aur-na__add:hover {
          background: var(--ink);
          color: var(--sand-1);
          border-color: var(--ink);
          transform: scale(1.08);
        }
        .aur-na__add.is-added {
          background: #cfe3d2;
          border-color: #cfe3d2;
          color: #24361f;
        }

        .aur-na__price {
          margin: 4px 0 0;
          font-size: 0.84rem;
          color: var(--ink-soft);
          opacity: 0;
        }
        .aur-na.is-in .aur-na__price {
          animation: aurNaFade 1s ease calc(var(--i) * 110ms + 700ms) both;
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
        .aur-na__arrow {
          position: absolute;
          top: 38%;
          z-index: 3;
        }
        .aur-na__arrow--prev {
          left: clamp(-8px, -2.4vw, -18px);
        }
        .aur-na__arrow--next {
          right: clamp(-8px, -2.4vw, -18px);
        }
        .aur-na__arrow button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          padding: 0;
          border-radius: 50%;
          border: 1px solid rgba(36, 28, 20, 0.35);
          background: rgba(246, 239, 232, 0.65);
          -webkit-backdrop-filter: blur(6px);
          backdrop-filter: blur(6px);
          color: var(--ink);
          cursor: pointer;
          box-shadow: 0 10px 24px -12px rgba(36, 28, 20, 0.35);
          transition: background 0.35s ease, color 0.35s ease, transform 0.45s var(--ease-out), border-color 0.35s ease;
        }
        .aur-na__arrow button:hover {
          background: var(--ink);
          color: var(--sand-1);
          border-color: var(--ink);
          transform: scale(1.08);
        }
        .aur-na__arrow button:active {
          transform: scale(0.94);
        }

        /* ═══════════════════════════════════════════════════════════════════
           FOOTER: pagination + tagline
           ═══════════════════════════════════════════════════════════════════ */
        .aur-na__foot {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          margin-top: clamp(30px, 3.4vw, 48px);
        }

        .aur-na__pager {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.76rem;
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.04em;
          color: var(--ink);
          opacity: 0;
        }
        .aur-na.is-in .aur-na__pager {
          animation: aurNaFade 1.2s ease 1.1s both;
        }
        .aur-na__pager i {
          font-style: normal;
          opacity: 0.5;
        }
        .aur-na__track {
          position: relative;
          width: clamp(90px, 10vw, 140px);
          height: 1px;
          margin-left: 6px;
          background: rgba(36, 28, 20, 0.22);
          overflow: hidden;
        }
        .aur-na__track-fill {
          position: absolute;
          inset: 0;
          background: var(--ink);
          transform-origin: left center;
          transform: scaleX(0);
          transition: transform 0.7s var(--ease-out);
        }

        .aur-na__tagline {
          display: flex;
          align-items: center;
          gap: 14px;
          opacity: 0;
        }
        .aur-na.is-in .aur-na__tagline {
          animation: aurNaFade 1.2s ease 1.2s both;
        }
        .aur-na__tagline i {
          display: block;
          width: 30px;
          height: 1px;
          background: var(--line);
        }
        .aur-na__tagline p {
          margin: 0;
          font-family: var(--aur-serif), Georgia, serif;
          font-style: italic;
          font-size: 0.96rem;
          line-height: 1.4;
          text-align: right;
          color: var(--ink-soft);
        }
        .aur-na__tagline p span {
          display: block;
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
        .aur-cursor.is-visible,
        .aur-cursor-dot.is-visible {
          opacity: 1;
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
        .aur-cursor.has-label .aur-cursor__label {
          opacity: 1;
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
        .aur-cursor-dot.is-grow::before {
          transform: scale(0);
        }

        /* ═══════════════════════════════════════════════════════════════════
           FOCUS + PAUSE
           ═══════════════════════════════════════════════════════════════════ */
        .aur-na a:focus-visible,
        .aur-na button:focus-visible {
          outline: 2px solid var(--copper);
          outline-offset: 4px;
        }
        .aur-na.is-offscreen::before,
        .aur-na.is-offscreen .aur-na__leaves {
          animation-play-state: paused;
        }

        /* ═══════════════════════════════════════════════════════════════════
           RESPONSIVE
           ═══════════════════════════════════════════════════════════════════ */
        @media (max-width: 1180px) {
          .aur-na__row {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          .aur-na__card:nth-child(n + 4) {
            display: none;
          }
        }

        @media (max-width: 980px) {
          .aur-na__head {
            grid-template-columns: 1fr;
            align-items: start;
          }
          .aur-na__desc {
            margin-top: 0;
            padding-left: 0;
          }
          .aur-na__desc::before {
            display: none;
          }
          .aur-na__foot {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          .aur-na__tagline p {
            text-align: left;
          }
        }

        @media (max-width: 720px) {
          .aur-na__row {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .aur-na__card:nth-child(n + 3) {
            display: none;
          }
          .aur-na__arrow {
            top: 34%;
          }
          .aur-na__arrow--prev {
            left: -4px;
          }
          .aur-na__arrow--next {
            right: -4px;
          }
        }

        @media (max-width: 460px) {
          .aur-na__row {
            grid-template-columns: 1fr;
          }
          .aur-na__card:nth-child(n + 2) {
            display: none;
          }
          .aur-na__arrow button {
            width: 38px;
            height: 38px;
          }
        }

        @media (pointer: coarse) {
          .aur-cursor,
          .aur-cursor-dot {
            display: none;
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           REDUCED MOTION
           ═══════════════════════════════════════════════════════════════════ */
        @media (prefers-reduced-motion: reduce) {
          .aur-na *,
          .aur-na *::before,
          .aur-na *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </section>
  );
}