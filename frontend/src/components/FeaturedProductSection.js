'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AURELIA · FEATURED PRODUCT  ("Product Spotlight" — art-exhibition style)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Place at: frontend/src/components/FeaturedProductSection.js
 *  Use:      <FeaturedProductSection />   (e.g. in src/app/page.js)
 *
 *  Same visual/animation language as Hero.js / ProductSection.js /
 *  CollectionsSection.js / StorySection.js:
 *   • Reveals once when scrolled into view: letter-stagger eyebrow, masked
 *     heading lines, features / price / CTA fading up in sequence
 *   • Large left-hand product photo wipes open, then settles with a Ken
 *     Burns zoom; wordmark, eyebrow and tagline sit over it with a soft shade
 *   • A real photo gallery: bottom-left counter + circular prev/next arrows
 *     cycle the hero photo, four thumbnails on the right pick it directly
 *   • Mouse parallax + scroll parallax on every photo, each at its own depth
 *   • Golden dust drifting over the hero photo, animated film grain
 *   • Magnetic CTA + arrow buttons, custom cursor ring with labels
 *   • Reduced-motion + touch fallbacks, pauses all loops off-screen
 *
 *  Images
 *   Point each entry in `images` at your own file, e.g.
 *   '/images/featured/bag-main.jpg'. Until a file exists at that path, it
 *   shows a warm tinted gradient placeholder so nothing breaks.
 *
 *  Props (all optional — sensible Aurelia copy is filled in by default)
 *   images: [{ src, alt, tint: [from, to] }, ...]   (first is the default hero shot)
 *   brand, eyebrowLeft, tagline
 *   pageIndex, pageTotal
 *   productEyebrow, titleLine1 ([{ text, accent }]), titleLine2, description
 *   features: [{ icon: 'leather' | 'hand' | 'box', label: [line1, line2] }]
 *   currency, price, rating: { value, count }
 *   ctaLabel, ctaHref, detailsLabel, detailsHref
 *   nextProductLabel, nextProductHref
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef, useState } from 'react';
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
   DATA — edit copy / images here
   ═════════════════════════════════════════════════════════════════════════════ */

const IMG = '/images/featured';

const DEFAULT_IMAGES = [
  { src: `${IMG}/bag-main.jpg`, alt: 'The Aurelia classic handbag resting on a stone pedestal', tint: ['#8a6a50', '#221a12'] },
  { src: `${IMG}/bag-detail-1.jpg`, alt: 'Close-up of the handbag clasp and handle', tint: ['#c9b89a', '#3a2c1e'] },
  { src: `${IMG}/bag-detail-2.jpg`, alt: 'Textured leather detail of the handbag', tint: ['#b5a181', '#2c2115'] },
  { src: `${IMG}/bag-detail-3.jpg`, alt: 'The lined interior of the handbag', tint: ['#cdbc9e', '#332616'] },
];

const DEFAULT_FEATURES = [
  { icon: 'leather', label: ['Premium', 'Italian Leather'] },
  { icon: 'hand', label: ['Handcrafted', 'Details'] },
  { icon: 'box', label: ['Spacious', 'Interior'] },
];

const pad = (n) => String(n).padStart(2, '0');

/* ═════════════════════════════════════════════════════════════════════════════
   ICONS
   ═════════════════════════════════════════════════════════════════════════════ */

const ArrowRight = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12h16M14 6l6 6-6 6" />
  </svg>
);

const ArrowLeft = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 12H4M10 6l-6 6 6 6" />
  </svg>
);

const LeatherIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3c4 2.4 7 6 7 10.2A7 7 0 0 1 5 13.2C5 9 8 5.4 12 3Z" />
    <path d="M12 8v10" />
  </svg>
);

const HandIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 12.5V6a1.5 1.5 0 0 1 3 0v5" />
    <path d="M11 11V4.5a1.5 1.5 0 0 1 3 0V11" />
    <path d="M14 11.2V5.7a1.5 1.5 0 0 1 3 0v9.8" />
    <path d="M17 11.5a1.5 1.5 0 0 1 3 0V15c0 3.9-2.7 7-6.5 7-2.4 0-3.9-.9-5.2-2.6L5 14.8c-.6-.9-.4-1.9.4-2.4.7-.5 1.6-.3 2.2.4L9 14.6" />
  </svg>
);

const BoxIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3.5 8 12 3.5 20.5 8 12 12.5 3.5 8Z" />
    <path d="M3.5 8v8L12 20.5 20.5 16V8" />
    <path d="M12 12.5V20.5" />
  </svg>
);

const FEATURE_ICONS = { leather: LeatherIcon, hand: HandIcon, box: BoxIcon };

const StarIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2.6 14.9 9l6.9.6-5.2 4.6 1.6 6.8L12 17.6 5.8 21l1.6-6.8L2.2 9.6 9.1 9 12 2.6Z" />
  </svg>
);

/* ═════════════════════════════════════════════════════════════════════════════
   HOOKS + SMALL COMPONENTS
   ═════════════════════════════════════════════════════════════════════════════ */

/** Element leans toward the cursor when it gets close. */
function useMagnetic(strength = 0.3, radius = 56) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (window.matchMedia('(pointer: coarse)').matches) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    let active = false;

    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
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

function Magnetic({ children, strength = 0.3, radius = 56 }) {
  const ref = useMagnetic(strength, radius);
  return (
    <span ref={ref} className="aur-magnet">
      {children}
    </span>
  );
}

/** Letters fade + rise one after another. */
function SplitLetters({ text, step = 34, start = 0 }) {
  return (
    <span aria-label={text}>
      {text.split('').map((ch, i) => (
        <span key={`${ch}-${i}`} className="aur-letter" aria-hidden="true" style={{ animationDelay: `${start + i * step}ms` }}>
          {ch === ' ' ? '\u00A0' : ch}
        </span>
      ))}
    </span>
  );
}

/** Photo with a graceful gradient fallback when the file doesn't exist yet. */
function MediaImage({ src, alt }) {
  const [failed, setFailed] = useState(!src);
  const ref = useRef(null);

  useEffect(() => {
    setFailed(!src);
  }, [src]);

  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, [src]);

  if (failed) return <span className="aur-feat__fallback" aria-hidden="true" />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img ref={ref} src={src} alt={alt || ''} loading="lazy" draggable={false} onError={() => setFailed(true)} />
  );
}

/** Golden dust drifting across the hero photo, pushed away by the cursor. */
function DustCanvas({ running }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !running) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const mouse = { x: -9999, y: -9999 };
    let width = 0;
    let height = 0;
    let particles = [];
    let raf = 0;

    const rand = (a, b) => a + Math.random() * (b - a);

    const spawn = (initial) => ({
      x: rand(0, width),
      y: initial ? rand(0, height) : height + rand(0, 60),
      r: rand(0.5, 2.2),
      vx: rand(-0.1, 0.22),
      vy: rand(-0.4, -0.06),
      alpha: rand(0.2, 0.8),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.008, 0.024),
      halo: rand(3, 6),
    });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = width < 640 ? 16 : 46;
      particles = Array.from({ length: count }, () => spawn(true));
    };

    const onMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const onLeave = () => {
      mouse.x = -9999;
      mouse.y = -9999;
    };

    const tick = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];

        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 130 * 130) {
          const d = Math.sqrt(d2) || 1;
          const force = (130 - d) / 130;
          p.x += (dx / d) * force * 2.2;
          p.y += (dy / d) * force * 2.2;
        }

        p.x += p.vx + Math.sin(p.phase) * 0.1;
        p.y += p.vy;
        p.phase += p.speed;

        if (p.y < -20 || p.x > width + 20 || p.x < -20) {
          particles[i] = spawn(false);
          continue;
        }

        const a = p.alpha * (0.55 + 0.45 * Math.sin(p.phase * 2.2));

        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 214, 160, ${(a * 0.16).toFixed(3)})`;
        ctx.arc(p.x, p.y, p.r * p.halo, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 236, 205, ${a.toFixed(3)})`;
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('blur', onLeave);
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('blur', onLeave);
    };
  }, [running]);

  return <canvas ref={canvasRef} className="aur-feat__dust" aria-hidden="true" />;
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
      <div ref={ringRef} className={`aur-cursor ${visible ? 'is-visible' : ''} ${grow ? 'is-grow' : ''} ${label ? 'has-label' : ''}`} aria-hidden="true">
        <span className="aur-cursor__label">{label}</span>
      </div>
      <div ref={dotRef} className={`aur-cursor-dot ${visible ? 'is-visible' : ''} ${grow ? 'is-grow' : ''}`} aria-hidden="true" />
    </>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   FEATURED PRODUCT SECTION
   ═════════════════════════════════════════════════════════════════════════════ */

export default function FeaturedProductSection({
  images = DEFAULT_IMAGES,
  brand = 'Aurelia',
  eyebrowLeft = ['Featured', 'Product'],
  tagline = ['Timeless elegance', 'in every detail.'],
  pageIndex = 3,
  pageTotal = 4,
  productEyebrow = 'The Aurelia Bag',
  titleLine1 = [
    { text: 'The ', accent: false },
    { text: 'Classic', accent: true },
  ],
  titleLine2 = 'Handbag',
  description = 'A timeless silhouette, crafted for modern life. The Aurelia bag blends heritage-inspired design with everyday functionality.',
  features = DEFAULT_FEATURES,
  currency = '$',
  price = '680',
  rating = { value: 4.9, count: 124 },
  ctaLabel = 'Add to Cart',
  ctaHref = '/cart/add',
  detailsLabel = 'View Full Details',
  detailsHref = '/shop/aurelia-classic-handbag',
  nextProductLabel = 'Next Product',
  nextProductHref = '/shop',
}) {
  const rootRef = useRef(null);
  const [revealed, setRevealed] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const ctaMagnet = useMagnetic(0.26, 40);
  const prevMagnet = useMagnetic(0.4, 34);
  const nextMagnet = useMagnetic(0.4, 34);

  const total = images.length;
  const active = images[activeIndex] || images[0];

  const nextImage = useCallback(() => {
    setActiveIndex((i) => (i + 1) % total);
  }, [total]);

  const prevImage = useCallback(() => {
    setActiveIndex((i) => (i - 1 + total) % total);
  }, [total]);

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
      { threshold: 0.18 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  /* ── keyboard: left/right cycle the gallery while in view ─────────────── */
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target && e.target.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (!onScreen) return;
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onScreen, nextImage, prevImage]);

  /* ── scroll parallax (CSS variable, no re-render) ─────────────────────── */
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

  /* ── mouse parallax ────────────────────────────────────────────────────── */
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

  const stars = Math.round(rating.value);

  return (
    <section
      ref={rootRef}
      className={`${serif.variable} ${sans.variable} aur-feat ${revealed ? 'is-in' : ''} ${onScreen ? '' : 'is-offscreen'}`}
      aria-label="Featured product"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <div className="aur-feat__grid">
        {/* ── Left: hero product photo ─────────────────────────────────── */}
        <div className="aur-feat__media">
          <div className="aur-feat__par" key={activeIndex}>
            <div className="aur-feat__kb">
              <MediaImage src={active.src} alt={active.alt} />
            </div>
          </div>
          <div className="aur-feat__shade" aria-hidden="true" />
          <DustCanvas running={revealed && onScreen && !tabHidden} />

          <p className="aur-feat__brand">{brand}</p>

          <div className="aur-feat__eyebrow-block">
            <i />
            <p>
              {eyebrowLeft.map((l, i) => (
                <span key={i}>{l}</span>
              ))}
            </p>
          </div>

          <div className="aur-feat__gallery">
            <div className="aur-feat__gallery-count" aria-live="polite">
              <span className="aur-feat__gallery-num">{pad(activeIndex + 1)}</span>
              <small>/ {pad(total)}</small>
            </div>
            <div className="aur-feat__gallery-arrows">
              <span ref={prevMagnet} className="aur-magnet">
                <button type="button" onClick={prevImage} aria-label="Previous photo" data-cursor="Prev">
                  <ArrowLeft />
                </button>
              </span>
              <span ref={nextMagnet} className="aur-magnet">
                <button type="button" onClick={nextImage} aria-label="Next photo" data-cursor="Next">
                  <ArrowRight size={14} />
                </button>
              </span>
            </div>
          </div>

          <div className="aur-feat__tag">
            <p>
              {tagline.map((l, i) => (
                <span key={i}>{l}</span>
              ))}
            </p>
            <i />
          </div>
        </div>

        {/* ── Center: product copy ─────────────────────────────────────── */}
        <div className="aur-feat__content">
          <p className="aur-feat__eyebrow">
            <SplitLetters text={productEyebrow} start={90} />
          </p>

          <h2 className="aur-feat__title">
            <span className="aur-line">
              <span className="aur-line__in" style={{ animationDelay: '180ms' }}>
                {titleLine1.map((part, i) => (
                  <span key={i} className={part.accent ? 'aur-feat__accent' : undefined}>
                    {part.text}
                  </span>
                ))}
              </span>
            </span>
            <span className="aur-line">
              <span className="aur-line__in" style={{ animationDelay: '300ms' }}>
                {titleLine2}
              </span>
            </span>
          </h2>

          <p className="aur-feat__desc">{description}</p>

          <ul className="aur-feat__features">
            {features.map((f, i) => {
              const Icon = FEATURE_ICONS[f.icon] || BoxIcon;
              return (
                <li key={i} style={{ animationDelay: `${820 + i * 110}ms` }}>
                  <span className="aur-feat__ficon">
                    <Icon />
                  </span>
                  <span className="aur-feat__flabel">
                    {f.label.map((l, i2) => (
                      <span key={i2}>{l}</span>
                    ))}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="aur-feat__price-row">
            <span className="aur-feat__price">
              <span className="aur-feat__price-cur">{currency}</span>
              {price}
            </span>
            <i />
            <span className="aur-feat__rating">
              <span className="aur-feat__stars" aria-hidden="true">
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} className={i < stars ? 'is-on' : ''}>
                    <StarIcon />
                  </span>
                ))}
              </span>
              <span>
                {rating.value} ({rating.count})
              </span>
            </span>
          </div>

          <div className="aur-feat__actions">
            <Magnetic strength={0.24} radius={44}>
              <Link href={ctaHref} className="aur-feat__cta" data-cursor="Add">
                <span>{ctaLabel}</span>
                <span className="aur-feat__cta-arrow">
                  <ArrowRight size={15} />
                </span>
              </Link>
            </Magnetic>

            <Link href={detailsHref} className="aur-feat__link">
              {detailsLabel}
            </Link>
          </div>
        </div>

        {/* ── Right: page count + thumbnail rail ───────────────────────── */}
        <div className="aur-feat__side">
          <div className="aur-feat__count">
            <span className="aur-feat__count-num">{pad(pageIndex)}</span>
            <em>/</em>
            <span>{pad(pageTotal)}</span>
            <i />
            <ArrowRight size={12} />
          </div>

          <div className="aur-feat__thumbs">
            {images.map((img, i) => (
              <button
                type="button"
                key={img.src || i}
                className={`aur-feat__thumb ${i === activeIndex ? 'is-active' : ''}`}
                style={{ '--i': i, '--t1': img.tint?.[0], '--t2': img.tint?.[1] }}
                onClick={() => setActiveIndex(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-pressed={i === activeIndex}
                data-cursor="View"
              >
                <span className="aur-feat__thumb-par">
                  <span className="aur-feat__thumb-kb">
                    <MediaImage src={img.src} alt={img.alt} />
                  </span>
                </span>
              </button>
            ))}
          </div>

          <Link href={nextProductHref} className="aur-feat__next">
            <i />
            <span>{nextProductLabel}</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      <SectionCursor rootRef={rootRef} enabled={revealed} />

      <style jsx global>{`
        /* ═══════════════════════════════════════════════════════════════════
           ROOT
           ═══════════════════════════════════════════════════════════════════ */
        .aur-feat {
          --cream: #ede6da;
          --ink: #2a2019;
          --ink-soft: rgba(42, 32, 25, 0.72);
          --line: rgba(42, 32, 25, 0.26);
          --copper: #b9724b;
          --gold: #c79a4c;
          --ease-out: cubic-bezier(0.22, 0.8, 0.2, 1);
          --ease-expo: cubic-bezier(0.19, 1, 0.22, 1);
          --ease-wipe: cubic-bezier(0.76, 0, 0.18, 1);
          --media-h: clamp(580px, 100vh, 860px);
          --mx: 0;
          --my: 0;
          --sp: 0;
          position: relative;
          overflow: hidden;
          isolation: isolate;
          background: var(--cream);
          color: var(--ink);
          font-family: var(--aur-sans), system-ui, sans-serif;
        }
        .aur-feat a,
        .aur-feat button {
          -webkit-tap-highlight-color: transparent;
        }

        .aur-feat__grid {
          display: grid;
          grid-template-columns: minmax(0, 1.22fr) minmax(0, 0.98fr) clamp(110px, 11vw, 150px);
          align-items: stretch;
        }

        @keyframes aurFtFade {
          from {
            opacity: 0;
            transform: translate3d(0, 16px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        @keyframes aurFtGrowX {
          to {
            transform: scaleX(1);
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           LEFT · HERO PRODUCT PHOTO
           ═══════════════════════════════════════════════════════════════════ */
        .aur-feat__media {
          position: relative;
          overflow: hidden;
          height: var(--media-h);
          background: #14100c;
          clip-path: inset(0 0 0 100%);
        }
        .aur-feat.is-in .aur-feat__media {
          animation: aurFtWipe 1.6s var(--ease-wipe) both;
        }
        @keyframes aurFtWipe {
          from {
            clip-path: inset(0 0 0 100%);
          }
          to {
            clip-path: inset(0 0 0 0);
          }
        }

        .aur-feat__par {
          position: absolute;
          inset: -8%;
          transform: translate3d(calc(var(--mx) * -20px), calc(var(--my) * -12px + var(--sp) * 24px), 0);
          transition: transform 0.9s cubic-bezier(0.2, 0.7, 0.2, 1);
          will-change: transform;
          animation: aurFtCross 0.6s ease both;
        }
        @keyframes aurFtCross {
          from {
            opacity: 0.3;
          }
          to {
            opacity: 1;
          }
        }
        .aur-feat__kb {
          position: absolute;
          inset: 0;
          transform: scale(1.14);
        }
        .aur-feat.is-in .aur-feat__kb {
          animation: aurFtKB 3s var(--ease-out) 0.2s both;
        }
        @keyframes aurFtKB {
          from {
            transform: scale(1.14) translate3d(1.4%, 0.8%, 0);
          }
          to {
            transform: scale(1) translate3d(0, 0, 0);
          }
        }
        .aur-feat__kb img,
        .aur-feat__media .aur-feat__fallback {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          -webkit-user-drag: none;
        }
        .aur-feat__media .aur-feat__fallback {
          background:
            linear-gradient(120deg, transparent 30%, rgba(255, 226, 180, 0.12) 46%, transparent 62%),
            radial-gradient(ellipse 70% 55% at 32% 22%, #8a6a50, transparent 72%),
            linear-gradient(165deg, #43331f, #120e0a);
        }

        .aur-feat__shade {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(0deg, rgba(14, 11, 8, 0.75) 0%, rgba(14, 11, 8, 0.08) 30%, rgba(14, 11, 8, 0) 48%),
            linear-gradient(180deg, rgba(14, 11, 8, 0.6) 0%, rgba(14, 11, 8, 0) 26%);
        }

        .aur-feat__dust {
          position: absolute;
          inset: 0;
          z-index: 2;
          width: 100%;
          height: 100%;
          pointer-events: none;
          opacity: 0;
          transition: opacity 2s ease 0.5s;
        }
        .aur-feat.is-in .aur-feat__dust {
          opacity: 1;
        }

        .aur-feat__brand {
          position: absolute;
          z-index: 3;
          top: clamp(22px, 2.6vw, 38px);
          left: clamp(22px, 2.6vw, 38px);
          margin: 0;
          font-family: var(--aur-serif), Georgia, serif;
          font-weight: 400;
          font-size: clamp(1.25rem, 1.7vw, 1.6rem);
          letter-spacing: 0.02em;
          color: #f6efe8;
          opacity: 0;
        }
        .aur-feat.is-in .aur-feat__brand {
          animation: aurFtFade 1.2s ease 0.9s both;
        }

        .aur-feat__eyebrow-block {
          position: absolute;
          z-index: 3;
          top: clamp(96px, 12vw, 148px);
          left: clamp(22px, 2.6vw, 38px);
          display: flex;
          gap: 12px;
          opacity: 0;
        }
        .aur-feat.is-in .aur-feat__eyebrow-block {
          animation: aurFtFade 1.2s ease 1.1s both;
        }
        .aur-feat__eyebrow-block i {
          display: block;
          width: 1px;
          align-self: stretch;
          background: rgba(246, 239, 232, 0.4);
        }
        .aur-feat__eyebrow-block p {
          margin: 0;
          font-size: 0.66rem;
          font-weight: 500;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          line-height: 1.7;
          color: rgba(246, 239, 232, 0.85);
        }
        .aur-feat__eyebrow-block p span {
          display: block;
        }

        .aur-feat__gallery {
          position: absolute;
          z-index: 3;
          left: clamp(22px, 2.6vw, 38px);
          bottom: clamp(96px, 12vw, 146px);
          display: flex;
          align-items: center;
          gap: 18px;
          opacity: 0;
        }
        .aur-feat.is-in .aur-feat__gallery {
          animation: aurFtFade 1.2s ease 1.3s both;
        }
        .aur-feat__gallery-count {
          display: flex;
          flex-direction: column;
          line-height: 1;
          color: #f6efe8;
        }
        .aur-feat__gallery-num {
          font-family: var(--aur-serif), Georgia, serif;
          font-size: 1.5rem;
          font-weight: 500;
          font-variant-numeric: tabular-nums;
        }
        .aur-feat__gallery-count small {
          margin-top: 3px;
          font-size: 0.66rem;
          letter-spacing: 0.08em;
          color: rgba(246, 239, 232, 0.6);
        }
        .aur-feat__gallery-arrows {
          display: flex;
          gap: 8px;
        }
        .aur-feat__gallery-arrows button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          padding: 0;
          border-radius: 50%;
          border: 1px solid rgba(246, 239, 232, 0.5);
          background: rgba(255, 255, 255, 0.02);
          color: #f6efe8;
          cursor: pointer;
          transition: background 0.35s ease, color 0.35s ease, border-color 0.35s ease, transform 0.45s var(--ease-out);
        }
        .aur-feat__gallery-arrows button:hover {
          background: #f6efe8;
          color: var(--ink);
          border-color: #f6efe8;
          transform: scale(1.08);
        }

        .aur-feat__tag {
          position: absolute;
          z-index: 3;
          left: clamp(22px, 2.6vw, 38px);
          bottom: clamp(30px, 3.4vw, 46px);
          opacity: 0;
        }
        .aur-feat.is-in .aur-feat__tag {
          animation: aurFtFade 1.2s ease 1.5s both;
        }
        .aur-feat__tag p {
          margin: 0 0 12px;
          font-family: var(--aur-serif), Georgia, serif;
          font-style: italic;
          font-size: clamp(0.92rem, 1.05vw, 1.02rem);
          line-height: 1.4;
          color: rgba(246, 239, 232, 0.9);
        }
        .aur-feat__tag p span {
          display: block;
        }
        .aur-feat__tag i {
          display: block;
          width: 40px;
          height: 1px;
          background: rgba(246, 239, 232, 0.5);
          transform: scaleX(0);
          transform-origin: left;
        }
        .aur-feat.is-in .aur-feat__tag i {
          animation: aurFtGrowX 1s var(--ease-out) 1.7s both;
        }

        /* ═══════════════════════════════════════════════════════════════════
           CENTER · PRODUCT COPY
           ═══════════════════════════════════════════════════════════════════ */
        .aur-feat__content {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: clamp(52px, 5.6vw, 88px) clamp(28px, 3.2vw, 52px);
        }

        .aur-feat__eyebrow {
          margin: 0 0 clamp(12px, 1.4vw, 18px);
          font-size: 0.7rem;
          font-weight: 500;
          letter-spacing: 0.36em;
          text-transform: uppercase;
          color: var(--copper);
        }
        .aur-letter {
          display: inline-block;
          opacity: 0;
        }
        .aur-feat.is-in .aur-letter {
          animation: aurFtLetter 0.9s var(--ease-expo) both;
        }
        @keyframes aurFtLetter {
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

        .aur-feat__title {
          display: flex;
          flex-direction: column;
          margin: 0;
          font-family: var(--aur-serif), Georgia, serif;
          font-weight: 400;
          font-size: clamp(2.2rem, 3.3vw, 3.2rem);
          line-height: 1.06;
          letter-spacing: -0.01em;
          color: var(--ink);
        }
        .aur-line {
          display: block;
          overflow: hidden;
          padding: 0.04em 0.06em 0.14em 0;
          margin-bottom: -0.1em;
        }
        .aur-line__in {
          display: inline-block;
          transform: translate3d(0, 115%, 0) rotate(3deg);
          transform-origin: left bottom;
        }
        .aur-feat.is-in .aur-line__in {
          animation: aurFtRise 1.3s var(--ease-expo) both;
        }
        .aur-feat__accent {
          font-style: italic;
          color: var(--copper);
        }
        @keyframes aurFtRise {
          from {
            transform: translate3d(0, 115%, 0) rotate(3deg);
          }
          to {
            transform: translate3d(0, 0, 0) rotate(0);
          }
        }

        .aur-feat__desc {
          max-width: 40ch;
          margin: clamp(18px, 2vw, 26px) 0 0;
          font-size: clamp(0.9rem, 1vw, 0.98rem);
          font-weight: 300;
          line-height: 1.7;
          color: var(--ink-soft);
          opacity: 0;
        }
        .aur-feat.is-in .aur-feat__desc {
          animation: aurFtFade 1.1s ease 0.6s both;
        }

        .aur-feat__features {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px clamp(20px, 2.4vw, 34px);
          margin: clamp(24px, 2.6vw, 34px) 0 0;
          padding: 0;
          list-style: none;
        }
        .aur-feat__features li {
          display: flex;
          align-items: center;
          gap: 12px;
          opacity: 0;
        }
        .aur-feat.is-in .aur-feat__features li {
          animation: aurFtFade 1s ease both;
        }
        .aur-feat__ficon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          border-radius: 50%;
          border: 1px solid var(--line);
          color: var(--copper);
        }
        .aur-feat__flabel {
          display: flex;
          flex-direction: column;
          font-size: 0.82rem;
          line-height: 1.35;
          color: var(--ink);
        }
        .aur-feat__flabel span {
          display: block;
        }

        .aur-feat__price-row {
          display: flex;
          align-items: center;
          gap: 16px;
          margin: clamp(26px, 2.8vw, 38px) 0 0;
          opacity: 0;
        }
        .aur-feat.is-in .aur-feat__price-row {
          animation: aurFtFade 1.2s ease 1.25s both;
        }
        .aur-feat__price {
          font-family: var(--aur-serif), Georgia, serif;
          font-size: clamp(1.7rem, 2.2vw, 2.1rem);
          font-weight: 500;
          color: var(--ink);
        }
        .aur-feat__price-cur {
          margin-right: 4px;
          font-size: 0.55em;
          font-weight: 400;
          vertical-align: 0.2em;
          color: var(--ink-soft);
        }
        .aur-feat__price-row > i {
          display: block;
          width: 34px;
          height: 1px;
          background: var(--line);
        }
        .aur-feat__rating {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8rem;
          color: var(--ink-soft);
        }
        .aur-feat__stars {
          display: inline-flex;
          gap: 2px;
          color: rgba(42, 32, 25, 0.25);
        }
        .aur-feat__stars .is-on {
          color: var(--gold);
        }

        .aur-feat__actions {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 16px;
          margin-top: clamp(26px, 2.8vw, 36px);
        }
        .aur-magnet {
          display: inline-block;
          transition: transform 0.7s var(--ease-out);
          will-change: transform;
        }
        .aur-magnet.is-magnet {
          transition-duration: 0.22s;
        }
        .aur-feat__actions .aur-magnet {
          opacity: 0;
        }
        .aur-feat.is-in .aur-feat__actions .aur-magnet {
          animation: aurFtFade 1.2s ease 1.45s both;
        }
        .aur-feat__cta {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 14px;
          height: 52px;
          padding: 0 30px;
          border-radius: 999px;
          background: var(--ink);
          color: var(--cream);
          font-size: 0.9rem;
          font-weight: 500;
          text-decoration: none;
          overflow: hidden;
          box-shadow: 0 16px 34px -16px rgba(42, 32, 25, 0.55);
          transition: transform 0.5s var(--ease-out), box-shadow 0.5s ease, background 0.4s ease;
        }
        .aur-feat__cta:hover {
          background: #3c2d20;
          transform: translateY(-3px);
          box-shadow: 0 22px 44px -16px rgba(42, 32, 25, 0.65);
        }
        .aur-feat__cta:active {
          transform: translateY(-1px) scale(0.98);
        }
        .aur-feat__cta-arrow {
          display: inline-flex;
          transition: transform 0.45s var(--ease-out);
        }
        .aur-feat__cta:hover .aur-feat__cta-arrow {
          transform: translateX(6px);
        }

        .aur-feat__link {
          position: relative;
          font-size: 0.86rem;
          color: var(--ink);
          text-decoration: none;
          padding-bottom: 3px;
          background: linear-gradient(currentColor, currentColor) 0 100% / 100% 1px no-repeat;
          opacity: 0;
        }
        .aur-feat.is-in .aur-feat__link {
          animation: aurFtFade 1.2s ease 1.6s both;
        }
        .aur-feat__link:hover {
          color: var(--copper);
        }

        /* ═══════════════════════════════════════════════════════════════════
           RIGHT · PAGE COUNT + THUMBNAIL RAIL
           ═══════════════════════════════════════════════════════════════════ */
        .aur-feat__side {
          display: flex;
          flex-direction: column;
          padding: clamp(22px, 2.6vw, 38px) clamp(18px, 2vw, 26px) clamp(22px, 2.6vw, 38px) 0;
        }

        .aur-feat__count {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: clamp(20px, 2.4vw, 32px);
          color: var(--ink);
          font-size: 0.7rem;
          letter-spacing: 0.06em;
          opacity: 0;
        }
        .aur-feat.is-in .aur-feat__count {
          animation: aurFtFade 1.1s ease 0.55s both;
        }
        .aur-feat__count-num {
          font-weight: 500;
        }
        .aur-feat__count em {
          font-style: normal;
          opacity: 0.5;
        }
        .aur-feat__count > span:nth-child(3) {
          opacity: 0.55;
        }
        .aur-feat__count i {
          flex: 1 1 auto;
          height: 1px;
          background: var(--line);
          transform: scaleX(0);
          transform-origin: left;
        }
        .aur-feat.is-in .aur-feat__count i {
          animation: aurFtGrowX 1.3s var(--ease-out) 0.7s both;
        }
        .aur-feat__count svg {
          flex-shrink: 0;
          opacity: 0.7;
        }

        .aur-feat__thumbs {
          display: flex;
          flex-direction: column;
          gap: clamp(12px, 1.4vw, 18px);
        }
        .aur-feat__thumb {
          position: relative;
          display: block;
          height: clamp(96px, 10vw, 130px);
          padding: 0;
          overflow: hidden;
          border: 1px solid transparent;
          background: #22190f;
          cursor: pointer;
          clip-path: inset(0 0 0 100%);
          transition: border-color 0.4s ease;
        }
        .aur-feat.is-in .aur-feat__thumb {
          animation: aurFtWipe 1.3s var(--ease-wipe) calc(var(--i) * 180ms + 0.5s) both;
        }
        .aur-feat__thumb.is-active {
          border-color: var(--copper);
        }
        .aur-feat__thumb-par {
          position: absolute;
          inset: -8%;
        }
        .aur-feat__thumb-kb {
          position: absolute;
          inset: 0;
          transform: scale(1.2);
        }
        .aur-feat.is-in .aur-feat__thumb-kb {
          animation: aurFtKB 2.2s var(--ease-out) calc(var(--i) * 180ms + 0.65s) both;
        }
        .aur-feat__thumb-kb img,
        .aur-feat__thumb .aur-feat__fallback {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scale(1);
          transition: transform 1.1s var(--ease-out), filter 0.4s ease;
          -webkit-user-drag: none;
        }
        .aur-feat__thumb .aur-feat__fallback {
          background:
            linear-gradient(120deg, transparent 32%, rgba(255, 226, 180, 0.14) 46%, transparent 60%),
            radial-gradient(ellipse 80% 55% at 30% 22%, var(--t1, #b89b76), transparent 72%),
            linear-gradient(165deg, var(--t2, #241c15), #14100c);
        }
        .aur-feat__thumb:hover .aur-feat__thumb-kb img,
        .aur-feat__thumb:hover .aur-feat__fallback {
          transform: scale(1.08);
        }
        .aur-feat__thumb:not(.is-active) .aur-feat__thumb-kb img,
        .aur-feat__thumb:not(.is-active) .aur-feat__fallback {
          filter: brightness(0.82);
        }

        .aur-feat__next {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-top: clamp(18px, 2vw, 26px);
          font-size: 0.74rem;
          letter-spacing: 0.04em;
          color: var(--ink);
          text-decoration: none;
          opacity: 0;
        }
        .aur-feat.is-in .aur-feat__next {
          animation: aurFtFade 1.2s ease 1.3s both;
        }
        .aur-feat__next i {
          display: block;
          width: 18px;
          height: 1px;
          background: var(--line);
        }
        .aur-feat__next svg {
          transition: transform 0.45s var(--ease-out);
        }
        .aur-feat__next:hover svg {
          transform: translateX(4px);
        }

        /* ═══════════════════════════════════════════════════════════════════
           CURSOR
           ═══════════════════════════════════════════════════════════════════ */
        .aur-cursor,
        .aur-cursor-dot {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 200;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.35s ease;
        }
        .aur-cursor.is-visible,
        .aur-cursor-dot.is-visible {
          opacity: 1;
        }
        .aur-cursor::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 42px;
          height: 42px;
          margin: -21px 0 0 -21px;
          border-radius: 50%;
          border: 1px solid rgba(42, 32, 25, 0.5);
          background: rgba(42, 32, 25, 0);
          transition: transform 0.5s var(--ease-out), background 0.4s ease, border-color 0.4s ease;
        }
        .aur-cursor.is-grow::before {
          transform: scale(1.5);
          background: rgba(42, 32, 25, 0.06);
          border-color: rgba(42, 32, 25, 0.8);
        }
        .aur-cursor.has-label::before {
          transform: scale(1.9);
          background: rgba(24, 18, 13, 0.72);
          border-color: transparent;
          -webkit-backdrop-filter: blur(6px);
          backdrop-filter: blur(6px);
        }
        .aur-cursor__label {
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
        .aur-cursor.has-label .aur-cursor__label {
          opacity: 1;
        }
        .aur-cursor-dot::before {
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
        .aur-cursor-dot.is-grow::before {
          transform: scale(0);
        }

        /* ═══════════════════════════════════════════════════════════════════
           FOCUS + PAUSE
           ═══════════════════════════════════════════════════════════════════ */
        .aur-feat a:focus-visible,
        .aur-feat button:focus-visible {
          outline: 2px solid var(--copper);
          outline-offset: 4px;
        }
        .aur-feat.is-offscreen .aur-feat__dust {
          animation-play-state: paused;
        }

        /* ═══════════════════════════════════════════════════════════════════
           RESPONSIVE
           ═══════════════════════════════════════════════════════════════════ */
        @media (max-width: 1180px) {
          .aur-feat__grid {
            grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr) clamp(100px, 14vw, 130px);
          }
        }

        @media (max-width: 980px) {
          .aur-feat {
            --media-h: 560px;
          }
          .aur-feat__grid {
            grid-template-columns: 1fr;
          }
          .aur-feat__side {
            padding: 0 clamp(24px, 6vw, 56px) clamp(56px, 7vw, 84px);
          }
          .aur-feat__thumbs {
            flex-direction: row;
          }
          .aur-feat__thumb {
            flex: 1;
            height: clamp(120px, 22vw, 180px);
          }
          .aur-feat__count {
            margin-bottom: clamp(16px, 3vw, 24px);
          }
        }

        @media (max-width: 620px) {
          .aur-feat {
            --media-h: 480px;
          }
          .aur-feat__content {
            padding: 48px 24px;
          }
          .aur-feat__desc {
            max-width: none;
          }
          .aur-feat__features {
            grid-template-columns: 1fr 1fr;
          }
          .aur-feat__eyebrow-block,
          .aur-feat__gallery {
            display: none;
          }
        }

        @media (pointer: coarse) {
          .aur-cursor,
          .aur-cursor-dot {
            display: none;
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           REDUCED MOTION
           ═══════════════════════════════════════════════════════════════════ */
        @media (prefers-reduced-motion: reduce) {
          .aur-feat *,
          .aur-feat *::before,
          .aur-feat *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
          .aur-feat__dust {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}