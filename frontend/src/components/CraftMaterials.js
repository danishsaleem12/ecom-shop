'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AURELIA · CRAFT & MATERIALS
 * ─────────────────────────────────────────────────────────────────────────────
 *  Place at: frontend/src/components/CraftMaterials.js
 *  Use:      <CraftMaterials />   inside src/app/about/page.js, under <OurPhilosophy />
 *
 *  ONE PAGE, EXACTLY LIKE THE REFERENCE
 *   The whole composition is drawn on a 1536 × 1024 "stage" (the reference's
 *   proportions) that is scaled to fit the screen: it is never taller than the
 *   viewport (100svh) and never wider than the page, and every position, photo
 *   size and font size scales with it. So on desktop the section fits in one
 *   screen and looks like the reference at any size. Extra room on wide screens
 *   is just paper, so it blends in.
 *   Below 1100px wide the layout stacks into a normal scrolling section.
 *
 *   ┌───────────────┬────────────────────────┬──────────┐
 *   │ logo          │                        │ photo  NATURAL FABRICS
 *   │ 04 — Craft…   │   big photo            │ photo  EXPERT ARTISANS
 *   │ Thoughtfully… │   THE ART OF           │ photo  SUSTAINABLE CHOICES
 *   │ text, quote   │   True Craftsmanship   │
 *   ├───────────────┴────────────────────────┤          │
 *   │ Linen  Silk  Wool  Leather  Details    │   note   │
 *   └────────────────────────────────────────┴──────────┘
 *
 *  Light and airy: soft paper, no dark overlays (only a very gentle warm shade
 *  behind the white "True Craftsmanship" caption), no particles on any photo.
 *
 *  Style (same language as the other Aurelia sections)
 *   • Plays when scrolled into view: letter-stagger eyebrow, line-mask headline
 *     with shimmer on the italic line, hairlines that draw themselves
 *   • Photos rise open with a Ken Burns settle, staggered (big photo, then the
 *     right column, then the five swatches)
 *   • Gentle mouse + scroll parallax, swaying leaf shadows, drifting light
 *   • Custom cursor ring (ink on paper, white over the big photo)
 *   • Reduced-motion + touch fallbacks
 *
 *  IMAGES  →  /public/images/craft/
 *    craft-hero.jpg      big photo, about 1.0 : 1.0 (hands stitching linen)
 *    craft-fabrics.jpg   about 6 : 7   (linen + olive sprig)
 *    craft-artisans.jpg  about 6 : 7   (hand scoring leather)
 *    craft-tag.jpg       about 6 : 7   (Aurelia tag on woven fabric)
 *    linen.jpg  silk.jpg  wool.jpg  leather.jpg  details.jpg   about 1 : 1
 *   A missing photo shows a soft gradient, so nothing breaks. You can also pass
 *   full URLs through the props.
 *
 *  Props (all optional)
 *   sectionNumber, eyebrow, titleLines: [{ text, accent }], description,
 *   quote: string[], brand, brandHref, showBrand
 *   heroKicker, heroTitle, image, imageAlt, imagePosition
 *   features: [{ label, text, image, alt }]   (3 rows, right column)
 *   swatches: [{ label, caption, image, alt }] (5 swatches, bottom row)
 *   outro: string[]
 *
 *  NOTE: every class starts with "cm-" (keyframes with "cm") so nothing clashes
 *  with the other sections' global styles when they share a page.
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

const IMG = '/images/craft';

const FEATURES = [
  {
    label: 'Natural Fabrics',
    text: 'Linen, cotton, wool, silk and other natural fibres, chosen for their beauty, breathability and lasting quality.',
    image: `${IMG}/craft-fabrics.jpg`,
    alt: 'Textured natural linen with an olive sprig resting on it',
  },
  {
    label: 'Expert Artisans',
    text: 'Skilled hands. Time-honoured techniques. Generations of craftsmanship, brought to life in every piece.',
    image: `${IMG}/craft-artisans.jpg`,
    alt: 'An artisan scoring a line into leather with a fine tool',
  },
  {
    label: 'Sustainable Choices',
    text: 'We are committed to responsible sourcing and mindful production, creating pieces that respect both people and the planet.',
    image: `${IMG}/craft-tag.jpg`,
    alt: 'An Aurelia tag resting on woven natural fabric',
  },
];

const SWATCHES = [
  { label: 'Linen', caption: 'Lightweight. Breathable. Timeless.', image: `${IMG}/linen.jpg`, alt: 'Soft folds of natural linen' },
  { label: 'Silk', caption: 'Fluid. Luxurious. Enduring.', image: `${IMG}/silk.jpg`, alt: 'Draped champagne silk' },
  { label: 'Wool', caption: 'Warm. Soft. Naturally refined.', image: `${IMG}/wool.jpg`, alt: 'Chunky cream wool knit' },
  { label: 'Leather', caption: 'Durable. Supple. Classic.', image: `${IMG}/leather.jpg`, alt: 'Tan leather with hand stitching' },
  { label: 'Details', caption: 'The difference is in the details.', image: `${IMG}/details.jpg`, alt: 'A sewing machine foot stitching cream fabric' },
];

/**
 * Right-column row geometry, measured from the reference (1536 × 1024):
 * top / height as a % of the stage height, pt = px from the row's top edge to
 * the small label.
 */
const ROWS = [
  { top: 4.59, h: 23.44, pt: 44 },
  { top: 29.2, h: 22.27, pt: 44 },
  { top: 53.22, h: 22.17, pt: 32 },
];

/** Soft beige gradients, used only while a photo file is missing. */
const TINTS = [
  ['#e0d6c8', '#bfae95'],
  ['#d6c9b6', '#ab977c'],
  ['#e3dacc', '#c4b49c'],
  ['#d0c7b2', '#a89c80'],
  ['#dccfbb', '#b39f83'],
];
const HERO_TINT = ['#c4ac90', '#8f7860'];

/* ═════════════════════════════════════════════════════════════════════════════
   SMALL COMPONENTS
   ═════════════════════════════════════════════════════════════════════════════ */

/** Letters fade + rise one after another. */
function SplitLetters({ text, step = 40, start = 0 }) {
  return (
    <span aria-label={text}>
      {text.split('').map((ch, i) => (
        <span key={`${ch}-${i}`} className="cm-letter" aria-hidden="true" style={{ animationDelay: `${start + i * step}ms` }}>
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

  if (failed) return <span className="cm-fallback" aria-hidden="true" />;

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

/** A photo that rises open, with parallax + Ken Burns inside. */
function Photo({ src, alt, position, className = '' }) {
  return (
    <span className={`cm-clip ${className}`}>
      <span className="cm-par">
        <span className="cm-kb">
          <CardImage src={src} alt={alt} position={position} />
        </span>
      </span>
    </span>
  );
}

/** Soft ring that follows the mouse. Ink on paper, white over the big photo. */
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
      setOnPhoto(Boolean(e.target.closest && e.target.closest('.cm-hero')));
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
      <div ref={ringRef} className={`cm-cursor ${tone} ${visible ? 'is-visible' : ''} ${grow ? 'is-grow' : ''} ${label ? 'has-label' : ''}`} aria-hidden="true">
        <span className="cm-cursor__label">{label}</span>
      </div>
      <div ref={dotRef} className={`cm-cursor-dot ${tone} ${visible ? 'is-visible' : ''} ${grow ? 'is-grow' : ''}`} aria-hidden="true" />
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
   CRAFT & MATERIALS
   ═════════════════════════════════════════════════════════════════════════════ */

export default function CraftMaterials({
  sectionNumber = '04',
  eyebrow = 'Craft & Materials',
  titleLines = [{ text: 'Thoughtfully' }, { text: 'Chosen. Beautifully' }, { text: 'Crafted.', accent: true }],
  description = 'Every piece at Aurelia is a celebration of exceptional materials and skilled craftsmanship. We source the finest natural fabrics and work with artisans who bring generations of expertise to every stitch, seam and detail.',
  quote = ['Better materials.', 'A more beautiful tomorrow.'],
  brand = 'Aurelia',
  brandHref = '/',
  showBrand = true,
  heroKicker = 'The art of',
  heroTitle = 'True Craftsmanship',
  image = `${IMG}/craft-hero.jpg`,
  imageAlt = 'Hands hand-stitching a natural linen garment on a wooden worktable in warm light',
  imagePosition = '50% 40%',
  features = FEATURES,
  swatches = SWATCHES,
  outro = ['Exceptional materials.', 'Lasting beauty.'],
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
      { threshold: 0.25 }
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

  /* ── render ──────────────────────────────────────────────────────────── */
  return (
    <section
      id="craft-materials"
      ref={rootRef}
      className={`${serif.variable} ${sans.variable} cm ${revealed ? 'is-in' : ''} ${onScreen ? '' : 'is-offscreen'}`}
      aria-label="Craft and materials"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <div className="cm-light" aria-hidden="true" />

      <div className="cm-stage">
        {/* ── leaf shadows ──────────────────────────────────────────── */}
        <div className="cm-shadow cm-shadow--tl" aria-hidden="true">
          <Leaves className="cm-leaves" />
        </div>
        <div className="cm-shadow cm-shadow--tl cm-shadow--b" aria-hidden="true">
          <Leaves className="cm-leaves" />
        </div>
        <div className="cm-shadow cm-shadow--br" aria-hidden="true">
          <Leaves className="cm-leaves" />
        </div>

        {/* ══ Left: copy ═══════════════════════════════════════════════ */}
        {showBrand && (
          <Link href={brandHref} className="cm-brand" data-cursor="Home">
            {brand}
          </Link>
        )}

        <div className="cm-copy">
          <p className="cm-eyebrow">
            <span className="cm-eyebrow__num">{sectionNumber}</span>
            <i className="cm-eyebrow__line" />
            <span className="cm-eyebrow__label">
              <SplitLetters text={eyebrow} start={260} />
            </span>
          </p>

          <h2 className="cm-title">
            {titleLines.map((line, i) => (
              <span className="cm-line" key={i}>
                <span
                  className={`cm-line__in ${line.accent ? 'cm-line__in--accent' : ''}`}
                  style={{ animationDelay: `${300 + i * 150}ms` }}
                >
                  {line.text}
                </span>
              </span>
            ))}
          </h2>

          <p className="cm-desc">{description}</p>
          <i className="cm-rule" />
          <p className="cm-quote">
            {quote.map((q) => (
              <span key={q}>{q}</span>
            ))}
          </p>
        </div>

        {/* ══ Centre: big photo ════════════════════════════════════════ */}
        <figure className="cm-hero" data-cursor="View" style={{ '--t1': HERO_TINT[0], '--t2': HERO_TINT[1] }}>
          <Photo src={image} alt={imageAlt} position={imagePosition} className="cm-clip--hero" />
          <div className="cm-hero__shade" aria-hidden="true" />
          <figcaption className="cm-hero__cap">
            <span className="cm-hero__kicker">{heroKicker}</span>
            <span className="cm-hero__title">
              <span className="cm-hero__title-in">{heroTitle}</span>
            </span>
            <i />
          </figcaption>
        </figure>

        {/* ══ Right: three features ════════════════════════════════════ */}
        <div className="cm-side">
          {features.map((f, i) => {
            const geo = ROWS[i % ROWS.length];
            const tint = TINTS[i % TINTS.length];
            return (
              <article
                className="cm-row"
                key={f.label}
                style={{ '--i': i, '--top': `${geo.top}%`, '--h': `${geo.h}%`, '--pt': geo.pt, '--t1': tint[0], '--t2': tint[1] }}
              >
                <div className="cm-row__img" data-cursor="View">
                  <Photo src={f.image} alt={f.alt} />
                </div>
                <div className="cm-row__text">
                  <h3 className="cm-label">{f.label}</h3>
                  <i className="cm-row__rule" />
                  <p>{f.text}</p>
                </div>
              </article>
            );
          })}
        </div>

        {/* ══ Bottom: five material swatches ═══════════════════════════ */}
        <div className="cm-swatches">
          {swatches.map((s, i) => {
            const tint = TINTS[(i + 2) % TINTS.length];
            return (
              <article className="cm-sw" key={s.label} style={{ '--i': i, '--t1': tint[0], '--t2': tint[1] }}>
                <div className="cm-sw__img" data-cursor="View">
                  <Photo src={s.image} alt={s.alt} />
                </div>
                <h3 className="cm-label cm-sw__label">{s.label}</h3>
                <p className="cm-sw__cap">{s.caption}</p>
                <i className="cm-sw__rule" />
              </article>
            );
          })}
        </div>

        {/* ══ Bottom right: sign-off ═══════════════════════════════════ */}
        <p className="cm-outro">
          {outro.map((o) => (
            <span key={o}>{o}</span>
          ))}
          <i />
        </p>
      </div>

      <SectionCursor rootRef={rootRef} enabled={revealed} />

      <style jsx global>{`
        /* ═══════════════════════════════════════════════════════════════════
           ROOT — soft paper, tokens
           ═══════════════════════════════════════════════════════════════════ */
        .cm {
          --ink: #3a3129;
          --ink-deep: #2d251e;
          --ink-soft: rgba(58, 49, 41, 0.84);
          --muted: #7a6957;
          --line: rgba(58, 49, 41, 0.34);
          --copper: #c98a63;
          --ease-out: cubic-bezier(0.22, 0.8, 0.2, 1);
          --ease-expo: cubic-bezier(0.19, 1, 0.22, 1);
          --ease-wipe: cubic-bezier(0.76, 0, 0.18, 1);
          --mx: 0;
          --my: 0;
          --sp: 0;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
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
        .cm a,
        .cm button {
          -webkit-tap-highlight-color: transparent;
        }

        /* paper grain (static) */
        .cm::before {
          content: '';
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          opacity: 0.2;
          mix-blend-mode: multiply;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35  0 0 0 0 0.28  0 0 0 0 0.2  0 0 0 0.9 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
        }

        /* drifting light on the paper */
        .cm-light {
          position: absolute;
          inset: -8%;
          z-index: 0;
          pointer-events: none;
          background:
            linear-gradient(115deg, transparent 40%, rgba(255, 244, 224, 0.26) 52%, transparent 64%),
            radial-gradient(40% 40% at 8% 6%, rgba(255, 246, 228, 0.45), transparent 70%);
          animation: cmLight 14s ease-in-out infinite alternate;
        }
        @keyframes cmLight {
          from {
            opacity: 0.5;
            transform: translate3d(-2.5%, 0, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(2.5%, 1.5%, 0);
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           STAGE — the reference (1536 × 1024) scaled to fit one screen.
           --px is "one reference pixel". Fonts and offsets are written as
           calc(var(--px) * N) with N taken from the reference.
           ═══════════════════════════════════════════════════════════════════ */
        .cm-stage {
          /* fallback for browsers without container units */
          --px: calc(min(100vw, max(150svh, 1100px)) / 1536);
          position: relative;
          z-index: 2;
          width: min(100%, max(150svh, 1100px));
          aspect-ratio: 3 / 2;
          container-type: inline-size;

          --f-brand: calc(var(--px) * 46);
          --f-eyebrow: max(9px, calc(var(--px) * 11));
          --f-title: calc(var(--px) * 46.4);
          --f-body: max(12px, calc(var(--px) * 15));
          --f-quote: max(15px, calc(var(--px) * 20));
          --f-hero-kicker: max(9px, calc(var(--px) * 11));
          --f-hero-title: calc(var(--px) * 42);
          --f-label: max(9px, calc(var(--px) * 11));
          --f-cap: max(11px, calc(var(--px) * 14));
          --f-side: max(12px, calc(var(--px) * 15));
        }
        @supports (width: 1cqw) {
          .cm-stage {
            --px: calc(100cqw / 1536);
          }
        }

        @keyframes cmFade {
          from {
            opacity: 0;
            transform: translate3d(0, 16px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        @keyframes cmGrowX {
          to {
            transform: scaleX(1);
          }
        }
        @keyframes cmOpen {
          from {
            clip-path: inset(100% 0 0 0);
          }
          to {
            clip-path: inset(0 0 0 0);
          }
        }
        @keyframes cmKB {
          from {
            transform: scale(1.16) translate3d(1.2%, 0.8%, 0);
          }
          to {
            transform: scale(1) translate3d(0, 0, 0);
          }
        }

        /* leaf shadows: top-left (two layers) + faint branch bottom-right */
        .cm-shadow {
          position: absolute;
          z-index: 1;
          pointer-events: none;
          color: rgba(64, 48, 33, 0.24);
          filter: blur(5px);
        }
        .cm-shadow--tl {
          top: calc(var(--px) * -36);
          left: calc(var(--px) * -36);
          width: calc(var(--px) * 500);
          transform: scaleX(-1);
        }
        .cm-shadow--b {
          top: calc(var(--px) * 30);
          left: calc(var(--px) * -150);
          width: calc(var(--px) * 400);
          color: rgba(64, 48, 33, 0.16);
          filter: blur(10px);
        }
        .cm-shadow--br {
          right: calc(var(--px) * -40);
          bottom: calc(var(--px) * -40);
          width: calc(var(--px) * 250);
          color: rgba(96, 86, 64, 0.16);
          filter: blur(1.5px);
          transform: rotate(180deg);
        }
        .cm-leaves {
          display: block;
          width: 100%;
          height: auto;
          transform-origin: 100% 0;
          animation: cmSway 9s ease-in-out infinite alternate;
        }
        .cm-shadow--b .cm-leaves {
          animation-duration: 12s;
          animation-direction: alternate-reverse;
        }
        .cm-shadow--br .cm-leaves {
          animation-duration: 13s;
        }
        @keyframes cmSway {
          from {
            transform: rotate(-1.8deg) translate3d(0, 0, 0);
          }
          to {
            transform: rotate(2.4deg) translate3d(-8px, 6px, 0);
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           LEFT — copy
           ═══════════════════════════════════════════════════════════════════ */
        .cm-brand {
          position: absolute;
          z-index: 6;
          top: calc(var(--px) * 30);
          left: calc(var(--px) * 75);
          font-size: var(--f-brand);
          font-weight: 400;
          letter-spacing: 0.005em;
          line-height: 1;
          color: var(--ink);
          text-decoration: none;
          opacity: 0;
        }
        .cm.is-in .cm-brand {
          animation: cmFade 1.2s ease 0.1s both;
        }

        .cm-copy {
          position: absolute;
          z-index: 5;
          top: calc(var(--px) * 140);
          left: calc(var(--px) * 82);
          width: calc(var(--px) * 357);
          transform: translate3d(calc(var(--mx) * 6px), 0, 0);
          transition: transform 0.8s cubic-bezier(0.2, 0.7, 0.2, 1);
        }
        .cm-eyebrow {
          display: flex;
          align-items: center;
          gap: calc(var(--px) * 16);
          margin: 0 0 calc(var(--px) * 26);
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: var(--f-eyebrow);
          line-height: 1.2;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: var(--ink);
        }
        .cm-eyebrow__num {
          opacity: 0;
        }
        .cm.is-in .cm-eyebrow__num {
          animation: cmFade 1s ease 0.15s both;
        }
        .cm-eyebrow__line {
          display: block;
          flex: 0 0 calc(var(--px) * 26);
          height: 1px;
          background: var(--line);
          transform: scaleX(0);
          transform-origin: left;
        }
        .cm.is-in .cm-eyebrow__line {
          animation: cmGrowX 1.2s var(--ease-out) 0.35s both;
        }
        .cm-letter {
          display: inline-block;
          opacity: 0;
        }
        .cm.is-in .cm-letter {
          animation: cmLetter 0.9s var(--ease-expo) both;
        }
        @keyframes cmLetter {
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

        .cm-title {
          margin: 0;
          font-weight: 400;
          font-size: var(--f-title);
          line-height: 1.2;
          letter-spacing: -0.014em;
          white-space: nowrap;
          color: var(--ink-deep);
        }
        .cm-line {
          display: block;
          overflow: hidden;
          padding: 0.02em 0.2em 0.1em 0;
          margin-bottom: -0.06em;
        }
        .cm-line__in {
          display: inline-block;
          transform: translate3d(0, 115%, 0) rotate(3deg);
          transform-origin: left bottom;
        }
        .cm.is-in .cm-line__in {
          animation: cmRise 1.35s var(--ease-expo) both;
        }
        .cm-line__in--accent {
          font-style: italic;
          padding-right: 0.08em;
          background: linear-gradient(95deg, #8b7560 0%, #6c5a49 45%, #a08a72 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }
        .cm.is-in .cm-line__in--accent {
          animation: cmRise 1.35s var(--ease-expo) both, cmShimmer 8s ease-in-out 1.8s infinite alternate;
        }
        @keyframes cmRise {
          from {
            transform: translate3d(0, 115%, 0) rotate(3deg);
          }
          to {
            transform: translate3d(0, 0, 0) rotate(0);
          }
        }
        @keyframes cmShimmer {
          from {
            background-position: 0% 50%;
          }
          to {
            background-position: 100% 50%;
          }
        }

        .cm-desc {
          margin: calc(var(--px) * 28) 0 0;
          max-width: calc(var(--px) * 312);
          font-size: var(--f-body);
          font-weight: 500;
          line-height: 1.47;
          color: var(--ink-soft);
          opacity: 0;
        }
        .cm.is-in .cm-desc {
          animation: cmFade 1.2s ease 1s both;
        }
        .cm-rule {
          display: block;
          width: calc(var(--px) * 47);
          height: 1px;
          margin: calc(var(--px) * 26) 0 calc(var(--px) * 21);
          background: var(--line);
          transform: scaleX(0);
          transform-origin: left;
        }
        .cm.is-in .cm-rule {
          animation: cmGrowX 1.2s var(--ease-out) 1.2s both;
        }
        .cm-quote {
          margin: 0;
          font-size: var(--f-quote);
          font-style: italic;
          font-weight: 500;
          line-height: 1.35;
          color: var(--ink);
          opacity: 0;
        }
        .cm-quote span {
          display: block;
        }
        .cm.is-in .cm-quote {
          animation: cmFade 1.2s ease 1.35s both;
        }

        /* ═══════════════════════════════════════════════════════════════════
           CENTRE — big photo
           ═══════════════════════════════════════════════════════════════════ */
        .cm-hero {
          position: absolute;
          z-index: 3;
          top: 0;
          left: 28.97%;
          width: 41.15%;
          height: 62.5%;
          margin: 0;
          overflow: visible;
        }
        .cm-clip {
          position: absolute;
          inset: 0;
          overflow: hidden;
          background: #d9cebe;
          clip-path: inset(100% 0 0 0);
        }
        .cm-par {
          position: absolute;
          inset: -7%;
          transform: translate3d(calc(var(--mx) * -10px), calc(var(--my) * -6px + var(--sp) * 12px), 0);
          transition: transform 0.9s cubic-bezier(0.2, 0.7, 0.2, 1);
          will-change: transform;
        }
        .cm-kb {
          position: absolute;
          inset: 0;
          transform: scale(1.16);
        }
        .cm-kb img,
        .cm-kb .cm-fallback {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scale(1);
          transition: transform 1.4s var(--ease-out);
          -webkit-user-drag: none;
        }
        .cm-fallback {
          background:
            radial-gradient(ellipse 80% 55% at 30% 22%, rgba(255, 250, 240, 0.55), transparent 72%),
            linear-gradient(170deg, var(--t1), var(--t2));
        }
        .cm-clip--hero {
          background: #b7a086;
        }
        .cm-clip--hero .cm-par {
          inset: -5%;
          transform: translate3d(calc(var(--mx) * -20px), calc(var(--my) * -12px + var(--sp) * 22px), 0);
        }
        .cm-hero:hover .cm-kb img,
        .cm-hero:hover .cm-kb .cm-fallback,
        .cm-row__img:hover .cm-kb img,
        .cm-row__img:hover .cm-kb .cm-fallback,
        .cm-sw__img:hover .cm-kb img,
        .cm-sw__img:hover .cm-kb .cm-fallback {
          transform: scale(1.06);
        }

        /* photos rise open, Ken Burns settle */
        .cm.is-in .cm-clip--hero {
          animation: cmOpen 1.7s var(--ease-wipe) 0.1s both;
        }
        .cm.is-in .cm-clip--hero .cm-kb {
          animation: cmKB 3s var(--ease-out) 0.2s both;
        }
        .cm.is-in .cm-row .cm-clip {
          animation: cmOpen 1.5s var(--ease-wipe) calc(var(--i) * 160ms + 500ms) both;
        }
        .cm.is-in .cm-row .cm-kb {
          animation: cmKB 2.6s var(--ease-out) calc(var(--i) * 160ms + 600ms) both;
        }
        .cm.is-in .cm-sw .cm-clip {
          animation: cmOpen 1.5s var(--ease-wipe) calc(var(--i) * 120ms + 800ms) both;
        }
        .cm.is-in .cm-sw .cm-kb {
          animation: cmKB 2.6s var(--ease-out) calc(var(--i) * 120ms + 900ms) both;
        }

        /* very gentle warm shade so the white caption stays readable */
        .cm-hero__shade {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(0deg, rgba(48, 34, 22, 0.32) 0%, rgba(48, 34, 22, 0) 42%);
          opacity: 0;
        }
        .cm.is-in .cm-hero__shade {
          animation: cmFade 1.6s ease 1.2s both;
        }

        .cm-hero__cap {
          position: absolute;
          left: calc(var(--px) * 43);
          bottom: calc(var(--px) * 48);
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          color: #fff;
        }
        .cm-hero__kicker {
          display: block;
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: var(--f-hero-kicker);
          line-height: 1.2;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          opacity: 0;
        }
        .cm.is-in .cm-hero__kicker {
          animation: cmFade 1.2s ease 1.3s both;
        }
        .cm-hero__title {
          display: block;
          margin-top: calc(var(--px) * 11);
          overflow: hidden;
          padding: 0.02em 0.2em 0.1em 0;
        }
        .cm-hero__title-in {
          display: inline-block;
          font-size: var(--f-hero-title);
          font-weight: 400;
          line-height: 1.1;
          letter-spacing: -0.01em;
          white-space: nowrap;
          transform: translate3d(0, 115%, 0) rotate(3deg);
          transform-origin: left bottom;
        }
        .cm.is-in .cm-hero__title-in {
          animation: cmRise 1.35s var(--ease-expo) 1.45s both;
        }
        .cm-hero__cap i {
          display: block;
          width: calc(var(--px) * 47);
          height: 1px;
          margin-top: calc(var(--px) * 12);
          background: rgba(255, 255, 255, 0.7);
          transform: scaleX(0);
          transform-origin: left;
        }
        .cm.is-in .cm-hero__cap i {
          animation: cmGrowX 1.2s var(--ease-out) 1.9s both;
        }

        /* ═══════════════════════════════════════════════════════════════════
           RIGHT — three features
           ═══════════════════════════════════════════════════════════════════ */
        .cm-side {
          position: absolute;
          inset: 0;
          z-index: 3;
          pointer-events: none;
        }
        .cm-row {
          position: absolute;
          left: 71.55%;
          width: 28.45%;
          top: var(--top);
          height: var(--h);
          pointer-events: none;
        }
        .cm-row__img {
          position: absolute;
          left: 0;
          top: 0;
          width: 47.36%;
          height: 100%;
          pointer-events: auto;
        }
        .cm-row__text {
          position: absolute;
          left: 54%;
          width: 39%;
          top: calc(var(--px) * var(--pt));
          pointer-events: auto;
        }
        .cm-label {
          margin: 0;
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: var(--f-label);
          font-weight: 400;
          line-height: 1.2;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: var(--ink);
        }
        .cm-row__text .cm-label,
        .cm-row__text p {
          opacity: 0;
        }
        .cm-row__rule {
          display: block;
          width: calc(var(--px) * 28);
          height: 1px;
          margin: calc(var(--px) * 16) 0 calc(var(--px) * 17);
          background: var(--line);
          transform: scaleX(0);
          transform-origin: left;
        }
        .cm-row__text p {
          margin: 0;
          font-size: var(--f-side);
          font-weight: 500;
          line-height: 1.34;
          color: var(--ink-soft);
        }
        .cm.is-in .cm-row__text .cm-label {
          animation: cmFade 1.1s ease calc(var(--i) * 160ms + 1000ms) both;
        }
        .cm.is-in .cm-row__rule {
          animation: cmGrowX 1.1s var(--ease-out) calc(var(--i) * 160ms + 1150ms) both;
        }
        .cm.is-in .cm-row__text p {
          animation: cmFade 1.1s ease calc(var(--i) * 160ms + 1250ms) both;
        }

        /* ═══════════════════════════════════════════════════════════════════
           BOTTOM — five swatches
           ═══════════════════════════════════════════════════════════════════ */
        .cm-swatches {
          position: absolute;
          z-index: 3;
          left: 5.4%;
          top: 65.92%;
          width: 64.5%;
          display: grid;
          grid-template-columns: 191fr 189fr 182fr 175fr 175fr;
          column-gap: 2.018%;
        }
        .cm-sw {
          min-width: 0;
        }
        .cm-sw__img {
          position: relative;
          height: calc(var(--px) * 182);
        }
        .cm-sw__label {
          margin-top: calc(var(--px) * 29);
          opacity: 0;
        }
        .cm-sw__cap {
          margin: calc(var(--px) * 12) 0 0;
          font-size: var(--f-cap);
          font-style: italic;
          font-weight: 500;
          line-height: 1.3;
          color: var(--ink-soft);
          opacity: 0;
        }
        .cm-sw__rule {
          display: block;
          width: calc(var(--px) * 28);
          height: 1px;
          margin-top: calc(var(--px) * 15);
          background: var(--line);
          transform: scaleX(0);
          transform-origin: left;
        }
        .cm.is-in .cm-sw__label {
          animation: cmFade 1.1s ease calc(var(--i) * 120ms + 1400ms) both;
        }
        .cm.is-in .cm-sw__cap {
          animation: cmFade 1.1s ease calc(var(--i) * 120ms + 1500ms) both;
        }
        .cm.is-in .cm-sw__rule {
          animation: cmGrowX 1.1s var(--ease-out) calc(var(--i) * 120ms + 1650ms) both;
        }

        /* sign-off, bottom right */
        .cm-outro {
          position: absolute;
          z-index: 3;
          left: 82.55%;
          top: calc(var(--px) * 902);
          margin: 0;
          font-size: var(--f-cap);
          font-style: italic;
          font-weight: 500;
          line-height: 1.43;
          color: var(--ink-soft);
          opacity: 0;
        }
        .cm-outro span {
          display: block;
        }
        .cm-outro i {
          display: block;
          width: calc(var(--px) * 28);
          height: 1px;
          margin-top: calc(var(--px) * 15);
          background: var(--line);
        }
        .cm.is-in .cm-outro {
          animation: cmFade 1.2s ease 2.2s both;
        }

        /* ═══════════════════════════════════════════════════════════════════
           CURSOR — ink on paper, white over the big photo
           ═══════════════════════════════════════════════════════════════════ */
        .cm-cursor,
        .cm-cursor-dot {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 200;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.35s ease;
        }
        .cm-cursor.is-visible,
        .cm-cursor-dot.is-visible {
          opacity: 1;
        }
        .cm-cursor::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 44px;
          height: 44px;
          margin: -22px 0 0 -22px;
          border-radius: 50%;
          border: 1px solid rgba(58, 49, 41, 0.55);
          background: rgba(58, 49, 41, 0);
          transition: transform 0.5s var(--ease-out), background 0.4s ease, border-color 0.4s ease;
        }
        .cm-cursor.is-grow::before {
          transform: scale(1.5);
          background: rgba(58, 49, 41, 0.06);
          border-color: rgba(58, 49, 41, 0.8);
        }
        .cm-cursor.has-label::before {
          transform: scale(1.9);
          background: rgba(238, 230, 219, 0.6);
          -webkit-backdrop-filter: blur(6px);
          backdrop-filter: blur(6px);
        }
        .cm-cursor__label {
          position: absolute;
          top: 0;
          left: 0;
          transform: translate(-50%, -50%);
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: 0.66rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ink);
          white-space: nowrap;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .cm-cursor.has-label .cm-cursor__label {
          opacity: 1;
        }
        .cm-cursor-dot::before {
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
        .cm-cursor-dot.is-grow::before {
          transform: scale(0);
        }
        .cm-cursor.is-photo::before {
          border-color: rgba(255, 255, 255, 0.65);
        }
        .cm-cursor.is-photo.is-grow::before {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.9);
        }
        .cm-cursor.is-photo.has-label::before {
          background: rgba(40, 30, 22, 0.4);
        }
        .cm-cursor.is-photo .cm-cursor__label {
          color: #fff;
        }
        .cm-cursor-dot.is-photo::before {
          background: #fff;
        }

        /* ═══════════════════════════════════════════════════════════════════
           FOCUS + PAUSE
           ═══════════════════════════════════════════════════════════════════ */
        .cm a:focus-visible,
        .cm button:focus-visible {
          outline: 2px solid var(--copper);
          outline-offset: 4px;
        }
        .cm.is-offscreen .cm-light,
        .cm.is-offscreen .cm-leaves,
        .cm.is-offscreen .cm-line__in--accent {
          animation-play-state: paused;
        }

        /* ═══════════════════════════════════════════════════════════════════
           STACKED LAYOUT (tablet + mobile): normal scrolling section
           ═══════════════════════════════════════════════════════════════════ */
        @media (max-width: 1100px) {
          .cm {
            display: block;
            min-height: 0;
            --g: clamp(22px, 6vw, 56px);
          }
          .cm-stage {
            --f-brand: 1.9rem;
            --f-eyebrow: 0.66rem;
            --f-title: clamp(2.4rem, 8.4vw, 3.6rem);
            --f-body: 1.02rem;
            --f-quote: 1.3rem;
            --f-hero-kicker: 0.66rem;
            --f-hero-title: clamp(1.9rem, 7vw, 2.9rem);
            --f-label: 0.66rem;
            --f-cap: 0.92rem;
            --f-side: 0.98rem;
            --px: 1px;
            display: flex;
            flex-direction: column;
            width: 100%;
            aspect-ratio: auto;
            container-type: normal;
            padding: 96px var(--g) 56px;
          }
          .cm-shadow--tl {
            width: 70vw;
            top: -20px;
            left: -20px;
          }
          .cm-shadow--b {
            width: 56vw;
            left: -80px;
          }
          .cm-shadow--br {
            display: none;
          }
          .cm-brand {
            top: 30px;
            left: var(--g);
          }
          .cm-copy {
            position: relative;
            top: auto;
            left: auto;
            width: 100%;
            max-width: 560px;
            transform: none;
          }
          .cm-eyebrow {
            gap: 16px;
            margin-bottom: 26px;
          }
          .cm-eyebrow__line {
            flex-basis: 26px;
          }
          .cm-title {
            white-space: normal;
          }
          .cm-desc {
            margin-top: 26px;
            max-width: 40ch;
          }
          .cm-rule {
            width: 47px;
            margin: 26px 0 20px;
          }

          .cm-hero {
            position: relative;
            top: auto;
            left: auto;
            width: 100%;
            height: auto;
            aspect-ratio: 1 / 0.92;
            margin-top: 40px;
          }
          .cm-hero__cap {
            left: 22px;
            bottom: 26px;
          }
          .cm-hero__title {
            margin-top: 10px;
          }
          .cm-hero__cap i {
            width: 47px;
            margin-top: 12px;
          }

          .cm-side {
            position: static;
            display: flex;
            flex-direction: column;
            gap: 30px;
            margin-top: 40px;
            pointer-events: auto;
          }
          .cm-row {
            position: relative;
            left: auto;
            top: auto;
            width: 100%;
            height: auto;
            display: grid;
            grid-template-columns: minmax(0, 42%) minmax(0, 1fr);
            column-gap: 22px;
            align-items: start;
          }
          .cm-row__img {
            position: relative;
            width: 100%;
            height: auto;
            aspect-ratio: 207 / 240;
          }
          .cm-row__text {
            position: static;
            width: auto;
            padding-top: 6px;
          }
          .cm-row__rule {
            width: 28px;
            margin: 14px 0 14px;
          }
          .cm-row__text p {
            max-width: 32ch;
          }

          .cm-swatches {
            position: relative;
            top: auto;
            left: auto;
            width: 100%;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 30px 18px;
            margin-top: 44px;
          }
          .cm-sw__img {
            height: auto;
            aspect-ratio: 1 / 1;
          }
          .cm-sw__label {
            margin-top: 22px;
          }
          .cm-sw__cap {
            margin-top: 10px;
          }
          .cm-sw__rule {
            width: 28px;
            margin-top: 12px;
          }

          .cm-outro {
            position: relative;
            top: auto;
            left: auto;
            margin-top: 40px;
          }
          .cm-outro i {
            width: 28px;
            margin-top: 14px;
          }
        }

        @media (min-width: 640px) and (max-width: 1100px) {
          .cm-swatches {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          .cm-side {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 26px;
          }
          .cm-row {
            display: block;
          }
          .cm-row__img {
            aspect-ratio: 6 / 5;
          }
          .cm-row__text {
            padding-top: 18px;
          }
        }

        @media (pointer: coarse) {
          .cm-cursor,
          .cm-cursor-dot {
            display: none;
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           REDUCED MOTION
           ═══════════════════════════════════════════════════════════════════ */
        @media (prefers-reduced-motion: reduce) {
          .cm *,
          .cm *::before,
          .cm *::after {
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