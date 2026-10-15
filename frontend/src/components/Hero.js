'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AURELIA · HERO
 * ─────────────────────────────────────────────────────────────────────────────
 *  Next.js (App Router) · plain JavaScript · no extra packages
 *
 *  What's inside
 *   • Cinematic intro curtain (plays once per browser session)
 *   • 3 slides with a wipe transition, Ken Burns zoom and mouse parallax
 *   • Headline line-mask reveal + per-letter eyebrow + rolling slide counter
 *   • Canvas golden-dust particles that get pushed away by the cursor
 *   • "Shop the look" hotspots with animated quick-view cards
 *   • Magnetic buttons, custom cursor ring, drag / swipe / keyboard navigation
 *   • Scroll-linked fade + zoom, autoplay that pauses on hover / hidden tab
 *   • Reduced-motion and touch-device fallbacks
 *
 *  Images
 *   The slides use free Unsplash placeholders for now. Replace the `image`
 *   values in SLIDES with your own files (e.g. '/images/hero/hero-1.jpg').
 *   Remote images are loaded with `unoptimized`, so no next.config.js change
 *   is needed. Local images go through the normal Next image optimizer.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import { useCart } from '@/context/CartContext';
import { API_URL } from '@/lib/imageUrl';
import { pkr } from '@/lib/policy';
import './styles/Hero.css';

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
   DATA
   ═════════════════════════════════════════════════════════════════════════════ */

/** Free Unsplash placeholder helper. Swap for your own images later. */
const unsplash = (id, width = 2400) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=80`;

const isRemote = (src) => /^https?:\/\//i.test(src);

/**
 * Hotspot coordinates (x / y) are percentages of the hero box.
 * Nudge them after you swap in your own photos.
 *
 * A hotspot's `name` must be EXACTLY the name of a product in your store (admin → Products).
 * Its price, link, image and stock are read from that product, so they can never be out of date.
 * If no product has that name, the hotspot is simply not shown.
 */
const SLIDES = [
  {
    id: 'spring-summer',
    eyebrow: 'New season',
    lineOne: 'Timeless Style,',
    lineTwo: 'Modern You.',
    text: ['Discover curated fashion, inspired by art,', 'designed for your everyday.'],
    image: unsplash('photo-1700317440744-a126fc87b900'),
    alt: 'Woman in a light dress sitting on a sunlit stone wall',
    collection: ['Spring', 'Summer', 'Collection'],
    href: '/collections/spring-summer',
    position: '62% 40%',
    accent: ['#f3ddd2', '#dcae94', '#b9724b'],
    hotspots: [
      { id: 'ss-1', x: 66, y: 46, name: 'Relaxed Linen Shirt', tag: 'New' },
      { id: 'ss-2', x: 58, y: 72, name: 'Tuscan Leather Satchel', tag: 'Bestseller' },
    ],
  },
  {
    id: 'resort',
    eyebrow: 'The resort edit',
    lineOne: 'Made to Last,',
    lineTwo: 'Worn to Love.',
    text: ['Quiet tailoring and natural fabrics,', 'chosen to outlive the season.'],
    image: unsplash('photo-1764298493197-a1c1cce57800'),
    alt: 'Woman in a straw hat and linen dress standing against a wall',
    collection: ['Resort', 'Edit', '2026'],
    href: '/collections/resort',
    position: '60% 35%',
    accent: ['#f6e6c8', '#e0b77a', '#b98336'],
    hotspots: [
      { id: 'rs-1', x: 63, y: 30, name: 'Woven Straw Hat', tag: 'Limited' },
      { id: 'rs-2', x: 62, y: 62, name: 'Linen Column Dress', tag: 'New' },
    ],
  },
  {
    id: 'linen-season',
    eyebrow: 'Linen season',
    lineOne: 'Light on You,',
    lineTwo: 'Easy Always.',
    text: ['Breathable linen and soft silk', 'for long days in the sun.'],
    image: unsplash('photo-1747396206869-75ea57b325ce'),
    alt: 'Woman posing in a simple linen dress',
    collection: ['Linen', 'Season', 'Edit'],
    href: '/collections/linen',
    position: '58% 38%',
    accent: ['#e8ddd6', '#c4a898', '#8f6a58'],
    hotspots: [
      { id: 'ln-1', x: 62, y: 52, name: 'Everyday Linen Dress', tag: 'Essential' },
    ],
  },
];

/** Milliseconds each slide stays on screen (must match .aur-counter__bar i). */
const SLIDE_DURATION = 7000;
/** Minimum time the intro curtain is shown on a fresh session. */
const INTRO_MIN_MS = 2100;
/** Hard cap so a slow image never blocks the intro. */
const INTRO_MAX_MS = 4800;

const pad = (n) => String(n).padStart(2, '0');

/* ═════════════════════════════════════════════════════════════════════════════
   ICONS
   ═════════════════════════════════════════════════════════════════════════════ */

const ArrowRight = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12h16M14 6l6 6-6 6" />
  </svg>
);

const ArrowLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 12H4M10 6l-6 6 6 6" />
  </svg>
);

const HangerIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 8V6.5a2 2 0 1 1 2 2" />
    <path d="M12 8 3 15.5a1 1 0 0 0 .6 1.8h16.8a1 1 0 0 0 .6-1.8L12 8Z" />
  </svg>
);

const PlusIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden="true">
    <path d="M6 1.5v9M1.5 6h9" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

/* ═════════════════════════════════════════════════════════════════════════════
   HOOKS
   ═════════════════════════════════════════════════════════════════════════════ */

/**
 * Magnetic hover: the element leans toward the cursor when it gets close.
 * Attach the returned ref to a wrapper (not to the element that has its own
 * hover transform).
 */
function useMagnetic(strength = 0.32, radius = 80) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (window.matchMedia('(pointer: coarse)').matches) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    let active = false;

    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
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

/* ═════════════════════════════════════════════════════════════════════════════
   SMALL COMPONENTS
   ═════════════════════════════════════════════════════════════════════════════ */

/** Splits text into letters so each one can fade in with a stagger. */
function SplitLetters({ text, step = 34, start = 0 }) {
  return (
    <span aria-label={text}>
      {text.split('').map((ch, i) => (
        <span
          key={`${ch}-${i}`}
          className="aur-letter"
          aria-hidden="true"
          style={{ animationDelay: `${start + i * step}ms` }}
        >
          {ch === ' ' ? '\u00A0' : ch}
        </span>
      ))}
    </span>
  );
}

/** Vertical number roller for the 01 / 03 counter. */
function Roller({ value, total }) {
  return (
    <span className="aur-roll" aria-hidden="true">
      <span className="aur-roll__zero">0</span>
      <span className="aur-roll__window">
        <span className="aur-roll__col" style={{ transform: `translateY(${-value * 100}%)` }}>
          {Array.from({ length: total }, (_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </span>
      </span>
    </span>
  );
}

/**
 * Golden dust drifting through the sunlight. Particles are nudged away from
 * the cursor. The loop pauses when the hero is off screen or hidden.
 */
function DustCanvas({ running }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !running) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: -9999, y: -9999 };
    let width = 0;
    let height = 0;
    let particles = [];
    let raf = 0;

    const rand = (a, b) => a + Math.random() * (b - a);

    const spawn = (initial) => ({
      x: rand(width * 0.3, width),
      y: initial ? rand(0, height) : height + rand(0, 60),
      r: rand(0.6, 2.6),
      vx: rand(-0.1, 0.28),
      vy: rand(-0.5, -0.08),
      alpha: rand(0.25, 0.95),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.008, 0.028),
      halo: rand(3, 7),
    });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = width < 820 ? 26 : 78;
      particles = Array.from({ length: count }, () => spawn(true));
    };

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    const tick = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];

        // push away from cursor
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 150 * 150) {
          const d = Math.sqrt(d2) || 1;
          const force = (150 - d) / 150;
          p.x += (dx / d) * force * 2.6;
          p.y += (dy / d) * force * 2.6;
        }

        p.x += p.vx + Math.sin(p.phase) * 0.12;
        p.y += p.vy;
        p.phase += p.speed;

        if (p.y < -20 || p.x > width + 20 || p.x < -20) {
          particles[i] = spawn(false);
          continue;
        }

        const twinkle = 0.55 + 0.45 * Math.sin(p.phase * 2.2);
        const a = p.alpha * twinkle;

        // soft halo
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 210, 150, ${(a * 0.16).toFixed(3)})`;
        ctx.arc(p.x, p.y, p.r * p.halo, 0, Math.PI * 2);
        ctx.fill();

        // bright core
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 232, 196, ${a.toFixed(3)})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('blur', onLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('blur', onLeave);
    };
  }, [running]);

  return <canvas ref={canvasRef} className="aur-dust" aria-hidden="true" />;
}

/**
 * Follows the mouse with a soft ring. It grows over anything clickable and can
 * show a label from a data-cursor attribute. Hidden on touch devices.
 */
function HeroCursor({ rootRef, enabled }) {
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
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      }
      const target = e.target.closest ? e.target.closest('a, button, [data-cursor]') : null;
      setGrow(Boolean(target));
      setLabel(target ? target.getAttribute('data-cursor') || '' : '');
    };
    const onEnter = () => setVisible(true);
    const onLeave = () => setVisible(false);

    const loop = () => {
      rx += (tx - rx) * 0.16;
      ry += (ty - ry) * 0.16;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      }
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

/** Finds the real product behind every hotspot name (one small search each, once on mount). */
function useHotspotProducts() {
  const [byName, setByName] = useState({});

  useEffect(() => {
    const controller = new AbortController();
    const names = [...new Set(SLIDES.flatMap((sl) => sl.hotspots.map((h) => h.name)))];

    Promise.all(
      names.map(async (name) => {
        try {
          const res = await fetch(`${API_URL}/api/products?search=${encodeURIComponent(name)}&limit=10`, {
            signal: controller.signal,
          });
          if (!res.ok) return null;
          const list = await res.json();
          return list.find((p) => p.name.trim().toLowerCase() === name.toLowerCase()) || null;
        } catch {
          return null; // network problem or aborted: that hotspot just stays hidden
        }
      })
    ).then((found) => {
      if (controller.signal.aborted) return;
      setByName(Object.fromEntries(found.filter(Boolean).map((p) => [p.name.trim().toLowerCase(), p])));
    });

    return () => controller.abort();
  }, []);

  return byName;
}

/** A "shop the look" pin with a quick-view card. `spot.product` is the real product from the API. */
function Hotspot({ spot, index, onQuickAdd }) {
  const { addItem } = useCart();
  const { product } = spot;
  const inStock = (product.stock ?? 0) > 0;
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const flip = spot.x > 68;

  useEffect(() => {
    if (!added) return undefined;
    const t = setTimeout(() => setAdded(false), 2200);
    return () => clearTimeout(t);
  }, [added]);

  const handleAdd = () => {
    if (!inStock) return;
    if (!addItem(product, 1)) return; // false = it has sizes/colors, so the shopper was sent to its page to choose
    setAdded(true);
    if (typeof onQuickAdd === 'function') onQuickAdd(spot);
  };

  return (
    <div
      className={`aur-spot ${open ? 'is-open' : ''} ${flip ? 'is-flip' : ''}`}
      style={{ left: `${spot.x}%`, top: `${spot.y}%`, '--d': `${1.9 + index * 0.3}s` }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        className="aur-spot__dot"
        aria-expanded={open}
        aria-label={`Quick view: ${spot.name}`}
        data-cursor="Quick view"
        onClick={() => setOpen((o) => !o)}
        onFocus={() => setOpen(true)}
      >
        <span className="aur-spot__pulse" />
        <span className="aur-spot__pulse aur-spot__pulse--late" />
        <span className="aur-spot__core">
          <PlusIcon />
        </span>
      </button>

      <div className="aur-spot__card" role="group" aria-label={spot.name}>
        {spot.tag && <span className="aur-spot__tag">{spot.tag}</span>}
        <h3>{spot.name}</h3>
        <p>{pkr(product.price)}</p>
        <div className="aur-spot__actions">
          <Link href={`/shop/${product._id}`} className="aur-spot__view" tabIndex={open ? 0 : -1}>
            View piece
          </Link>
          <button
            type="button"
            className={`aur-spot__add ${added ? 'is-added' : ''}`}
            tabIndex={open ? 0 : -1}
            onClick={handleAdd}
            disabled={!inStock}
          >
            {added ? (
              <>
                <CheckIcon /> Added
              </>
            ) : inStock ? (
              'Quick add'
            ) : (
              'Sold out'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Intro curtain: two panels slide apart after the wordmark has drawn in. */
function Curtain({ ready, gone }) {
  if (gone) return null;
  return (
    <div className={`aur-curtain ${ready ? 'is-open' : ''}`} aria-hidden="true">
      <div className="aur-curtain__panel aur-curtain__panel--top" />
      <div className="aur-curtain__panel aur-curtain__panel--bottom" />
      <div className="aur-curtain__brand">
        <span className="aur-curtain__word">
          {'Aurelia'.split('').map((ch, i) => (
            <span key={i} style={{ animationDelay: `${0.25 + i * 0.09}s` }}>
              {ch}
            </span>
          ))}
        </span>
        <span className="aur-curtain__line" />
        <span className="aur-curtain__sub">Spring Summer 2026</span>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   HERO
   ═════════════════════════════════════════════════════════════════════════════ */

/**
 * Props
 *  - onQuickAdd(spot) : called when someone presses "Quick add" on a hotspot
 */
export default function Hero({ onQuickAdd }) {
  const rootRef = useRef(null);
  const dragStart = useRef(null);
  const total = SLIDES.length;

  const [state, setState] = useState({ current: 0, prev: null, dir: 1, changes: 0 });
  const [hover, setHover] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [inView, setInView] = useState(true);

  const [minTimePassed, setMinTimePassed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [ready, setReady] = useState(false);
  const [curtainGone, setCurtainGone] = useState(false);

  const { current, prev, dir, changes } = state;
  const slide = SLIDES[current];
  const productsByName = useHotspotProducts();
  const spots = slide.hotspots
    .map((h) => ({ ...h, product: productsByName[h.name.toLowerCase()] }))
    .filter((h) => h.product);
  const paused = hover || tabHidden || !inView || !ready;

  const magnetCta = useMagnetic(0.3, 70);
  const magnetPrev = useMagnetic(0.4, 50);
  const magnetNext = useMagnetic(0.4, 50);

  /* ── navigation ──────────────────────────────────────────────────────── */
  const next = useCallback(() => {
    setState((s) => ({ current: (s.current + 1) % total, prev: s.current, dir: 1, changes: s.changes + 1 }));
  }, [total]);

  const previous = useCallback(() => {
    setState((s) => ({ current: (s.current - 1 + total) % total, prev: s.current, dir: -1, changes: s.changes + 1 }));
  }, [total]);

  const goTo = useCallback(
    (to) => {
      setState((s) => {
        if (to === s.current) return s;
        return { current: to, prev: s.current, dir: to > s.current ? 1 : -1, changes: s.changes + 1 };
      });
    },
    []
  );

  /* forget the outgoing slide once its exit animation has finished */
  useEffect(() => {
    if (changes === 0) return undefined;
    const t = setTimeout(() => {
      setState((s) => (s.changes === changes ? { ...s, prev: null } : s));
    }, 1800);
    return () => clearTimeout(t);
  }, [changes]);

  /* ── intro sequence ──────────────────────────────────────────────────── */
  useEffect(() => {
    let seen = false;
    try {
      seen = window.sessionStorage.getItem('aurelia-intro') === '1';
    } catch (e) {
      seen = false;
    }

    if (seen) {
      setMinTimePassed(true);
      setImageLoaded(true);
      setCurtainGone(true);
      return undefined;
    }

    const min = setTimeout(() => setMinTimePassed(true), INTRO_MIN_MS);
    const max = setTimeout(() => {
      setMinTimePassed(true);
      setImageLoaded(true);
    }, INTRO_MAX_MS);

    return () => {
      clearTimeout(min);
      clearTimeout(max);
    };
  }, []);

  useEffect(() => {
    if (minTimePassed && imageLoaded) setReady(true);
  }, [minTimePassed, imageLoaded]);

  useEffect(() => {
    if (!ready || curtainGone) return undefined;
    try {
      window.sessionStorage.setItem('aurelia-intro', '1');
    } catch (e) {
      /* storage unavailable, ignore */
    }
    const t = setTimeout(() => setCurtainGone(true), 2200);
    return () => clearTimeout(t);
  }, [ready, curtainGone]);

  /* ── visibility: tab hidden + scrolled out of view ───────────────────── */
  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* ── scroll-linked effects (written to a CSS variable, no re-render) ─── */
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    let raf = 0;

    const update = () => {
      raf = 0;
      const h = el.offsetHeight || 1;
      const p = Math.min(Math.max(window.scrollY / h, 0), 1);
      el.style.setProperty('--scroll', p.toFixed(4));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  /* ── keyboard ────────────────────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (!inView) return;
      if (e.key === 'ArrowRight') next();
      if (e.key === 'ArrowLeft') previous();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, previous, inView]);

  /* ── pointer: parallax + drag to navigate ────────────────────────────── */
  const onMouseMove = (e) => {
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    el.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  };

  const onMouseLeave = () => {
    const el = rootRef.current;
    if (el) {
      el.style.setProperty('--mx', '0');
      el.style.setProperty('--my', '0');
    }
    setHover(false);
  };

  const onPointerDown = (e) => {
    if (e.target.closest && e.target.closest('a, button, .aur-spot')) return;
    dragStart.current = e.clientX;
  };

  const onPointerUp = (e) => {
    if (dragStart.current == null) return;
    const dx = e.clientX - dragStart.current;
    dragStart.current = null;
    if (Math.abs(dx) > 70) {
      if (dx < 0) next();
      else previous();
    }
  };

  const scrollDown = () => {
    const h = rootRef.current ? rootRef.current.offsetHeight : window.innerHeight;
    window.scrollTo({ top: h, behavior: 'smooth' });
  };

  /* ── render ──────────────────────────────────────────────────────────── */
  return (
    <section
      ref={rootRef}
      className={`${serif.variable} ${sans.variable} aur-hero ${ready ? 'is-ready' : ''} ${inView ? '' : 'is-offscreen'}`}
      style={{ '--a1': slide.accent[0], '--a2': slide.accent[1], '--a3': slide.accent[2] }}
      aria-roledescription="carousel"
      aria-label="Featured collections"
      onMouseMove={onMouseMove}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={onMouseLeave}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        dragStart.current = null;
      }}
    >
      <Curtain ready={ready} gone={curtainGone} />

      {/* ── Background slides ─────────────────────────────────────────── */}
      <div className="aur-hero__slides" aria-hidden="true">
        {SLIDES.map((s, i) => {
          const isActive = i === current;
          const isLeaving = i === prev;
          const cls = [
            'aur-slide',
            isActive ? 'is-active' : '',
            isLeaving ? 'is-leaving' : '',
            isActive && changes === 0 ? 'is-still' : '',
          ].join(' ');

          return (
            <div key={s.id} className={cls} data-dir={dir}>
              <div className="aur-slide__parallax">
                <div className="aur-slide__kb">
                  <Image
                    src={s.image}
                    alt=""
                    fill
                    sizes="100vw"
                    priority={i === 0}
                    quality={90}
                    unoptimized={isRemote(s.image)}
                    onLoad={i === 0 ? () => setImageLoaded(true) : undefined}
                    style={{ objectFit: 'cover', objectPosition: s.position }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Light, atmosphere, particles ──────────────────────────────── */}
      <div className="aur-hero__shade" />
      <div className="aur-hero__sun" />
      <div className="aur-hero__sun aur-hero__sun--b" />
      <DustCanvas running={ready && inView && !tabHidden} />
      <div className="aur-hero__vignette" />
      <div className="aur-hero__grain" />

      {/* ── Copy + controls ───────────────────────────────────────────── */}
      <div className="aur-hero__inner">
        <div className="aur-copy" key={current}>
          <p className="aur-eyebrow">
            <SplitLetters text={slide.eyebrow} start={80} />
          </p>

          <h1 className="aur-title">
            <span className="aur-line">
              <span className="aur-line__in" style={{ animationDelay: '160ms' }}>
                {slide.lineOne}
              </span>
            </span>
            <span className="aur-line">
              <span className="aur-line__in aur-line__in--accent" style={{ animationDelay: '300ms' }}>
                {slide.lineTwo}
              </span>
            </span>
          </h1>

          <p className="aur-text">
            {slide.text[0]}
            <br />
            {slide.text[1]}
          </p>

          <span ref={magnetCta} className="aur-magnet aur-magnet--cta">
            <Link href={slide.href} className="aur-cta" data-cursor="Shop">
              <span className="aur-cta__label">Shop Collection</span>
              <span className="aur-cta__arrow">
                <ArrowRight />
              </span>
            </Link>
          </span>
        </div>

        <div className="aur-controls">
          <span ref={magnetPrev} className="aur-magnet">
            <button type="button" className="aur-circle" onClick={previous} aria-label="Previous slide" data-cursor="Prev">
              <ArrowLeft />
            </button>
          </span>

          <div className="aur-counter" aria-hidden="true">
            <span className="aur-counter__bar">
              <i
                key={current}
                style={{ animationPlayState: paused ? 'paused' : 'running' }}
                onAnimationEnd={next}
              />
            </span>
            <span className="aur-counter__num">
              <Roller value={current} total={total} />
              <em>/</em>
              <span>{pad(total)}</span>
            </span>
            <span className="aur-counter__bar aur-counter__bar--static" />
          </div>

          <span ref={magnetNext} className="aur-magnet">
            <button type="button" className="aur-circle" onClick={next} aria-label="Next slide" data-cursor="Next">
              <ArrowRight />
            </button>
          </span>
        </div>

        <div className="aur-dots" role="tablist" aria-label="Choose slide">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === current}
              aria-label={`Slide ${i + 1}: ${s.lineOne}`}
              className={i === current ? 'is-active' : ''}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      </div>

      {/* ── Shop the look hotspots (only products that exist in the store are shown) ── */}
      {spots.length > 0 && (
        <div className="aur-spots" key={`spots-${current}`}>
          {spots.map((spot, i) => (
            <Hotspot key={spot.id} spot={spot} index={i} onQuickAdd={onQuickAdd} />
          ))}
        </div>
      )}

      {/* ── Right: collection tag ─────────────────────────────────────── */}
      <div className="aur-side" key={`side-${current}`}>
        <Link href={slide.href} className="aur-side__circle" aria-label={slide.collection.join(' ')} data-cursor="View">
          <HangerIcon />
        </Link>
        <p>
          {slide.collection.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </p>
        <i className="aur-side__line" />
      </div>

      {/* ── Bottom left tagline ───────────────────────────────────────── */}
      <div className="aur-tagline">
        <i />
        <p>
          More than just
          <br />
          products —
          <br />
          it&apos;s a feeling.
        </p>
      </div>

      <div className="aur-hero__rule" aria-hidden="true" />

      {/* ── Scroll cue ────────────────────────────────────────────────── */}
      <button type="button" className="aur-scroll" onClick={scrollDown} aria-label="Scroll down" data-cursor="Scroll">
        <span>Scroll</span>
        <span className="aur-scroll__mouse">
          <i />
        </span>
      </button>

      <HeroCursor rootRef={rootRef} enabled={ready} />

    </section>
  );
}