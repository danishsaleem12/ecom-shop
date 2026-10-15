'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AURELIA · OUR STORY
 * ─────────────────────────────────────────────────────────────────────────────
 *  Place at: frontend/src/components/OurStory.js
 *  Use:      <OurStory />   inside src/app/about/page.js, right under <AboutHero />
 *            (AboutHero's CTA points at #our-story, and this section has that id)
 *
 *  Layout (same as the reference)
 *   ┌───────────────┬─────────────────┬────────────┐
 *   │ logo          │                 │ photo  note│
 *   │ 02 — Our Story│   tall photo    │ photo      │
 *   │ A Journey…    │                 │ │ Our Beginning
 *   │ paragraphs    │                 │ │ 2018     │
 *   │ signature     │                 │            │
 *   └───────────────┴─────────────────┴────────────┘
 *   Tablet: text | photo on top, the small photos + 2018 in a row below.
 *   Mobile: everything stacks.
 *
 *  Style (lifted from Hero.js / AboutHero.js / CollectionsSection.js)
 *   • Same fonts, easing curves, gutter scale and clip-path "rise open" reveals
 *   • Plays once when scrolled into view: letter-stagger eyebrow, line-mask
 *     headline with shimmer on the italic line, hairlines that draw themselves,
 *     photos that rise open with a Ken Burns settle
 *   • Mouse + scroll parallax on every photo, 3D tilt + light glare on the two
 *     small frames, custom cursor ring (ink on paper, white on the big photo)
 *   • Swaying leaf shadows, drifting light, paper grain
 *   • "2018" rolls up digit by digit, the signature is written in
 *   • Pauses when off screen / tab hidden, reduced-motion + touch fallbacks
 *
 *  IMAGES
 *   Drop your photos in /public/images/story/ :
 *     story-main.jpg    tall portrait, about 3:4 or taller (woman on terrace)
 *     story-fabric.jpg  linen with the Aurelia tag, about 6:7
 *     story-terrace.jpg stone wall + olive branch, about 7:6
 *   Until a file exists that frame shows a warm gradient, so nothing breaks.
 *   You can also pass full URLs (e.g. Unsplash) through the props.
 *
 *  Props (all optional)
 *   eyebrowNumber, eyebrow, titleLines: [{ text, em, accent }]
 *   paragraphs: string[], signature, tagline: string[]
 *   brand, brandHref, showBrand   — the small "Aurelia" logo top-left
 *   image, imageAlt, imagePosition
 *   frames: [{ src, alt }, { src, alt }], caption: string[]
 *   beginningLabel, year, beginningText
 *
 *  NOTE: every class here starts with "os-" (and keyframes with "os"), so the
 *  styles never clash with Hero / AboutHero / CollectionsSection when they sit
 *  on the same page.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Allura, Cormorant_Garamond, Figtree } from 'next/font/google';
import './styles/OurStory.css';

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

const IMG = '/images/story';

const DEFAULT_FRAMES = [
  { src: `${IMG}/story-fabric.jpg`, alt: 'An Aurelia tag resting on soft natural linen' },
  { src: `${IMG}/story-terrace.jpg`, alt: 'Sunlit stone wall with an olive branch above the hills' },
];

/** Gradient fallbacks (used only while a photo file is missing). */
const MAIN_TINT = ['#e0d6c8', '#b9a68d'];
const FRAME_TINTS = [
  ['#e0d6c8', '#bfae95'],
  ['#d6c9b6', '#ab977c'],
];

/* ═════════════════════════════════════════════════════════════════════════════
   SMALL COMPONENTS
   ═════════════════════════════════════════════════════════════════════════════ */

/** Letters fade + rise one after another (same as Hero). */
function SplitLetters({ text, step = 40, start = 0 }) {
  return (
    <span aria-label={text}>
      {text.split('').map((ch, i) => (
        <span key={`${ch}-${i}`} className="os-letter" aria-hidden="true" style={{ animationDelay: `${start + i * step}ms` }}>
          {ch === ' ' ? '\u00A0' : ch}
        </span>
      ))}
    </span>
  );
}

/** Each digit rolls up from 0 to its value, one after another. */
function Year({ value }) {
  return (
    <span className="os-year" aria-label={value}>
      {String(value)
        .split('')
        .map((ch, i) => {
          const d = Number(ch);
          if (Number.isNaN(d)) {
            return (
              <span key={i} aria-hidden="true">
                {ch}
              </span>
            );
          }
          return (
            <span key={i} className="os-year__win" aria-hidden="true" style={{ '--d': d, '--n': i }}>
              <span className="os-year__col">
                {Array.from({ length: 10 }, (_, k) => (
                  <span key={k}>{k}</span>
                ))}
              </span>
            </span>
          );
        })}
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

  if (failed) return <span className="os-fallback" aria-hidden="true" />;

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
      setOnPhoto(Boolean(e.target.closest && e.target.closest('.os-photo')));
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
      <div ref={ringRef} className={`os-cursor ${tone} ${visible ? 'is-visible' : ''} ${grow ? 'is-grow' : ''} ${label ? 'has-label' : ''}`} aria-hidden="true">
        <span className="os-cursor__label">{label}</span>
      </div>
      <div ref={dotRef} className={`os-cursor-dot ${tone} ${visible ? 'is-visible' : ''} ${grow ? 'is-grow' : ''}`} aria-hidden="true" />
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

/** One of the two small framed photos (tilts + glares on hover). */
function Frame({ src, alt, tint, index, className = '' }) {
  const ref = useRef(null);
  const depth = index === 0 ? 1 : 0.7;
  const sd = index === 0 ? 14 : 22;

  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--tx', (x - 0.5).toFixed(3));
    el.style.setProperty('--ty', (y - 0.5).toFixed(3));
    el.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
    el.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
  };

  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--tx', '0');
    el.style.setProperty('--ty', '0');
  };

  return (
    <div
      ref={ref}
      className={`os-frame ${className}`}
      data-cursor="View"
      style={{ '--i': index, '--depth': depth, '--sd': sd, '--t1': tint[0], '--t2': tint[1] }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <span className="os-frame__clip">
        <span className="os-frame__par">
          <span className="os-frame__kb">
            <CardImage src={src} alt={alt} />
          </span>
        </span>
        <span className="os-frame__glare" />
      </span>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   OUR STORY
   ═════════════════════════════════════════════════════════════════════════════ */

export default function OurStory({
  eyebrowNumber = '02',
  eyebrow = 'Our Story',
  titleLines = [
    { text: 'A', em: 'Journey' },
    { text: 'of Inspiration,' },
    { text: 'Crafted in Time.', accent: true },
  ],
  paragraphs = [
    'Aurelia was born from a simple belief — that fashion can be more than just what we wear. It can be a form of self-expression, a celebration of individuality, and a gentle force for a more sustainable future.',
    'What started as a small idea, inspired by travels, art and a deep love for timeless beauty, has grown into a brand dedicated to creating pieces that feel as good as they look — today and tomorrow.',
  ],
  signature = 'Aurelia',
  tagline = ['More than fashion.', 'A lifestyle.'],
  brand = 'Aurelia',
  brandHref = '/',
  showBrand = true,
  image = `${IMG}/story-main.jpg`,
  imageAlt = 'Woman in a flowing cream dress on a sunlit stone terrace, looking out over the hills',
  imagePosition = '50% 38%',
  frames = DEFAULT_FRAMES,
  caption = ['Rooted in heritage.', 'Designed for tomorrow.'],
  beginningLabel = 'Our Beginning',
  year = '2018',
  beginningText = 'Aurelia began with a passion for timeless fashion and a dream to create something meaningful.',
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

  /* ── render ──────────────────────────────────────────────────────────── */
  return (
    <section
      id="our-story"
      ref={rootRef}
      className={`${serif.variable} ${sans.variable} ${script.variable} os ${revealed ? 'is-in' : ''} ${onScreen ? '' : 'is-offscreen'}`}
      aria-label="Our story"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {/* ── Atmosphere: light + leaf shadows ─────────────────────────── */}
      <div className="os-light" aria-hidden="true" />
      <div className="os-light os-light--b" aria-hidden="true" />
      <div className="os-shadow os-shadow--tl" aria-hidden="true">
        <Leaves className="os-leaves" />
      </div>
      <div className="os-shadow os-shadow--tl os-shadow--b" aria-hidden="true">
        <Leaves className="os-leaves" />
      </div>
      <div className="os-shadow os-shadow--br" aria-hidden="true">
        <Leaves className="os-leaves" />
      </div>

      <div className="os-grid">
        {/* ══ Left: story copy ═════════════════════════════════════════ */}
        <div className="os-copy">
          {showBrand && (
            <Link href={brandHref} className="os-brand" data-cursor="Home">
              {brand}
            </Link>
          )}

          <div className="os-copy__main">
            <p className="os-eyebrow">
              <span className="os-eyebrow__num">{eyebrowNumber}</span>
              <i className="os-eyebrow__line" />
              <span className="os-eyebrow__label">
                <SplitLetters text={eyebrow} start={260} />
              </span>
              <i className="os-eyebrow__line os-eyebrow__line--long" />
            </p>

            <h2 className="os-title">
              {titleLines.map((line, i) => (
                <span className="os-line" key={i}>
                  <span
                    className={`os-line__in ${line.accent ? 'os-line__in--accent' : ''}`}
                    style={{ animationDelay: `${240 + i * 140}ms` }}
                  >
                    {line.text}
                    {line.em ? (
                      <>
                        {' '}
                        <em>{line.em}</em>
                      </>
                    ) : null}
                  </span>
                </span>
              ))}
            </h2>

            <div className="os-paras">
              {paragraphs.map((p, i) => (
                <p key={i} className="os-p" style={{ '--p': i }}>
                  {p}
                </p>
              ))}
            </div>
          </div>

          <div className="os-foot">
            <i className="os-foot__rule" />
            <span className="os-sign" aria-label={signature}>
              <span className="os-sign__word" aria-hidden="true">
                {signature}
              </span>
            </span>
            <p className="os-tag">
              {tagline.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </p>
          </div>
        </div>

        {/* ══ Centre: tall photo ═══════════════════════════════════════ */}
        <div className="os-photo" style={{ '--t1': MAIN_TINT[0], '--t2': MAIN_TINT[1] }}>
          <div className="os-photo__par">
            <div className="os-photo__kb">
              <CardImage src={image} alt={imageAlt} position={imagePosition} />
            </div>
          </div>
          <div className="os-photo__sun" aria-hidden="true" />
        </div>

        {/* ══ Right: small photos + 2018 ═══════════════════════════════ */}
        <aside className="os-side">
          <div className="os-side__row">
            {frameA && <Frame src={frameA.src} alt={frameA.alt} tint={FRAME_TINTS[0]} index={0} className="os-frame--a" />}
            <div className="os-note">
              <p>
                {caption.map((c) => (
                  <span key={c}>{c}</span>
                ))}
              </p>
              <i />
            </div>
          </div>

          {frameB && <Frame src={frameB.src} alt={frameB.alt} tint={FRAME_TINTS[1]} index={1} className="os-frame--b" />}

          <div className="os-begin">
            <i className="os-begin__line" />
            <div className="os-begin__body">
              <span className="os-begin__label">{beginningLabel}</span>
              <Year value={year} />
              <p>{beginningText}</p>
            </div>
          </div>
        </aside>
      </div>

      <SectionCursor rootRef={rootRef} enabled={revealed} />

    </section>
  );
}