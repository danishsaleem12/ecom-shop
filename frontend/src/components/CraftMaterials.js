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
import './styles/CraftMaterials.css';

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

    </section>
  );
}