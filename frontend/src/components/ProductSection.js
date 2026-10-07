'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AURELIA · PRODUCT SECTION ("The Collection") — sand / editorial, animated
 * ─────────────────────────────────────────────────────────────────────────────
 *  Place at: frontend/src/components/ProductSection.js
 *
 *  Animations (same language as the Hero)
 *   • Everything plays when the section scrolls into view
 *   • Eyebrow letters stagger in, heading lines rise out of a mask
 *   • Images wipe open with a stagger, then settle with a Ken Burns zoom
 *   • Changing page wipes the row in from the direction you navigated
 *   • Mouse parallax + scroll parallax on the images (each at its own depth)
 *   • Drifting window-light, animated film grain, arc that slowly floats
 *   • Golden dust that gets pushed away by the cursor
 *   • Prices count up, hairlines draw themselves, page counter rolls
 *   • Magnetic arrow buttons, custom cursor ring with labels
 *   • Hovering one piece softly dims the others
 *   • Drag / swipe / ← → keys change page
 *   • Reduced-motion + touch fallbacks
 *
 *  Data: loads products from your backend, three per page.
 *  Images: full URLs and uploaded files (/uploads/...) both work via imageSrc().
 *
 *  Props
 *   apiUrl        default: API_URL from lib/imageUrl.js
 *   endpoint      default: '/api/products'
 *   query         extra query string, e.g. 'limit=9'
 *   eyebrow, title, titleAccent, description, viewAllHref — copy overrides
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import { API_URL, imageSrc } from '@/lib/imageUrl';

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

const pad = (n) => String(n).padStart(2, '0');

const formatPKR = (n) => {
  const value = Number(n);
  if (!Number.isFinite(value)) return 'Rs —';
  return `Rs ${value.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
};

const normalizeProduct = (raw, i) => {
  const id = raw._id || raw.id || raw.slug || `item-${i}`;
  const image =
    raw.image ||
    (Array.isArray(raw.images) ? raw.images[0] : null) ||
    raw.imageUrl ||
    raw.thumbnail ||
    '';
  const href = raw.href || (raw.slug ? `/shop/${raw.slug}` : `/shop/${id}`);
  return {
    id,
    name: raw.name || raw.title || 'Untitled piece',
    price: raw.price ?? raw.amount ?? 0,
    image: imageSrc(image),
    href,
  };
};

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

/* ═════════════════════════════════════════════════════════════════════════════
   ICONS
   ═════════════════════════════════════════════════════════════════════════════ */

const ArrowRight = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12h16M14 6l6 6-6 6" />
  </svg>
);

const ArrowLeft = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 12H4M10 6l-6 6 6 6" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 11A8 8 0 1 0 18.5 15.5M20 5v6h-6" />
  </svg>
);

/* ═════════════════════════════════════════════════════════════════════════════
   HOOKS + SMALL COMPONENTS
   ═════════════════════════════════════════════════════════════════════════════ */

/** Element leans toward the cursor when it gets close. */
function useMagnetic(strength = 0.4, radius = 50) {
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

function Magnetic({ children, strength = 0.4, radius = 50 }) {
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

/** Price that counts up once it is revealed. */
function Price({ value, run, delay = 0 }) {
  const target = Number(value);
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!Number.isFinite(target) || !run) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setN(target);
      return undefined;
    }

    let raf = 0;
    let startTs = 0;
    const duration = 1400;

    const step = (ts) => {
      if (!startTs) startTs = ts;
      const p = Math.min((ts - startTs) / duration, 1);
      setN(Math.round(target * (1 - Math.pow(1 - p, 4))));
      if (p < 1) raf = requestAnimationFrame(step);
    };

    const t = setTimeout(() => {
      raf = requestAnimationFrame(step);
    }, delay);

    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
    };
  }, [target, run, delay]);

  if (!Number.isFinite(target)) return 'Rs —';
  return `Rs ${n.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
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
      r: rand(0.5, 2.2),
      vx: rand(-0.12, 0.26),
      vy: rand(-0.45, -0.06),
      alpha: rand(0.25, 0.85),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.008, 0.026),
      halo: rand(3, 6),
    });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = width < 820 ? 18 : 52;
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
        ctx.fillStyle = `rgba(255, 226, 170, ${(a * 0.14).toFixed(3)})`;
        ctx.arc(p.x, p.y, p.r * p.halo, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 244, 220, ${(a * 0.9).toFixed(3)})`;
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

/* ═════════════════════════════════════════════════════════════════════════════
   PRODUCT SECTION
   ═════════════════════════════════════════════════════════════════════════════ */

export default function ProductSection({
  apiUrl = API_URL,
  endpoint = '/api/products',
  query = '',
  eyebrow = 'The collection',
  title = 'Pieces worth',
  titleAccent = 'remembering.',
  description = 'Timeless pieces, thoughtfully curated for those who appreciate the beauty in the details.',
  viewAllHref = '/shop',
}) {
  const rootRef = useRef(null);
  const dragStart = useRef(null);
  const justDragged = useRef(false);
  const requestId = useRef(0);

  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | error
  const [page, setPage] = useState({ index: 0, dir: 1 });
  const [revealed, setRevealed] = useState(false); // has been scrolled into view (once)
  const [onScreen, setOnScreen] = useState(false); // currently in view
  const [tabHidden, setTabHidden] = useState(false);

  /* ── data ────────────────────────────────────────────────────────────── */
  const load = useCallback(() => {
    const id = ++requestId.current;
    const controller = new AbortController();
    setStatus('loading');

    const url = `${apiUrl}${endpoint}${query ? `?${query}` : ''}`;

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed with ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (id !== requestId.current) return;
        const list = Array.isArray(data) ? data : data.products || data.data || [];
        setProducts(list.map(normalizeProduct));
        setStatus('ready');
      })
      .catch((err) => {
        if (id !== requestId.current || err.name === 'AbortError') return;
        setStatus('error');
      });

    return () => controller.abort();
  }, [apiUrl, endpoint, query]);

  useEffect(() => {
    const cancel = load();
    return cancel;
  }, [load]);

  useEffect(() => {
    setPage({ index: 0, dir: 1 });
  }, [products]);

  const groups = useMemo(() => chunk(products, 3), [products]);
  const total = groups.length;
  const current = groups[page.index] || [];
  const canCycle = total > 1;

  const next = useCallback(() => {
    if (total < 2) return;
    setPage((p) => ({ index: (p.index + 1) % total, dir: 1 }));
  }, [total]);

  const previous = useCallback(() => {
    if (total < 2) return;
    setPage((p) => ({ index: (p.index - 1 + total) % total, dir: -1 }));
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

  /* ── scroll parallax (writes a CSS variable, no re-render) ───────────── */
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

  /* ── pointer: mouse parallax + drag to change page ───────────────────── */
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
    if (!e.target.closest || !e.target.closest('.aur-shop__row')) return;
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

  /* ── render ──────────────────────────────────────────────────────────── */
  const navInCaption = current.length >= 2;

  const nav = canCycle ? (
    <div className="aur-shop__nav" role="group" aria-label="Browse pieces">
      <Magnetic>
        <button type="button" onClick={previous} aria-label="Previous pieces" data-cursor="Prev">
          <ArrowLeft size={15} />
        </button>
      </Magnetic>
      <Magnetic>
        <button type="button" className="is-primary" onClick={next} aria-label="Next pieces" data-cursor="Next">
          <ArrowRight size={15} />
        </button>
      </Magnetic>
      <span className="aur-shop__count" aria-live="polite">
        <Roller value={page.index} total={total} />
        <em>/</em>
        <span>{pad(total)}</span>
      </span>
    </div>
  ) : null;

  return (
    <section
      ref={rootRef}
      className={`${serif.variable} ${sans.variable} aur-shop ${revealed ? 'is-in' : ''} ${onScreen ? '' : 'is-offscreen'}`}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        dragStart.current = null;
      }}
      onClickCapture={onClickCapture}
    >
      <div className="aur-shop__light" aria-hidden="true" />
      <div className="aur-shop__light aur-shop__light--b" aria-hidden="true" />
      <DustCanvas running={revealed && onScreen && !tabHidden} />

      <div className="aur-shop__head">
        <div className="aur-shop__heading">
          <p className="aur-shop__eyebrow">
            <SplitLetters text={eyebrow} start={120} />
          </p>
          <h2 className="aur-shop__title">
            <span className="aur-line">
              <span className="aur-line__in" style={{ animationDelay: '220ms' }}>
                {title}
              </span>
            </span>
            <span className="aur-line aur-line--indent">
              <span className="aur-line__in aur-line__in--accent" style={{ animationDelay: '360ms' }}>
                {titleAccent}
              </span>
            </span>
          </h2>
        </div>

        <div className="aur-shop__desc">
          <p>{description}</p>
        </div>

        <Link href={viewAllHref} className="aur-shop__all" data-cursor="Shop">
          <span>View all pieces</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {status === 'loading' && <SkeletonRow />}

      {status === 'error' && (
        <div className="aur-shop__state">
          <p>We couldn&apos;t load the collection right now.</p>
          <button type="button" onClick={load}>
            <RefreshIcon /> Try again
          </button>
        </div>
      )}

      {status === 'ready' && products.length === 0 && (
        <div className="aur-shop__state">
          <p>No pieces have been added yet — check back soon.</p>
        </div>
      )}

      {status === 'ready' && current.length > 0 && (
        <>
          <div className={`aur-shop__row ${page.dir === -1 ? 'is-prev' : 'is-next'}`} key={page.index}>
            {current.map((p, i) => (
              <article className={`aur-piece aur-piece--${i}`} key={p.id} style={{ '--i': i }}>
                <Link href={p.href} className="aur-piece__frame" aria-label={p.name} data-cursor="View">
                  <span className="aur-piece__par">
                    <span className="aur-piece__kb">
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image} alt={p.name} loading="lazy" draggable={false} />
                      ) : (
                        <span className="aur-piece__placeholder" aria-hidden="true" />
                      )}
                    </span>
                  </span>
                </Link>

                <div className="aur-piece__cap">
                  <Link href={p.href} className="aur-piece__meta">
                    <strong>{p.name}</strong>
                    <span>
                      <Price value={p.price} run={revealed} delay={750 + i * 140} />
                    </span>
                  </Link>
                  <span className="aur-piece__rule" aria-hidden="true" />
                  {i === 1 && navInCaption && nav}
                </div>
              </article>
            ))}
          </div>

          {!navInCaption && nav && <div className="aur-shop__nav-fallback">{nav}</div>}
        </>
      )}

      <SectionCursor rootRef={rootRef} enabled={revealed} />

      <style jsx global>{`
        /* ═══════════════════════════════════════════════════════════════════
           ROOT
           ═══════════════════════════════════════════════════════════════════ */
        .aur-shop {
          --sand-1: #d2c2ac;
          --sand-2: #c2b199;
          --sand-3: #b8a68e;
          --ink: #2a2018;
          --ink-soft: rgba(42, 32, 24, 0.72);
          --line: rgba(42, 32, 24, 0.28);
          --gutter: clamp(20px, 8.9vw, 150px);
          --ease-out: cubic-bezier(0.22, 0.8, 0.2, 1);
          --ease-expo: cubic-bezier(0.19, 1, 0.22, 1);
          --ease-wipe: cubic-bezier(0.76, 0, 0.18, 1);
          --frame-h: clamp(280px, 27.5vw, 430px);
          --mx: 0;
          --my: 0;
          --sp: 0;
          position: relative;
          overflow: hidden;
          isolation: isolate;
          color: var(--ink);
          font-family: var(--aur-serif), Georgia, serif;
          padding: clamp(40px, 4vw, 64px) var(--gutter) clamp(44px, 5vw, 76px);
          background:
            radial-gradient(ellipse 60% 55% at 30% 0%, rgba(255, 244, 222, 0.5), transparent 70%),
            linear-gradient(165deg, var(--sand-1) 0%, var(--sand-2) 55%, var(--sand-3) 100%);
        }
        .aur-shop a,
        .aur-shop button {
          -webkit-tap-highlight-color: transparent;
        }

        /* film grain (jitters like the hero) */
        .aur-shop::before {
          content: '';
          position: absolute;
          inset: -10%;
          z-index: -1;
          pointer-events: none;
          opacity: 0.16;
          mix-blend-mode: multiply;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
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

        /* arc, top right — slowly floats */
        .aur-shop::after {
          content: '';
          position: absolute;
          z-index: -1;
          pointer-events: none;
          width: 1500px;
          height: 1500px;
          top: -1380px;
          right: -420px;
          border-radius: 50%;
          border: 1px solid rgba(255, 250, 240, 0.4);
          animation: aurArc 16s ease-in-out infinite alternate;
        }
        @keyframes aurArc {
          from {
            transform: translate3d(0, 0, 0) rotate(0deg);
          }
          to {
            transform: translate3d(-30px, 26px, 0) rotate(2.5deg);
          }
        }

        /* window light that drifts across the wall */
        .aur-shop__light {
          position: absolute;
          inset: -8%;
          z-index: -1;
          pointer-events: none;
          background:
            linear-gradient(112deg, transparent 8%, rgba(255, 246, 228, 0.36) 20%, transparent 31%),
            linear-gradient(112deg, transparent 38%, rgba(255, 246, 228, 0.24) 47%, transparent 56%),
            linear-gradient(112deg, transparent 62%, rgba(70, 48, 30, 0.13) 72%, transparent 82%);
          animation: aurLight 11s ease-in-out infinite alternate;
        }
        .aur-shop__light--b {
          background: radial-gradient(45% 55% at 85% 10%, rgba(255, 240, 210, 0.5), transparent 70%);
          animation-duration: 15s;
          animation-direction: alternate-reverse;
        }
        @keyframes aurLight {
          from {
            opacity: 0.55;
            transform: translate3d(-2.5%, 0, 0) skewX(0deg);
          }
          to {
            opacity: 1;
            transform: translate3d(2.5%, 1.5%, 0) skewX(-2deg);
          }
        }

        .aur-dust {
          position: absolute;
          inset: 0;
          z-index: 3;
          width: 100%;
          height: 100%;
          pointer-events: none;
          opacity: 0;
          transition: opacity 2s ease 0.6s;
        }
        .aur-shop.is-in .aur-dust {
          opacity: 1;
        }

        /* ═══════════════════════════════════════════════════════════════════
           HEADER
           ═══════════════════════════════════════════════════════════════════ */
        .aur-shop__head {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: end;
          column-gap: clamp(28px, 3.4vw, 48px);
          row-gap: 22px;
          margin-bottom: clamp(26px, 2.6vw, 36px);
        }
        .aur-shop__eyebrow {
          margin: 0 0 clamp(14px, 1.6vw, 22px);
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: 0.66rem;
          font-weight: 400;
          letter-spacing: 0.42em;
          text-transform: uppercase;
          color: var(--ink);
        }
        .aur-letter {
          display: inline-block;
          opacity: 0;
        }
        .aur-shop.is-in .aur-letter {
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

        .aur-shop__title {
          display: flex;
          flex-direction: column;
          margin: 0;
          font-weight: 400;
          font-size: clamp(2.5rem, 4.3vw, 4rem);
          line-height: 1.02;
          letter-spacing: -0.015em;
        }
        .aur-line {
          display: block;
          overflow: hidden;
          padding: 0.04em 0.2em 0.14em 0;
          margin-bottom: -0.1em;
        }
        .aur-line--indent {
          padding-left: clamp(36px, 4vw, 58px);
        }
        .aur-line__in {
          display: inline-block;
          transform: translate3d(0, 115%, 0) rotate(3deg);
          transform-origin: left bottom;
        }
        .aur-shop.is-in .aur-line__in {
          animation: aurRise 1.35s var(--ease-expo) both;
        }
        .aur-line__in--accent {
          font-style: italic;
          padding-right: 0.08em;
          background: linear-gradient(95deg, #2a2018 0%, #6e4529 48%, #2a2018 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }
        .aur-shop.is-in .aur-line__in--accent {
          animation: aurRise 1.35s var(--ease-expo) both, aurShimmer 8s ease-in-out 1.8s infinite alternate;
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

        .aur-shop__desc {
          position: relative;
          align-self: center;
          margin-top: clamp(22px, 2.4vw, 34px);
          padding-left: clamp(20px, 2.2vw, 30px);
          opacity: 0;
        }
        .aur-shop__desc::before {
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
        .aur-shop.is-in .aur-shop__desc {
          animation: aurFade 1.2s ease 0.7s both;
        }
        .aur-shop.is-in .aur-shop__desc::before {
          animation: aurGrowY 1.2s var(--ease-out) 0.6s both;
        }
        @keyframes aurGrowY {
          to {
            transform: scaleY(1);
          }
        }
        .aur-shop__desc p {
          margin: 0;
          max-width: 27ch;
          font-size: clamp(0.95rem, 1.05vw, 1.05rem);
          line-height: 1.55;
          color: var(--ink);
        }

        .aur-shop__all {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          margin-bottom: clamp(30px, 3vw, 46px);
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: 0.78rem;
          letter-spacing: 0.02em;
          color: var(--ink);
          text-decoration: none;
          white-space: nowrap;
          opacity: 0;
        }
        .aur-shop.is-in .aur-shop__all {
          animation: aurFade 1.2s ease 0.9s both;
        }
        .aur-shop__all::before {
          content: '';
          width: clamp(40px, 5vw, 72px);
          height: 1px;
          margin-right: 6px;
          background: var(--line);
          transform: scaleX(0);
          transform-origin: right;
          transition: width 0.6s var(--ease-out);
        }
        .aur-shop.is-in .aur-shop__all::before {
          animation: aurGrowX 1.3s var(--ease-out) 1s both;
        }
        .aur-shop__all:hover::before {
          width: clamp(60px, 7vw, 100px);
        }
        @keyframes aurGrowX {
          to {
            transform: scaleX(1);
          }
        }
        .aur-shop__all svg {
          transition: transform 0.45s var(--ease-out);
        }
        .aur-shop__all:hover svg {
          transform: translateX(5px);
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
           PRODUCT ROW
           ═══════════════════════════════════════════════════════════════════ */
        .aur-shop__row {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: flex-start;
          gap: clamp(14px, 1.8vw, 26px);
          touch-action: pan-y;
        }
        .aur-piece {
          display: flex;
          flex-direction: column;
          flex: 1.3 1 0;
          min-width: 0;
          --depth: 1;
          --sd: 22;
        }
        .aur-piece--1 {
          flex: 2.66 1 0;
          --depth: 0.6;
          --sd: 34;
        }
        .aur-piece--2 {
          flex: 1 1 0;
          --depth: 1.4;
          --sd: 12;
        }

        /* frame: wipe open */
        .aur-piece__frame {
          position: relative;
          display: block;
          height: var(--frame-h);
          overflow: hidden;
          background: var(--sand-3);
          clip-path: inset(0 0 0 100%);
        }
        .aur-shop__row.is-prev .aur-piece__frame {
          clip-path: inset(0 100% 0 0);
        }
        .aur-shop.is-in .aur-piece__frame {
          animation: aurWipeNext 1.5s var(--ease-wipe) calc(var(--i) * 140ms + 100ms) both;
        }
        .aur-shop.is-in .aur-shop__row.is-prev .aur-piece__frame {
          animation-name: aurWipePrev;
        }
        @keyframes aurWipeNext {
          from {
            clip-path: inset(0 0 0 100%);
          }
          to {
            clip-path: inset(0 0 0 0);
          }
        }
        @keyframes aurWipePrev {
          from {
            clip-path: inset(0 100% 0 0);
          }
          to {
            clip-path: inset(0 0 0 0);
          }
        }

        /* layer 1: mouse + scroll parallax */
        .aur-piece__par {
          position: absolute;
          inset: -8%;
          transform: translate3d(
            calc(var(--mx) * -18px * var(--depth)),
            calc(var(--my) * -10px * var(--depth) + var(--sp) * var(--sd) * 1px),
            0
          );
          transition: transform 0.9s cubic-bezier(0.2, 0.7, 0.2, 1);
          will-change: transform;
        }
        /* layer 2: Ken Burns settle after the wipe */
        .aur-piece__kb {
          position: absolute;
          inset: 0;
          transform: scale(1.22);
        }
        .aur-shop.is-in .aur-piece__kb {
          animation: aurKB 2.6s var(--ease-out) calc(var(--i) * 140ms + 150ms) both;
        }
        @keyframes aurKB {
          from {
            transform: scale(1.22) translate3d(1.6%, 0.8%, 0);
          }
          to {
            transform: scale(1) translate3d(0, 0, 0);
          }
        }
        /* layer 3: hover zoom */
        .aur-piece__kb img,
        .aur-piece__placeholder {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scale(1);
          transition: transform 1.3s var(--ease-out), filter 0.6s ease;
          -webkit-user-drag: none;
        }
        .aur-piece__placeholder {
          background: linear-gradient(135deg, #cdbba4, #aa977f);
        }
        .aur-piece:hover .aur-piece__kb img {
          transform: scale(1.07);
        }
        /* dim the siblings while one is hovered */
        .aur-shop__row:hover .aur-piece:not(:hover) .aur-piece__kb img {
          filter: saturate(0.7) brightness(0.86);
        }

        /* caption */
        .aur-piece__cap {
          display: flex;
          align-items: flex-start;
          gap: clamp(16px, 2vw, 28px);
          margin-top: 16px;
          opacity: 0;
        }
        .aur-shop.is-in .aur-piece__cap {
          animation: aurFade 1.1s ease calc(var(--i) * 140ms + 700ms) both;
        }
        .aur-piece__meta {
          display: flex;
          flex-direction: column;
          gap: 3px;
          color: var(--ink);
          text-decoration: none;
          font-size: 0.86rem;
          line-height: 1.3;
          transition: transform 0.6s var(--ease-out);
        }
        .aur-piece:hover .aur-piece__meta {
          transform: translateX(5px);
        }
        .aur-piece__meta strong {
          align-self: flex-start;
          font-weight: 400;
          background: linear-gradient(currentColor, currentColor) 0 100% / 0 1px no-repeat;
          transition: background-size 0.6s var(--ease-out);
        }
        .aur-piece:hover .aur-piece__meta strong {
          background-size: 100% 1px;
        }
        .aur-piece__meta span {
          color: var(--ink-soft);
          font-variant-numeric: tabular-nums;
        }
        .aur-piece__rule {
          flex: 1 1 auto;
          min-width: 16px;
          height: 1px;
          margin-top: 0.7em;
          background: var(--line);
          transform: scaleX(0);
          transform-origin: left;
          transition: background 0.4s ease;
        }
        .aur-shop.is-in .aur-piece__rule {
          animation: aurGrowX 1.3s var(--ease-out) calc(var(--i) * 140ms + 900ms) both;
        }
        .aur-piece:hover .aur-piece__rule {
          background: rgba(42, 32, 24, 0.6);
        }

        /* ═══════════════════════════════════════════════════════════════════
           NAV
           ═══════════════════════════════════════════════════════════════════ */
        .aur-magnet {
          display: inline-block;
          transition: transform 0.7s var(--ease-out);
          will-change: transform;
        }
        .aur-magnet.is-magnet {
          transition-duration: 0.22s;
        }
        .aur-shop__nav {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
          margin-top: -6px;
        }
        .aur-shop__nav button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          padding: 0;
          border-radius: 50%;
          border: 1px solid transparent;
          background: transparent;
          color: var(--ink);
          cursor: pointer;
          transition: background 0.35s ease, color 0.35s ease, border-color 0.35s ease, transform 0.45s var(--ease-out);
        }
        .aur-shop__nav button.is-primary {
          width: 34px;
          height: 34px;
          border-color: rgba(42, 32, 24, 0.55);
        }
        .aur-shop__nav button:hover {
          background: var(--ink);
          color: var(--sand-1);
          border-color: var(--ink);
          transform: scale(1.1);
        }
        .aur-shop__nav button:active {
          transform: scale(0.92);
        }
        .aur-shop__count {
          display: inline-flex;
          align-items: baseline;
          gap: 5px;
          margin-left: 4px;
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: 0.72rem;
          letter-spacing: 0.06em;
          color: var(--ink);
        }
        .aur-shop__count em {
          font-style: normal;
          opacity: 0.5;
        }
        .aur-shop__count > span:last-child {
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
        .aur-shop__nav-fallback {
          position: relative;
          z-index: 2;
          display: flex;
          justify-content: flex-end;
          margin-top: 18px;
          opacity: 0;
        }
        .aur-shop.is-in .aur-shop__nav-fallback {
          animation: aurFade 1.1s ease 0.9s both;
        }

        /* ═══════════════════════════════════════════════════════════════════
           LOADING / ERROR / EMPTY
           ═══════════════════════════════════════════════════════════════════ */
        .aur-shop__row.is-skeleton .aur-skel {
          flex: 1.3 1 0;
        }
        .aur-shop__row.is-skeleton .aur-skel--wide {
          flex: 2.66 1 0;
        }
        .aur-shop__row.is-skeleton .aur-skel--last {
          flex: 1 1 0;
        }
        .aur-skel__frame {
          height: var(--frame-h);
          background: linear-gradient(100deg, #c4b39c 30%, #d3c4ae 50%, #c4b39c 70%);
          background-size: 200% 100%;
          animation: aurSkel 1.6s ease-in-out infinite;
        }
        .aur-skel__line {
          height: 10px;
          width: 55%;
          margin-top: 18px;
          background: linear-gradient(100deg, #c4b39c 30%, #d3c4ae 50%, #c4b39c 70%);
          background-size: 200% 100%;
          animation: aurSkel 1.6s ease-in-out infinite;
        }
        @keyframes aurSkel {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
        .aur-shop__state {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 70px 20px;
          text-align: center;
          font-size: 1.05rem;
          color: var(--ink-soft);
        }
        .aur-shop__state button {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border-radius: 999px;
          border: 1px solid var(--line);
          background: transparent;
          color: var(--ink);
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: 0.85rem;
          cursor: pointer;
          transition: background 0.3s ease, color 0.3s ease;
        }
        .aur-shop__state button:hover {
          background: var(--ink);
          color: var(--sand-1);
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
          border: 1px solid rgba(42, 32, 24, 0.55);
          background: rgba(42, 32, 24, 0);
          transition: transform 0.5s var(--ease-out), background 0.4s ease, border-color 0.4s ease;
        }
        .aur-cursor.is-grow::before {
          transform: scale(1.5);
          background: rgba(42, 32, 24, 0.06);
          border-color: rgba(42, 32, 24, 0.8);
        }
        .aur-cursor.has-label::before {
          transform: scale(1.9);
          background: rgba(30, 22, 16, 0.72);
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
          font-size: 0.66rem;
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
        .aur-shop a:focus-visible,
        .aur-shop button:focus-visible {
          outline: 2px solid #8a5a3a;
          outline-offset: 4px;
        }
        .aur-shop.is-offscreen::before,
        .aur-shop.is-offscreen::after,
        .aur-shop.is-offscreen .aur-shop__light,
        .aur-shop.is-offscreen .aur-line__in--accent {
          animation-play-state: paused;
        }

        /* ═══════════════════════════════════════════════════════════════════
           RESPONSIVE
           ═══════════════════════════════════════════════════════════════════ */
        @media (max-width: 980px) {
          .aur-shop__head {
            grid-template-columns: 1fr;
            align-items: start;
          }
          .aur-shop__desc {
            margin-top: 0;
            padding-left: 0;
          }
          .aur-shop__desc::before {
            display: none;
          }
          .aur-shop__all {
            margin-bottom: 0;
          }
          .aur-shop__all::before {
            display: none;
          }
        }
        @media (max-width: 680px) {
          .aur-shop {
            --frame-h: 360px;
          }
          .aur-shop__row,
          .aur-shop__row.is-skeleton {
            flex-direction: column;
            gap: 28px;
          }
          .aur-piece,
          .aur-piece--1,
          .aur-piece--2,
          .aur-shop__row.is-skeleton .aur-skel,
          .aur-shop__row.is-skeleton .aur-skel--wide,
          .aur-shop__row.is-skeleton .aur-skel--last {
            flex: none;
            width: 100%;
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
          .aur-shop *,
          .aur-shop *::before,
          .aur-shop *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
          .aur-dust {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}

/** Shimmering placeholders shown while the backend responds. */
function SkeletonRow() {
  return (
    <div className="aur-shop__row is-skeleton" aria-hidden="true">
      <div className="aur-skel">
        <div className="aur-skel__frame" />
        <div className="aur-skel__line" />
      </div>
      <div className="aur-skel aur-skel--wide">
        <div className="aur-skel__frame" />
        <div className="aur-skel__line" />
      </div>
      <div className="aur-skel aur-skel--last">
        <div className="aur-skel__frame" />
        <div className="aur-skel__line" />
      </div>
    </div>
  );
}