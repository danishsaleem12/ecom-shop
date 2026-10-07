'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AURELIA · ABOUT HERO
 * ─────────────────────────────────────────────────────────────────────────────
 *  Place at: frontend/src/components/AboutHero.js
 *  Use:      <AboutHero />   inside src/app/about/page.js, under your <Navbar />
 *
 *  Single full-bleed editorial photo — same theme, tokens and atmosphere as
 *  the homepage Hero.js (no slider/curtain here, since this is one page's
 *  hero, not the homepage carousel):
 *   • Same colour tokens, easing curves and gutter scale as Hero.js
 *   • next/image with Ken Burns settle + mouse parallax, same clip-path math
 *   • Letter-stagger eyebrow, line-mask headline reveal, italic shimmer accent
 *   • Golden-dust canvas pushed away by the cursor, warm sun glow, film grain,
 *     vignette + left shade so copy stays legible — all lifted from Hero.js
 *   • Magnetic circular "Our Story" CTA + growing hairline (Hero's tagline
 *     hairline treatment) instead of Hero's pill CTA, to match the reference
 *   • Custom cursor ring with data-cursor labels, scroll cue, reduced-motion
 *     and touch-device fallbacks
 *
 *  Props (all optional)
 *   eyebrow, titleLines: [{ text, accent }]  — last accent line renders italic
 *   description, ctaLabel, ctaHref
 *   image, imageAlt, imagePosition, accent: [c1, c2, c3]
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
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

const unsplash = (id, width = 2400) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=80`;

const isRemote = (src) => /^https?:\/\//i.test(src);

/** Minimum time the reveal waits before running, so it never feels rushed. */
const READY_MIN_MS = 260;
/** Hard cap so a slow image never blocks the reveal. */
const READY_MAX_MS = 3200;

/* ═════════════════════════════════════════════════════════════════════════════
   ICONS
   ═════════════════════════════════════════════════════════════════════════════ */

const ArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12h16M14 6l6 6-6 6" />
  </svg>
);

/* ═════════════════════════════════════════════════════════════════════════════
   HOOKS
   ═════════════════════════════════════════════════════════════════════════════ */

/** Magnetic hover: the element leans toward the cursor when it gets close. */
function useMagnetic(strength = 0.32, radius = 70) {
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
   SMALL COMPONENTS (lifted from Hero.js)
   ═════════════════════════════════════════════════════════════════════════════ */

/** Splits text into letters so each one can fade in with a stagger. */
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

/** Golden dust drifting through the sunlight, nudged away from the cursor. */
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
      const count = width < 820 ? 22 : 64;
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

/** Follows the mouse with a soft ring; grows + labels over clickable things. */
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
      <div ref={ringRef} className={`aur-cursor ${visible ? 'is-visible' : ''} ${grow ? 'is-grow' : ''} ${label ? 'has-label' : ''}`} aria-hidden="true">
        <span className="aur-cursor__label">{label}</span>
      </div>
      <div ref={dotRef} className={`aur-cursor-dot ${visible ? 'is-visible' : ''} ${grow ? 'is-grow' : ''}`} aria-hidden="true" />
    </>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   ABOUT HERO
   ═════════════════════════════════════════════════════════════════════════════ */

export default function AboutHero({
  eyebrow = 'About Aurelia',
  titleLines = [
    { text: 'The Story' },
    { text: 'Behind' },
    { text: 'Aurelia', accent: true },
  ],
  description = 'More than a fashion brand — Aurelia is a feeling, a vision, and a tribute to the timeless beauty of everyday life.',
  ctaLabel = 'Our Story',
  ctaHref = '#our-story',
  image = unsplash('photo-1700317440744-a126fc87b900'),
  imageAlt = 'Woman on a sunlit terrace among olive branches, looking out over the hills',
  imagePosition = '68% 32%',
  accent = ['#f3ddd2', '#dcae94', '#b9724b'],
}) {
  const rootRef = useRef(null);
  const magnetCta = useMagnetic(0.3, 60);

  const [hover, setHover] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [inView, setInView] = useState(true);
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [ready, setReady] = useState(false);

  /* ── reveal gate: waits for the photo (capped), like Hero's intro ────── */
  useEffect(() => {
    const min = setTimeout(() => setMinTimePassed(true), READY_MIN_MS);
    const max = setTimeout(() => setImageLoaded(true), READY_MAX_MS);
    return () => {
      clearTimeout(min);
      clearTimeout(max);
    };
  }, []);

  useEffect(() => {
    if (minTimePassed && imageLoaded) setReady(true);
  }, [minTimePassed, imageLoaded]);

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

  /* ── pointer: parallax ────────────────────────────────────────────────── */
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

  const scrollDown = useCallback(() => {
    const h = rootRef.current ? rootRef.current.offsetHeight : window.innerHeight;
    window.scrollTo({ top: h, behavior: 'smooth' });
  }, []);

  return (
    <section
      ref={rootRef}
      className={`${serif.variable} ${sans.variable} aur-ah ${ready ? 'is-ready' : ''} ${inView ? '' : 'is-offscreen'}`}
      style={{ '--a1': accent[0], '--a2': accent[1], '--a3': accent[2] }}
      aria-label="About Aurelia"
      onMouseMove={onMouseMove}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={onMouseLeave}
    >
      {/* ── Background photo ─────────────────────────────────────────── */}
      <div className="aur-ah__media" aria-hidden="true">
        <div className="aur-ah__parallax">
          <div className="aur-ah__kb">
            <Image
              src={image}
              alt={imageAlt}
              fill
              sizes="100vw"
              priority
              quality={90}
              unoptimized={isRemote(image)}
              onLoad={() => setImageLoaded(true)}
              style={{ objectFit: 'cover', objectPosition: imagePosition }}
            />
          </div>
        </div>
      </div>

      {/* ── Light, atmosphere, particles (same layers as Hero.js) ──────── */}
      <div className="aur-ah__shade" />
      <div className="aur-ah__sun" />
      <div className="aur-ah__sun aur-ah__sun--b" />
      <DustCanvas running={ready && inView && !tabHidden} />
      <div className="aur-ah__vignette" />
      <div className="aur-ah__grain" />

      {/* ── Copy ─────────────────────────────────────────────────────── */}
      <div className="aur-ah__inner">
        <p className="aur-eyebrow">
          <SplitLetters text={eyebrow} start={80} />
        </p>

        <h1 className="aur-title">
          {titleLines.map((line, i) => (
            <span className="aur-line" key={i}>
              <span
                className={`aur-line__in ${line.accent ? 'aur-line__in--accent' : ''}`}
                style={{ animationDelay: `${160 + i * 140}ms` }}
              >
                {line.text}
              </span>
            </span>
          ))}
        </h1>

        <p className="aur-text">{description}</p>

        <div className="aur-cta-row">
          <span ref={magnetCta} className="aur-magnet">
            <Link href={ctaHref} className="aur-circle" aria-label={ctaLabel} data-cursor={ctaLabel}>
              <ArrowRight />
            </Link>
          </span>
          <span className="aur-cta-row__label">{ctaLabel}</span>
          <i className="aur-cta-row__line" />
        </div>
      </div>

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
           ROOT — same tokens as Hero.js
           ═══════════════════════════════════════════════════════════════════ */
        .aur-ah {
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
          --mx: 0;
          --my: 0;
          position: relative;
          width: 100%;
          height: 100vh;
          height: 100svh;
          min-height: 680px;
          overflow: hidden;
          background: #171310;
          color: var(--cream);
          font-family: var(--aur-sans), system-ui, sans-serif;
          isolation: isolate;
        }
        .aur-ah a,
        .aur-ah button {
          -webkit-tap-highlight-color: transparent;
        }

        /* ═══════════════════════════════════════════════════════════════════
           BACKGROUND PHOTO
           ═══════════════════════════════════════════════════════════════════ */
        .aur-ah__media {
          position: absolute;
          inset: 0;
          z-index: 1;
        }
        .aur-ah__parallax {
          position: absolute;
          inset: -3%;
          transform: translate3d(calc(var(--mx) * -26px), calc(var(--my) * -16px), 0);
          transition: transform 0.9s cubic-bezier(0.2, 0.7, 0.2, 1);
          will-change: transform;
        }
        .aur-ah__kb {
          position: absolute;
          inset: 0;
          transform: scale(1.1);
        }
        .aur-ah.is-ready .aur-ah__kb {
          animation: aurAhKB 13s cubic-bezier(0.2, 0.6, 0.3, 1) forwards;
        }
        @keyframes aurAhKB {
          from {
            transform: scale(1.14) translate3d(1.4%, 0.6%, 0);
          }
          to {
            transform: scale(1) translate3d(0, 0, 0);
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           ATMOSPHERE — identical layers to Hero.js
           ═══════════════════════════════════════════════════════════════════ */
        .aur-ah__shade {
          position: absolute;
          inset: 0;
          z-index: 4;
          pointer-events: none;
          background:
            linear-gradient(90deg, rgba(21, 18, 15, 0.94) 0%, rgba(21, 18, 15, 0.78) 26%, rgba(21, 18, 15, 0.28) 52%, rgba(21, 18, 15, 0) 68%),
            linear-gradient(180deg, rgba(21, 18, 15, 0.58) 0%, rgba(21, 18, 15, 0) 22%),
            linear-gradient(0deg, rgba(21, 18, 15, 0.55) 0%, rgba(21, 18, 15, 0) 28%);
        }

        .aur-ah__sun {
          position: absolute;
          inset: 0;
          z-index: 4;
          pointer-events: none;
          mix-blend-mode: soft-light;
          background: radial-gradient(60% 70% at 78% 30%, rgba(255, 214, 160, 0.6), rgba(255, 214, 160, 0) 70%);
          animation: aurAhSun 9s ease-in-out infinite alternate;
        }
        .aur-ah__sun--b {
          background: radial-gradient(40% 50% at 92% 8%, rgba(255, 236, 200, 0.55), rgba(255, 236, 200, 0) 70%);
          animation-duration: 13s;
          animation-direction: alternate-reverse;
        }
        @keyframes aurAhSun {
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
        .aur-ah.is-ready .aur-dust {
          opacity: 1;
        }

        .aur-ah__vignette {
          position: absolute;
          inset: 0;
          z-index: 5;
          pointer-events: none;
          background: radial-gradient(120% 100% at 60% 50%, rgba(0, 0, 0, 0) 55%, rgba(8, 6, 5, 0.5) 100%);
        }

        .aur-ah__grain {
          position: absolute;
          inset: 0;
          z-index: 6;
          pointer-events: none;
          opacity: 0.085;
          mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
          animation: aurAhGrain 1.2s steps(6) infinite;
        }
        @keyframes aurAhGrain {
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
           COPY — same eyebrow / line-mask / accent shimmer as Hero.js
           ═══════════════════════════════════════════════════════════════════ */
        .aur-ah__inner {
          position: relative;
          z-index: 10;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          max-width: 640px;
          padding: 96px 0 56px var(--gutter);
          transform: translate3d(calc(var(--mx) * 8px), 0, 0);
          transition: transform 0.8s cubic-bezier(0.2, 0.7, 0.2, 1);
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
        .aur-ah.is-ready .aur-letter {
          animation: aurAhLetter 0.9s var(--ease-expo) both;
        }
        @keyframes aurAhLetter {
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
          font-size: clamp(2.8rem, 4.9vw, 5.4rem);
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
        .aur-ah.is-ready .aur-line__in {
          animation: aurAhRise 1.35s var(--ease-expo) both;
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
        .aur-ah.is-ready .aur-line__in--accent {
          animation: aurAhRise 1.35s var(--ease-expo) both, aurAhShimmer 7s ease-in-out 1.8s infinite alternate;
        }
        @keyframes aurAhRise {
          from {
            transform: translate3d(0, 115%, 0) rotate(3deg);
          }
          to {
            transform: translate3d(0, 0, 0) rotate(0);
          }
        }
        @keyframes aurAhShimmer {
          from {
            background-position: 0% 50%;
          }
          to {
            background-position: 100% 50%;
          }
        }

        .aur-text {
          margin: 26px 0 0;
          max-width: 42ch;
          font-size: clamp(0.98rem, 1.1vw, 1.1rem);
          font-weight: 300;
          line-height: 1.8;
          color: rgba(246, 239, 232, 0.9);
          opacity: 0;
        }
        .aur-ah.is-ready .aur-text {
          animation: aurAhFade 1.2s ease 0.62s both;
        }
        @keyframes aurAhFade {
          from {
            opacity: 0;
            transform: translate3d(0, 16px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        /* ── CTA: magnetic circle + label + growing hairline
           (Hero's aur-circle + aur-side__line treatments, combined) ────── */
        .aur-magnet {
          display: inline-flex;
          transition: transform 0.7s var(--ease-out);
          will-change: transform;
        }
        .aur-magnet.is-magnet {
          transition-duration: 0.22s;
        }

        .aur-cta-row {
          display: flex;
          align-items: center;
          gap: 18px;
          margin-top: 42px;
          opacity: 0;
        }
        .aur-ah.is-ready .aur-cta-row {
          animation: aurAhFade 1.2s ease 0.85s both;
        }

        .aur-circle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.55);
          background: rgba(255, 255, 255, 0.02);
          color: var(--cream);
          transition: background 0.35s ease, color 0.35s ease, transform 0.45s var(--ease-out), border-color 0.35s ease;
        }
        .aur-circle:hover {
          background: var(--cream);
          color: var(--ink);
          border-color: var(--cream);
          transform: scale(1.08);
        }
        .aur-circle:active {
          transform: scale(0.94);
        }

        .aur-cta-row__label {
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--cream);
        }
        .aur-cta-row__line {
          display: block;
          width: 46px;
          height: 1px;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0));
          transform-origin: left;
          transform: scaleX(0);
        }
        .aur-ah.is-ready .aur-cta-row__line {
          animation: aurGrow 1.4s var(--ease-out) 1.15s both;
        }
        @keyframes aurGrow {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           SCROLL CUE — same as Hero.js
           ═══════════════════════════════════════════════════════════════════ */
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
        .aur-ah.is-ready .aur-scroll {
          animation: aurAhFade 1.3s ease 1.4s both;
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
          animation: aurAhWheel 1.8s ease-in-out infinite;
        }
        @keyframes aurAhWheel {
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
           CUSTOM CURSOR — identical to Hero.js
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
        .aur-ah a:focus-visible,
        .aur-ah button:focus-visible {
          outline: 2px solid var(--copper);
          outline-offset: 4px;
        }
        .aur-ah.is-offscreen .aur-ah__sun,
        .aur-ah.is-offscreen .aur-ah__grain,
        .aur-ah.is-offscreen .aur-line__in--accent {
          animation-play-state: paused;
        }

        /* ═══════════════════════════════════════════════════════════════════
           RESPONSIVE
           ═══════════════════════════════════════════════════════════════════ */
        @media (max-width: 820px) {
          .aur-ah {
            min-height: 640px;
          }
          .aur-ah__shade {
            background:
              linear-gradient(180deg, rgba(21, 18, 15, 0.6) 0%, rgba(21, 18, 15, 0) 22%),
              linear-gradient(0deg, rgba(21, 18, 15, 0.96) 0%, rgba(21, 18, 15, 0.82) 38%, rgba(21, 18, 15, 0) 72%);
          }
          .aur-ah__inner {
            max-width: 100%;
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
          .aur-cta-row {
            margin-top: 30px;
          }
          .aur-scroll {
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
          .aur-ah *,
          .aur-ah *::before,
          .aur-ah *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
          .aur-ah__grain,
          .aur-dust {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}