'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AURELIA · THE AURELIA WOMAN
 * ─────────────────────────────────────────────────────────────────────────────
 *  Place at: frontend/src/components/AureliaWoman.js
 *  Use:      <AureliaWoman />   inside src/app/about/page.js, under <DesignProcess />
 *
 *  Layout (same as the reference)
 *   ┌───────────────┬────────────────────┬────────┬────────┐
 *   │ logo          │                     │ hills  │ hat &  │
 *   │ 06 — The      │                     │ photo  │ flower │
 *   │ Aurelia Woman │   tall photo        ├────────┴────────┤
 *   │ Graceful.     │   (woman sitting)   │ quote           │
 *   │ Confident,    │                     │                 │
 *   │ Authentic.    │                     ├─────────┬───────┤
 *   │ paragraph     │                     │ Values  │Lifest.│
 *   │ italic quote  │                     ├─────────┼───────┤
 *   │               │                     │ Style   │Mindset│
 *   └───────────────┴─────────────────────┴─────────┴───────┘
 *
 *  Full viewport section (100svh), soft paper background — same visual
 *  language as CraftMaterials.js / OurPhilosophy.js / OurStory.js:
 *   • Plays once when scrolled into view: letter-stagger eyebrow, line-mask
 *     headline with shimmer on the italic line, hairlines that draw
 *   • Photos rise open with a Ken Burns settle, staggered
 *   • Gentle mouse + scroll parallax, swaying leaf shadows, drifting light
 *   • The pull-quote card fades in over the photos; the four value traits
 *     fade in last, each with a small line icon
 *   • Custom cursor ring (ink on paper, white over a photo)
 *   • Reduced-motion + touch fallbacks
 *
 *  IMAGES  →  /public/images/woman/
 *    woman-main.jpg    tall portrait, about 4:5 (woman sitting on a wall)
 *    woman-hills.jpg   landscape, about 8:5 (hillside view)
 *    woman-details.jpg about 1:1 (straw hat and flowers)
 *    A missing photo shows a soft gradient, so nothing breaks. You can also
 *    pass full URLs through the props.
 *
 *  Props (all optional)
 *   sectionNumber, eyebrow, titleLines: [{ text, accent }], description,
 *   quote, brand, brandHref, showBrand
 *   image, imageAlt, imagePosition
 *   frames: [{ image, alt, position }]   (2 photos: hills, details)
 *   pullQuote
 *   traits: [{ icon, label, text }]      (4 items, 2×2 grid)
 *
 *  NOTE: every class starts with "aw-" (keyframes with "aw") so nothing
 *  clashes with the other sections' global styles when they share a page.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState } from 'react';
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

const IMG = '/images/woman';

const FRAMES = [
  { image: `${IMG}/woman-hills.jpg`, alt: 'Sunlit hills seen from a terrace', position: '50% 45%' },
  { image: `${IMG}/woman-details.jpg`, alt: 'A straw hat resting beside wildflowers', position: '50% 50%' },
];

const TRAITS = [
  {
    label: 'Values',
    text: 'Quality & Integrity',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 3h12l3 5-9 13L3 8Z" />
        <path d="M3 8h18M9 3l3 5 3-5M12 8l-3 5 3 8 3-8Z" />
      </svg>
    ),
  },
  {
    label: 'Lifestyle',
    text: 'Practical & Intentional',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 21s-7.5-4.6-10-9.3C.4 8.2 2.3 4.5 6 4c2-.3 3.7.6 6 3 2.3-2.4 4-3.3 6-3 3.7.5 5.6 4.2 4 7.7C19.5 16.4 12 21 12 21Z" />
      </svg>
    ),
  },
  {
    label: 'Style',
    text: 'Effortless & Timeless',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 4c-4 0-13 3-15 12-.4 1.8.7 3.6 2.6 3.9C10 20.3 12 18 13 15" />
        <path d="M20 4c0 4-3 13-12 15M5 19l-2 2" />
      </svg>
    ),
  },
  {
    label: 'Mindset',
    text: 'Independent & Kind',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="m15.5 8.5-2.2 5.2-5.2 2.2 2.2-5.2z" />
      </svg>
    ),
  },
];

const MAIN_TINT = ['#e0d6c8', '#b9a68d'];
const FRAME_TINTS = [
  ['#d6c9b6', '#ab977c'],
  ['#e3dacc', '#c4b49c'],
];

/* ═════════════════════════════════════════════════════════════════════════════
   SMALL COMPONENTS
   ═════════════════════════════════════════════════════════════════════════════ */

/** Letters fade + rise one after another. */
function SplitLetters({ text, step = 40, start = 0 }) {
  return (
    <span aria-label={text}>
      {text.split('').map((ch, i) => (
        <span key={`${ch}-${i}`} className="aw-letter" aria-hidden="true" style={{ animationDelay: `${start + i * step}ms` }}>
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

  if (failed) return <span className="aw-fallback" aria-hidden="true" />;

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
      setOnPhoto(Boolean(e.target.closest && e.target.closest('.aw-photo')));
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
      <div ref={ringRef} className={`aw-cursor ${tone} ${visible ? 'is-visible' : ''} ${grow ? 'is-grow' : ''} ${label ? 'has-label' : ''}`} aria-hidden="true">
        <span className="aw-cursor__label">{label}</span>
      </div>
      <div ref={dotRef} className={`aw-cursor-dot ${tone} ${visible ? 'is-visible' : ''} ${grow ? 'is-grow' : ''}`} aria-hidden="true" />
    </>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   THE AURELIA WOMAN
   ═════════════════════════════════════════════════════════════════════════════ */

export default function AureliaWoman({
  sectionNumber = '06',
  eyebrow = 'The Aurelia Woman',
  titleLines = [{ text: 'Graceful. Confident,' }, { text: 'Authentic.', accent: true }],
  description = 'The Aurelia woman is not defined by a single look, but by a feeling — a quiet confidence, a deep appreciation for beauty, and a life lived with intention. She chooses quality over quantity, pieces that tell a story, and finds elegance in the everyday.',
  quote = 'She doesn’t just wear fashion. She lives it.',
  brand = 'Aurelia',
  brandHref = '/',
  showBrand = true,
  image = `${IMG}/woman-main.jpg`,
  imageAlt = 'Woman in a flowing cream linen dress sitting on a sunlit stone wall above rolling hills',
  imagePosition = '50% 30%',
  frames = FRAMES,
  pullQuote = 'A woman who chooses Aurelia chooses more than fashion — she chooses herself.',
  traits = TRAITS,
}) {
  const rootRef = useRef(null);

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

  const [frameA, frameB] = frames;

  return (
    <section
      id="aurelia-woman"
      ref={rootRef}
      className={`${serif.variable} ${sans.variable} aw ${revealed ? 'is-in' : ''} ${onScreen ? '' : 'is-offscreen'}`}
      aria-label="The Aurelia woman"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {/* ── Atmosphere: light + leaf shadows ─────────────────────────── */}
      <div className="aw-light" aria-hidden="true" />
      <div className="aw-shadow aw-shadow--tl" aria-hidden="true">
        <Leaves className="aw-leaves" />
      </div>
      <div className="aw-shadow aw-shadow--tl aw-shadow--b" aria-hidden="true">
        <Leaves className="aw-leaves" />
      </div>

      <div className="aw-grid">
        {/* ══ Left: copy ═══════════════════════════════════════════════ */}
        <div className="aw-copy">
          {showBrand && (
            <Link href={brandHref} className="aw-brand" data-cursor="Home">
              {brand}
            </Link>
          )}

          <div className="aw-copy__main">
            <p className="aw-eyebrow">
              <span className="aw-eyebrow__num">{sectionNumber}</span>
              <i className="aw-eyebrow__line" />
              <span className="aw-eyebrow__label">
                <SplitLetters text={eyebrow} start={260} />
              </span>
            </p>

            <h2 className="aw-title">
              {titleLines.map((line, i) => (
                <span className="aw-line" key={i}>
                  <span
                    className={`aw-line__in ${line.accent ? 'aw-line__in--accent' : ''}`}
                    style={{ animationDelay: `${240 + i * 150}ms` }}
                  >
                    {line.text}
                  </span>
                </span>
              ))}
            </h2>

            <p className="aw-desc">{description}</p>
            <i className="aw-rule" />
            <p className="aw-quote">{quote}</p>
          </div>
        </div>

        {/* ══ Right: photo mosaic + quote + traits ═══════════════════════ */}
        <div className="aw-gallery">
          <figure className="aw-photo aw-photo--main" data-cursor="View" style={{ '--t1': MAIN_TINT[0], '--t2': MAIN_TINT[1] }}>
            <span className="aw-clip">
              <span className="aw-par">
                <span className="aw-kb">
                  <CardImage src={image} alt={imageAlt} position={imagePosition} />
                </span>
              </span>
            </span>
          </figure>

          {frameA && (
            <figure className="aw-photo aw-photo--a" data-cursor="View" style={{ '--i': 0, '--t1': FRAME_TINTS[0][0], '--t2': FRAME_TINTS[0][1] }}>
              <span className="aw-clip">
                <span className="aw-par">
                  <span className="aw-kb">
                    <CardImage src={frameA.image} alt={frameA.alt} position={frameA.position} />
                  </span>
                </span>
              </span>
            </figure>
          )}

          {frameB && (
            <figure className="aw-photo aw-photo--b" data-cursor="View" style={{ '--i': 1, '--t1': FRAME_TINTS[1][0], '--t2': FRAME_TINTS[1][1] }}>
              <span className="aw-clip">
                <span className="aw-par">
                  <span className="aw-kb">
                    <CardImage src={frameB.image} alt={frameB.alt} position={frameB.position} />
                  </span>
                </span>
              </span>
            </figure>
          )}

          <div className="aw-pull">
            <p>{pullQuote}</p>
          </div>

          <div className="aw-traits">
            {traits.map((t, i) => (
              <div className="aw-trait" key={t.label} style={{ '--i': i }}>
                <span className="aw-trait__icon">{t.icon}</span>
                <span className="aw-trait__body">
                  <span className="aw-trait__label">{t.label}</span>
                  <span className="aw-trait__text">{t.text}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SectionCursor rootRef={rootRef} enabled={revealed} />

      <style jsx global>{`
        /* ═══════════════════════════════════════════════════════════════════
           ROOT — soft paper, tokens
           ═══════════════════════════════════════════════════════════════════ */
        .aw {
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
            linear-gradient(160deg, #e0d7cb 0%, #d8cec1 55%, #d2c7b9 100%);
        }
        .aw a,
        .aw button {
          -webkit-tap-highlight-color: transparent;
        }

        /* paper grain (static) */
        .aw::before {
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
        .aw-light {
          position: absolute;
          inset: -8%;
          z-index: 0;
          pointer-events: none;
          background:
            linear-gradient(115deg, transparent 40%, rgba(255, 244, 224, 0.26) 52%, transparent 64%),
            radial-gradient(40% 40% at 8% 6%, rgba(255, 246, 228, 0.45), transparent 70%);
          animation: awLight 14s ease-in-out infinite alternate;
        }
        @keyframes awLight {
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
        .aw-shadow {
          position: absolute;
          z-index: 1;
          pointer-events: none;
          width: min(30vw, 480px);
          color: rgba(64, 48, 33, 0.22);
          filter: blur(5px);
        }
        .aw-shadow--tl {
          top: -26px;
          left: -26px;
          transform: scaleX(-1);
        }
        .aw-shadow--b {
          top: 26px;
          left: -100px;
          width: min(24vw, 380px);
          color: rgba(64, 48, 33, 0.15);
          filter: blur(10px);
        }
        .aw-leaves {
          display: block;
          width: 100%;
          height: auto;
          transform-origin: 100% 0;
          animation: awSway 9s ease-in-out infinite alternate;
        }
        .aw-shadow--b .aw-leaves {
          animation-duration: 12s;
          animation-direction: alternate-reverse;
        }
        @keyframes awSway {
          from {
            transform: rotate(-1.8deg) translate3d(0, 0, 0);
          }
          to {
            transform: rotate(2.4deg) translate3d(-8px, 6px, 0);
          }
        }

        @keyframes awFade {
          from {
            opacity: 0;
            transform: translate3d(0, 16px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        @keyframes awGrowX {
          to {
            transform: scaleX(1);
          }
        }
        @keyframes awOpen {
          from {
            clip-path: inset(100% 0 0 0);
          }
          to {
            clip-path: inset(0 0 0 0);
          }
        }
        @keyframes awKB {
          from {
            transform: scale(1.16) translate3d(1.2%, 0.8%, 0);
          }
          to {
            transform: scale(1) translate3d(0, 0, 0);
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           GRID — copy left, gallery right
           ═══════════════════════════════════════════════════════════════════ */
        .aw-grid {
          position: relative;
          z-index: 3;
          width: 100%;
          display: grid;
          grid-template-columns: minmax(0, 34fr) minmax(0, 66fr);
          align-items: center;
          gap: clamp(24px, 3.4vw, 56px);
          padding: clamp(96px, 8vw, 132px) var(--gutter-r) clamp(56px, 6vw, 96px) var(--gutter);
        }

        /* ═══════════════════════════════════════════════════════════════════
           LEFT — copy
           ═══════════════════════════════════════════════════════════════════ */
        .aw-copy {
          position: relative;
          min-width: 0;
        }
        .aw-brand {
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
        .aw.is-in .aw-brand {
          animation: awFade 1.2s ease 0.1s both;
        }

        .aw-copy__main {
          transform: translate3d(calc(var(--mx) * 6px), 0, 0);
          transition: transform 0.8s cubic-bezier(0.2, 0.7, 0.2, 1);
        }

        .aw-eyebrow {
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
        .aw-eyebrow__num {
          opacity: 0;
        }
        .aw.is-in .aw-eyebrow__num {
          animation: awFade 1s ease 0.15s both;
        }
        .aw-eyebrow__line {
          display: block;
          flex: 0 0 22px;
          height: 1px;
          background: var(--line);
          transform: scaleX(0);
          transform-origin: left;
        }
        .aw.is-in .aw-eyebrow__line {
          animation: awGrowX 1.2s var(--ease-out) 0.35s both;
        }
        .aw-letter {
          display: inline-block;
          opacity: 0;
        }
        .aw.is-in .aw-letter {
          animation: awLetter 0.9s var(--ease-expo) both;
        }
        @keyframes awLetter {
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

        .aw-title {
          margin: 0;
          font-weight: 400;
          font-size: clamp(2.1rem, 2.7vw, 2.9rem);
          line-height: 1.14;
          letter-spacing: -0.012em;
          color: var(--ink-deep);
        }
        .aw-line {
          display: block;
          overflow: hidden;
          padding: 0.04em 0.2em 0.14em 0;
          margin-bottom: -0.1em;
        }
        .aw-line__in {
          display: inline-block;
          transform: translate3d(0, 115%, 0) rotate(3deg);
          transform-origin: left bottom;
        }
        .aw.is-in .aw-line__in {
          animation: awRise 1.35s var(--ease-expo) both;
        }
        .aw-line__in--accent {
          font-style: italic;
          padding-right: 0.08em;
          background: linear-gradient(95deg, #8b7560 0%, #6c5a49 45%, #a08a72 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }
        .aw.is-in .aw-line__in--accent {
          animation: awRise 1.35s var(--ease-expo) both, awShimmer 8s ease-in-out 1.8s infinite alternate;
        }
        @keyframes awRise {
          from {
            transform: translate3d(0, 115%, 0) rotate(3deg);
          }
          to {
            transform: translate3d(0, 0, 0) rotate(0);
          }
        }
        @keyframes awShimmer {
          from {
            background-position: 0% 50%;
          }
          to {
            background-position: 100% 50%;
          }
        }

        .aw-desc {
          margin: clamp(18px, 1.8vw, 26px) 0 0;
          max-width: 36ch;
          font-size: clamp(0.9rem, 1vw, 1rem);
          font-weight: 500;
          line-height: 1.68;
          color: var(--ink-soft);
          opacity: 0;
        }
        .aw.is-in .aw-desc {
          animation: awFade 1.2s ease 0.95s both;
        }

        .aw-rule {
          display: block;
          width: 44px;
          height: 1px;
          margin: clamp(20px, 2vw, 28px) 0 clamp(16px, 1.6vw, 22px);
          background: var(--line);
          transform: scaleX(0);
          transform-origin: left;
        }
        .aw.is-in .aw-rule {
          animation: awGrowX 1.2s var(--ease-out) 1.15s both;
        }
        .aw-quote {
          margin: 0;
          max-width: 30ch;
          font-size: clamp(1rem, 1.15vw, 1.14rem);
          font-style: italic;
          font-weight: 500;
          line-height: 1.5;
          color: var(--ink);
          opacity: 0;
        }
        .aw.is-in .aw-quote {
          animation: awFade 1.2s ease 1.3s both;
        }

        /* ═══════════════════════════════════════════════════════════════════
           RIGHT — gallery mosaic
           ═══════════════════════════════════════════════════════════════════ */
        .aw-gallery {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.62fr) minmax(0, 0.62fr);
          grid-template-rows: auto auto auto;
          grid-template-areas:
            'main hills details'
            'main quote quote'
            'main traits traits';
          gap: clamp(12px, 1.4vw, 20px);
        }

        .aw-photo {
          position: relative;
          margin: 0;
          overflow: visible;
        }
        .aw-photo--main {
          grid-area: main;
          aspect-ratio: 4 / 5;
        }
        .aw-photo--a {
          grid-area: hills;
          aspect-ratio: 8 / 5;
        }
        .aw-photo--b {
          grid-area: details;
          aspect-ratio: 1 / 1;
        }

        .aw-clip {
          position: absolute;
          inset: 0;
          display: block;
          overflow: hidden;
          background: #d9cebe;
          clip-path: inset(100% 0 0 0);
        }
        .aw-photo--main .aw-clip {
          position: relative;
          height: 100%;
        }
        .aw.is-in .aw-photo--main .aw-clip {
          animation: awOpen 1.7s var(--ease-wipe) 0.15s both;
        }
        .aw.is-in .aw-photo--a .aw-clip {
          animation: awOpen 1.5s var(--ease-wipe) 0.45s both;
        }
        .aw.is-in .aw-photo--b .aw-clip {
          animation: awOpen 1.5s var(--ease-wipe) 0.6s both;
        }
        .aw-par {
          position: absolute;
          inset: -7%;
          transform: translate3d(calc(var(--mx) * -10px), calc(var(--my) * -6px + var(--sp) * 12px), 0);
          transition: transform 0.9s cubic-bezier(0.2, 0.7, 0.2, 1);
          will-change: transform;
        }
        .aw-photo--main .aw-par {
          transform: translate3d(calc(var(--mx) * -18px), calc(var(--my) * -10px + var(--sp) * 20px), 0);
        }
        .aw-kb {
          position: absolute;
          inset: 0;
          transform: scale(1.16);
        }
        .aw.is-in .aw-photo--main .aw-kb {
          animation: awKB 3s var(--ease-out) 0.25s both;
        }
        .aw.is-in .aw-photo--a .aw-kb {
          animation: awKB 2.6s var(--ease-out) 0.55s both;
        }
        .aw.is-in .aw-photo--b .aw-kb {
          animation: awKB 2.6s var(--ease-out) 0.7s both;
        }
        .aw-kb img,
        .aw-kb .aw-fallback {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scale(1);
          transition: transform 1.4s var(--ease-out);
          -webkit-user-drag: none;
        }
        .aw-fallback {
          background:
            radial-gradient(ellipse 80% 55% at 30% 22%, rgba(255, 250, 240, 0.55), transparent 72%),
            linear-gradient(170deg, var(--t1), var(--t2));
        }
        .aw-photo:hover .aw-kb img,
        .aw-photo:hover .aw-kb .aw-fallback {
          transform: scale(1.06);
        }

        /* pull-quote card */
        .aw-pull {
          grid-area: quote;
          display: flex;
          align-items: center;
          padding: clamp(16px, 1.8vw, 26px) clamp(18px, 2vw, 28px);
          background: rgba(246, 240, 231, 0.55);
          border: 1px solid rgba(58, 49, 41, 0.14);
          opacity: 0;
        }
        .aw.is-in .aw-pull {
          animation: awFade 1.2s ease 1s both;
        }
        .aw-pull p {
          margin: 0;
          font-size: clamp(0.86rem, 0.98vw, 0.98rem);
          font-style: italic;
          font-weight: 500;
          line-height: 1.5;
          color: var(--ink);
        }

        /* four value traits, 2×2 */
        .aw-traits {
          grid-area: traits;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: clamp(10px, 1.2vw, 16px);
        }
        .aw-trait {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: clamp(12px, 1.4vw, 18px);
          background: rgba(246, 240, 231, 0.4);
          border: 1px solid rgba(58, 49, 41, 0.12);
          opacity: 0;
        }
        .aw.is-in .aw-trait {
          animation: awFade 1s ease calc(var(--i) * 120ms + 1.25s) both;
        }
        .aw-trait__icon {
          flex: 0 0 auto;
          display: inline-flex;
          color: var(--copper);
          margin-top: 2px;
        }
        .aw-trait__body {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }
        .aw-trait__label {
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: 0.6rem;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--muted);
        }
        .aw-trait__text {
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: 0.82rem;
          font-weight: 500;
          line-height: 1.35;
          color: var(--ink-deep);
        }

        /* ═══════════════════════════════════════════════════════════════════
           CURSOR — ink on paper, white over a photo
           ═══════════════════════════════════════════════════════════════════ */
        .aw-cursor,
        .aw-cursor-dot {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 200;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.35s ease;
        }
        .aw-cursor.is-visible,
        .aw-cursor-dot.is-visible {
          opacity: 1;
        }
        .aw-cursor::before {
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
        .aw-cursor.is-grow::before {
          transform: scale(1.5);
          background: rgba(58, 49, 41, 0.06);
          border-color: rgba(58, 49, 41, 0.8);
        }
        .aw-cursor.has-label::before {
          transform: scale(1.9);
          background: rgba(238, 230, 219, 0.6);
          -webkit-backdrop-filter: blur(6px);
          backdrop-filter: blur(6px);
        }
        .aw-cursor__label {
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
        .aw-cursor.has-label .aw-cursor__label {
          opacity: 1;
        }
        .aw-cursor-dot::before {
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
        .aw-cursor-dot.is-grow::before {
          transform: scale(0);
        }
        .aw-cursor.is-photo::before {
          border-color: rgba(255, 255, 255, 0.65);
        }
        .aw-cursor.is-photo.is-grow::before {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.9);
        }
        .aw-cursor.is-photo.has-label::before {
          background: rgba(40, 30, 22, 0.4);
        }
        .aw-cursor.is-photo .aw-cursor__label {
          color: #fff;
        }
        .aw-cursor-dot.is-photo::before {
          background: #fff;
        }

        /* ═══════════════════════════════════════════════════════════════════
           FOCUS + PAUSE
           ═══════════════════════════════════════════════════════════════════ */
        .aw a:focus-visible,
        .aw button:focus-visible {
          outline: 2px solid var(--copper);
          outline-offset: 4px;
        }
        .aw.is-offscreen .aw-light,
        .aw.is-offscreen .aw-leaves,
        .aw.is-offscreen .aw-line__in--accent {
          animation-play-state: paused;
        }

        /* ═══════════════════════════════════════════════════════════════════
           RESPONSIVE
           ═══════════════════════════════════════════════════════════════════ */
        @media (max-width: 1180px) {
          .aw-grid {
            grid-template-columns: minmax(0, 1fr);
          }
          .aw-brand {
            position: static;
            margin-bottom: 28px;
          }
          .aw-gallery {
            margin-top: clamp(28px, 4vw, 44px);
          }
        }

        @media (max-width: 780px) {
          .aw {
            min-height: 0;
          }
          .aw-grid {
            padding: 88px var(--gutter) 64px;
          }
          .aw-gallery {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            grid-template-areas:
              'main hills'
              'main details'
              'quote quote'
              'traits traits';
          }
          .aw-traits {
            grid-template-columns: minmax(0, 1fr);
          }
        }

        @media (max-width: 480px) {
          .aw-gallery {
            grid-template-columns: minmax(0, 1fr);
            grid-template-areas:
              'main'
              'hills'
              'details'
              'quote'
              'traits';
          }
        }

        @media (pointer: coarse) {
          .aw-cursor,
          .aw-cursor-dot {
            display: none;
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           REDUCED MOTION
           ═══════════════════════════════════════════════════════════════════ */
        @media (prefers-reduced-motion: reduce) {
          .aw *,
          .aw *::before,
          .aw *::after {
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