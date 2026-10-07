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
      { id: 'ss-1', x: 66, y: 46, name: 'Relaxed Linen Shirt', price: '$96', tag: 'New', href: '/shop/relaxed-linen-shirt' },
      { id: 'ss-2', x: 58, y: 72, name: 'Tuscan Leather Satchel', price: '$320', tag: 'Bestseller', href: '/shop/tuscan-leather-satchel' },
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
      { id: 'rs-1', x: 63, y: 30, name: 'Woven Straw Hat', price: '$72', tag: 'Limited', href: '/shop/woven-straw-hat' },
      { id: 'rs-2', x: 62, y: 62, name: 'Linen Column Dress', price: '$184', tag: 'New', href: '/shop/linen-column-dress' },
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
      { id: 'ln-1', x: 62, y: 52, name: 'Everyday Linen Dress', price: '$158', tag: 'Essential', href: '/shop/everyday-linen-dress' },
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

/** A "shop the look" pin with a quick-view card. */
function Hotspot({ spot, index, onQuickAdd }) {
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const flip = spot.x > 68;

  useEffect(() => {
    if (!added) return undefined;
    const t = setTimeout(() => setAdded(false), 2200);
    return () => clearTimeout(t);
  }, [added]);

  const handleAdd = () => {
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
        <p>{spot.price}</p>
        <div className="aur-spot__actions">
          <Link href={spot.href} className="aur-spot__view" tabIndex={open ? 0 : -1}>
            View piece
          </Link>
          <button type="button" className={`aur-spot__add ${added ? 'is-added' : ''}`} tabIndex={open ? 0 : -1} onClick={handleAdd}>
            {added ? (
              <>
                <CheckIcon /> Added
              </>
            ) : (
              'Quick add'
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

      {/* ── Shop the look hotspots ──────────────────────────────────────
      <div className="aur-spots" key={`spots-${current}`}>
        {slide.hotspots.map((spot, i) => (
          <Hotspot key={spot.id} spot={spot} index={i} onQuickAdd={onQuickAdd} />
        ))}
      </div> */}

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

      <style jsx global>{`
        /* ═══════════════════════════════════════════════════════════════════
           ROOT
           ═══════════════════════════════════════════════════════════════════ */
        .aur-hero {
          --cream: #f6efe8;
          --blush: #f0dcd2;
          --copper: #c98a63;
          --ink: #211b18;
          --a1: #f3ddd2;
          --a2: #dcae94;
          --a3: #b9724b;
          --gutter: clamp(22px, 6.6vw, 124px);
          --ease-out: cubic-bezier(0.22, 0.8, 0.2, 1);
          --ease-expo: cubic-bezier(0.19, 1, 0.22, 1);
          --ease-wipe: cubic-bezier(0.76, 0, 0.18, 1);
          --mx: 0;
          --my: 0;
          --scroll: 0;
          position: relative;
          width: 100%;
          height: 100vh;
          height: 100svh;
          min-height: 700px;
          overflow: hidden;
          background: #171310;
          color: var(--cream);
          font-family: var(--aur-sans), system-ui, sans-serif;
          isolation: isolate;
          touch-action: pan-y;
          user-select: none;
          -webkit-user-select: none;
        }

        .aur-hero a,
        .aur-hero button {
          -webkit-tap-highlight-color: transparent;
        }

        /* ═══════════════════════════════════════════════════════════════════
           INTRO CURTAIN
           ═══════════════════════════════════════════════════════════════════ */
        .aur-curtain {
          position: absolute;
          inset: 0;
          z-index: 40;
          display: grid;
          place-items: center;
          pointer-events: none;
        }
        .aur-curtain__panel {
          position: absolute;
          left: 0;
          right: 0;
          height: 50.5%;
          background: #171310;
          transition: transform 1.35s var(--ease-wipe) 0.25s;
        }
        .aur-curtain__panel--top {
          top: 0;
        }
        .aur-curtain__panel--bottom {
          bottom: 0;
        }
        .aur-curtain.is-open .aur-curtain__panel--top {
          transform: translate3d(0, -100%, 0);
        }
        .aur-curtain.is-open .aur-curtain__panel--bottom {
          transform: translate3d(0, 100%, 0);
        }
        .aur-curtain__brand {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 18px;
          transition: opacity 0.6s ease, transform 0.9s var(--ease-out);
        }
        .aur-curtain.is-open .aur-curtain__brand {
          opacity: 0;
          transform: translate3d(0, -18px, 0) scale(0.98);
        }
        .aur-curtain__word {
          display: inline-flex;
          font-family: var(--aur-serif), Georgia, serif;
          font-size: clamp(3rem, 7vw, 5.4rem);
          font-weight: 300;
          letter-spacing: 0.02em;
          color: var(--cream);
        }
        .aur-curtain__word span {
          display: inline-block;
          opacity: 0;
          transform: translate3d(0, 40%, 0);
          filter: blur(8px);
          animation: aurCurtainLetter 1.1s var(--ease-expo) forwards;
        }
        @keyframes aurCurtainLetter {
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
            filter: blur(0);
          }
        }
        .aur-curtain__line {
          width: min(240px, 46vw);
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(246, 239, 232, 0.7), transparent);
          transform: scaleX(0);
          animation: aurCurtainLine 1.5s var(--ease-expo) 0.9s forwards;
        }
        @keyframes aurCurtainLine {
          to {
            transform: scaleX(1);
          }
        }
        .aur-curtain__sub {
          font-size: 0.72rem;
          font-weight: 400;
          letter-spacing: 0.42em;
          text-transform: uppercase;
          color: rgba(246, 239, 232, 0.6);
          opacity: 0;
          animation: aurFadeSimple 1.2s ease 1.3s forwards;
        }
        @keyframes aurFadeSimple {
          to {
            opacity: 1;
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           BACKGROUND SLIDES
           ═══════════════════════════════════════════════════════════════════ */
        .aur-hero__slides,
        .aur-slide,
        .aur-slide__parallax,
        .aur-slide__kb {
          position: absolute;
          inset: 0;
        }

        .aur-hero__slides {
          transform: scale(calc(1 + var(--scroll) * 0.1));
          transform-origin: 60% 40%;
          opacity: calc(1 - var(--scroll) * 0.55);
        }

        .aur-slide {
          visibility: hidden;
          z-index: 1;
        }
        .aur-slide.is-leaving {
          visibility: visible;
          z-index: 2;
          animation: aurLeave 1.7s var(--ease-wipe) forwards;
        }
        .aur-slide.is-active {
          visibility: visible;
          z-index: 3;
          animation: aurEnterNext 1.7s var(--ease-wipe) both;
        }
        .aur-slide.is-active[data-dir='-1'] {
          animation-name: aurEnterPrev;
        }
        .aur-slide.is-active.is-still {
          animation: none;
        }
        @keyframes aurEnterNext {
          from {
            clip-path: inset(0 0 0 100%);
          }
          to {
            clip-path: inset(0 0 0 0);
          }
        }
        @keyframes aurEnterPrev {
          from {
            clip-path: inset(0 100% 0 0);
          }
          to {
            clip-path: inset(0 0 0 0);
          }
        }
        @keyframes aurLeave {
          from {
            transform: scale(1) translate3d(0, 0, 0);
            filter: brightness(1);
          }
          to {
            transform: scale(1.07) translate3d(-5%, 0, 0);
            filter: brightness(0.45);
          }
        }

        .aur-slide__parallax {
          inset: -3%;
          transform: translate3d(calc(var(--mx) * -26px), calc(var(--my) * -16px), 0);
          transition: transform 0.9s cubic-bezier(0.2, 0.7, 0.2, 1);
          will-change: transform;
        }
        .aur-slide__kb {
          transform: scale(1.1);
        }
        .aur-slide.is-active .aur-slide__kb {
          animation: aurKenBurns 12s cubic-bezier(0.2, 0.6, 0.3, 1) forwards;
        }
        @keyframes aurKenBurns {
          from {
            transform: scale(1.14) translate3d(1.4%, 0.6%, 0);
          }
          to {
            transform: scale(1) translate3d(0, 0, 0);
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           ATMOSPHERE
           ═══════════════════════════════════════════════════════════════════ */
        .aur-hero__shade {
          position: absolute;
          inset: 0;
          z-index: 4;
          pointer-events: none;
          background:
            linear-gradient(90deg, rgba(21, 18, 15, 0.94) 0%, rgba(21, 18, 15, 0.78) 26%, rgba(21, 18, 15, 0.28) 52%, rgba(21, 18, 15, 0) 68%),
            linear-gradient(180deg, rgba(21, 18, 15, 0.58) 0%, rgba(21, 18, 15, 0) 22%),
            linear-gradient(0deg, rgba(21, 18, 15, 0.55) 0%, rgba(21, 18, 15, 0) 28%);
        }

        .aur-hero__sun {
          position: absolute;
          inset: 0;
          z-index: 4;
          pointer-events: none;
          mix-blend-mode: soft-light;
          background: radial-gradient(60% 70% at 78% 30%, rgba(255, 214, 160, 0.6), rgba(255, 214, 160, 0) 70%);
          animation: aurSun 9s ease-in-out infinite alternate;
        }
        .aur-hero__sun--b {
          background: radial-gradient(40% 50% at 92% 8%, rgba(255, 236, 200, 0.55), rgba(255, 236, 200, 0) 70%);
          animation-duration: 13s;
          animation-direction: alternate-reverse;
        }
        @keyframes aurSun {
          from {
            opacity: 0.5;
            transform: translate3d(0, 0, 0) scale(1);
          }
          to {
            opacity: 1;
            transform: translate3d(-2.5%, 2.5%, 0) scale(1.06);
          }
        }

        .aur-dust {
          position: absolute;
          inset: 0;
          z-index: 5;
          width: 100%;
          height: 100%;
          pointer-events: none;
          opacity: 0;
          transition: opacity 2s ease 0.4s;
        }
        .aur-hero.is-ready .aur-dust {
          opacity: 1;
        }

        .aur-hero__vignette {
          position: absolute;
          inset: 0;
          z-index: 5;
          pointer-events: none;
          background: radial-gradient(120% 100% at 60% 50%, rgba(0, 0, 0, 0) 55%, rgba(8, 6, 5, 0.5) 100%);
        }

        .aur-hero__grain {
          position: absolute;
          inset: 0;
          z-index: 6;
          pointer-events: none;
          opacity: 0.085;
          mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
          animation: aurGrain 1.2s steps(6) infinite;
        }
        @keyframes aurGrain {
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

        /* ═══════════════════════════════════════════════════════════════════
           COPY
           ═══════════════════════════════════════════════════════════════════ */
        .aur-hero__inner {
          position: relative;
          z-index: 10;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 96px 0 56px var(--gutter);
          max-width: 100%;
          transform: translate3d(calc(var(--mx) * 8px), calc(var(--scroll) * 90px), 0);
          opacity: calc(1 - var(--scroll) * 1.25);
          transition: transform 0.8s cubic-bezier(0.2, 0.7, 0.2, 1);
        }
        .aur-copy {
          max-width: 700px;
        }

        .aur-eyebrow {
          margin: 0 0 22px;
          font-size: 0.82rem;
          font-weight: 400;
          letter-spacing: 0.44em;
          text-transform: uppercase;
          color: rgba(246, 239, 232, 0.88);
        }
        .aur-letter {
          display: inline-block;
          opacity: 0;
        }
        .aur-hero.is-ready .aur-letter {
          animation: aurLetter 0.9s var(--ease-expo) both;
        }
        @keyframes aurLetter {
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

        .aur-title {
          margin: 0;
          font-family: var(--aur-serif), Georgia, serif;
          font-weight: 400;
          font-size: clamp(2.9rem, 4.9vw, 5.6rem);
          line-height: 1.04;
          letter-spacing: -0.015em;
          color: #fff;
        }
        .aur-line {
          display: block;
          overflow: hidden;
          padding: 0.04em 0.2em 0.14em 0;
          margin-bottom: -0.1em;
        }
        .aur-line__in {
          display: inline-block;
          transform: translate3d(0, 115%, 0) rotate(3deg);
          transform-origin: left bottom;
        }
        .aur-hero.is-ready .aur-line__in {
          animation: aurRise 1.35s var(--ease-expo) both;
        }
        .aur-line__in--accent {
          font-style: italic;
          padding-right: 0.08em;
          background: linear-gradient(95deg, var(--a1) 0%, var(--a2) 45%, var(--a3) 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }
        .aur-hero.is-ready .aur-line__in--accent {
          animation: aurRise 1.35s var(--ease-expo) both, aurShimmer 7s ease-in-out 1.8s infinite alternate;
        }
        @keyframes aurRise {
          from {
            transform: translate3d(0, 115%, 0) rotate(3deg);
          }
          to {
            transform: translate3d(0, 0, 0) rotate(0);
          }
        }
        @keyframes aurShimmer {
          from {
            background-position: 0% 50%;
          }
          to {
            background-position: 100% 50%;
          }
        }

        .aur-text {
          margin: 30px 0 0;
          font-size: clamp(1rem, 1.15vw, 1.14rem);
          font-weight: 300;
          line-height: 1.85;
          color: rgba(246, 239, 232, 0.9);
          opacity: 0;
        }
        .aur-hero.is-ready .aur-text {
          animation: aurFade 1.2s ease 0.62s both;
        }
        @keyframes aurFade {
          from {
            opacity: 0;
            transform: translate3d(0, 16px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           MAGNETIC WRAPPER + CTA
           ═══════════════════════════════════════════════════════════════════ */
        .aur-magnet {
          display: inline-block;
          transition: transform 0.7s var(--ease-out);
          will-change: transform;
        }
        .aur-magnet.is-magnet {
          transition-duration: 0.22s;
        }
        .aur-magnet--cta {
          margin-top: 40px;
          opacity: 0;
        }
        .aur-hero.is-ready .aur-magnet--cta {
          animation: aurFade 1.2s ease 0.85s both;
        }

        .aur-cta {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 14px;
          height: 52px;
          padding: 0 30px;
          border-radius: 999px;
          background: var(--blush);
          color: var(--ink);
          font-size: 0.95rem;
          font-weight: 500;
          text-decoration: none;
          overflow: hidden;
          box-shadow: 0 14px 34px -14px rgba(240, 220, 210, 0.45);
          transition: transform 0.5s var(--ease-out), box-shadow 0.5s ease, background 0.4s ease;
        }
        .aur-cta::before {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          width: 60%;
          left: -80%;
          background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.75), transparent);
          transform: skewX(-18deg);
        }
        .aur-cta::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          box-shadow: 0 0 0 0 rgba(240, 220, 210, 0.5);
          animation: aurCtaPulse 3.2s ease-out 3s infinite;
        }
        @keyframes aurCtaPulse {
          0% {
            box-shadow: 0 0 0 0 rgba(240, 220, 210, 0.45);
          }
          70%,
          100% {
            box-shadow: 0 0 0 18px rgba(240, 220, 210, 0);
          }
        }
        .aur-cta:hover {
          background: #fbeee6;
          transform: translateY(-3px);
          box-shadow: 0 22px 44px -14px rgba(240, 220, 210, 0.6);
        }
        .aur-cta:hover::before {
          left: 130%;
          transition: left 0.9s ease;
        }
        .aur-cta:active {
          transform: translateY(-1px) scale(0.98);
        }
        .aur-cta__label,
        .aur-cta__arrow {
          position: relative;
        }
        .aur-cta__arrow {
          display: inline-flex;
          transition: transform 0.45s var(--ease-out);
        }
        .aur-cta:hover .aur-cta__arrow {
          transform: translateX(6px);
        }

        /* ═══════════════════════════════════════════════════════════════════
           CONTROLS + COUNTER
           ═══════════════════════════════════════════════════════════════════ */
        .aur-controls {
          display: flex;
          align-items: center;
          gap: 18px;
          margin-top: 52px;
          opacity: 0;
        }
        .aur-hero.is-ready .aur-controls {
          animation: aurFade 1.2s ease 1.05s both;
        }

        .aur-circle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          padding: 0;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.55);
          background: rgba(255, 255, 255, 0.02);
          color: var(--cream);
          cursor: pointer;
          transition: background 0.35s ease, color 0.35s ease, transform 0.45s var(--ease-out), border-color 0.35s ease;
        }
        .aur-circle:hover {
          background: var(--cream);
          color: var(--ink);
          border-color: var(--cream);
          transform: scale(1.1);
        }
        .aur-circle:active {
          transform: scale(0.92);
        }

        .aur-counter {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          font-size: 0.88rem;
          letter-spacing: 0.04em;
        }
        .aur-counter__bar {
          position: relative;
          display: block;
          width: 30px;
          height: 1px;
          background: rgba(255, 255, 255, 0.3);
          overflow: hidden;
        }
        .aur-counter__bar i {
          position: absolute;
          inset: 0;
          background: var(--cream);
          transform-origin: left center;
          transform: scaleX(0);
          animation: aurProgress 7000ms linear forwards; /* keep in sync with SLIDE_DURATION */
        }
        .aur-counter__bar--static {
          background: rgba(255, 255, 255, 0.55);
        }
        @keyframes aurProgress {
          to {
            transform: scaleX(1);
          }
        }
        .aur-counter__num {
          display: inline-flex;
          align-items: baseline;
          gap: 6px;
          color: #fff;
        }
        .aur-counter__num em {
          font-style: normal;
          opacity: 0.6;
        }
        .aur-counter__num > span:last-child {
          opacity: 0.6;
        }

        .aur-roll {
          display: inline-flex;
          height: 1.25em;
          line-height: 1.25em;
          font-weight: 500;
          overflow: hidden;
        }
        .aur-roll__window {
          display: block;
          height: 1.25em;
          overflow: hidden;
        }
        .aur-roll__col {
          display: flex;
          flex-direction: column;
          transition: transform 0.9s var(--ease-wipe);
        }
        .aur-roll__col span {
          display: block;
          height: 1.25em;
        }

        .aur-dots {
          display: none;
        }

        /* ═══════════════════════════════════════════════════════════════════
           HOTSPOTS
           ═══════════════════════════════════════════════════════════════════ */
        .aur-spots {
          position: absolute;
          inset: 0;
          z-index: 12;
          pointer-events: none;
          transform: translate3d(calc(var(--mx) * -14px), calc(var(--my) * -9px), 0);
          transition: transform 0.9s cubic-bezier(0.2, 0.7, 0.2, 1);
          opacity: calc(1 - var(--scroll) * 1.6);
        }
        .aur-spot {
          position: absolute;
          transform: translate(-50%, -50%);
          pointer-events: auto;
          opacity: 0;
        }
        .aur-hero.is-ready .aur-spot {
          animation: aurSpotIn 1s var(--ease-expo) var(--d) both;
        }
        @keyframes aurSpotIn {
          from {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.2);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
        .aur-spot__dot {
          position: relative;
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          padding: 0;
          border: 0;
          background: transparent;
          color: var(--ink);
          cursor: pointer;
        }
        .aur-spot__core {
          position: relative;
          z-index: 2;
          display: grid;
          place-items: center;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: rgba(250, 244, 238, 0.94);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
          transition: transform 0.5s var(--ease-out), background 0.3s ease;
        }
        .aur-spot__core svg {
          transition: transform 0.5s var(--ease-out);
        }
        .aur-spot.is-open .aur-spot__core {
          transform: scale(1.12);
          background: #fff;
        }
        .aur-spot.is-open .aur-spot__core svg {
          transform: rotate(135deg);
        }
        .aur-spot__pulse {
          position: absolute;
          inset: 4px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.85);
          animation: aurPulse 2.6s ease-out infinite;
        }
        .aur-spot__pulse--late {
          animation-delay: 1.3s;
        }
        @keyframes aurPulse {
          0% {
            transform: scale(0.8);
            opacity: 0.9;
          }
          100% {
            transform: scale(2.4);
            opacity: 0;
          }
        }

        .aur-spot__card {
          position: absolute;
          top: 50%;
          left: 46px;
          width: 232px;
          padding: 18px 18px 16px;
          border-radius: 20px;
          background: rgba(26, 22, 19, 0.72);
          -webkit-backdrop-filter: blur(20px) saturate(150%);
          backdrop-filter: blur(20px) saturate(150%);
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08);
          opacity: 0;
          visibility: hidden;
          transform: translate3d(-10px, -50%, 0) scale(0.94);
          transform-origin: left center;
          transition: opacity 0.35s ease, transform 0.55s var(--ease-out), visibility 0s linear 0.35s;
        }
        .aur-spot.is-flip .aur-spot__card {
          left: auto;
          right: 46px;
          transform-origin: right center;
          transform: translate3d(10px, -50%, 0) scale(0.94);
        }
        .aur-spot.is-open .aur-spot__card {
          opacity: 1;
          visibility: visible;
          transform: translate3d(0, -50%, 0) scale(1);
          transition-delay: 0s;
        }
        .aur-spot__tag {
          display: inline-block;
          margin-bottom: 8px;
          padding: 3px 10px;
          border-radius: 999px;
          background: rgba(240, 220, 210, 0.16);
          font-size: 0.7rem;
          letter-spacing: 0.08em;
          color: var(--blush);
        }
        .aur-spot__card h3 {
          margin: 0;
          font-family: var(--aur-serif), Georgia, serif;
          font-size: 1.32rem;
          font-weight: 400;
          line-height: 1.15;
          color: #fff;
        }
        .aur-spot__card p {
          margin: 6px 0 14px;
          font-size: 0.95rem;
          font-weight: 300;
          color: rgba(246, 239, 232, 0.8);
        }
        .aur-spot__actions {
          display: flex;
          gap: 8px;
        }
        .aur-spot__view,
        .aur-spot__add {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          flex: 1;
          height: 36px;
          padding: 0 10px;
          border-radius: 999px;
          font: inherit;
          font-size: 0.8rem;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          transition: background 0.3s ease, color 0.3s ease, transform 0.35s var(--ease-out), border-color 0.3s ease;
        }
        .aur-spot__view {
          border: 1px solid rgba(255, 255, 255, 0.3);
          background: transparent;
          color: var(--cream);
        }
        .aur-spot__view:hover {
          background: rgba(255, 255, 255, 0.12);
          transform: translateY(-2px);
        }
        .aur-spot__add {
          border: 1px solid var(--blush);
          background: var(--blush);
          color: var(--ink);
        }
        .aur-spot__add:hover {
          background: #fbeee6;
          transform: translateY(-2px);
        }
        .aur-spot__add.is-added {
          background: #cfe3d2;
          border-color: #cfe3d2;
        }

        /* ═══════════════════════════════════════════════════════════════════
           RIGHT TAG
           ═══════════════════════════════════════════════════════════════════ */
        .aur-side {
          position: absolute;
          z-index: 10;
          right: clamp(20px, 2.6vw, 48px);
          top: 37%;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 96px;
          text-align: center;
          opacity: 0;
        }
        .aur-hero.is-ready .aur-side {
          animation: aurFade 1.3s ease 1.2s both;
        }
        .aur-side__circle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.45);
          background: rgba(20, 17, 14, 0.18);
          -webkit-backdrop-filter: blur(6px);
          backdrop-filter: blur(6px);
          color: var(--cream);
          transition: background 0.4s ease, color 0.4s ease, transform 0.5s var(--ease-out);
        }
        .aur-side__circle:hover {
          background: var(--cream);
          color: var(--ink);
          transform: rotate(-12deg) scale(1.1);
        }
        .aur-side p {
          margin: 16px 0 0;
          font-size: 0.82rem;
          line-height: 1.6;
          color: rgba(246, 239, 232, 0.88);
        }
        .aur-side p span {
          display: block;
        }
        .aur-side__line {
          display: block;
          width: 1px;
          height: 52px;
          margin-top: 16px;
          background: linear-gradient(to bottom, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0));
          transform-origin: top;
          animation: aurGrow 1.4s var(--ease-out) 1.4s both;
        }
        @keyframes aurGrow {
          from {
            transform: scaleY(0);
          }
          to {
            transform: scaleY(1);
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           BOTTOM LEFT + RULE + SCROLL CUE
           ═══════════════════════════════════════════════════════════════════ */
        .aur-tagline {
          position: absolute;
          z-index: 10;
          left: calc(var(--gutter) + 8px);
          bottom: 48px;
          opacity: 0;
        }
        .aur-hero.is-ready .aur-tagline {
          animation: aurFade 1.3s ease 1.3s both;
        }
        .aur-tagline i {
          display: block;
          width: 1px;
          height: 46px;
          margin: 0 0 18px 0;
          background: linear-gradient(to bottom, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.5));
        }
        .aur-tagline p {
          margin: 0;
          font-family: var(--aur-serif), Georgia, serif;
          font-style: italic;
          font-size: 1.32rem;
          line-height: 1.3;
          color: rgba(246, 239, 232, 0.84);
        }

        .aur-hero__rule {
          position: absolute;
          z-index: 10;
          left: 16%;
          right: 30%;
          bottom: 100px;
          height: 1px;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.5) 20%, rgba(255, 255, 255, 0.5) 70%, rgba(255, 255, 255, 0));
          transform: scaleX(0);
          transform-origin: left;
        }
        .aur-hero.is-ready .aur-hero__rule {
          animation: aurRule 1.9s var(--ease-out) 1.3s both;
        }
        @keyframes aurRule {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }

        .aur-scroll {
          position: absolute;
          z-index: 10;
          right: clamp(20px, 4.6vw, 84px);
          bottom: 44px;
          display: inline-flex;
          align-items: center;
          gap: 14px;
          padding: 0;
          border: 0;
          background: transparent;
          color: var(--cream);
          font: inherit;
          font-size: 0.85rem;
          cursor: pointer;
          opacity: 0;
        }
        .aur-hero.is-ready .aur-scroll {
          animation: aurFade 1.3s ease 1.5s both;
        }
        .aur-scroll__mouse {
          position: relative;
          width: 15px;
          height: 34px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.7);
          transition: border-color 0.3s ease, transform 0.4s ease;
        }
        .aur-scroll:hover .aur-scroll__mouse {
          border-color: #fff;
          transform: translateY(3px);
        }
        .aur-scroll__mouse i {
          position: absolute;
          top: 6px;
          left: 50%;
          width: 2px;
          height: 6px;
          margin-left: -1px;
          border-radius: 2px;
          background: var(--cream);
          animation: aurWheel 1.8s ease-in-out infinite;
        }
        @keyframes aurWheel {
          0% {
            opacity: 0;
            transform: translateY(0);
          }
          30% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateY(12px);
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           CUSTOM CURSOR
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
          width: 44px;
          height: 44px;
          margin: -22px 0 0 -22px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.55);
          background: rgba(255, 255, 255, 0);
          transition: transform 0.5s var(--ease-out), background 0.4s ease, border-color 0.4s ease;
        }
        .aur-cursor.is-grow::before {
          transform: scale(1.55);
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.85);
        }
        .aur-cursor.has-label::before {
          transform: scale(1.9);
          background: rgba(20, 17, 14, 0.4);
          -webkit-backdrop-filter: blur(6px);
          backdrop-filter: blur(6px);
        }
        .aur-cursor__label {
          position: absolute;
          top: 0;
          left: 0;
          transform: translate(-50%, -50%);
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: 0.68rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #fff;
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
          background: #fff;
          transition: transform 0.3s ease, opacity 0.3s ease;
        }
        .aur-cursor-dot.is-grow::before {
          transform: scale(0);
        }

        /* ═══════════════════════════════════════════════════════════════════
           FOCUS + PAUSE STATES
           ═══════════════════════════════════════════════════════════════════ */
        .aur-hero a:focus-visible,
        .aur-hero button:focus-visible {
          outline: 2px solid var(--copper);
          outline-offset: 4px;
        }
        .aur-hero.is-offscreen .aur-hero__sun,
        .aur-hero.is-offscreen .aur-hero__grain,
        .aur-hero.is-offscreen .aur-spot__pulse,
        .aur-hero.is-offscreen .aur-cta::after,
        .aur-hero.is-offscreen .aur-line__in--accent {
          animation-play-state: paused;
        }

        /* ═══════════════════════════════════════════════════════════════════
           RESPONSIVE
           ═══════════════════════════════════════════════════════════════════ */
        @media (max-width: 1100px) {
          .aur-side {
            display: none;
          }
          .aur-hero__rule {
            right: 12%;
          }
        }

        @media (max-width: 820px) {
          .aur-hero {
            min-height: 660px;
          }
          .aur-slide img {
            object-position: 72% center !important;
          }
          .aur-hero__shade {
            background:
              linear-gradient(180deg, rgba(21, 18, 15, 0.6) 0%, rgba(21, 18, 15, 0) 22%),
              linear-gradient(0deg, rgba(21, 18, 15, 0.96) 0%, rgba(21, 18, 15, 0.82) 38%, rgba(21, 18, 15, 0) 72%);
          }
          .aur-hero__inner {
            justify-content: flex-end;
            padding: 96px 24px 44px 24px;
          }
          .aur-eyebrow {
            font-size: 0.72rem;
            letter-spacing: 0.36em;
          }
          .aur-title {
            font-size: clamp(2.5rem, 11vw, 3.6rem);
          }
          .aur-text {
            margin-top: 20px;
          }
          .aur-magnet--cta {
            margin-top: 28px;
          }
          .aur-controls {
            margin-top: 34px;
          }
          .aur-spots {
            display: none;
          }
          .aur-tagline,
          .aur-hero__rule,
          .aur-scroll {
            display: none;
          }
        }

        @media (max-width: 420px) {
          .aur-text br {
            display: none;
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
          .aur-hero *,
          .aur-hero *::before,
          .aur-hero *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
          .aur-hero__grain,
          .aur-dust {
            display: none;
          }
          .aur-counter__bar i {
            animation: none;
          }
          .aur-curtain {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}