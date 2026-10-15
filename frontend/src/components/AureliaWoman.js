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
import './styles/AureliaWoman.css';

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

    </section>
  );
}