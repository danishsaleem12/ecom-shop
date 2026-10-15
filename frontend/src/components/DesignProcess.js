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
import './styles/DesignProcess.css';

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

    </section>
  );
}