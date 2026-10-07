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

      <style jsx global>{`
        /* ═══════════════════════════════════════════════════════════════════
           ROOT — soft paper, tokens
           ═══════════════════════════════════════════════════════════════════ */
        .op {
          --ink: #3a3129;
          --ink-deep: #2d251e;
          --ink-soft: rgba(58, 49, 41, 0.82);
          --muted: #7a6957;
          --line: rgba(58, 49, 41, 0.34);
          --copper: #c98a63;
          --gutter: clamp(24px, 7.9vw, 150px);
          --gutter-r: clamp(24px, 5vw, 96px);
          --ease-out: cubic-bezier(0.22, 0.8, 0.2, 1);
          --ease-expo: cubic-bezier(0.19, 1, 0.22, 1);
          --ease-wipe: cubic-bezier(0.76, 0, 0.18, 1);
          --mx: 0;
          --my: 0;
          --sp: 0;
          position: relative;
          overflow: hidden;
          isolation: isolate;
          color: var(--ink);
          font-family: var(--aur-serif), Georgia, serif;
          background:
            radial-gradient(ellipse 60% 70% at 0% 0%, rgba(255, 250, 242, 0.55), transparent 65%),
            radial-gradient(ellipse 50% 60% at 100% 100%, rgba(255, 250, 242, 0.4), transparent 70%),
            linear-gradient(160deg, #e2d9cd 0%, #dbd1c4 55%, #d5cabc 100%);
        }
        .op a,
        .op button {
          -webkit-tap-highlight-color: transparent;
        }

        /* paper grain (static) */
        .op::before {
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
        .op-light {
          position: absolute;
          inset: -8%;
          z-index: 0;
          pointer-events: none;
          background:
            linear-gradient(115deg, transparent 40%, rgba(255, 244, 224, 0.26) 52%, transparent 64%),
            radial-gradient(40% 40% at 8% 6%, rgba(255, 246, 228, 0.45), transparent 70%);
          animation: opLight 14s ease-in-out infinite alternate;
        }
        @keyframes opLight {
          from {
            opacity: 0.5;
            transform: translate3d(-2.5%, 0, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(2.5%, 1.5%, 0);
          }
        }

        /* leaf shadows: top-left (two layers) + right edge */
        .op-shadow {
          position: absolute;
          z-index: 1;
          pointer-events: none;
          width: min(30vw, 480px);
          color: rgba(64, 48, 33, 0.22);
          filter: blur(5px);
        }
        .op-shadow--tl {
          top: -26px;
          left: -26px;
          transform: scaleX(-1);
        }
        .op-shadow--b {
          top: 26px;
          left: -100px;
          width: min(24vw, 380px);
          color: rgba(64, 48, 33, 0.15);
          filter: blur(10px);
        }
        .op-shadow--r {
          right: -34px;
          top: 47%;
          width: min(13vw, 220px);
          color: rgba(64, 48, 33, 0.16);
          filter: blur(6px);
        }
        .op-leaves {
          display: block;
          width: 100%;
          height: auto;
          transform-origin: 100% 0;
          animation: opSway 9s ease-in-out infinite alternate;
        }
        .op-shadow--b .op-leaves {
          animation-duration: 12s;
          animation-direction: alternate-reverse;
        }
        .op-shadow--r .op-leaves {
          animation-duration: 11s;
        }
        @keyframes opSway {
          from {
            transform: rotate(-1.8deg) translate3d(0, 0, 0);
          }
          to {
            transform: rotate(2.4deg) translate3d(-8px, 6px, 0);
          }
        }

        @keyframes opFade {
          from {
            opacity: 0;
            transform: translate3d(0, 16px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        @keyframes opGrowX {
          to {
            transform: scaleX(1);
          }
        }
        @keyframes opOpen {
          from {
            clip-path: inset(100% 0 0 0);
          }
          to {
            clip-path: inset(0 0 0 0);
          }
        }
        @keyframes opKB {
          from {
            transform: scale(1.16) translate3d(1.2%, 0.8%, 0);
          }
          to {
            transform: scale(1) translate3d(0, 0, 0);
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           HERO
           ═══════════════════════════════════════════════════════════════════ */
        .op-hero {
          position: relative;
          z-index: 2;
          min-height: clamp(500px, 32vw, 660px);
        }

        /* photo: wipes in from the right, dissolves into paper on the left */
        .op-hero__clip {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 30%;
          right: 0;
          overflow: hidden;
          clip-path: inset(0 0 0 100%);
        }
        .op.is-in .op-hero__clip {
          animation: opWipe 1.8s var(--ease-wipe) 0.1s both;
        }
        @keyframes opWipe {
          from {
            clip-path: inset(0 0 0 100%);
          }
          to {
            clip-path: inset(0 0 0 0);
          }
        }
        .op-hero__mask {
          position: absolute;
          inset: 0;
          -webkit-mask-image: linear-gradient(90deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.3) 12%, rgba(0, 0, 0, 0.75) 28%, #000 44%);
          mask-image: linear-gradient(90deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.3) 12%, rgba(0, 0, 0, 0.75) 28%, #000 44%);
        }
        .op-hero__par {
          position: absolute;
          inset: -4%;
          transform: translate3d(calc(var(--mx) * -20px), calc(var(--my) * -12px + var(--sp) * 22px), 0);
          transition: transform 0.9s cubic-bezier(0.2, 0.7, 0.2, 1);
          will-change: transform;
        }
        .op-hero__kb {
          position: absolute;
          inset: 0;
          transform: scale(1.1);
        }
        .op.is-in .op-hero__kb {
          animation: opKB 3s var(--ease-out) 0.2s both;
        }
        .op-hero__kb img,
        .op-hero__kb .op-fallback {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          -webkit-user-drag: none;
        }
        .op-fallback {
          background:
            radial-gradient(ellipse 80% 55% at 30% 22%, rgba(255, 250, 240, 0.55), transparent 72%),
            linear-gradient(170deg, var(--t1), var(--t2));
        }

        /* logo, section label, italic note */
        .op-brand {
          position: absolute;
          z-index: 6;
          top: clamp(22px, 2.6vw, 40px);
          left: clamp(24px, 5.9vw, 112px);
          font-size: clamp(1.7rem, 2.75vw, 2.7rem);
          font-weight: 400;
          letter-spacing: 0.01em;
          line-height: 1;
          color: var(--ink);
          text-decoration: none;
          opacity: 0;
        }
        .op.is-in .op-brand {
          animation: opFade 1.2s ease 0.1s both;
        }

        .op-label {
          position: absolute;
          z-index: 6;
          top: clamp(22px, 3.7vw, 58px);
          right: clamp(24px, 7.5vw, 144px);
          display: flex;
          align-items: center;
          gap: 16px;
          margin: 0;
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: 0.62rem;
          letter-spacing: 0.34em;
          text-transform: uppercase;
          color: var(--ink);
          opacity: 0;
        }
        .op.is-in .op-label {
          animation: opFade 1.2s ease 1.1s both;
        }
        .op-label i {
          display: block;
          width: 40px;
          height: 1px;
          background: var(--line);
        }

        .op-note {
          position: absolute;
          z-index: 6;
          left: 73.7%;
          top: 50%;
          opacity: 0;
        }
        .op.is-in .op-note {
          animation: opFade 1.2s ease 1.4s both;
        }
        .op-note p {
          margin: 0;
          font-size: clamp(0.84rem, 0.98vw, 0.98rem);
          font-style: italic;
          font-weight: 500;
          line-height: 1.5;
          color: #6b5a48;
        }
        .op-note p span {
          display: block;
        }
        .op-note i {
          display: block;
          width: 52px;
          height: 1px;
          margin-top: 16px;
          background: var(--line);
          transform: scaleX(0);
          transform-origin: left;
        }
        .op.is-in .op-note i {
          animation: opGrowX 1.3s var(--ease-out) 1.8s both;
        }

        /* copy */
        .op-hero__copy {
          position: relative;
          z-index: 5;
          max-width: 48%;
          padding: clamp(112px, 10.2vw, 176px) 0 clamp(34px, 3.4vw, 58px) var(--gutter);
          transform: translate3d(calc(var(--mx) * 6px), 0, 0);
          transition: transform 0.8s cubic-bezier(0.2, 0.7, 0.2, 1);
        }
        .op-eyebrow {
          margin: 0 0 clamp(14px, 1.5vw, 22px);
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: 0.66rem;
          font-weight: 400;
          letter-spacing: 0.36em;
          text-transform: uppercase;
          color: var(--ink);
        }
        .op-letter {
          display: inline-block;
          opacity: 0;
        }
        .op.is-in .op-letter {
          animation: opLetter 0.9s var(--ease-expo) both;
        }
        @keyframes opLetter {
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

        .op-title {
          margin: 0;
          font-weight: 400;
          font-size: clamp(2.5rem, 3.95vw, 4.2rem);
          line-height: 1.05;
          letter-spacing: -0.014em;
          color: var(--ink-deep);
        }
        .op-line {
          display: block;
          overflow: hidden;
          padding: 0.04em 0.2em 0.14em 0;
          margin-bottom: -0.1em;
        }
        .op-line__in {
          display: inline-block;
          transform: translate3d(0, 115%, 0) rotate(3deg);
          transform-origin: left bottom;
        }
        .op.is-in .op-line__in {
          animation: opRise 1.35s var(--ease-expo) both;
        }
        .op-line__in--accent {
          font-style: italic;
          padding-right: 0.08em;
          background: linear-gradient(95deg, #8b7560 0%, #6c5a49 45%, #a08a72 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }
        .op.is-in .op-line__in--accent {
          animation: opRise 1.35s var(--ease-expo) both, opShimmer 8s ease-in-out 1.8s infinite alternate;
        }
        @keyframes opRise {
          from {
            transform: translate3d(0, 115%, 0) rotate(3deg);
          }
          to {
            transform: translate3d(0, 0, 0) rotate(0);
          }
        }
        @keyframes opShimmer {
          from {
            background-position: 0% 50%;
          }
          to {
            background-position: 100% 50%;
          }
        }

        .op-rule {
          display: block;
          width: 52px;
          height: 1px;
          margin: clamp(20px, 2vw, 30px) 0 clamp(16px, 1.7vw, 26px);
          background: var(--line);
          transform: scaleX(0);
          transform-origin: left;
        }
        .op.is-in .op-rule {
          animation: opGrowX 1.2s var(--ease-out) 0.95s both;
        }
        .op-desc {
          margin: 0;
          max-width: 37ch;
          font-size: clamp(0.95rem, 1.15vw, 1.12rem);
          font-weight: 500;
          line-height: 1.75;
          color: var(--ink-soft);
          opacity: 0;
        }
        .op.is-in .op-desc {
          animation: opFade 1.2s ease 1.05s both;
        }

        /* ═══════════════════════════════════════════════════════════════════
           BAND — pillars + signature row
           ═══════════════════════════════════════════════════════════════════ */
        .op-band {
          position: relative;
          z-index: 3;
          padding: clamp(28px, 2.9vw, 48px) var(--gutter-r) clamp(34px, 4.4vw, 74px) var(--gutter);
          background: linear-gradient(180deg, rgba(236, 229, 219, 0.6), rgba(230, 222, 211, 0.55));
        }
        .op-pillars {
          display: grid;
          grid-template-columns: repeat(var(--cols, 4), minmax(0, 1fr));
          gap: clamp(24px, 3.6vw, 64px);
        }
        .op-pil {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .op-pil__num {
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: 0.62rem;
          letter-spacing: 0.1em;
          color: var(--ink-soft);
          opacity: 0;
        }
        .op-pil__title {
          margin: clamp(14px, 1.5vw, 22px) 0 0;
          font-size: clamp(1.5rem, 1.8vw, 1.95rem);
          font-weight: 400;
          line-height: 1.1;
          color: var(--ink-deep);
          opacity: 0;
        }
        .op-pil__text {
          margin: 12px 0 0;
          max-width: 30ch;
          font-size: clamp(0.92rem, 1.02vw, 1.04rem);
          font-weight: 500;
          line-height: 1.45;
          color: var(--ink-soft);
          opacity: 0;
        }
        .op-pil__rule {
          display: block;
          width: 40px;
          height: 1px;
          margin: clamp(14px, 1.5vw, 22px) 0 clamp(20px, 2.2vw, 34px);
          background: var(--line);
          transform: scaleX(0);
          transform-origin: left;
        }
        .op.is-band .op-pil__num {
          animation: opFade 1s ease calc(var(--i) * 140ms + 100ms) both;
        }
        .op.is-band .op-pil__title {
          animation: opFade 1.1s ease calc(var(--i) * 140ms + 220ms) both;
        }
        .op.is-band .op-pil__text {
          animation: opFade 1.1s ease calc(var(--i) * 140ms + 340ms) both;
        }
        .op.is-band .op-pil__rule {
          animation: opGrowX 1.1s var(--ease-out) calc(var(--i) * 140ms + 560ms) both;
        }

        /* photos (aligned along the bottom of each pillar) */
        .op-pil__img {
          position: relative;
          margin-top: auto;
          aspect-ratio: 1.75 / 1;
        }
        .op-pil__clip {
          position: absolute;
          inset: 0;
          overflow: hidden;
          background: #d9cebe;
          clip-path: inset(100% 0 0 0);
        }
        .op.is-band .op-pil__clip {
          animation: opOpen 1.5s var(--ease-wipe) calc(var(--i) * 140ms + 450ms) both;
        }
        .op-pil__par {
          position: absolute;
          inset: -7%;
          transform: translate3d(calc(var(--mx) * -10px), calc(var(--my) * -6px + var(--sp) * 12px), 0);
          transition: transform 0.9s cubic-bezier(0.2, 0.7, 0.2, 1);
          will-change: transform;
        }
        .op-pil__kb {
          position: absolute;
          inset: 0;
          transform: scale(1.16);
        }
        .op.is-band .op-pil__kb {
          animation: opKB 2.6s var(--ease-out) calc(var(--i) * 140ms + 550ms) both;
        }
        .op-pil__kb img,
        .op-pil__kb .op-fallback {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scale(1);
          transition: transform 1.4s var(--ease-out);
          -webkit-user-drag: none;
        }
        .op-pil__img:hover .op-pil__kb img,
        .op-pil__img:hover .op-pil__kb .op-fallback {
          transform: scale(1.06);
        }

        /* signature row */
        .op-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 18px 28px;
          margin-top: clamp(28px, 3.4vw, 56px);
        }
        .op-foot__left {
          display: flex;
          align-items: center;
          gap: clamp(16px, 1.6vw, 26px);
          flex: 1 1 auto;
          min-width: 0;
        }
        .op-sign {
          display: block;
          flex: 0 0 auto;
          font-family: var(--aur-script), cursive;
          font-size: clamp(1.9rem, 2.3vw, 2.4rem);
          line-height: 1.1;
          color: var(--ink);
        }
        .op-sign__word {
          display: inline-block;
          padding: 0.1em 0.25em 0.1em 0.05em;
          clip-path: inset(-20% 100% -20% 0);
        }
        .op.is-band .op-sign__word {
          animation: opWrite 1.8s var(--ease-out) 1.1s both;
        }
        @keyframes opWrite {
          from {
            clip-path: inset(-20% 100% -20% 0);
          }
          to {
            clip-path: inset(-20% 0 -20% 0);
          }
        }
        .op-foot__rule {
          display: block;
          flex: 0 1 clamp(120px, 22vw, 360px);
          height: 1px;
          background: var(--line);
          transform: scaleX(0);
          transform-origin: left;
        }
        .op.is-band .op-foot__rule {
          animation: opGrowX 1.6s var(--ease-out) 1.5s both;
        }
        .op-tags {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px 14px;
          margin: 0;
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: 0.62rem;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: var(--ink);
          opacity: 0;
        }
        .op-tags span {
          display: inline-flex;
          align-items: center;
          gap: 14px;
        }
        .op-tags i {
          font-style: normal;
          opacity: 0.6;
        }
        .op.is-band .op-tags {
          animation: opFade 1.2s ease 1.6s both;
        }

        /* optional stone ledge along the bottom */
        .op-ledge {
          position: relative;
          z-index: 2;
          height: clamp(46px, 6.2vw, 100px);
          overflow: hidden;
          clip-path: inset(100% 0 0 0);
        }
        .op.is-band .op-ledge {
          animation: opOpen 1.6s var(--ease-wipe) 0.6s both;
        }
        .op-ledge img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: 50% 30%;
          -webkit-user-drag: none;
        }

        /* crisp olive branch, bottom-left */
        .op-branch {
          position: absolute;
          z-index: 4;
          left: -1.5vw;
          bottom: -2.4vw;
          width: min(16vw, 250px);
          pointer-events: none;
          color: rgba(78, 86, 56, 0.85);
          transform: rotate(180deg);
        }
        .op-branch__svg {
          display: block;
          width: 100%;
          height: auto;
          transform-origin: 100% 0;
          filter: drop-shadow(0 6px 8px rgba(40, 30, 20, 0.22));
          animation: opSway 10s ease-in-out infinite alternate;
        }

        /* ═══════════════════════════════════════════════════════════════════
           CURSOR (ink on paper)
           ═══════════════════════════════════════════════════════════════════ */
        .op-cursor,
        .op-cursor-dot {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 200;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.35s ease;
        }
        .op-cursor.is-visible,
        .op-cursor-dot.is-visible {
          opacity: 1;
        }
        .op-cursor::before {
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
        .op-cursor.is-grow::before {
          transform: scale(1.5);
          background: rgba(58, 49, 41, 0.06);
          border-color: rgba(58, 49, 41, 0.8);
        }
        .op-cursor.has-label::before {
          transform: scale(1.9);
          background: rgba(238, 230, 219, 0.6);
          -webkit-backdrop-filter: blur(6px);
          backdrop-filter: blur(6px);
        }
        .op-cursor__label {
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
        .op-cursor.has-label .op-cursor__label {
          opacity: 1;
        }
        .op-cursor-dot::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 6px;
          height: 6px;
          margin: -3px 0 0 -3px;
          border-radius: 50%;
          background: var(--ink);
          transition: transform 0.3s ease;
        }
        .op-cursor-dot.is-grow::before {
          transform: scale(0);
        }

        /* ═══════════════════════════════════════════════════════════════════
           FOCUS + PAUSE
           ═══════════════════════════════════════════════════════════════════ */
        .op a:focus-visible,
        .op button:focus-visible {
          outline: 2px solid var(--copper);
          outline-offset: 4px;
        }
        .op.is-offscreen .op-light,
        .op.is-offscreen .op-leaves,
        .op.is-offscreen .op-branch__svg,
        .op.is-offscreen .op-line__in--accent {
          animation-play-state: paused;
        }

        /* ═══════════════════════════════════════════════════════════════════
           RESPONSIVE
           ═══════════════════════════════════════════════════════════════════ */
        @media (max-width: 1100px) {
          .op-hero__clip {
            left: 24%;
          }
          .op-hero__copy {
            max-width: 58%;
          }
          .op-note {
            display: none;
          }
        }

        @media (max-width: 1000px) {
          .op-pillars {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 38px clamp(24px, 4vw, 48px);
          }
        }

        @media (max-width: 820px) {
          .op {
            --gutter: 24px;
            --gutter-r: 24px;
          }
          .op-hero {
            display: flex;
            flex-direction: column;
            min-height: 0;
          }
          .op-hero__clip {
            position: relative;
            top: auto;
            bottom: auto;
            left: 0;
            right: auto;
            width: 100%;
            height: min(96vw, 560px);
            flex: 0 0 auto;
          }
          .op-hero__mask {
            -webkit-mask-image: linear-gradient(180deg, #000 0%, #000 52%, rgba(0, 0, 0, 0.55) 78%, rgba(0, 0, 0, 0) 100%);
            mask-image: linear-gradient(180deg, #000 0%, #000 52%, rgba(0, 0, 0, 0.55) 78%, rgba(0, 0, 0, 0) 100%);
          }
          .op-hero__copy {
            max-width: 100%;
            padding: 0 var(--gutter) 34px;
            margin-top: -8vw;
          }
          .op-brand {
            left: var(--gutter);
          }
          .op-label {
            display: none;
          }
          .op-shadow {
            width: 62vw;
          }
          .op-shadow--r,
          .op-branch {
            display: none;
          }
        }

        @media (max-width: 560px) {
          .op-pillars {
            grid-template-columns: minmax(0, 1fr);
          }
          .op-pil__text {
            max-width: 36ch;
          }
        }

        @media (pointer: coarse) {
          .op-cursor,
          .op-cursor-dot {
            display: none;
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           REDUCED MOTION
           ═══════════════════════════════════════════════════════════════════ */
        @media (prefers-reduced-motion: reduce) {
          .op *,
          .op *::before,
          .op *::after {
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