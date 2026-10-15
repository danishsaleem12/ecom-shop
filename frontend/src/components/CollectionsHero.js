'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AURELIA · COLLECTIONS · HERO  (nav-free)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Place at: frontend/src/app/components/CollectionsHero.js
 *  Use:      <Navbar /> <CollectionsHero />   (top of the Collections page)
 *
 *  Same visual/animation language as Hero.js / ProductSection.js, trimmed
 *  down to just the hero — no bundled nav bar, search overlay, or mobile
 *  menu here anymore, since your site already has its own Navbar.js
 *  handling all of that. Sits full-bleed behind it exactly like Hero.js does.
 *
 *  What's inside
 *   • Full-bleed photo with mouse parallax + a slow Ken Burns zoom,
 *     animated film grain, a soft directional shade so the copy stays
 *     legible, and drifting golden dust (same motif as every other section)
 *   • Two clusters of painterly olive-branch leaves framing the photo,
 *     swaying gently
 *   • Eyebrow with a drawn rule, three-line masked heading reveal with an
 *     italic gradient accent line, description, and a magnetic CTA whose
 *     circle rotates and fills on hover
 *   • A bouncing scroll cue at the bottom, a custom cursor ring that grows
 *     and labels itself over every interactive element
 *   • Reduced-motion + touch fallbacks throughout
 *
 *  Images
 *   IMAGE below is a different Unsplash placeholder from the last version —
 *   swap it for your own photography whenever it's ready, everything else
 *   keeps working unchanged.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import './styles/CollectionsHero.css';

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
   DATA — edit copy / image here
   ═════════════════════════════════════════════════════════════════════════════ */

const IMAGE = 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1800&q=80';
const IMAGE_ALT = 'Woman in flowing linen standing on a sunlit terrace overlooking the coast';

/* ═════════════════════════════════════════════════════════════════════════════
   ICONS
   ═════════════════════════════════════════════════════════════════════════════ */

const ArrowRight = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12h16M14 6l6 6-6 6" />
  </svg>
);

const ArrowDown = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 4v16M6 14l6 6 6-6" />
  </svg>
);

/* ═════════════════════════════════════════════════════════════════════════════
   HOOKS
   ═════════════════════════════════════════════════════════════════════════════ */

/** Element leans toward the cursor when it gets close. */
function useMagnetic(strength = 0.3, radius = 60) {
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

function Magnetic({ children, strength = 0.3, radius = 60, className = '' }) {
  const ref = useMagnetic(strength, radius);
  return (
    <span ref={ref} className={`col-magnet ${className}`}>
      {children}
    </span>
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
      x: rand(width * 0.2, width),
      y: initial ? rand(0, height) : height + rand(0, 60),
      r: rand(0.6, 2.5),
      vx: rand(-0.1, 0.26),
      vy: rand(-0.48, -0.08),
      alpha: rand(0.22, 0.9),
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
      const count = width < 820 ? 24 : 68;
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

        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 214, 160, ${(a * 0.16).toFixed(3)})`;
        ctx.arc(p.x, p.y, p.r * p.halo, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 236, 205, ${a.toFixed(3)})`;
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

  return <canvas ref={canvasRef} className="col-hero__dust" aria-hidden="true" />;
}

/** Soft ring that follows the mouse; grows over links and shows data-cursor labels. */
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
      <div ref={ringRef} className={`col-cursor ${visible ? 'is-visible' : ''} ${grow ? 'is-grow' : ''} ${label ? 'has-label' : ''}`} aria-hidden="true">
        <span className="col-cursor__label">{label}</span>
      </div>
      <div ref={dotRef} className={`col-cursor-dot ${visible ? 'is-visible' : ''} ${grow ? 'is-grow' : ''}`} aria-hidden="true" />
    </>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   DECORATIVE OLIVE BRANCH
   ═════════════════════════════════════════════════════════════════════════════ */

/** A painterly olive-branch silhouette in the brand's sage/gold palette. */
function OliveBranch({ className }) {
  const leaves = [
    [40, 30, -28], [64, 54, 34], [86, 80, -46], [104, 108, 26], [128, 138, -58],
    [148, 168, 22], [168, 198, -38], [190, 224, 48], [214, 250, -22], [236, 278, 56],
    [30, 60, 60], [58, 96, -70], [86, 130, 70], [16, 100, 10],
  ];
  return (
    <svg className={className} viewBox="0 0 260 320" aria-hidden="true">
      <path d="M8 6c40 30 72 66 96 118s36 108 30 188" fill="none" stroke="#5c6b3f" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
      {leaves.map(([x, y, r], i) => (
        <ellipse
          key={i}
          cx="0"
          cy="-15"
          rx="9"
          ry="20"
          fill={i % 3 === 0 ? '#71804c' : i % 3 === 1 ? '#8a9a5f' : '#5c6b3f'}
          opacity="0.92"
          transform={`translate(${x} ${y}) rotate(${r})`}
        />
      ))}
    </svg>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   HERO
   ═════════════════════════════════════════════════════════════════════════════ */

export default function CollectionsHero({
  eyebrow = 'Collections',
  titleLines = ['Curated for', 'Every Season,', 'Every Moment.'],
  description = 'Thoughtfully designed collections for modern life — from sun-drenched escapes to meaningful celebrations and everything in between.',
  ctaLabel = 'Explore Our Collections',
  ctaHref = '#collections',
}) {
  const heroRef = useRef(null);
  const [revealed, setRevealed] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);

  const ctaArrow = useMagnetic(0.4, 30);

  /* play the entrance sequence one tick after mount, so the keyframes
     reliably restart even under fast refresh / route transitions */
  useEffect(() => {
    const t = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(t);
  }, []);

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  /* subtle mouse-parallax on the background layer only — separate from
     the slow zoom on the <img> itself, so the two transforms never fight */
  const onMove = (e) => {
    const el = heroRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--hx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    el.style.setProperty('--hy', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  };
  const onLeave = () => {
    const el = heroRef.current;
    if (el) {
      el.style.setProperty('--hx', '0');
      el.style.setProperty('--hy', '0');
    }
  };

  const scrollDown = useCallback(() => {
    const el = heroRef.current;
    if (!el) return;
    window.scrollTo({ top: el.offsetHeight, behavior: 'smooth' });
  }, []);

  return (
    <section
      className={`${serif.variable} ${sans.variable} col-hero ${revealed ? 'is-in' : ''}`}
      ref={heroRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div className="col-hero__media" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={IMAGE} alt={IMAGE_ALT} />
      </div>
      <div className="col-hero__shade" />
      <div className="col-hero__grain" aria-hidden="true" />
      <DustCanvas running={revealed && !tabHidden} />

      <OliveBranch className="col-hero__leaf col-hero__leaf--tl" />
      <OliveBranch className="col-hero__leaf col-hero__leaf--r" />
      <OliveBranch className="col-hero__leaf col-hero__leaf--bl" />

      <div className="col-hero__inner">
        <p className="col-hero__eyebrow">
          <span>{eyebrow}</span>
          <i />
        </p>

        <h1 className="col-hero__title">
          {titleLines.map((line, i) => (
            <span className="col-line" key={line}>
              <span
                className={`col-line__in ${i === titleLines.length - 1 ? 'col-line__in--accent' : ''}`}
                style={{ animationDelay: `${140 + i * 120}ms` }}
              >
                {line}
              </span>
            </span>
          ))}
        </h1>

        <p className="col-hero__text">{description}</p>

        <Magnetic strength={0.22} radius={54} className="col-hero__cta-wrap">
          <Link href={ctaHref} className="col-cta" data-cursor="Explore">
            <span className="col-cta__label">{ctaLabel}</span>
            <span ref={ctaArrow} className="col-cta__circle">
              <ArrowRight />
            </span>
          </Link>
        </Magnetic>
      </div>

      <button type="button" className="col-hero__scroll" onClick={scrollDown} aria-label="Scroll to collections" data-cursor="Scroll">
        <span>Scroll</span>
        <span className="col-hero__scroll-icon">
          <ArrowDown />
        </span>
      </button>

      <HeroCursor rootRef={heroRef} enabled={revealed} />

      {/* Rules whose class names are defined differently in other sections stay here: see src/components/styles/README.md */}
      <style jsx global>{`
        @keyframes colFade {
          from {
            opacity: 0;
            transform: translate3d(0, 14px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           CUSTOM CURSOR
           ═══════════════════════════════════════════════════════════════════ */
        .col-cursor,
        .col-cursor-dot {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 200;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.35s ease;
        }
        .col-cursor::before {
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
          transition: transform 0.5s cubic-bezier(0.22, 0.8, 0.2, 1), background 0.4s ease, border-color 0.4s ease;
        }
        .col-cursor.is-grow::before {
          transform: scale(1.55);
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.85);
        }
        .col-cursor.has-label::before {
          transform: scale(1.9);
          background: rgba(20, 17, 14, 0.4);
          -webkit-backdrop-filter: blur(6px);
          backdrop-filter: blur(6px);
        }
        .col-cursor__label {
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
        .col-cursor-dot::before {
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

        @media (pointer: coarse) {
          .col-cursor,
          .col-cursor-dot {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}