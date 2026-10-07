'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AURELIA · DESIGN PROCESS
 * ─────────────────────────────────────────────────────────────────────────────
 *  Place at: frontend/src/components/DesignProcess.js
 *  Use:      <DesignProcess />   inside src/app/about/page.js, under <CraftMaterials />
 *
 *  Layout (same as the reference)
 *   ┌───────────────┬────────┬────────┬────────┬────────┬────────┐
 *   │ logo          │        │        │        │        │        │
 *   │ 05 — Our      │ photo  │ photo  │ photo  │ photo  │ photo  │
 *   │ Approach to   │        │        │        │        │        │
 *   │ Design        │ 01     │ 02     │ 03     │ 04     │ 05     │
 *   │ From Inspir-  │ Insp-  │ Rese-  │ Design │ Craft- │ The    │
 *   │ ation to      │ iration│ arch   │        │ ing    │ Final  │
 *   │ Timeless      │ text   │ text   │ text   │ text   │ Piece  │
 *   │ Pieces.       │        │        │        │        │ text   │
 *   │ paragraph     │        │        │        │        │        │
 *   │ OUR PROCESS ○ │        │        │        │        │        │
 *   └───────────────┴────────┴────────┴────────┴────────┴────────┘
 *
 *  Full viewport section (100svh), soft paper background, no dark overlays —
 *  same visual language as CraftMaterials.js / OurPhilosophy.js / OurStory.js:
 *   • Plays once when scrolled into view: letter-stagger eyebrow, line-mask
 *     headline with shimmer on the italic line, hairlines that draw
 *   • Five photos rise open with a Ken Burns settle, staggered left to right
 *   • Gentle mouse + scroll parallax, swaying leaf shadows, drifting light
 *   • Magnetic circular "Our Process" CTA + growing hairline (same treatment
 *     as AboutHero's CTA)
 *   • Custom cursor ring (ink on paper, white over a photo)
 *   • Reduced-motion + touch fallbacks
 *
 *  IMAGES  →  /public/images/process/
 *    inspiration.jpg  research.jpg  design.jpg  crafting.jpg  final-piece.jpg
 *    about 3:4 each. A missing photo shows a soft gradient, so nothing breaks.
 *    You can also pass full URLs through the props.
 *
 *  Props (all optional)
 *   sectionNumber, eyebrow, titleLines: [{ text, accent }], description,
 *   ctaLabel, ctaHref, brand, brandHref, showBrand
 *   steps: [{ number, label, text, image, alt }]   (5 columns)
 *
 *  NOTE: every class starts with "dp-" (keyframes with "dp") so nothing
 *  clashes with the other sections' global styles when they share a page.
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
   DATA — edit copy and images here
   ═════════════════════════════════════════════════════════════════════════════ */

const IMG = '/images/process';

const STEPS = [
  {
    number: '01',
    label: 'Inspiration',
    text: 'We find beauty in the world around us — in art, nature, and everyday moments.',
    image: `${IMG}/inspiration.jpg`,
    alt: 'A vintage photograph and fashion sketch pinned to a moodboard',
  },
  {
    number: '02',
    label: 'Research',
    text: 'We study materials, textures and techniques to bring our vision to life.',
    image: `${IMG}/research.jpg`,
    alt: 'Folded lengths of natural fabric',
  },
  {
    number: '03',
    label: 'Design',
    text: 'Our team turns ideas into detailed designs, with a focus on form, function and feeling.',
    image: `${IMG}/design.jpg`,
    alt: 'A hand sketching a garment design',
  },
  {
    number: '04',
    label: 'Crafting',
    text: 'Skilled artisans bring each piece to life with precision, care and expertise.',
    image: `${IMG}/crafting.jpg`,
    alt: 'An artisan hand-stitching fabric on a sewing machine',
  },
  {
    number: '05',
    label: 'The Final Piece',
    text: 'The result is more than just clothing — it’s a story of art, craftsmanship and you.',
    image: `${IMG}/final-piece.jpg`,
    alt: 'A finished garment draped on a dress form',
  },
];

/** Soft beige gradients, used only while a photo file is missing. */
const TINTS = [
  ['#e0d6c8', '#bfae95'],
  ['#d6c9b6', '#ab977c'],
  ['#e3dacc', '#c4b49c'],
  ['#d0c7b2', '#a89c80'],
  ['#dccfbb', '#b39f83'],
];

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

/** Letters fade + rise one after another. */
function SplitLetters({ text, step = 40, start = 0 }) {
  return (
    <span aria-label={text}>
      {text.split('').map((ch, i) => (
        <span key={`${ch}-${i}`} className="dp-letter" aria-hidden="true" style={{ animationDelay: `${start + i * step}ms` }}>
          {ch === ' ' ? '\u00A0' : ch}
        </span>
      ))}
    </span>
  );
}

/** Photo with a graceful gradient fallback when the file doesn't exist yet. */
function CardImage({ src, alt, position }) {
  const [failed, setFailed] = useState(!src);
  const ref = useRef(null);

  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) return <span className="dp-fallback" aria-hidden="true" />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt={alt}
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
      style={position ? { objectPosition: position } : undefined}
    />
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

/** Soft ring that follows the mouse. Ink on paper, white over a photo. */
function SectionCursor({ rootRef, enabled }) {
  const ringRef = useRef(null);
  const dotRef = useRef(null);
  const [label, setLabel] = useState('');
  const [grow, setGrow] = useState(false);
  const [visible, setVisible] = useState(false);
  const [onPhoto, setOnPhoto] = useState(false);
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
      setOnPhoto(Boolean(e.target.closest && e.target.closest('.dp-step__img')));
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

  const tone = onPhoto ? 'is-photo' : '';

  return (
    <>
      <div ref={ringRef} className={`dp-cursor ${tone} ${visible ? 'is-visible' : ''} ${grow ? 'is-grow' : ''} ${label ? 'has-label' : ''}`} aria-hidden="true">
        <span className="dp-cursor__label">{label}</span>
      </div>
      <div ref={dotRef} className={`dp-cursor-dot ${tone} ${visible ? 'is-visible' : ''} ${grow ? 'is-grow' : ''}`} aria-hidden="true" />
    </>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   DESIGN PROCESS
   ═════════════════════════════════════════════════════════════════════════════ */

export default function DesignProcess({
  sectionNumber = '05',
  eyebrow = 'Our Approach to Design',
  titleLines = [{ text: 'From Inspiration' }, { text: 'to Timeless Pieces.', accent: true }],
  description = 'Our design process is a thoughtful journey from the first spark of inspiration to the final stitch. We draw from nature, art, culture and emotion, translating them into pieces that feel both modern and timeless.',
  ctaLabel = 'Our Process',
  ctaHref = '#craft-materials',
  brand = 'Aurelia',
  brandHref = '/',
  showBrand = true,
  steps = STEPS,
}) {
  const rootRef = useRef(null);
  const magnetCta = useMagnetic(0.3, 60);

  const [revealed, setRevealed] = useState(false);
  const [onScreen, setOnScreen] = useState(false);

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

  /* ── pointer: mouse parallax ─────────────────────────────────────────── */
  const onMouseMove = useCallback((e) => {
    const el = rootRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
    el.style.setProperty('--my', ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
  }, []);

  const onMouseLeave = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    el.style.setProperty('--mx', '0');
    el.style.setProperty('--my', '0');
  }, []);

  return (
    <section
      id="design-process"
      ref={rootRef}
      className={`${serif.variable} ${sans.variable} dp ${revealed ? 'is-in' : ''} ${onScreen ? '' : 'is-offscreen'}`}
      aria-label="Our approach to design"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {/* ── Atmosphere: light + leaf shadows ─────────────────────────── */}
      <div className="dp-light" aria-hidden="true" />
      <div className="dp-shadow dp-shadow--tl" aria-hidden="true">
        <Leaves className="dp-leaves" />
      </div>
      <div className="dp-shadow dp-shadow--tl dp-shadow--b" aria-hidden="true">
        <Leaves className="dp-leaves" />
      </div>

      <div className="dp-grid">
        {/* ══ Left: copy ═══════════════════════════════════════════════ */}
        <div className="dp-copy">
          {showBrand && (
            <Link href={brandHref} className="dp-brand" data-cursor="Home">
              {brand}
            </Link>
          )}

          <div className="dp-copy__main">
            <p className="dp-eyebrow">
              <span className="dp-eyebrow__num">{sectionNumber}</span>
              <i className="dp-eyebrow__line" />
              <span className="dp-eyebrow__label">
                <SplitLetters text={eyebrow} start={260} />
              </span>
            </p>

            <h2 className="dp-title">
              {titleLines.map((line, i) => (
                <span className="dp-line" key={i}>
                  <span
                    className={`dp-line__in ${line.accent ? 'dp-line__in--accent' : ''}`}
                    style={{ animationDelay: `${240 + i * 150}ms` }}
                  >
                    {line.text}
                  </span>
                </span>
              ))}
            </h2>

            <p className="dp-desc">{description}</p>
          </div>

          <div className="dp-cta-row">
            <span className="dp-cta-row__label">{ctaLabel}</span>
            <i className="dp-cta-row__line" />
            <span ref={magnetCta} className="dp-magnet">
              <Link href={ctaHref} className="dp-circle" aria-label={ctaLabel} data-cursor={ctaLabel}>
                <ArrowRight />
              </Link>
            </span>
          </div>
        </div>

        {/* ══ Right: five process steps ═══════════════════════════════ */}
        <div className="dp-steps">
          {steps.map((s, i) => {
            const tint = TINTS[i % TINTS.length];
            return (
              <article className="dp-step" key={s.label} style={{ '--i': i, '--t1': tint[0], '--t2': tint[1] }}>
                <div className="dp-step__img" data-cursor="View">
                  <span className="dp-clip">
                    <span className="dp-par">
                      <span className="dp-kb">
                        <CardImage src={s.image} alt={s.alt} />
                      </span>
                    </span>
                  </span>
                </div>
                <p className="dp-step__meta">
                  <span className="dp-step__num">{s.number}</span>
                  <span className="dp-step__label">{s.label}</span>
                </p>
                <p className="dp-step__text">{s.text}</p>
              </article>
            );
          })}
        </div>
      </div>

      <SectionCursor rootRef={rootRef} enabled={revealed} />

      <style jsx global>{`
        /* ═══════════════════════════════════════════════════════════════════
           ROOT — soft paper, tokens (same as CraftMaterials / OurPhilosophy)
           ═══════════════════════════════════════════════════════════════════ */
        .dp {
          --ink: #3a3129;
          --ink-deep: #2d251e;
          --ink-soft: rgba(58, 49, 41, 0.82);
          --muted: #7a6957;
          --line: rgba(58, 49, 41, 0.34);
          --copper: #c98a63;
          --gutter: clamp(22px, 6.6vw, 124px);
          --gutter-r: clamp(22px, 5vw, 96px);
          --ease-out: cubic-bezier(0.22, 0.8, 0.2, 1);
          --ease-expo: cubic-bezier(0.19, 1, 0.22, 1);
          --ease-wipe: cubic-bezier(0.76, 0, 0.18, 1);
          --mx: 0;
          --my: 0;
          --sp: 0;
          position: relative;
          display: flex;
          align-items: center;
          min-height: 100vh;
          min-height: 100svh;
          overflow: hidden;
          isolation: isolate;
          color: var(--ink);
          font-family: var(--aur-serif), Georgia, serif;
          background:
            radial-gradient(ellipse 60% 70% at 0% 0%, rgba(255, 250, 242, 0.55), transparent 65%),
            radial-gradient(ellipse 50% 60% at 100% 100%, rgba(255, 250, 242, 0.4), transparent 70%),
            linear-gradient(160deg, #e2d9cd 0%, #dbd1c4 55%, #d5cabc 100%);
        }
        .dp a,
        .dp button {
          -webkit-tap-highlight-color: transparent;
        }

        /* paper grain (static) */
        .dp::before {
          content: '';
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          opacity: 0.2;
          mix-blend-mode: multiply;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35  0 0 0 0 0.28  0 0 0 0 0.2  0 0 0 0.9 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
        }

        /* drifting light on the paper */
        .dp-light {
          position: absolute;
          inset: -8%;
          z-index: 0;
          pointer-events: none;
          background:
            linear-gradient(115deg, transparent 40%, rgba(255, 244, 224, 0.26) 52%, transparent 64%),
            radial-gradient(40% 40% at 8% 6%, rgba(255, 246, 228, 0.45), transparent 70%);
          animation: dpLight 14s ease-in-out infinite alternate;
        }
        @keyframes dpLight {
          from {
            opacity: 0.5;
            transform: translate3d(-2.5%, 0, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(2.5%, 1.5%, 0);
          }
        }

        /* leaf shadows, top-left (two layers) */
        .dp-shadow {
          position: absolute;
          z-index: 1;
          pointer-events: none;
          width: min(30vw, 480px);
          color: rgba(64, 48, 33, 0.22);
          filter: blur(5px);
        }
        .dp-shadow--tl {
          top: -26px;
          left: -26px;
          transform: scaleX(-1);
        }
        .dp-shadow--b {
          top: 26px;
          left: -100px;
          width: min(24vw, 380px);
          color: rgba(64, 48, 33, 0.15);
          filter: blur(10px);
        }
        .dp-leaves {
          display: block;
          width: 100%;
          height: auto;
          transform-origin: 100% 0;
          animation: dpSway 9s ease-in-out infinite alternate;
        }
        .dp-shadow--b .dp-leaves {
          animation-duration: 12s;
          animation-direction: alternate-reverse;
        }
        @keyframes dpSway {
          from {
            transform: rotate(-1.8deg) translate3d(0, 0, 0);
          }
          to {
            transform: rotate(2.4deg) translate3d(-8px, 6px, 0);
          }
        }

        @keyframes dpFade {
          from {
            opacity: 0;
            transform: translate3d(0, 16px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        @keyframes dpGrowX {
          to {
            transform: scaleX(1);
          }
        }
        @keyframes dpOpen {
          from {
            clip-path: inset(100% 0 0 0);
          }
          to {
            clip-path: inset(0 0 0 0);
          }
        }
        @keyframes dpKB {
          from {
            transform: scale(1.16) translate3d(1.2%, 0.8%, 0);
          }
          to {
            transform: scale(1) translate3d(0, 0, 0);
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           GRID — copy left, five steps right
           ═══════════════════════════════════════════════════════════════════ */
        .dp-grid {
          position: relative;
          z-index: 3;
          width: 100%;
          display: grid;
          grid-template-columns: minmax(0, 30fr) minmax(0, 70fr);
          align-items: center;
          gap: clamp(20px, 3vw, 48px);
          padding: clamp(96px, 8vw, 132px) var(--gutter-r) clamp(56px, 6vw, 96px) var(--gutter);
        }

        /* ═══════════════════════════════════════════════════════════════════
           LEFT — copy
           ═══════════════════════════════════════════════════════════════════ */
        .dp-copy {
          position: relative;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .dp-brand {
          position: absolute;
          top: clamp(-78px, -6.4vw, -56px);
          left: 0;
          font-size: clamp(1.5rem, 2vw, 1.9rem);
          font-weight: 400;
          letter-spacing: 0.01em;
          line-height: 1;
          color: var(--ink);
          text-decoration: none;
          opacity: 0;
        }
        .dp.is-in .dp-brand {
          animation: dpFade 1.2s ease 0.1s both;
        }

        .dp-copy__main {
          transform: translate3d(calc(var(--mx) * 6px), 0, 0);
          transition: transform 0.8s cubic-bezier(0.2, 0.7, 0.2, 1);
        }

        .dp-eyebrow {
          display: flex;
          align-items: center;
          gap: 14px;
          margin: 0 0 clamp(18px, 2vw, 28px);
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: 0.62rem;
          font-weight: 400;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: var(--ink);
        }
        .dp-eyebrow__num {
          opacity: 0;
        }
        .dp.is-in .dp-eyebrow__num {
          animation: dpFade 1s ease 0.15s both;
        }
        .dp-eyebrow__line {
          display: block;
          flex: 0 0 22px;
          height: 1px;
          background: var(--line);
          transform: scaleX(0);
          transform-origin: left;
        }
        .dp.is-in .dp-eyebrow__line {
          animation: dpGrowX 1.2s var(--ease-out) 0.35s both;
        }
        .dp-letter {
          display: inline-block;
          opacity: 0;
        }
        .dp.is-in .dp-letter {
          animation: dpLetter 0.9s var(--ease-expo) both;
        }
        @keyframes dpLetter {
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

        .dp-title {
          margin: 0;
          font-weight: 400;
          font-size: clamp(2.1rem, 2.7vw, 2.9rem);
          line-height: 1.14;
          letter-spacing: -0.012em;
          color: var(--ink-deep);
        }
        .dp-line {
          display: block;
          overflow: hidden;
          padding: 0.04em 0.2em 0.14em 0;
          margin-bottom: -0.1em;
        }
        .dp-line__in {
          display: inline-block;
          transform: translate3d(0, 115%, 0) rotate(3deg);
          transform-origin: left bottom;
        }
        .dp.is-in .dp-line__in {
          animation: dpRise 1.35s var(--ease-expo) both;
        }
        .dp-line__in--accent {
          font-style: italic;
          padding-right: 0.08em;
          background: linear-gradient(95deg, #8b7560 0%, #6c5a49 45%, #a08a72 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }
        .dp.is-in .dp-line__in--accent {
          animation: dpRise 1.35s var(--ease-expo) both, dpShimmer 8s ease-in-out 1.8s infinite alternate;
        }
        @keyframes dpRise {
          from {
            transform: translate3d(0, 115%, 0) rotate(3deg);
          }
          to {
            transform: translate3d(0, 0, 0) rotate(0);
          }
        }
        @keyframes dpShimmer {
          from {
            background-position: 0% 50%;
          }
          to {
            background-position: 100% 50%;
          }
        }

        .dp-desc {
          margin: clamp(18px, 1.8vw, 26px) 0 0;
          max-width: 34ch;
          font-size: clamp(0.9rem, 1vw, 1rem);
          font-weight: 500;
          line-height: 1.68;
          color: var(--ink-soft);
          opacity: 0;
        }
        .dp.is-in .dp-desc {
          animation: dpFade 1.2s ease 0.95s both;
        }

        /* CTA: label + growing hairline + magnetic circle */
        .dp-cta-row {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: clamp(28px, 3vw, 48px);
          opacity: 0;
        }
        .dp.is-in .dp-cta-row {
          animation: dpFade 1.2s ease 1.2s both;
        }
        .dp-cta-row__label {
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--ink);
        }
        .dp-cta-row__line {
          display: block;
          width: 44px;
          height: 1px;
          background: var(--line);
          transform-origin: left;
          transform: scaleX(0);
        }
        .dp.is-in .dp-cta-row__line {
          animation: dpGrowX 1.3s var(--ease-out) 1.4s both;
        }
        .dp-magnet {
          display: inline-flex;
          transition: transform 0.7s var(--ease-out);
          will-change: transform;
        }
        .dp-magnet.is-magnet {
          transition-duration: 0.22s;
        }
        .dp-circle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          flex: 0 0 auto;
          border-radius: 50%;
          border: 1px solid rgba(58, 49, 41, 0.45);
          background: rgba(58, 49, 41, 0.02);
          color: var(--ink);
          transition: background 0.35s ease, color 0.35s ease, transform 0.45s var(--ease-out), border-color 0.35s ease;
        }
        .dp-circle:hover {
          background: var(--ink);
          color: #f6efe8;
          border-color: var(--ink);
          transform: scale(1.08);
        }
        .dp-circle:active {
          transform: scale(0.94);
        }

        /* ═══════════════════════════════════════════════════════════════════
           RIGHT — five steps
           ═══════════════════════════════════════════════════════════════════ */
        .dp-steps {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: clamp(14px, 1.4vw, 22px);
        }
        .dp-step {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .dp-step__img {
          position: relative;
          aspect-ratio: 3 / 4;
          border-radius: 2px;
        }
        .dp-clip {
          position: absolute;
          inset: 0;
          overflow: hidden;
          background: #d9cebe;
          clip-path: inset(100% 0 0 0);
        }
        .dp.is-in .dp-clip {
          animation: dpOpen 1.5s var(--ease-wipe) calc(var(--i) * 140ms + 350ms) both;
        }
        .dp-par {
          position: absolute;
          inset: -7%;
          transform: translate3d(calc(var(--mx) * -10px), calc(var(--my) * -6px + var(--sp) * 12px), 0);
          transition: transform 0.9s cubic-bezier(0.2, 0.7, 0.2, 1);
          will-change: transform;
        }
        .dp-kb {
          position: absolute;
          inset: 0;
          transform: scale(1.16);
        }
        .dp.is-in .dp-kb {
          animation: dpKB 2.6s var(--ease-out) calc(var(--i) * 140ms + 450ms) both;
        }
        .dp-kb img,
        .dp-kb .dp-fallback {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scale(1);
          transition: transform 1.4s var(--ease-out);
          -webkit-user-drag: none;
        }
        .dp-fallback {
          background:
            radial-gradient(ellipse 80% 55% at 30% 22%, rgba(255, 250, 240, 0.55), transparent 72%),
            linear-gradient(170deg, var(--t1), var(--t2));
        }
        .dp-step__img:hover .dp-kb img,
        .dp-step__img:hover .dp-kb .dp-fallback {
          transform: scale(1.06);
        }

        .dp-step__meta {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin: clamp(14px, 1.4vw, 20px) 0 0;
          opacity: 0;
        }
        .dp.is-in .dp-step__meta {
          animation: dpFade 1s ease calc(var(--i) * 140ms + 900ms) both;
        }
        .dp-step__num {
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: 0.6rem;
          font-weight: 600;
          letter-spacing: 0.14em;
          color: var(--muted);
        }
        .dp-step__label {
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: 0.66rem;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--ink-deep);
        }
        .dp-step__text {
          margin: 8px 0 0;
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: 0.76rem;
          font-weight: 400;
          line-height: 1.5;
          color: var(--ink-soft);
          opacity: 0;
        }
        .dp.is-in .dp-step__text {
          animation: dpFade 1s ease calc(var(--i) * 140ms + 1020ms) both;
        }

        /* ═══════════════════════════════════════════════════════════════════
           CURSOR — ink on paper, white over a photo
           ═══════════════════════════════════════════════════════════════════ */
        .dp-cursor,
        .dp-cursor-dot {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 200;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.35s ease;
        }
        .dp-cursor.is-visible,
        .dp-cursor-dot.is-visible {
          opacity: 1;
        }
        .dp-cursor::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 40px;
          height: 40px;
          margin: -20px 0 0 -20px;
          border-radius: 50%;
          border: 1px solid rgba(58, 49, 41, 0.55);
          background: rgba(58, 49, 41, 0);
          transition: transform 0.5s var(--ease-out), background 0.4s ease, border-color 0.4s ease;
        }
        .dp-cursor.is-grow::before {
          transform: scale(1.5);
          background: rgba(58, 49, 41, 0.06);
          border-color: rgba(58, 49, 41, 0.8);
        }
        .dp-cursor.has-label::before {
          transform: scale(1.9);
          background: rgba(238, 230, 219, 0.6);
          -webkit-backdrop-filter: blur(6px);
          backdrop-filter: blur(6px);
        }
        .dp-cursor__label {
          position: absolute;
          top: 0;
          left: 0;
          transform: translate(-50%, -50%);
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: 0.64rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ink);
          white-space: nowrap;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .dp-cursor.has-label .dp-cursor__label {
          opacity: 1;
        }
        .dp-cursor-dot::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 6px;
          height: 6px;
          margin: -3px 0 0 -3px;
          border-radius: 50%;
          background: var(--ink);
          transition: transform 0.3s ease, background 0.3s ease;
        }
        .dp-cursor-dot.is-grow::before {
          transform: scale(0);
        }
        .dp-cursor.is-photo::before {
          border-color: rgba(255, 255, 255, 0.65);
        }
        .dp-cursor.is-photo.is-grow::before {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.9);
        }
        .dp-cursor.is-photo.has-label::before {
          background: rgba(40, 30, 22, 0.4);
        }
        .dp-cursor.is-photo .dp-cursor__label {
          color: #fff;
        }
        .dp-cursor-dot.is-photo::before {
          background: #fff;
        }

        /* ═══════════════════════════════════════════════════════════════════
           FOCUS + PAUSE
           ═══════════════════════════════════════════════════════════════════ */
        .dp a:focus-visible,
        .dp button:focus-visible {
          outline: 2px solid var(--copper);
          outline-offset: 4px;
        }
        .dp.is-offscreen .dp-light,
        .dp.is-offscreen .dp-leaves,
        .dp.is-offscreen .dp-line__in--accent {
          animation-play-state: paused;
        }

        /* ═══════════════════════════════════════════════════════════════════
           RESPONSIVE
           ═══════════════════════════════════════════════════════════════════ */
        @media (max-width: 1180px) {
          .dp-grid {
            grid-template-columns: minmax(0, 1fr);
          }
          .dp-brand {
            position: static;
            margin-bottom: 28px;
          }
          .dp-steps {
            grid-template-columns: repeat(5, minmax(0, 1fr));
            margin-top: clamp(28px, 4vw, 44px);
          }
        }

        @media (max-width: 900px) {
          .dp {
            min-height: 0;
          }
          .dp-grid {
            padding: 88px var(--gutter) 64px;
          }
          .dp-steps {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 26px 18px;
          }
        }

        @media (max-width: 520px) {
          .dp-desc {
            max-width: none;
          }
        }

        @media (pointer: coarse) {
          .dp-cursor,
          .dp-cursor-dot {
            display: none;
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           REDUCED MOTION
           ═══════════════════════════════════════════════════════════════════ */
        @media (prefers-reduced-motion: reduce) {
          .dp *,
          .dp *::before,
          .dp *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            transition-delay: 0s !important;
          }
        }
      `}</style>
    </section>
  );
}