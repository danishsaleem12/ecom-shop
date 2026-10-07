'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AURELIA · COLLECTIONS SECTION ("Shop by Collection") — dark editorial
 * ─────────────────────────────────────────────────────────────────────────────
 *  Place at: frontend/src/components/CollectionsSection.js
 *  Use:      <CollectionsSection />   (e.g. in src/app/page.js)
 *
 *  Your menu becomes three groups, switched with the tabs bottom-left:
 *    Seasonal  → Spring / Summer · Resort Edit · Linen Season · Autumn / Winter
 *    Occasions → Evening · Wedding Guest · Travel · Everyday Essentials
 *    Featured  → Sun-Washed Neutrals · The Evening Collection  (two wide cards)
 *
 *  IMAGES
 *   Each collection points at /public/images/collections/<slug>.jpg
 *   (see GROUPS below). Until you add a file, that card shows a warm gradient
 *   fallback, so nothing breaks. Portrait photos (about 4:5 or taller) look
 *   best; the two Featured cards are wider, so use landscape-friendly shots.
 *
 *  ANIMATION (same language as Hero / ProductSection)
 *   • Plays when scrolled into view: letter-by-letter eyebrow, masked heading,
 *     cards rise open with a stagger + Ken Burns settle, hairlines draw
 *   • Switching a tab wipes the new cards in from the side you moved toward
 *   • Mouse + scroll parallax on the photos, 3D tilt + light glare on hover,
 *     siblings dim while one card is hovered
 *   • Drifting light, swaying leaf shadows, film grain, golden dust that
 *     avoids the cursor, magnetic arrow buttons, custom cursor with labels
 *   • Drag / swipe / ← → keys change group; reduced-motion + touch fallbacks
 *
 *  Props (all optional)
 *   groups, eyebrow, title, titleAccent, description, viewAllHref
 */

import { useCallback, useEffect, useRef, useState } from 'react';
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
   DATA — edit copy, links and images here
   ═════════════════════════════════════════════════════════════════════════════ */

const IMG = '/images/collections';

const GROUPS = [
  {
    id: 'seasonal',
    label: 'Seasonal',
    items: [
      { slug: 'spring-summer', title: 'Spring / Summer', text: ['Light layers for', 'longer, softer days.'], image: `${IMG}/spring-summer.jpg`, tint: ['#8a6a50', '#2e231b'] },
      { slug: 'resort', title: 'Resort Edit', text: ['Quiet tailoring for', 'sun-soaked escapes.'], image: `${IMG}/resort.jpg`, tint: ['#a08462', '#33271d'] },
      { slug: 'linen', title: 'Linen Season', text: ['Breathable, easy,', 'made for the heat.'], image: `${IMG}/linen.jpg`, tint: ['#9b8b74', '#2b241d'] },
      { slug: 'autumn-winter', title: 'Autumn / Winter', text: ['Warm textures and', 'deeper tones.'], image: `${IMG}/autumn-winter.jpg`, tint: ['#7a4b32', '#251710'] },
    ],
  },
  {
    id: 'occasions',
    label: 'Occasions',
    items: [
      { slug: 'evening', title: 'Evening', text: ['Pieces made to', 'catch the light.'], image: `${IMG}/evening.jpg`, tint: ['#6b4a3c', '#1c1310'] },
      { slug: 'wedding-guest', title: 'Wedding Guest', text: ['Elegant, never', 'overdressed.'], image: `${IMG}/wedding-guest.jpg`, tint: ['#a48d7d', '#2d221b'] },
      { slug: 'travel', title: 'Travel', text: ['Effortless pieces', 'that pack well.'], image: `${IMG}/travel.jpg`, tint: ['#6d735c', '#1f211a'] },
      { slug: 'everyday-essentials', title: 'Everyday Essentials', text: ['The quiet basics', "you'll reach for daily."], image: `${IMG}/everyday-essentials.jpg`, tint: ['#8c7a68', '#28201a'] },
    ],
  },
  {
    id: 'featured',
    label: 'Featured',
    items: [
      { slug: 'sun-washed-neutrals', title: 'Sun-Washed Neutrals', text: ['Soft sand, cream and', 'warm stone tones.'], image: `${IMG}/sun-washed-neutrals.jpg`, tint: ['#b89b76', '#33281d'] },
      { slug: 'evening-collection', title: 'The Evening Collection', text: ['After-dark elegance,', 'thoughtfully finished.'], image: `${IMG}/evening-collection.jpg`, tint: ['#5a3f35', '#170f0c'] },
    ],
  },
];

const pad = (n) => String(n).padStart(2, '0');

/* ═════════════════════════════════════════════════════════════════════════════
   ICONS
   ═════════════════════════════════════════════════════════════════════════════ */

const ArrowRight = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12h16M14 6l6 6-6 6" />
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

function Magnetic({ children, strength = 0.35, radius = 50 }) {
  const ref = useMagnetic(strength, radius);
  return (
    <span ref={ref} className="aur-magnet">
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

/** Vertical number roller for the 01 — 03 counter. */
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

/** Photo with a graceful gradient fallback when the file doesn't exist yet. */
function CardImage({ src, alt }) {
  const [failed, setFailed] = useState(!src);
  const ref = useRef(null);

  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) return <span className="aur-col__fallback" aria-hidden="true" />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={ref} src={src} alt={alt} loading="lazy" draggable={false} onError={() => setFailed(true)} />
  );
}

/** Golden dust drifting through the light, pushed away by the cursor. */
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
      x: rand(0, width),
      y: initial ? rand(0, height) : height + rand(0, 60),
      r: rand(0.5, 2.3),
      vx: rand(-0.12, 0.26),
      vy: rand(-0.45, -0.06),
      alpha: rand(0.25, 0.9),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.008, 0.026),
      halo: rand(3, 7),
    });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = width < 820 ? 18 : 56;
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

        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 140 * 140) {
          const d = Math.sqrt(d2) || 1;
          const force = (140 - d) / 140;
          p.x += (dx / d) * force * 2.4;
          p.y += (dy / d) * force * 2.4;
        }

        p.x += p.vx + Math.sin(p.phase) * 0.12;
        p.y += p.vy;
        p.phase += p.speed;

        if (p.y < -20 || p.x > width + 20 || p.x < -20) {
          particles[i] = spawn(false);
          continue;
        }

        const a = p.alpha * (0.55 + 0.45 * Math.sin(p.phase * 2.2));

        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 210, 150, ${(a * 0.16).toFixed(3)})`;
        ctx.arc(p.x, p.y, p.r * p.halo, 0, Math.PI * 2);
        ctx.fill();

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

/** Blurred foliage silhouette that sways, like leaves in front of a window. */
function Leaves({ className }) {
  const leaves = [
    [372, 40, -30], [340, 62, 40], [318, 84, -50], [292, 100, 30], [262, 130, -60],
    [238, 150, 20], [214, 182, -40], [188, 204, 50], [160, 236, -20], [132, 262, 60],
    [110, 296, -30], [352, 24, 60], [300, 70, 80], [246, 110, 70],
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

/* ═════════════════════════════════════════════════════════════════════════════
   COLLECTION CARD
   ═════════════════════════════════════════════════════════════════════════════ */

const DEPTHS = [
  { depth: 1, sd: 26 },
  { depth: 0.65, sd: 38 },
  { depth: 1.3, sd: 16 },
  { depth: 0.85, sd: 30 },
];

function CollectionCard({ item, index, span }) {
  const cardRef = useRef(null);
  const { depth, sd } = DEPTHS[index % DEPTHS.length];

  const onMove = (e) => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--tx', (x - 0.5).toFixed(3));
    el.style.setProperty('--ty', (y - 0.5).toFixed(3));
    el.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
    el.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
  };

  const onLeave = () => {
    const el = cardRef.current;
    if (!el) return;
    el.style.setProperty('--tx', '0');
    el.style.setProperty('--ty', '0');
  };

  return (
    <article
      className="aur-col"
      data-span={span}
      style={{ '--i': index, '--depth': depth, '--sd': sd, '--t1': item.tint[0], '--t2': item.tint[1] }}
    >
      <Link
        ref={cardRef}
        href={`/collections/${item.slug}`}
        className="aur-col__card"
        data-cursor="Explore"
        onMouseMove={onMove}
        onMouseLeave={onLeave}
      >
        <span className="aur-col__par">
          <span className="aur-col__kb">
            <CardImage src={item.image} alt={item.title} />
          </span>
        </span>
        <span className="aur-col__shade" />
        <span className="aur-col__glare" />

        <span className="aur-col__top">
          <span className="aur-col__num">{pad(index + 1)}</span>
          <i />
        </span>

        <span className="aur-col__body">
          <span className="aur-col__title">{item.title}</span>
          <span className="aur-col__text">
            {item.text[0]}
            <br />
            {item.text[1]}
          </span>
          <Magnetic>
            <span className="aur-col__go" aria-hidden="true">
              <ArrowRight size={15} />
            </span>
          </Magnetic>
        </span>
      </Link>
    </article>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   SECTION
   ═════════════════════════════════════════════════════════════════════════════ */

export default function CollectionsSection({
  groups = GROUPS,
  eyebrow = 'Shop by collection',
  title = 'Find Your',
  titleAccent = 'Perfect Style',
  description = 'Explore our curated collections, each inspired by a different mood, moment and story.',
  viewAllHref = '/collections',
}) {
  const rootRef = useRef(null);
  const dragStart = useRef(null);
  const justDragged = useRef(false);
  const total = groups.length;

  // dir: 0 = first reveal (rise), 1 = next, -1 = previous
  const [state, setState] = useState({ index: 0, dir: 0 });
  const [revealed, setRevealed] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);

  const { index, dir } = state;
  const group = groups[index];

  const goTo = useCallback((to) => {
    setState((s) => (to === s.index ? s : { index: to, dir: to > s.index ? 1 : -1 }));
  }, []);

  const next = useCallback(() => {
    setState((s) => ({ index: (s.index + 1) % total, dir: 1 }));
  }, [total]);

  const previous = useCallback(() => {
    setState((s) => ({ index: (s.index - 1 + total) % total, dir: -1 }));
  }, [total]);

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
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  /* ── scroll parallax (CSS variable, no re-render) ────────────────────── */
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    let raf = 0;

    const update = () => {
      raf = 0;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const p = (rect.top + rect.height / 2 - vh / 2) / (vh / 2 + rect.height / 2);
      el.style.setProperty('--sp', Math.max(-1, Math.min(1, p)).toFixed(3));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
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

  /* ── pointer: mouse parallax + drag to change group ──────────────────── */
  const onMouseMove = (e) => {
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    el.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  };

  const onMouseLeave = () => {
    const el = rootRef.current;
    if (!el) return;
    el.style.setProperty('--mx', '0');
    el.style.setProperty('--my', '0');
  };

  const onPointerDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (!e.target.closest || !e.target.closest('.aur-cols')) return;
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

  const rowDir = dir === 0 ? 'is-up' : dir === 1 ? 'is-next' : 'is-prev';
  const span = group.items.length === 2 ? 2 : 1;

  /* ── render ──────────────────────────────────────────────────────────── */
  return (
    <section
      ref={rootRef}
      className={`${serif.variable} ${sans.variable} aur-cs ${revealed ? 'is-in' : ''} ${onScreen ? '' : 'is-offscreen'}`}
      aria-label="Shop by collection"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        dragStart.current = null;
      }}
      onClickCapture={onClickCapture}
    >
      <div className="aur-cs__light" aria-hidden="true" />
      <div className="aur-cs__light aur-cs__light--b" aria-hidden="true" />
      <Leaves className="aur-cs__leaves" />
      <Leaves className="aur-cs__leaves aur-cs__leaves--b" />
      <DustCanvas running={revealed && onScreen && !tabHidden} />

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="aur-cs__head">
        <div className="aur-cs__heading">
          <p className="aur-cs__eyebrow">
            <SplitLetters text={eyebrow} start={120} />
          </p>
          <h2 className="aur-cs__title">
            <span className="aur-line">
              <span className="aur-line__in" style={{ animationDelay: '220ms' }}>
                {title}
              </span>
            </span>
            <span className="aur-line">
              <span className="aur-line__in aur-line__in--accent" style={{ animationDelay: '360ms' }}>
                {titleAccent}
              </span>
            </span>
          </h2>
        </div>

        <div className="aur-cs__desc">
          <p>{description}</p>
        </div>

        <Link href={viewAllHref} className="aur-cs__all" data-cursor="Shop">
          <span>View All Collections</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* ── Cards ────────────────────────────────────────────────────── */}
      <div className={`aur-cols ${rowDir}`} key={group.id}>
        {group.items.map((item, i) => (
          <CollectionCard key={item.slug} item={item} index={i} span={span} />
        ))}
      </div>

      {/* ── Footer: counter + tabs, crosshair ────────────────────────── */}
      <div className="aur-foot">
        <div className="aur-foot__left">
          <span className="aur-foot__count" aria-hidden="true">
            <Roller value={index} total={total} />
            <i />
            <span>{pad(total)}</span>
          </span>

          <div className="aur-foot__tabs" role="tablist" aria-label="Collection groups">
            {groups.map((g, i) => (
              <button
                key={g.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                className={i === index ? 'is-active' : ''}
                onClick={() => goTo(i)}
                data-cursor={i === index ? '' : 'Show'}
              >
                {g.label}
              </button>
            ))}
          </div>

          <i className="aur-foot__rule" aria-hidden="true" />
        </div>

        <div className="aur-target" aria-hidden="true">
          <i className="aur-target__h aur-target__h--l" />
          <i className="aur-target__h aur-target__h--r" />
          <span className="aur-target__ring" />
          <span className="aur-target__ring aur-target__ring--in" />
          <b />
        </div>
      </div>

      <SectionCursor rootRef={rootRef} enabled={revealed} />

      <style jsx global>{`
        /* ═══════════════════════════════════════════════════════════════════
           ROOT
           ═══════════════════════════════════════════════════════════════════ */
        .aur-cs {
          --ink: #f3eadf;
          --ink-soft: rgba(243, 234, 223, 0.74);
          --line: rgba(243, 234, 223, 0.3);
          --tan: #cdb19c;
          --gutter: clamp(20px, 5.2vw, 96px);
          --ease-out: cubic-bezier(0.22, 0.8, 0.2, 1);
          --ease-expo: cubic-bezier(0.19, 1, 0.22, 1);
          --ease-wipe: cubic-bezier(0.76, 0, 0.18, 1);
          --card-h: clamp(360px, 33vw, 520px);
          --mx: 0;
          --my: 0;
          --sp: 0;
          position: relative;
          overflow: hidden;
          isolation: isolate;
          color: var(--ink);
          font-family: var(--aur-serif), Georgia, serif;
          padding: clamp(44px, 4.4vw, 72px) var(--gutter) clamp(36px, 3.6vw, 56px);
          background:
            radial-gradient(ellipse 55% 70% at 100% 15%, rgba(156, 122, 86, 0.42), transparent 65%),
            radial-gradient(ellipse 60% 45% at 0% 100%, rgba(0, 0, 0, 0.5), transparent 70%),
            linear-gradient(160deg, #2a2019 0%, #1a1410 55%, #110d0a 100%);
        }
        .aur-cs a,
        .aur-cs button {
          -webkit-tap-highlight-color: transparent;
        }

        /* film grain (jitters like the hero) */
        .aur-cs::before {
          content: '';
          position: absolute;
          inset: -10%;
          z-index: -1;
          pointer-events: none;
          opacity: 0.12;
          mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
          animation: aurCsGrain 1.2s steps(6) infinite;
        }
        @keyframes aurCsGrain {
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

        /* drifting light */
        .aur-cs__light {
          position: absolute;
          inset: -8%;
          z-index: -1;
          pointer-events: none;
          background:
            linear-gradient(115deg, transparent 52%, rgba(255, 214, 160, 0.09) 62%, transparent 72%),
            linear-gradient(115deg, transparent 76%, rgba(255, 214, 160, 0.06) 84%, transparent 92%);
          animation: aurCsLight 12s ease-in-out infinite alternate;
        }
        .aur-cs__light--b {
          background: radial-gradient(40% 50% at 92% 8%, rgba(255, 224, 180, 0.22), transparent 70%);
          animation-duration: 16s;
          animation-direction: alternate-reverse;
        }
        @keyframes aurCsLight {
          from {
            opacity: 0.5;
            transform: translate3d(-2.5%, 0, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(2.5%, 1.5%, 0);
          }
        }

        /* leaf shadows top-right */
        .aur-cs__leaves {
          position: absolute;
          z-index: -1;
          pointer-events: none;
          top: -30px;
          right: -20px;
          width: min(46vw, 640px);
          color: rgba(8, 5, 3, 0.55);
          filter: blur(5px);
          transform-origin: 100% 0;
          animation: aurCsSway 9s ease-in-out infinite alternate;
        }
        .aur-cs__leaves--b {
          top: 40px;
          right: -120px;
          width: min(38vw, 520px);
          color: rgba(8, 5, 3, 0.4);
          filter: blur(10px);
          animation-duration: 12s;
          animation-direction: alternate-reverse;
        }
        @keyframes aurCsSway {
          from {
            transform: rotate(-1.8deg) translate3d(0, 0, 0);
          }
          to {
            transform: rotate(2.4deg) translate3d(-8px, 6px, 0);
          }
        }

        .aur-dust {
          position: absolute;
          inset: 0;
          z-index: 4;
          width: 100%;
          height: 100%;
          pointer-events: none;
          opacity: 0;
          transition: opacity 2s ease 0.6s;
        }
        .aur-cs.is-in .aur-dust {
          opacity: 1;
        }

        @keyframes aurCsFade {
          from {
            opacity: 0;
            transform: translate3d(0, 16px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        @keyframes aurCsGrowX {
          to {
            transform: scaleX(1);
          }
        }
        @keyframes aurCsGrowY {
          to {
            transform: scaleY(1);
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           HEADER
           ═══════════════════════════════════════════════════════════════════ */
        .aur-cs__head {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: end;
          column-gap: clamp(28px, 3.4vw, 52px);
          row-gap: 22px;
          margin-bottom: clamp(28px, 3vw, 44px);
        }
        .aur-cs__eyebrow {
          margin: 0 0 clamp(14px, 1.6vw, 22px);
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: 0.64rem;
          letter-spacing: 0.42em;
          text-transform: uppercase;
          color: var(--ink);
        }
        .aur-letter {
          display: inline-block;
          opacity: 0;
        }
        .aur-cs.is-in .aur-letter {
          animation: aurCsLetter 0.9s var(--ease-expo) both;
        }
        @keyframes aurCsLetter {
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

        .aur-cs__title {
          display: flex;
          flex-direction: column;
          margin: 0;
          font-weight: 400;
          font-size: clamp(2.5rem, 4.4vw, 4.1rem);
          line-height: 1.02;
          letter-spacing: -0.012em;
          color: #fbf4ea;
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
        .aur-cs.is-in .aur-line__in {
          animation: aurCsRise 1.35s var(--ease-expo) both;
        }
        .aur-line__in--accent {
          font-style: italic;
          padding-right: 0.08em;
          background: linear-gradient(95deg, #d8bfae 0%, #b99a84 45%, #e6cfbc 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }
        .aur-cs.is-in .aur-line__in--accent {
          animation: aurCsRise 1.35s var(--ease-expo) both, aurCsShimmer 8s ease-in-out 1.8s infinite alternate;
        }
        @keyframes aurCsRise {
          from {
            transform: translate3d(0, 115%, 0) rotate(3deg);
          }
          to {
            transform: translate3d(0, 0, 0) rotate(0);
          }
        }
        @keyframes aurCsShimmer {
          from {
            background-position: 0% 50%;
          }
          to {
            background-position: 100% 50%;
          }
        }

        .aur-cs__desc {
          position: relative;
          align-self: center;
          margin-top: clamp(24px, 2.6vw, 38px);
          padding-left: clamp(20px, 2.2vw, 30px);
          opacity: 0;
        }
        .aur-cs__desc::before {
          content: '';
          position: absolute;
          left: 0;
          top: -4px;
          bottom: -4px;
          width: 1px;
          background: var(--line);
          transform: scaleY(0);
          transform-origin: top;
        }
        .aur-cs.is-in .aur-cs__desc {
          animation: aurCsFade 1.2s ease 0.7s both;
        }
        .aur-cs.is-in .aur-cs__desc::before {
          animation: aurCsGrowY 1.2s var(--ease-out) 0.6s both;
        }
        .aur-cs__desc p {
          margin: 0;
          max-width: 30ch;
          font-size: clamp(0.92rem, 1vw, 1.02rem);
          line-height: 1.55;
          color: var(--ink);
        }

        .aur-cs__all {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          margin-bottom: clamp(30px, 3vw, 46px);
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: 0.76rem;
          letter-spacing: 0.02em;
          color: var(--ink);
          text-decoration: none;
          white-space: nowrap;
          opacity: 0;
        }
        .aur-cs.is-in .aur-cs__all {
          animation: aurCsFade 1.2s ease 0.9s both;
        }
        .aur-cs__all svg {
          transition: transform 0.45s var(--ease-out);
        }
        .aur-cs__all:hover svg {
          transform: translateX(5px);
        }

        /* ═══════════════════════════════════════════════════════════════════
           CARDS
           ═══════════════════════════════════════════════════════════════════ */
        .aur-cols {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: clamp(10px, 1.2vw, 18px);
          touch-action: pan-y;
        }
        .aur-col {
          min-width: 0;
        }
        .aur-col[data-span='2'] {
          grid-column: span 2;
        }

        .aur-col__card {
          --tx: 0;
          --ty: 0;
          --gx: 50%;
          --gy: 50%;
          position: relative;
          display: block;
          height: var(--card-h);
          overflow: hidden;
          color: var(--ink);
          text-decoration: none;
          background: #1a1410;
          border: 1px solid rgba(243, 234, 223, 0.16);
          box-shadow: 0 30px 60px -30px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.06);
          transform: perspective(1000px) rotateX(calc(var(--ty) * -5deg)) rotateY(calc(var(--tx) * 6deg));
          transition: transform 0.6s var(--ease-out), border-color 0.5s ease, filter 0.6s ease, box-shadow 0.6s ease;
          clip-path: inset(100% 0 0 0);
          will-change: transform;
        }
        .aur-cols.is-next .aur-col__card {
          clip-path: inset(0 0 0 100%);
        }
        .aur-cols.is-prev .aur-col__card {
          clip-path: inset(0 100% 0 0);
        }
        .aur-cs.is-in .aur-col__card {
          animation: aurCsRiseOpen 1.5s var(--ease-wipe) calc(var(--i) * 130ms + 100ms) both;
        }
        .aur-cs.is-in .aur-cols.is-next .aur-col__card {
          animation-name: aurCsWipeNext;
        }
        .aur-cs.is-in .aur-cols.is-prev .aur-col__card {
          animation-name: aurCsWipePrev;
        }
        @keyframes aurCsRiseOpen {
          from {
            clip-path: inset(100% 0 0 0);
          }
          to {
            clip-path: inset(0 0 0 0);
          }
        }
        @keyframes aurCsWipeNext {
          from {
            clip-path: inset(0 0 0 100%);
          }
          to {
            clip-path: inset(0 0 0 0);
          }
        }
        @keyframes aurCsWipePrev {
          from {
            clip-path: inset(0 100% 0 0);
          }
          to {
            clip-path: inset(0 0 0 0);
          }
        }
        .aur-col__card:hover {
          border-color: rgba(243, 234, 223, 0.42);
          box-shadow: 0 40px 70px -30px rgba(0, 0, 0, 0.85), 0 0 40px -10px rgba(255, 206, 150, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }
        /* dim siblings while one is hovered */
        .aur-cols:hover .aur-col:not(:hover) .aur-col__card {
          filter: brightness(0.68) saturate(0.85);
        }

        /* photo layers: parallax → Ken Burns → hover zoom */
        .aur-col__par {
          position: absolute;
          inset: -7%;
          transform: translate3d(
            calc(var(--mx) * -16px * var(--depth)),
            calc(var(--my) * -10px * var(--depth) + var(--sp) * var(--sd) * 1px),
            0
          );
          transition: transform 0.9s cubic-bezier(0.2, 0.7, 0.2, 1);
          will-change: transform;
        }
        .aur-col__kb {
          position: absolute;
          inset: 0;
          transform: scale(1.2);
        }
        .aur-cs.is-in .aur-col__kb {
          animation: aurCsKB 2.6s var(--ease-out) calc(var(--i) * 130ms + 150ms) both;
        }
        @keyframes aurCsKB {
          from {
            transform: scale(1.2) translate3d(1.4%, 0.8%, 0);
          }
          to {
            transform: scale(1) translate3d(0, 0, 0);
          }
        }
        .aur-col__kb img,
        .aur-col__fallback {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scale(1);
          transition: transform 1.4s var(--ease-out);
          -webkit-user-drag: none;
        }
        .aur-col__fallback {
          background:
            linear-gradient(120deg, transparent 32%, rgba(255, 226, 180, 0.13) 46%, transparent 60%),
            radial-gradient(ellipse 80% 55% at 30% 22%, var(--t1), transparent 72%),
            linear-gradient(165deg, var(--t2), #120d0a);
        }
        .aur-col__card:hover .aur-col__kb img,
        .aur-col__card:hover .aur-col__fallback {
          transform: scale(1.07);
        }

        .aur-col__shade {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(180deg, rgba(10, 7, 5, 0.32) 0%, rgba(10, 7, 5, 0) 26%),
            linear-gradient(180deg, rgba(10, 7, 5, 0) 44%, rgba(12, 8, 6, 0.62) 68%, rgba(12, 8, 6, 0.92) 100%);
        }
        .aur-col__glare {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0;
          mix-blend-mode: soft-light;
          background: radial-gradient(circle 240px at var(--gx) var(--gy), rgba(255, 232, 196, 0.55), transparent 70%);
          transition: opacity 0.5s ease;
        }
        .aur-col__card:hover .aur-col__glare {
          opacity: 1;
        }

        /* number + line */
        .aur-col__top {
          position: absolute;
          top: 22px;
          left: 22px;
          right: 22px;
          display: flex;
          align-items: center;
          gap: 14px;
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: 0.72rem;
          letter-spacing: 0.1em;
          color: rgba(243, 234, 223, 0.9);
          opacity: 0;
        }
        .aur-col__top i {
          display: block;
          width: 34px;
          height: 1px;
          background: var(--line);
          transform: scaleX(0);
          transform-origin: left;
          transition: width 0.6s var(--ease-out);
        }
        .aur-cs.is-in .aur-col__top {
          animation: aurCsFade 1s ease calc(var(--i) * 130ms + 800ms) both;
        }
        .aur-cs.is-in .aur-col__top i {
          animation: aurCsGrowX 1.2s var(--ease-out) calc(var(--i) * 130ms + 1000ms) both;
        }
        .aur-col__card:hover .aur-col__top i {
          width: 64px;
        }

        /* title, text, arrow */
        .aur-col__body {
          position: absolute;
          left: 22px;
          right: 22px;
          bottom: 22px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          opacity: 0;
          transition: transform 0.7s var(--ease-out);
        }
        .aur-cs.is-in .aur-col__body {
          animation: aurCsFade 1.1s ease calc(var(--i) * 130ms + 750ms) both;
        }
        .aur-col__card:hover .aur-col__body {
          transform: translate3d(0, -4px, 0);
        }
        .aur-col__title {
          display: block;
          font-size: clamp(1.4rem, 1.95vw, 1.95rem);
          font-weight: 400;
          line-height: 1.1;
          color: #fbf4ea;
        }
        .aur-col__text {
          display: block;
          margin-top: 12px;
          font-size: clamp(0.82rem, 0.9vw, 0.92rem);
          line-height: 1.5;
          color: var(--ink-soft);
        }
        .aur-col__go {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          margin-top: 20px;
          border-radius: 50%;
          border: 1px solid rgba(243, 234, 223, 0.6);
          background: rgba(20, 15, 11, 0.15);
          -webkit-backdrop-filter: blur(4px);
          backdrop-filter: blur(4px);
          color: var(--ink);
          transition: background 0.4s ease, color 0.4s ease, border-color 0.4s ease, transform 0.5s var(--ease-out);
        }
        .aur-col__card:hover .aur-col__go {
          background: var(--ink);
          border-color: var(--ink);
          color: #1a1410;
          transform: scale(1.08);
        }
        .aur-col__go svg {
          transition: transform 0.45s var(--ease-out);
        }
        .aur-col__card:hover .aur-col__go svg {
          transform: translateX(2px);
        }

        .aur-magnet {
          display: inline-block;
          transition: transform 0.7s var(--ease-out);
          will-change: transform;
        }
        .aur-magnet.is-magnet {
          transition-duration: 0.22s;
        }

        /* ═══════════════════════════════════════════════════════════════════
           FOOTER: counter + tabs, crosshair
           ═══════════════════════════════════════════════════════════════════ */
        .aur-foot {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          margin-top: clamp(26px, 3vw, 44px);
        }
        .aur-foot__left {
          flex: 1 1 auto;
          display: flex;
          align-items: center;
          gap: clamp(20px, 2.4vw, 36px);
          min-width: 0;
          font-family: var(--aur-sans), system-ui, sans-serif;
          opacity: 0;
        }
        .aur-cs.is-in .aur-foot__left {
          animation: aurCsFade 1.2s ease 1.1s both;
        }
        .aur-foot__count {
          display: inline-flex;
          align-items: baseline;
          gap: 10px;
          font-size: 0.74rem;
          letter-spacing: 0.08em;
          color: var(--ink);
        }
        .aur-foot__count i {
          display: block;
          align-self: center;
          width: 26px;
          height: 1px;
          background: var(--line);
        }
        .aur-foot__count > span:last-child {
          opacity: 0.55;
        }
        .aur-roll {
          display: inline-flex;
          height: 1.3em;
          line-height: 1.3em;
          overflow: hidden;
        }
        .aur-roll__window {
          display: block;
          height: 1.3em;
          overflow: hidden;
        }
        .aur-roll__col {
          display: flex;
          flex-direction: column;
          transition: transform 0.9s var(--ease-wipe);
        }
        .aur-roll__col span {
          display: block;
          height: 1.3em;
        }

        .aur-foot__tabs {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px clamp(14px, 1.8vw, 26px);
        }
        .aur-foot__tabs button {
          position: relative;
          padding: 6px 0;
          border: 0;
          background: transparent;
          color: rgba(243, 234, 223, 0.5);
          font: inherit;
          font-size: 0.72rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          cursor: pointer;
          transition: color 0.4s ease;
        }
        .aur-foot__tabs button::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 1px;
          background: var(--ink);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.6s var(--ease-out);
        }
        .aur-foot__tabs button:hover {
          color: var(--ink);
        }
        .aur-foot__tabs button.is-active {
          color: var(--ink);
        }
        .aur-foot__tabs button.is-active::after {
          transform: scaleX(1);
        }
        .aur-foot__rule {
          display: block;
          flex: 1 1 60px;
          max-width: 200px;
          height: 1px;
          background: linear-gradient(90deg, var(--line), transparent);
        }

        /* crosshair, bottom right (drifts with the mouse) */
        .aur-target {
          position: relative;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          width: 60px;
          height: 60px;
          margin-right: 30px;
          opacity: 0;
          transform: translate3d(calc(var(--mx) * 30px), calc(var(--my) * 18px), 0);
          transition: transform 0.9s cubic-bezier(0.2, 0.7, 0.2, 1);
        }
        .aur-cs.is-in .aur-target {
          opacity: 1;
          transition: opacity 1.4s ease 1.4s, transform 0.9s cubic-bezier(0.2, 0.7, 0.2, 1);
        }
        .aur-target__ring {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 1px solid rgba(243, 234, 223, 0.4);
          animation: aurCsRing 4.5s ease-in-out infinite;
        }
        .aur-target__ring--in {
          inset: 17px;
          border-color: rgba(243, 234, 223, 0.6);
          animation-delay: 1.2s;
        }
        @keyframes aurCsRing {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.85;
          }
          50% {
            transform: scale(1.12);
            opacity: 0.4;
          }
        }
        .aur-target b {
          position: relative;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 0 12px 2px rgba(255, 226, 180, 0.7);
        }
        .aur-target__h {
          position: absolute;
          top: 50%;
          width: 44px;
          height: 1px;
          background: rgba(243, 234, 223, 0.32);
        }
        .aur-target__h--l {
          right: 100%;
          margin-right: 8px;
          background: linear-gradient(270deg, rgba(243, 234, 223, 0.35), transparent);
        }
        .aur-target__h--r {
          left: 100%;
          margin-left: 8px;
          background: linear-gradient(90deg, rgba(243, 234, 223, 0.35), transparent);
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
          width: 44px;
          height: 44px;
          margin: -22px 0 0 -22px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.55);
          background: rgba(255, 255, 255, 0);
          transition: transform 0.5s var(--ease-out), background 0.4s ease, border-color 0.4s ease;
        }
        .aur-cursor.is-grow::before {
          transform: scale(1.5);
          background: rgba(255, 255, 255, 0.07);
          border-color: rgba(255, 255, 255, 0.85);
        }
        .aur-cursor.has-label::before {
          transform: scale(1.9);
          background: rgba(20, 15, 11, 0.45);
          border-color: rgba(255, 255, 255, 0.5);
          -webkit-backdrop-filter: blur(6px);
          backdrop-filter: blur(6px);
        }
        .aur-cursor__label {
          position: absolute;
          top: 0;
          left: 0;
          transform: translate(-50%, -50%);
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: 0.66rem;
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
          transition: transform 0.3s ease;
        }
        .aur-cursor-dot.is-grow::before {
          transform: scale(0);
        }

        /* ═══════════════════════════════════════════════════════════════════
           FOCUS + PAUSE
           ═══════════════════════════════════════════════════════════════════ */
        .aur-cs a:focus-visible,
        .aur-cs button:focus-visible {
          outline: 2px solid #cdb19c;
          outline-offset: 4px;
        }
        .aur-cs.is-offscreen::before,
        .aur-cs.is-offscreen .aur-cs__light,
        .aur-cs.is-offscreen .aur-cs__leaves,
        .aur-cs.is-offscreen .aur-target__ring,
        .aur-cs.is-offscreen .aur-line__in--accent {
          animation-play-state: paused;
        }

        /* ═══════════════════════════════════════════════════════════════════
           RESPONSIVE
           ═══════════════════════════════════════════════════════════════════ */
        @media (max-width: 1100px) {
          .aur-cols {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .aur-cs {
            --card-h: clamp(320px, 52vw, 460px);
          }
        }
        @media (max-width: 980px) {
          .aur-cs__head {
            grid-template-columns: 1fr;
            align-items: start;
          }
          .aur-cs__desc {
            margin-top: 0;
            padding-left: 0;
          }
          .aur-cs__desc::before {
            display: none;
          }
          .aur-cs__all {
            margin-bottom: 0;
          }
        }
        @media (max-width: 560px) {
          .aur-cs {
            --card-h: 380px;
          }
          .aur-cols {
            grid-template-columns: 1fr;
          }
          .aur-col[data-span='2'] {
            grid-column: auto;
          }
          .aur-target {
            display: none;
          }
          .aur-foot__rule {
            display: none;
          }
        }
        @media (pointer: coarse) {
          .aur-cursor,
          .aur-cursor-dot {
            display: none;
          }
          .aur-col__card {
            transform: none;
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           REDUCED MOTION
           ═══════════════════════════════════════════════════════════════════ */
        @media (prefers-reduced-motion: reduce) {
          .aur-cs *,
          .aur-cs *::before,
          .aur-cs *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
          .aur-dust {
            display: none;
          }
          .aur-col__card {
            transform: none;
          }
        }
      `}</style>
    </section>
  );
}