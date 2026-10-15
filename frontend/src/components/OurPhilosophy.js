'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AURELIA · OUR PHILOSOPHY
 * ─────────────────────────────────────────────────────────────────────────────
 *  Place at: frontend/src/components/OurPhilosophy.js
 *  Use:      <OurPhilosophy />   inside src/app/about/page.js, under <OurStory />
 *
 *  Layout (same as the reference)
 *   ┌──────────────────────────────────────────────────────┐
 *   │ logo                                   03 — Our Philosophy
 *   │ OUR PHILOSOPHY               ┌── photo fades into paper
 *   │ More Than Fashion,           │   woman on the wall + olive vase
 *   │ A Way of Seeing.             │        italic note
 *   │ ───  paragraph               │
 *   ├──────────────────────────────┴───────────────────────┤
 *   │ 01 Timelessness │ 02 Craftsmanship │ 03 Simplicity │ 04 Beauty
 *   │ text + rule     │ text + rule      │ …             │ …
 *   │ [photo]         │ [photo]          │ [photo]       │ [photo]
 *   │ Aurelia ─────────                    TIMELESS / CONSCIOUS / BEAUTIFUL
 *   └──────────────────────────────────────────────────────┘
 *    (optional stone ledge photo along the very bottom)
 *
 *  Light and airy, like the reference: soft paper, no dark overlays, no
 *  particles or sparkles on the photos. The hero photo dissolves into the
 *  paper on the left with a CSS mask, so the text always sits on clean paper.
 *
 *  Style (same language as Hero / AboutHero / CollectionsSection / OurStory)
 *   • Fonts, easing curves and gutter scale, custom cursor, reduced-motion and
 *     touch fallbacks
 *   • Hero plays when scrolled into view: letter-stagger eyebrow, line-mask
 *     headline with shimmer on the italic line, hairlines that draw
 *   • The four pillars play when THEY scroll into view: photos rise open with a
 *     Ken Burns settle, hairlines draw, the signature is written in
 *   • Gentle mouse + scroll parallax, swaying leaf shadows, drifting light
 *
 *  IMAGES  →  /public/images/philosophy/
 *    philosophy-hero.jpg   wide landscape, subject on the right (about 3:2)
 *    timelessness.jpg  craftsmanship.jpg  simplicity.jpg  beauty.jpg   (about 7:4)
 *    philosophy-ledge.jpg  OPTIONAL wide stone strip for the bottom edge.
 *                          If the file is missing, the strip is simply not shown.
 *   A missing photo shows a soft beige gradient, so nothing breaks.
 *   You can also pass full URLs through the props.
 *
 *  Props (all optional)
 *   sectionNumber, sectionLabel, eyebrow, titleLines: [{ text, accent }]
 *   description, note: string[], brand, brandHref, showBrand
 *   image, imageAlt, imagePosition
 *   pillars: [{ title, text, image, alt }]
 *   signature, tagline: string[], ledgeImage
 *
 *  NOTE: every class starts with "op-" (keyframes with "op") so nothing clashes
 *  with the other sections' global styles when they share a page.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Allura, Cormorant_Garamond, Figtree } from 'next/font/google';
import './styles/OurPhilosophy.css';

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

const script = Allura({
  subsets: ['latin'],
  weight: '400',
  variable: '--aur-script',
  display: 'swap',
});

/* ═════════════════════════════════════════════════════════════════════════════
   DATA — edit copy and images here
   ═════════════════════════════════════════════════════════════════════════════ */

const IMG = '/images/philosophy';

const PILLARS = [
  {
    title: 'Timelessness',
    text: 'We create pieces that transcend seasons and trends — designed to be loved, worn and passed down.',
    image: `${IMG}/timelessness.jpg`,
    alt: 'An olive sprig resting on soft natural linen',
  },
  {
    title: 'Craftsmanship',
    text: 'Every detail matters. We honour traditional techniques and skilled hands, blending heritage with modern refinement.',
    image: `${IMG}/craftsmanship.jpg`,
    alt: 'Hands fastening the button of a lace linen garment',
  },
  {
    title: 'Simplicity',
    text: 'We believe in the beauty of less — clean lines, thoughtful silhouettes and effortless elegance.',
    image: `${IMG}/simplicity.jpg`,
    alt: 'A white daisy beside a handmade ceramic bowl',
  },
  {
    title: 'Beauty',
    text: 'Beauty lives in the details — in natural textures, soft palettes, and the quiet confidence of feeling like yourself.',
    image: `${IMG}/beauty.jpg`,
    alt: 'A hillside village among cypress trees',
  },
];

/** Soft beige gradients, used only while a photo file is missing. */
const TINTS = [
  ['#e0d6c8', '#bfae95'],
  ['#d6c9b6', '#ab977c'],
  ['#e3dacc', '#c4b49c'],
  ['#d0c7b2', '#a89c80'],
];
const HERO_TINT = ['#d3dadb', '#c3b299'];

const pad = (n) => String(n).padStart(2, '0');

/* ═════════════════════════════════════════════════════════════════════════════
   SMALL COMPONENTS
   ═════════════════════════════════════════════════════════════════════════════ */

/** Letters fade + rise one after another. */
function SplitLetters({ text, step = 40, start = 0 }) {
  return (
    <span aria-label={text}>
      {text.split('').map((ch, i) => (
        <span key={`${ch}-${i}`} className="op-letter" aria-hidden="true" style={{ animationDelay: `${start + i * step}ms` }}>
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

  if (failed) return <span className="op-fallback" aria-hidden="true" />;

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

/** Optional stone strip along the bottom. Not rendered at all if the file is missing. */
function Ledge({ src }) {
  const [failed, setFailed] = useState(!src);
  const ref = useRef(null);

  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) return null;

  return (
    <div className="op-ledge" aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={ref} src={src} alt="" loading="lazy" draggable={false} onError={() => setFailed(true)} />
    </div>
  );
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
      <div ref={ringRef} className={`op-cursor ${visible ? 'is-visible' : ''} ${grow ? 'is-grow' : ''} ${label ? 'has-label' : ''}`} aria-hidden="true">
        <span className="op-cursor__label">{label}</span>
      </div>
      <div ref={dotRef} className={`op-cursor-dot ${visible ? 'is-visible' : ''} ${grow ? 'is-grow' : ''}`} aria-hidden="true" />
    </>
  );
}

/** Olive-branch silhouette. Blurred + translucent it reads as a leaf shadow; crisp + olive it reads as a real branch. */
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
   OUR PHILOSOPHY
   ═════════════════════════════════════════════════════════════════════════════ */

export default function OurPhilosophy({
  sectionNumber = '03',
  sectionLabel = 'Our Philosophy',
  eyebrow = 'Our Philosophy',
  titleLines = [{ text: 'More Than Fashion,' }, { text: 'A Way of Seeing.', accent: true }],
  description = 'At Aurelia, we believe fashion is more than what you wear — it’s how you move through the world. Our philosophy is rooted in timelessness, intentionality and a deep respect for craft, beauty and the people behind each piece.',
  note = ['Timeless', 'values, for', 'a more beautiful', 'tomorrow.'],
  brand = 'Aurelia',
  brandHref = '/',
  showBrand = true,
  image = `${IMG}/philosophy-hero.jpg`,
  imageAlt = 'Woman in a flowing cream linen dress sitting on a sunlit stone wall above rolling hills, an olive branch in a clay vase beside her',
  imagePosition = '68% 30%',
  pillars = PILLARS,
  signature = 'Aurelia',
  tagline = ['Timeless', 'Conscious', 'Beautiful'],
  ledgeImage = `${IMG}/philosophy-ledge.jpg`,
}) {
  const rootRef = useRef(null);
  const bandRef = useRef(null);

  const [revealed, setRevealed] = useState(false);
  const [bandIn, setBandIn] = useState(false);
  const [onScreen, setOnScreen] = useState(false);

  /* ── in view: hero reveals with the section, pillars reveal when they arrive ── */
  useEffect(() => {
    const el = rootRef.current;
    const band = bandRef.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setRevealed(true);
      setBandIn(true);
      setOnScreen(true);
      return undefined;
    }

    const ioRoot = new IntersectionObserver(
      ([entry]) => {
        setOnScreen(entry.isIntersecting);
        if (entry.isIntersecting) setRevealed(true);
      },
      { threshold: 0.12 }
    );
    ioRoot.observe(el);

    let ioBand;
    if (band) {
      ioBand = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setBandIn(true);
        },
        { threshold: 0.22 }
      );
      ioBand.observe(band);
    }

    return () => {
      ioRoot.disconnect();
      if (ioBand) ioBand.disconnect();
    };
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
      id="our-philosophy"
      ref={rootRef}
      className={`${serif.variable} ${sans.variable} ${script.variable} op ${revealed ? 'is-in' : ''} ${bandIn ? 'is-band' : ''} ${onScreen ? '' : 'is-offscreen'}`}
      aria-label="Our philosophy"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {/* ── Atmosphere: light + leaf shadows ─────────────────────────── */}
      <div className="op-light" aria-hidden="true" />
      <div className="op-shadow op-shadow--tl" aria-hidden="true">
        <Leaves className="op-leaves" />
      </div>
      <div className="op-shadow op-shadow--tl op-shadow--b" aria-hidden="true">
        <Leaves className="op-leaves" />
      </div>
      <div className="op-shadow op-shadow--r" aria-hidden="true">
        <Leaves className="op-leaves" />
      </div>

      {/* ══ Hero: photo dissolving into paper + copy ═══════════════════ */}
      <div className="op-hero">
        <div className="op-hero__clip" style={{ '--t1': HERO_TINT[0], '--t2': HERO_TINT[1] }}>
          <div className="op-hero__mask">
            <div className="op-hero__par">
              <div className="op-hero__kb">
                <CardImage src={image} alt={imageAlt} position={imagePosition} />
              </div>
            </div>
          </div>
        </div>

        {showBrand && (
          <Link href={brandHref} className="op-brand" data-cursor="Home">
            {brand}
          </Link>
        )}

        <p className="op-label" aria-hidden="true">
          <span>{sectionNumber}</span>
          <i />
          <span>{sectionLabel}</span>
        </p>

        <div className="op-note">
          <p>
            {note.map((n) => (
              <span key={n}>{n}</span>
            ))}
          </p>
          <i />
        </div>

        <div className="op-hero__copy">
          <p className="op-eyebrow">
            <SplitLetters text={eyebrow} start={200} />
          </p>

          <h2 className="op-title">
            {titleLines.map((line, i) => (
              <span className="op-line" key={i}>
                <span
                  className={`op-line__in ${line.accent ? 'op-line__in--accent' : ''}`}
                  style={{ animationDelay: `${300 + i * 150}ms` }}
                >
                  {line.text}
                </span>
              </span>
            ))}
          </h2>

          <i className="op-rule" />
          <p className="op-desc">{description}</p>
        </div>
      </div>

      {/* ══ Band: four pillars + signature row ═════════════════════════ */}
      <div className="op-band" ref={bandRef}>
        <div className="op-pillars" style={{ '--cols': pillars.length }}>
          {pillars.map((p, i) => {
            const tint = TINTS[i % TINTS.length];
            return (
              <article className="op-pil" key={p.title} style={{ '--i': i, '--t1': tint[0], '--t2': tint[1] }}>
                <span className="op-pil__num">{pad(i + 1)}</span>
                <h3 className="op-pil__title">{p.title}</h3>
                <p className="op-pil__text">{p.text}</p>
                <i className="op-pil__rule" />
                <div className="op-pil__img" data-cursor="View">
                  <span className="op-pil__clip">
                    <span className="op-pil__par">
                      <span className="op-pil__kb">
                        <CardImage src={p.image} alt={p.alt} />
                      </span>
                    </span>
                  </span>
                </div>
              </article>
            );
          })}
        </div>

        <div className="op-foot">
          <div className="op-foot__left">
            <span className="op-sign" aria-label={signature}>
              <span className="op-sign__word" aria-hidden="true">
                {signature}
              </span>
            </span>
            <i className="op-foot__rule" />
          </div>
          <p className="op-tags">
            {tagline.map((t, i) => (
              <span key={t}>
                {i > 0 && <i aria-hidden="true">/</i>}
                {t}
              </span>
            ))}
          </p>
        </div>
      </div>

      <Ledge src={ledgeImage} />

      {/* crisp olive branch, bottom-left corner */}
      <div className="op-branch" aria-hidden="true">
        <Leaves className="op-branch__svg" />
      </div>

      <SectionCursor rootRef={rootRef} enabled={revealed} />

    </section>
  );
}