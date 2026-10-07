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

      <style jsx global>{`
        /* ═══════════════════════════════════════════════════════════════════
           ROOT
           ═══════════════════════════════════════════════════════════════════ */
        .col-hero {
          --cream: #f6efe8;
          --ink: #201b16;
          --copper: #c98a63;
          --gold: #dcae94;
          --hx: 0;
          --hy: 0;
          position: relative;
          width: 100%;
          height: 100vh;
          height: 100svh;
          min-height: 660px;
          overflow: hidden;
          background: #14110f;
          color: var(--cream);
          font-family: var(--aur-sans), system-ui, sans-serif;
          isolation: isolate;
        }
        .col-hero a,
        .col-hero button {
          -webkit-tap-highlight-color: transparent;
        }

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
        @keyframes colGrowX {
          to {
            transform: scaleX(1);
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           BACKGROUND MEDIA
           ═══════════════════════════════════════════════════════════════════ */
        .col-hero__media {
          position: absolute;
          inset: -4%;
          transform: translate3d(calc(var(--hx) * -22px), calc(var(--hy) * -14px), 0);
          transition: transform 0.7s cubic-bezier(0.22, 0.8, 0.2, 1);
          will-change: transform;
        }
        .col-hero__media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: 62% 40%;
          transform: scale(1.14);
        }
        .col-hero.is-in .col-hero__media img {
          animation: colZoom 14s cubic-bezier(0.2, 0.6, 0.3, 1) forwards;
        }
        @keyframes colZoom {
          from {
            transform: scale(1.14);
          }
          to {
            transform: scale(1);
          }
        }

        .col-hero__shade {
          position: absolute;
          inset: 0;
          z-index: 1;
          pointer-events: none;
          background:
            linear-gradient(90deg, rgba(15, 13, 11, 0.74) 0%, rgba(15, 13, 11, 0.46) 38%, rgba(15, 13, 11, 0.08) 68%),
            linear-gradient(180deg, rgba(10, 8, 6, 0.65) 0%, rgba(15, 13, 11, 0) 22%),
            linear-gradient(0deg, rgba(15, 13, 11, 0.4) 0%, rgba(15, 13, 11, 0) 24%);
        }

        .col-hero__grain {
          position: absolute;
          inset: 0;
          z-index: 2;
          pointer-events: none;
          opacity: 0.06;
          mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
        }

        .col-hero__dust {
          position: absolute;
          inset: 0;
          z-index: 3;
          width: 100%;
          height: 100%;
          pointer-events: none;
          opacity: 0;
          transition: opacity 2s ease 0.6s;
        }
        .col-hero.is-in .col-hero__dust {
          opacity: 1;
        }

        /* ═══════════════════════════════════════════════════════════════════
           OLIVE BRANCH DECORATION
           ═══════════════════════════════════════════════════════════════════ */
        .col-hero__leaf {
          position: absolute;
          z-index: 4;
          pointer-events: none;
          filter: drop-shadow(0 12px 20px rgba(10, 8, 5, 0.4));
          opacity: 0;
        }
        .col-hero.is-in .col-hero__leaf {
          animation: colFade 1.4s ease 0.4s both, colSway 8s ease-in-out 1.8s infinite alternate;
        }
        @keyframes colSway {
          from {
            transform: rotate(-2deg) translate3d(0, 0, 0);
          }
          to {
            transform: rotate(1.6deg) translate3d(-4px, 5px, 0);
          }
        }
        .col-hero__leaf--tl {
          top: -26px;
          left: -34px;
          width: clamp(150px, 15vw, 220px);
          transform-origin: 20% 0;
        }
        .col-hero__leaf--r {
          top: 8%;
          right: -60px;
          width: clamp(130px, 13vw, 190px);
          transform: scaleX(-1);
          transform-origin: 80% 0;
        }
        .col-hero.is-in .col-hero__leaf--r {
          animation: colFade 1.4s ease 0.55s both, colSwayR 10s ease-in-out 1.9s infinite alternate;
        }
        @keyframes colSwayR {
          from {
            transform: scaleX(-1) rotate(-2deg) translate3d(0, 0, 0);
          }
          to {
            transform: scaleX(-1) rotate(1.8deg) translate3d(4px, 6px, 0);
          }
        }
        .col-hero__leaf--bl {
          bottom: -40px;
          left: -20px;
          width: clamp(90px, 9vw, 140px);
          opacity: 0.9;
        }
        .col-hero.is-in .col-hero__leaf--bl {
          animation: colFade 1.4s ease 0.7s both, colSway 11s ease-in-out 2.1s infinite alternate-reverse;
        }

        /* ═══════════════════════════════════════════════════════════════════
           COPY
           ═══════════════════════════════════════════════════════════════════ */
        .col-hero__inner {
          position: relative;
          z-index: 5;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 0 clamp(22px, 6.6vw, 124px);
          max-width: 640px;
        }

        .col-hero__eyebrow {
          display: flex;
          align-items: center;
          gap: 14px;
          margin: 0 0 22px;
          font-size: 0.8rem;
          font-weight: 500;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: rgba(246, 239, 232, 0.85);
          opacity: 0;
        }
        .col-hero.is-in .col-hero__eyebrow {
          animation: colFade 0.9s ease 0.05s forwards;
        }
        .col-hero__eyebrow i {
          display: block;
          width: 34px;
          height: 1px;
          background: rgba(246, 239, 232, 0.6);
          transform: scaleX(0);
          transform-origin: left;
        }
        .col-hero.is-in .col-hero__eyebrow i {
          animation: colGrowX 1s cubic-bezier(0.22, 0.8, 0.2, 1) 0.5s forwards;
        }

        .col-hero__title {
          margin: 0;
          font-family: var(--aur-serif), Georgia, serif;
          font-weight: 400;
          font-size: clamp(2.7rem, 4.6vw, 4.6rem);
          line-height: 1.08;
          letter-spacing: -0.01em;
          color: #fff;
        }
        .col-line {
          display: block;
          overflow: hidden;
          padding: 0.04em 0.2em 0.14em 0;
          margin-bottom: -0.1em;
        }
        .col-line__in {
          display: inline-block;
          transform: translate3d(0, 112%, 0) rotate(2deg);
          transform-origin: left bottom;
        }
        .col-hero.is-in .col-line__in {
          animation: colRise 1.2s cubic-bezier(0.19, 1, 0.22, 1) both;
        }
        .col-line__in--accent {
          font-style: italic;
          padding-right: 0.08em;
          background: linear-gradient(95deg, #f3ddd2 0%, #dcae94 45%, #b9724b 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }
        .col-hero.is-in .col-line__in--accent {
          animation: colRise 1.2s cubic-bezier(0.19, 1, 0.22, 1) both, colShimmer 7s ease-in-out 1.6s infinite alternate;
        }
        @keyframes colRise {
          from {
            transform: translate3d(0, 112%, 0) rotate(2deg);
          }
          to {
            transform: translate3d(0, 0, 0) rotate(0);
          }
        }
        @keyframes colShimmer {
          from {
            background-position: 0% 50%;
          }
          to {
            background-position: 100% 50%;
          }
        }

        .col-hero__text {
          max-width: 46ch;
          margin: 28px 0 0;
          font-size: clamp(0.95rem, 1.1vw, 1.05rem);
          font-weight: 300;
          line-height: 1.8;
          color: rgba(246, 239, 232, 0.88);
          opacity: 0;
        }
        .col-hero.is-in .col-hero__text {
          animation: colFade 1.1s ease 0.55s forwards;
        }

        .col-magnet {
          display: inline-block;
          transition: transform 0.7s cubic-bezier(0.22, 0.8, 0.2, 1);
          will-change: transform;
        }
        .col-magnet.is-magnet {
          transition-duration: 0.22s;
        }
        .col-hero__cta-wrap {
          margin-top: 38px;
          opacity: 0;
        }
        .col-hero.is-in .col-hero__cta-wrap {
          animation: colFade 1.1s ease 0.75s forwards;
        }

        .col-cta {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 16px;
          text-decoration: none;
          color: var(--cream);
        }
        .col-cta__label {
          position: relative;
          font-size: 0.95rem;
          font-weight: 500;
          letter-spacing: 0.01em;
          transition: color 0.3s ease;
        }
        .col-cta__label::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: -4px;
          width: 100%;
          height: 1px;
          background: currentColor;
          transform: scaleX(0.2);
          transform-origin: left;
          opacity: 0.55;
          transition: transform 0.45s cubic-bezier(0.22, 0.8, 0.2, 1);
        }
        .col-cta:hover .col-cta__label::after {
          transform: scaleX(1);
          opacity: 1;
        }
        .col-cta__circle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          border: 1px solid rgba(246, 239, 232, 0.55);
          color: var(--cream);
          transition: background 0.4s cubic-bezier(0.22, 0.8, 0.2, 1), color 0.4s ease, border-color 0.4s ease, transform 0.5s cubic-bezier(0.22, 0.8, 0.2, 1);
        }
        .col-cta:hover .col-cta__circle {
          background: var(--cream);
          color: #181513;
          border-color: var(--cream);
          transform: rotate(45deg);
        }
        .col-cta:active .col-cta__circle {
          transform: rotate(45deg) scale(0.9);
        }
        .col-cta:hover .col-cta__label {
          color: #fff;
        }

        /* ═══════════════════════════════════════════════════════════════════
           SCROLL CUE
           ═══════════════════════════════════════════════════════════════════ */
        .col-hero__scroll {
          position: absolute;
          z-index: 5;
          left: 50%;
          bottom: clamp(22px, 3vw, 38px);
          transform: translateX(-50%);
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          border: 0;
          background: transparent;
          color: rgba(246, 239, 232, 0.85);
          font-size: 0.66rem;
          font-weight: 500;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          cursor: pointer;
          opacity: 0;
        }
        .col-hero.is-in .col-hero__scroll {
          animation: colFade 1.2s ease 1.1s forwards;
        }
        .col-hero__scroll-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 1px solid rgba(246, 239, 232, 0.5);
          transition: background 0.35s ease, color 0.35s ease, transform 0.4s cubic-bezier(0.22, 0.8, 0.2, 1);
        }
        .col-hero__scroll-icon svg {
          animation: colBob 2.2s ease-in-out infinite;
        }
        @keyframes colBob {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(3px);
          }
        }
        .col-hero__scroll:hover .col-hero__scroll-icon {
          background: var(--cream);
          color: #181513;
          transform: scale(1.08);
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
        .col-cursor.is-visible,
        .col-cursor-dot.is-visible {
          opacity: 1;
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
        .col-cursor.has-label .col-cursor__label {
          opacity: 1;
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
        .col-cursor-dot.is-grow::before {
          transform: scale(0);
        }

        /* ═══════════════════════════════════════════════════════════════════
           FOCUS
           ═══════════════════════════════════════════════════════════════════ */
        .col-hero a:focus-visible,
        .col-hero button:focus-visible {
          outline: 2px solid var(--copper);
          outline-offset: 4px;
          border-radius: 8px;
        }

        /* ═══════════════════════════════════════════════════════════════════
           RESPONSIVE
           ═══════════════════════════════════════════════════════════════════ */
        @media (max-width: 900px) {
          .col-hero__leaf--r {
            width: 110px;
          }
        }

        @media (max-width: 640px) {
          .col-hero__inner {
            max-width: 100%;
            padding: 0 22px;
          }
          .col-hero__title {
            font-size: clamp(2.3rem, 10vw, 3rem);
          }
          .col-hero__leaf--tl {
            width: 120px;
          }
          .col-hero__leaf--bl {
            width: 80px;
          }
          .col-hero__scroll {
            display: none;
          }
        }

        @media (pointer: coarse) {
          .col-cursor,
          .col-cursor-dot {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .col-hero *,
          .col-hero *::before,
          .col-hero *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
          .col-hero__media {
            transition: none;
          }
          .col-hero__dust {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}