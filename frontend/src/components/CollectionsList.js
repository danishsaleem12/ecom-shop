'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AURELIA · COLLECTIONS · LIST  ("Explore Collections" — full page listing)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Place at: frontend/src/app/components/CollectionsList.js
 *  Use:      place below <CollectionsHero /> on the Collections page, e.g.
 *            src/app/collections/page.js:
 *
 *              import CollectionsHero from '../components/CollectionsHero';
 *              import CollectionsList from '../components/CollectionsList';
 *
 *              export default function CollectionsPage() {
 *                return (
 *                  <>
 *                    <CollectionsHero />
 *                    <CollectionsList />
 *                  </>
 *                );
 *              }
 *
 *  Self-contained — no other files are needed. It loads its own fonts and
 *  hooks the same way every other Aurelia section does, so it can be
 *  dropped in on its own.
 *
 *  What's inside (matches the screenshot)
 *   • A three-column index up top — Seasonal / Occasions / Featured — each
 *     with a short caption and a list of jump links (#slug) down to the
 *     matching row below, plus a small circular "view all" link per column
 *   • Ten full-width collection rows (all four Seasonal, all four
 *     Occasions, both Featured pieces), each a big photo banner with a
 *     category label, title, description and an "Explore Collection" link
 *     overlaid on the left, and three detail thumbnails on the right
 *   • Every row reveals itself independently the moment it scrolls into
 *     view — photo wipes open, Ken Burns settles, copy and thumbnails
 *     fade up in sequence — rather than everything firing at once
 *   • Hover zoom on every photo, a rotating circular arrow on every CTA,
 *     drifting light + animated grain for atmosphere, a custom cursor ring
 *     with labels, reduced-motion + touch fallbacks throughout
 *
 *  Images
 *   Point each collection's `image` / each thumb's `image` at your own
 *   file, e.g. '/images/collections/spring-summer.jpg'. Until a file
 *   exists there, it shows a warm tinted gradient placeholder.
 *
 *  Props (all optional — the screenshot's copy is filled in by default)
 *   categories: [{ id, label, caption, href, items: [{ title, slug }] }]
 *   collections: [{ slug, category, title, description, href, image, tint,
 *                    thumbs: [{ image, tint }] }]
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
   DATA — edit copy / images / links here
   ═════════════════════════════════════════════════════════════════════════════ */

const IMG = '/images/collections';

const CATEGORIES = [
  {
    id: 'seasonal',
    label: 'Seasonal',
    caption: 'Inspired by the seasons, designed for you.',
    href: '/collections/seasonal',
    items: [
      { title: 'Spring / Summer', slug: 'spring-summer' },
      { title: 'Resort Edit', slug: 'resort' },
      { title: 'Linen Season', slug: 'linen' },
      { title: 'Autumn / Winter', slug: 'autumn-winter' },
    ],
  },
  {
    id: 'occasions',
    label: 'Occasions',
    caption: "For life's most beautiful moments.",
    href: '/collections/occasions',
    items: [
      { title: 'Evening', slug: 'evening' },
      { title: 'Wedding Guest', slug: 'wedding-guest' },
      { title: 'Travel', slug: 'travel' },
      { title: 'Everyday Essentials', slug: 'everyday-essentials' },
    ],
  },
  {
    id: 'featured',
    label: 'Featured',
    caption: 'Our most-loved and exclusive pieces.',
    href: '/collections/featured',
    items: [
      { title: 'Sun-Washed Neutrals', slug: 'sun-washed-neutrals' },
      { title: 'The Evening Collection', slug: 'evening-collection' },
    ],
  },
];

const COLLECTIONS = [
  {
    slug: 'spring-summer',
    category: 'Seasonal',
    title: 'Spring / Summer',
    description: 'Light fabrics, soft colors and effortless silhouettes for warmer days and longer evenings.',
    href: '/collections/spring-summer',
    image: `${IMG}/spring-summer.jpg`,
    tint: ['#c9ad86', '#332a1a'],
    thumbs: [
      { image: `${IMG}/spring-summer-detail-1.jpg`, tint: ['#e4d9bf', '#3a2f1d'] },
      { image: `${IMG}/spring-summer-detail-2.jpg`, tint: ['#d7c39a', '#362b19'] },
      { image: `${IMG}/spring-summer-detail-3.jpg`, tint: ['#c2a06a', '#2c2213'] },
    ],
  },
  {
    slug: 'evening',
    category: 'Occasion',
    title: 'Evening',
    description: 'Refined silhouettes and luxurious details for your most special moments.',
    href: '/collections/evening',
    image: `${IMG}/evening.jpg`,
    tint: ['#6b4a3c', '#1c1310'],
    thumbs: [
      { image: `${IMG}/evening-detail-1.jpg`, tint: ['#3a2620', '#120b09'] },
      { image: `${IMG}/evening-detail-2.jpg`, tint: ['#4a2f26', '#150e0b'] },
      { image: `${IMG}/evening-detail-3.jpg`, tint: ['#5c3a2c', '#19110c'] },
    ],
  },
  {
    slug: 'sun-washed-neutrals',
    category: 'Featured',
    title: 'Sun-Washed Neutrals',
    description: 'Timeless tones. Effortless elegance. A collection made for earthy days and golden hours.',
    href: '/collections/sun-washed-neutrals',
    image: `${IMG}/sun-washed-neutrals.jpg`,
    tint: ['#b89b76', '#33281d'],
    thumbs: [
      { image: `${IMG}/sun-washed-neutrals-detail-1.jpg`, tint: ['#d8c7a6', '#372c1c'] },
      { image: `${IMG}/sun-washed-neutrals-detail-2.jpg`, tint: ['#c4ac81', '#2e2416'] },
      { image: `${IMG}/sun-washed-neutrals-detail-3.jpg`, tint: ['#ae9066', '#261e13'] },
    ],
  },
  {
    slug: 'evening-collection',
    category: 'Featured',
    title: 'The Evening Collection',
    description: 'Rich textures, elegant drapes and timeless pieces for unforgettable nights.',
    href: '/collections/evening-collection',
    image: `${IMG}/evening-collection.jpg`,
    tint: ['#5a3f35', '#170f0c'],
    thumbs: [
      { image: `${IMG}/evening-collection-detail-1.jpg`, tint: ['#6e4a3a', '#1b1109'] },
      { image: `${IMG}/evening-collection-detail-2.jpg`, tint: ['#4a2e28', '#140d0a'] },
      { image: `${IMG}/evening-collection-detail-3.jpg`, tint: ['#7c3f42', '#1c0f10'] },
    ],
  },
  {
    slug: 'resort',
    category: 'Seasonal',
    title: 'Resort Edit',
    description: 'Quiet tailoring and warm-weather ease, made for sun-soaked escapes.',
    href: '/collections/resort',
    image: `${IMG}/resort.jpg`,
    tint: ['#a08462', '#33271d'],
    thumbs: [
      { image: `${IMG}/resort-detail-1.jpg`, tint: ['#cbb287', '#372b1a'] },
      { image: `${IMG}/resort-detail-2.jpg`, tint: ['#b89a6c', '#2d2314'] },
      { image: `${IMG}/resort-detail-3.jpg`, tint: ['#9c8058', '#241b10'] },
    ],
  },
  {
    slug: 'linen',
    category: 'Seasonal',
    title: 'Linen Season',
    description: 'Breathable linen and soft silk, made for long days in the heat.',
    href: '/collections/linen',
    image: `${IMG}/linen.jpg`,
    tint: ['#9b8b74', '#2b241d'],
    thumbs: [
      { image: `${IMG}/linen-detail-1.jpg`, tint: ['#d6cbb4', '#362f22'] },
      { image: `${IMG}/linen-detail-2.jpg`, tint: ['#beae90', '#2e281c'] },
      { image: `${IMG}/linen-detail-3.jpg`, tint: ['#a4956f', '#241f15'] },
    ],
  },
  {
    slug: 'autumn-winter',
    category: 'Seasonal',
    title: 'Autumn / Winter',
    description: 'Warm textures and deeper tones for the cooler months ahead.',
    href: '/collections/autumn-winter',
    image: `${IMG}/autumn-winter.jpg`,
    tint: ['#7a4b32', '#251710'],
    thumbs: [
      { image: `${IMG}/autumn-winter-detail-1.jpg`, tint: ['#8f5c3a', '#2a1a10'] },
      { image: `${IMG}/autumn-winter-detail-2.jpg`, tint: ['#6b4128', '#1c110a'] },
      { image: `${IMG}/autumn-winter-detail-3.jpg`, tint: ['#a06f45', '#2c2013'] },
    ],
  },
  {
    slug: 'wedding-guest',
    category: 'Occasion',
    title: 'Wedding Guest',
    description: 'Elegant, considered pieces that never overdress the moment.',
    href: '/collections/wedding-guest',
    image: `${IMG}/wedding-guest.jpg`,
    tint: ['#a48d7d', '#2d221b'],
    thumbs: [
      { image: `${IMG}/wedding-guest-detail-1.jpg`, tint: ['#c8b3a0', '#352a20'] },
      { image: `${IMG}/wedding-guest-detail-2.jpg`, tint: ['#b39c88', '#2c2117'] },
      { image: `${IMG}/wedding-guest-detail-3.jpg`, tint: ['#8e7563', '#211a13'] },
    ],
  },
  {
    slug: 'travel',
    category: 'Occasion',
    title: 'Travel',
    description: 'Effortless separates that pack light and move easily.',
    href: '/collections/travel',
    image: `${IMG}/travel.jpg`,
    tint: ['#6d735c', '#1f211a'],
    thumbs: [
      { image: `${IMG}/travel-detail-1.jpg`, tint: ['#8d9375', '#242618'] },
      { image: `${IMG}/travel-detail-2.jpg`, tint: ['#767c62', '#1e2017'] },
      { image: `${IMG}/travel-detail-3.jpg`, tint: ['#5c6249', '#181a12'] },
    ],
  },
  {
    slug: 'everyday-essentials',
    category: 'Occasion',
    title: 'Everyday Essentials',
    description: 'The quiet basics you will reach for daily.',
    href: '/collections/everyday-essentials',
    image: `${IMG}/everyday-essentials.jpg`,
    tint: ['#8c7a68', '#28201a'],
    thumbs: [
      { image: `${IMG}/everyday-essentials-detail-1.jpg`, tint: ['#b19d87', '#302820'] },
      { image: `${IMG}/everyday-essentials-detail-2.jpg`, tint: ['#9a8873', '#271f18'] },
      { image: `${IMG}/everyday-essentials-detail-3.jpg`, tint: ['#7c6c5a', '#1e1811'] },
    ],
  },
];

/* ═════════════════════════════════════════════════════════════════════════════
   ICONS
   ═════════════════════════════════════════════════════════════════════════════ */

const ArrowRight = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12h16M14 6l6 6-6 6" />
  </svg>
);

const PlusIcon = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true">
    <path d="M6 1.5v9M1.5 6h9" />
  </svg>
);

/* ═════════════════════════════════════════════════════════════════════════════
   HOOKS + SMALL COMPONENTS
   ═════════════════════════════════════════════════════════════════════════════ */

/** True once, the first time the ref'd element scrolls into view. */
function useRevealOnce(threshold = 0.2) {
  const ref = useRef(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setRevealed(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          io.disconnect();
        }
      },
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return [ref, revealed];
}

/** Photo with a graceful gradient fallback when the file doesn't exist yet. */
function MediaImage({ src, alt, tint }) {
  const [failed, setFailed] = useState(!src);
  const ref = useRef(null);

  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) return <span className="col-list__fallback" aria-hidden="true" style={{ '--t1': tint?.[0], '--t2': tint?.[1] }} />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={ref} src={src} alt={alt || ''} loading="lazy" draggable={false} onError={() => setFailed(true)} />
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
      <div ref={ringRef} className={`col-cursor ${visible ? 'is-visible' : ''} ${grow ? 'is-grow' : ''} ${label ? 'has-label' : ''}`} aria-hidden="true">
        <span className="col-cursor__label">{label}</span>
      </div>
      <div ref={dotRef} className={`col-cursor-dot ${visible ? 'is-visible' : ''} ${grow ? 'is-grow' : ''}`} aria-hidden="true" />
    </>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   INDEX (top three-column nav)
   ═════════════════════════════════════════════════════════════════════════════ */

function CollectionsIndex({ categories }) {
  const [ref, revealed] = useRevealOnce(0.15);

  return (
    <div ref={ref} className={`col-list__index ${revealed ? 'is-in' : ''}`}>
      {categories.map((cat, i) => (
        <div className="col-list__cat" key={cat.id} style={{ '--i': i }}>
          <div className="col-list__cat-head">
            <h3>{cat.label}</h3>
            <Link href={cat.href} className="col-list__cat-more" aria-label={`More ${cat.label} collections`} data-cursor="View">
              <PlusIcon />
            </Link>
          </div>
          <p>{cat.caption}</p>
          <ul>
            {cat.items.map((it) => (
              <li key={it.slug}>
                <a href={`#${it.slug}`}>{it.title}</a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   ROW (one full-width collection banner)
   ═════════════════════════════════════════════════════════════════════════════ */

function CollectionRow({ item, index }) {
  const [ref, revealed] = useRevealOnce(0.16);

  return (
    <div ref={ref} id={item.slug} className={`col-list__row ${revealed ? 'is-in' : ''}`}>
      <Link href={item.href} className="col-list__main" data-cursor="Explore">
        <span className="col-list__par">
          <span className="col-list__kb">
            <MediaImage src={item.image} alt={item.title} tint={item.tint} />
          </span>
        </span>
        <span className="col-list__shade" aria-hidden="true" />

        <span className="col-list__copy">
          <span className="col-list__label">{item.category}</span>
          <span className="col-list__title">{item.title}</span>
          <span className="col-list__desc">{item.description}</span>
          <span className="col-list__cta">
            <span>Explore Collection</span>
            <span className="col-list__cta-circle">
              <ArrowRight />
            </span>
          </span>
        </span>
      </Link>

      <div className="col-list__thumbs">
        {item.thumbs.map((t, i) => (
          <div className="col-list__thumb" key={i} style={{ '--i': i + 1 }}>
            <span className="col-list__thumb-par">
              <span className="col-list__thumb-kb">
                <MediaImage src={t.image} alt="" tint={t.tint} />
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   COLLECTIONS LIST
   ═════════════════════════════════════════════════════════════════════════════ */

export default function CollectionsList({ categories = CATEGORIES, collections = COLLECTIONS }) {
  const rootRef = useRef(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setEnabled(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <section ref={rootRef} className={`${serif.variable} ${sans.variable} col-list`} aria-label="Explore collections">
      <div className="col-list__light" aria-hidden="true" />
      <div className="col-list__grain" aria-hidden="true" />

      <CollectionsIndex categories={categories} />

      <div className="col-list__rows">
        {collections.map((item, i) => (
          <CollectionRow key={item.slug} item={item} index={i} />
        ))}
      </div>

      <SectionCursor rootRef={rootRef} enabled={enabled} />

      <style jsx global>{`
        /* ═══════════════════════════════════════════════════════════════════
           ROOT
           ═══════════════════════════════════════════════════════════════════ */
        .col-list {
          --cream: #efe7d8;
          --ink: #241d16;
          --ink-soft: rgba(36, 29, 22, 0.72);
          --line: rgba(36, 29, 22, 0.24);
          --copper: #a56a41;
          --gutter: clamp(20px, 4.4vw, 76px);
          --ease-out: cubic-bezier(0.22, 0.8, 0.2, 1);
          --ease-expo: cubic-bezier(0.19, 1, 0.22, 1);
          --ease-wipe: cubic-bezier(0.76, 0, 0.18, 1);
          position: relative;
          overflow: hidden;
          isolation: isolate;
          color: var(--ink);
          font-family: var(--aur-sans), system-ui, sans-serif;
          background: var(--cream);
          padding: clamp(40px, 4.6vw, 68px) var(--gutter) clamp(56px, 6vw, 90px);
        }
        .col-list a,
        .col-list button {
          -webkit-tap-highlight-color: transparent;
        }

        .col-list__light {
          position: absolute;
          inset: -10%;
          z-index: -1;
          pointer-events: none;
          background:
            radial-gradient(ellipse 55% 45% at 12% 0%, rgba(255, 248, 232, 0.6), transparent 65%),
            radial-gradient(ellipse 45% 40% at 100% 100%, rgba(150, 120, 84, 0.16), transparent 65%);
          animation: colLtDrift 13s ease-in-out infinite alternate;
        }
        @keyframes colLtDrift {
          from {
            opacity: 0.7;
            transform: translate3d(-1.5%, 0, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(1.5%, 1%, 0);
          }
        }

        .col-list__grain {
          position: absolute;
          inset: -10%;
          z-index: -1;
          pointer-events: none;
          opacity: 0.05;
          mix-blend-mode: multiply;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
          animation: colGrain 1.2s steps(6) infinite;
        }
        @keyframes colGrain {
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

        @keyframes colFade {
          from {
            opacity: 0;
            transform: translate3d(0, 16px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           INDEX (Seasonal / Occasions / Featured)
           ═══════════════════════════════════════════════════════════════════ */
        .col-list__index {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: clamp(28px, 4vw, 56px);
          padding-bottom: clamp(32px, 3.6vw, 52px);
          margin-bottom: clamp(32px, 3.6vw, 52px);
          border-bottom: 1px solid var(--line);
        }
        .col-list__cat {
          opacity: 0;
        }
        .col-list__index.is-in .col-list__cat {
          animation: colFade 1s ease calc(var(--i) * 120ms + 60ms) both;
        }
        .col-list__cat-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .col-list__cat-head h3 {
          margin: 0;
          font-family: var(--aur-serif), Georgia, serif;
          font-size: clamp(1.1rem, 1.3vw, 1.3rem);
          font-weight: 500;
          color: var(--ink);
        }
        .col-list__cat-more {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          flex-shrink: 0;
          border-radius: 50%;
          border: 1px solid var(--line);
          color: var(--ink);
          transition: background 0.3s ease, color 0.3s ease, border-color 0.3s ease, transform 0.4s var(--ease-out);
        }
        .col-list__cat-more:hover {
          background: var(--ink);
          color: var(--cream);
          border-color: var(--ink);
          transform: rotate(90deg);
        }
        .col-list__cat p {
          margin: 8px 0 16px;
          font-size: 0.82rem;
          line-height: 1.5;
          color: var(--ink-soft);
        }
        .col-list__cat ul {
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .col-list__cat li + li {
          margin-top: 8px;
        }
        .col-list__cat a {
          position: relative;
          display: inline-block;
          font-size: 0.86rem;
          color: var(--ink);
          text-decoration: none;
          background: linear-gradient(currentColor, currentColor) 0 100% / 0 1px no-repeat;
          transition: background-size 0.4s var(--ease-out), color 0.3s ease;
        }
        .col-list__cat a:hover {
          color: var(--copper);
          background-size: 100% 1px;
        }

        /* ═══════════════════════════════════════════════════════════════════
           ROWS
           ═══════════════════════════════════════════════════════════════════ */
        .col-list__rows {
          display: flex;
          flex-direction: column;
          gap: clamp(14px, 1.8vw, 22px);
        }

        .col-list__row {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
          gap: clamp(10px, 1.2vw, 16px);
          scroll-margin-top: 24px;
        }

        .col-list__main {
          position: relative;
          display: block;
          height: clamp(230px, 25vw, 300px);
          overflow: hidden;
          background: #1a140e;
          color: var(--cream);
          text-decoration: none;
          clip-path: inset(0 0 0 100%);
        }
        .col-list__row.is-in .col-list__main {
          animation: colWipe 1.5s var(--ease-wipe) both;
        }
        @keyframes colWipe {
          from {
            clip-path: inset(0 0 0 100%);
          }
          to {
            clip-path: inset(0 0 0 0);
          }
        }

        .col-list__par {
          position: absolute;
          inset: -6%;
        }
        .col-list__kb {
          position: absolute;
          inset: 0;
          transform: scale(1.16);
        }
        .col-list__row.is-in .col-list__kb {
          animation: colKB 2.6s var(--ease-out) 0.15s both;
        }
        @keyframes colKB {
          from {
            transform: scale(1.16) translate3d(1.4%, 0.8%, 0);
          }
          to {
            transform: scale(1) translate3d(0, 0, 0);
          }
        }
        .col-list__kb img,
        .col-list__main .col-list__fallback {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scale(1);
          transition: transform 1.3s var(--ease-out);
          -webkit-user-drag: none;
        }
        .col-list__main .col-list__fallback {
          background:
            linear-gradient(120deg, transparent 32%, rgba(255, 226, 180, 0.13) 46%, transparent 60%),
            radial-gradient(ellipse 80% 55% at 28% 24%, var(--t1, #b89b76), transparent 72%),
            linear-gradient(165deg, var(--t2, #241c15), #14100c);
        }
        .col-list__main:hover .col-list__kb img,
        .col-list__main:hover .col-list__fallback {
          transform: scale(1.06);
        }

        .col-list__shade {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background: linear-gradient(90deg, rgba(14, 11, 8, 0.78) 0%, rgba(14, 11, 8, 0.5) 38%, rgba(14, 11, 8, 0.06) 68%);
        }

        .col-list__copy {
          position: absolute;
          z-index: 2;
          left: clamp(20px, 2.6vw, 40px);
          top: 50%;
          transform: translateY(-50%);
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          max-width: min(70%, 380px);
        }
        .col-list__label {
          font-size: 0.64rem;
          font-weight: 500;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: rgba(246, 239, 232, 0.75);
          opacity: 0;
        }
        .col-list__row.is-in .col-list__label {
          animation: colFade 0.9s ease 0.55s both;
        }
        .col-list__title {
          margin-top: 10px;
          font-family: var(--aur-serif), Georgia, serif;
          font-weight: 400;
          font-size: clamp(1.7rem, 2.6vw, 2.5rem);
          line-height: 1.05;
          color: #fbf4ea;
          opacity: 0;
        }
        .col-list__row.is-in .col-list__title {
          animation: colFade 1s ease 0.65s both;
        }
        .col-list__desc {
          margin-top: 12px;
          font-size: 0.82rem;
          font-weight: 300;
          line-height: 1.55;
          color: rgba(246, 239, 232, 0.85);
          opacity: 0;
        }
        .col-list__row.is-in .col-list__desc {
          animation: colFade 1s ease 0.78s both;
        }
        .col-list__cta {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          margin-top: 20px;
          font-size: 0.82rem;
          font-weight: 500;
          color: #fbf4ea;
          opacity: 0;
        }
        .col-list__row.is-in .col-list__cta {
          animation: colFade 1s ease 0.92s both;
        }
        .col-list__cta-circle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 1px solid rgba(246, 239, 232, 0.6);
          color: #fbf4ea;
          transition: background 0.4s var(--ease-out), color 0.4s ease, border-color 0.4s ease, transform 0.5s var(--ease-out);
        }
        .col-list__main:hover .col-list__cta-circle {
          background: #fbf4ea;
          color: var(--ink);
          border-color: #fbf4ea;
          transform: rotate(45deg);
        }

        /* thumbnails */
        .col-list__thumbs {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: clamp(8px, 1vw, 12px);
        }
        .col-list__thumb {
          position: relative;
          overflow: hidden;
          height: clamp(230px, 25vw, 300px);
          background: #1a140e;
          clip-path: inset(0 0 0 100%);
        }
        .col-list__row.is-in .col-list__thumb {
          animation: colWipe 1.3s var(--ease-wipe) calc(var(--i) * 130ms + 0.25s) both;
        }
        .col-list__thumb-par {
          position: absolute;
          inset: -6%;
        }
        .col-list__thumb-kb {
          position: absolute;
          inset: 0;
          transform: scale(1.2);
        }
        .col-list__row.is-in .col-list__thumb-kb {
          animation: colKB 2.2s var(--ease-out) calc(var(--i) * 130ms + 0.35s) both;
        }
        .col-list__thumb-kb img,
        .col-list__thumb .col-list__fallback {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scale(1);
          transition: transform 1.1s var(--ease-out);
          -webkit-user-drag: none;
        }
        .col-list__thumb .col-list__fallback {
          background:
            linear-gradient(120deg, transparent 32%, rgba(255, 226, 180, 0.13) 46%, transparent 60%),
            radial-gradient(ellipse 80% 55% at 30% 22%, var(--t1, #b89b76), transparent 72%),
            linear-gradient(165deg, var(--t2, #241c15), #14100c);
        }
        .col-list__thumbs:hover .col-list__thumb:not(:hover) .col-list__thumb-kb img,
        .col-list__thumbs:hover .col-list__thumb:not(:hover) .col-list__fallback {
          filter: brightness(0.82);
        }
        .col-list__thumb:hover .col-list__thumb-kb img,
        .col-list__thumb:hover .col-list__fallback {
          transform: scale(1.08);
        }

        /* ═══════════════════════════════════════════════════════════════════
           CURSOR
           ═══════════════════════════════════════════════════════════════════ */
        .col-cursor,
        .col-cursor-dot {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 200;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.35s ease;
        }
        .col-cursor.is-visible,
        .col-cursor-dot.is-visible {
          opacity: 1;
        }
        .col-cursor::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 42px;
          height: 42px;
          margin: -21px 0 0 -21px;
          border-radius: 50%;
          border: 1px solid rgba(36, 29, 22, 0.5);
          background: rgba(36, 29, 22, 0);
          transition: transform 0.5s var(--ease-out), background 0.4s ease, border-color 0.4s ease;
        }
        .col-cursor.is-grow::before {
          transform: scale(1.5);
          background: rgba(36, 29, 22, 0.06);
          border-color: rgba(36, 29, 22, 0.8);
        }
        .col-cursor.has-label::before {
          transform: scale(1.9);
          background: rgba(24, 18, 13, 0.72);
          border-color: transparent;
          -webkit-backdrop-filter: blur(6px);
          backdrop-filter: blur(6px);
        }
        .col-cursor__label {
          position: absolute;
          top: 0;
          left: 0;
          transform: translate(-50%, -50%);
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: 0.64rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #f6efe8;
          white-space: nowrap;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .col-cursor.has-label .col-cursor__label {
          opacity: 1;
        }
        .col-cursor-dot::before {
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
        .col-cursor-dot.is-grow::before {
          transform: scale(0);
        }

        /* ═══════════════════════════════════════════════════════════════════
           FOCUS
           ═══════════════════════════════════════════════════════════════════ */
        .col-list a:focus-visible,
        .col-list button:focus-visible {
          outline: 2px solid var(--copper);
          outline-offset: 4px;
        }

        /* ═══════════════════════════════════════════════════════════════════
           RESPONSIVE
           ═══════════════════════════════════════════════════════════════════ */
        @media (max-width: 980px) {
          .col-list__index {
            grid-template-columns: 1fr;
            gap: 28px;
          }
        }

        @media (max-width: 860px) {
          .col-list__row {
            grid-template-columns: 1fr;
          }
          .col-list__thumbs {
            height: clamp(160px, 40vw, 220px);
          }
          .col-list__thumb {
            height: 100%;
          }
        }

        @media (max-width: 520px) {
          .col-list__copy {
            max-width: 84%;
          }
          .col-list__thumbs {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (pointer: coarse) {
          .col-cursor,
          .col-cursor-dot {
            display: none;
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           REDUCED MOTION
           ═══════════════════════════════════════════════════════════════════ */
        @media (prefers-reduced-motion: reduce) {
          .col-list *,
          .col-list *::before,
          .col-list *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </section>
  );
}