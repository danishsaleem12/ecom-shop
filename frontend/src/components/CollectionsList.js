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
import './styles/CollectionsList.css';

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

      {/* Rules whose class names are defined differently in other sections stay here: see src/components/styles/README.md */}
      <style jsx global>{`
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

        @media (pointer: coarse) {
          .col-cursor,
          .col-cursor-dot {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}