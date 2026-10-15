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
import './styles/ProductSection.css';

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

      {/* Rules whose class names are defined differently in other sections stay here: see src/components/styles/README.md */}
      <style jsx global>{`
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
        .aur-line {
          display: block;
          overflow: hidden;
          padding: 0.04em 0.2em 0.14em 0;
          margin-bottom: -0.1em;
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
        .aur-roll__col span {
          display: block;
          height: 1.3em;
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

        /* ═══════════════════════════════════════════════════════════════════
           REDUCED MOTION
           ═══════════════════════════════════════════════════════════════════ */
        @media (prefers-reduced-motion: reduce) {
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