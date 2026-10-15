'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AURELIA · STORY  ("Our Story" — editorial magazine section)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Place at: frontend/src/components/StorySection.js
 *  Use:      <StorySection />   (e.g. in src/app/page.js, after CollectionsSection)
 *
 *  Same visual/animation language as Hero.js / ProductSection.js / CollectionsSection.js:
 *   • Reveals once when scrolled into view: letter-by-letter eyebrow, masked
 *     heading lines, paragraphs and signature fading up in sequence
 *   • Large left-hand portrait wipes open with a stagger, then settles with a
 *     Ken Burns zoom; wordmark + tagline sit over it with a soft shade
 *   • Two stacked "detail" photos on the right wipe in the same way, with
 *     hover zoom and a drawn caption
 *   • Mouse parallax + scroll parallax on every photo, at their own depth
 *   • Drifting window-light, animated film grain, golden dust that avoids
 *     the cursor over the hero image
 *   • Magnetic scroll cue, custom cursor ring with labels
 *   • Reduced-motion + touch fallbacks, pauses all loops off-screen
 *
 *  Images
 *   Point mainImage / sideImages at your own files, e.g.
 *   '/images/story/story-main.jpg'. Until a file exists at that path, each
 *   photo shows a warm gradient placeholder (tinted per image) so nothing
 *   breaks — swap in real photography whenever it's ready.
 *
 *  Props (all optional — sensible Aurelia copy is filled in by default)
 *   mainImage, mainImageAlt, brand, tagline
 *   pageIndex, pageTotal
 *   eyebrow, title, titleAccent, paragraphs
 *   signature, signatureSub, scrollLabel
 *   sideImages: [{ image, alt, caption: [line1, line2] }, ...]
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Cormorant_Garamond, Figtree, Parisienne } from 'next/font/google';
import './styles/Storysection.css';

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

const script = Parisienne({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--aur-script',
  display: 'swap',
});

/* ═════════════════════════════════════════════════════════════════════════════
   DATA — edit copy / images here
   ═════════════════════════════════════════════════════════════════════════════ */

const IMG = '/images/story';

const DEFAULT_SIDE = [
  {
    image: `${IMG}/detail-1.jpg`,
    alt: 'Linen and olive branch styled on a stone table',
    caption: ['Inspired by nature,', 'crafted for you.'],
    tint: ['#b89b76', '#332920'],
  },
  {
    image: `${IMG}/detail-2.jpg`,
    alt: 'Aurelia label resting on a woven surface',
    caption: ['Timeless pieces', 'for modern life.'],
    tint: ['#9c8265', '#241c15'],
  },
];

const pad = (n) => String(n).padStart(2, '0');

/* ═════════════════════════════════════════════════════════════════════════════
   ICONS
   ═════════════════════════════════════════════════════════════════════════════ */

const ArrowDown = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 4v16M6 14l6 6 6-6" />
  </svg>
);

/* ═════════════════════════════════════════════════════════════════════════════
   HOOKS + SMALL COMPONENTS
   ═════════════════════════════════════════════════════════════════════════════ */

/** Element leans toward the cursor when it gets close. */
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
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) return <span className="aur-story__fallback" aria-hidden="true" />;

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
      const count = width < 640 ? 16 : 44;
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

  return <canvas ref={canvasRef} className="aur-story__dust" aria-hidden="true" />;
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
   STORY SECTION
   ═════════════════════════════════════════════════════════════════════════════ */

export default function StorySection({
  mainImage = `${IMG}/story-main.jpg`,
  mainImageAlt = 'Woman in a linen dress sitting in warm afternoon light',
  brand = 'Aurelia',
  tagline = ['More than just', 'clothes —', "it's a feeling."],
  pageIndex = 2,
  pageTotal = 4,
  eyebrow = 'Our story',
  title = 'Thoughtfully Designed for',
  titleAccent = 'a Kinder Tomorrow.',
  paragraphs = [
    'Aurelia was born from a simple belief — that fashion can be more than just what we wear. It can be a form of self-expression, a celebration of individuality, and a gentle force for a more sustainable future.',
    'We create timeless pieces, inspired by nature, art and the quiet beauty of everyday moments. Each collection is carefully designed with quality, craftsmanship and conscious choices at its heart.',
  ],
  signature = 'Aurelia',
  signatureSub = ['More than fashion.', 'A lifestyle.'],
  scrollLabel = 'Scroll to explore',
  sideImages = DEFAULT_SIDE,
}) {
  const rootRef = useRef(null);
  const [revealed, setRevealed] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);

  const scrollCue = useMagnetic(0.28, 46);

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

  const scrollDown = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const top = el.getBoundingClientRect().bottom + window.scrollY - 24;
    window.scrollTo({ top, behavior: 'smooth' });
  }, []);

  return (
    <section
      ref={rootRef}
      className={`${serif.variable} ${sans.variable} ${script.variable} aur-story ${revealed ? 'is-in' : ''} ${onScreen ? '' : 'is-offscreen'}`}
      aria-label="Our story"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <div className="aur-story__grid">
        {/* ── Left: large portrait ─────────────────────────────────────── */}
        <div className="aur-story__media">
          <div className="aur-story__par">
            <div className="aur-story__kb">
              <MediaImage src={mainImage} alt={mainImageAlt} />
            </div>
          </div>
          <div className="aur-story__shade" aria-hidden="true" />
          <DustCanvas running={revealed && onScreen && !tabHidden} />

          <p className="aur-story__brand">{brand}</p>

          <div className="aur-story__tag">
            <i />
            <p>
              {tagline.map((line, i) => (
                <span key={i}>{line}</span>
              ))}
            </p>
          </div>
        </div>

        {/* ── Center: copy ─────────────────────────────────────────────── */}
        <div className="aur-story__content">
          <p className="aur-story__eyebrow">
            <SplitLetters text={eyebrow} start={100} />
          </p>

          <h2 className="aur-story__title">
            <span className="aur-line">
              <span className="aur-line__in" style={{ animationDelay: '200ms' }}>
                {title}
              </span>
            </span>
            <span className="aur-line">
              <span className="aur-line__in aur-line__in--accent" style={{ animationDelay: '340ms' }}>
                {titleAccent}
              </span>
            </span>
          </h2>

          <div className="aur-story__body">
            {paragraphs.map((p, i) => (
              <p key={i} style={{ animationDelay: `${640 + i * 160}ms` }}>
                {p}
              </p>
            ))}
          </div>

          <div className="aur-story__sign">
            <span className="aur-story__script">{signature}</span>
            <span className="aur-story__subcaps">
              {signatureSub.map((l, i) => (
                <span key={i}>{l}</span>
              ))}
            </span>
          </div>

          <i className="aur-story__rule" aria-hidden="true" />

          <span ref={scrollCue} className="aur-magnet">
            <button type="button" className="aur-story__scroll" onClick={scrollDown} data-cursor="Scroll">
              <span className="aur-story__scroll-icon">
                <ArrowDown />
              </span>
              <span>{scrollLabel}</span>
            </button>
          </span>
        </div>

        {/* ── Right: page count + detail photos ────────────────────────── */}
        <div className="aur-story__side">
          <div className="aur-story__count" aria-hidden="true">
            <span className="aur-story__count-num">{pad(pageIndex)}</span>
            <em>/</em>
            <span>{pad(pageTotal)}</span>
            <i />
          </div>

          <div className="aur-story__thumbs">
            {sideImages.map((s, i) => (
              <figure className="aur-story__thumb" key={s.image || i} style={{ '--i': i, '--t1': s.tint?.[0], '--t2': s.tint?.[1] }}>
                <div className="aur-story__thumb-frame" data-cursor="View">
                  <span className="aur-story__thumb-par">
                    <span className="aur-story__thumb-kb">
                      <MediaImage src={s.image} alt={s.alt} />
                    </span>
                  </span>
                </div>
                <figcaption>
                  {s.caption.map((l, i2) => (
                    <span key={i2}>{l}</span>
                  ))}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>

      <SectionCursor rootRef={rootRef} enabled={revealed} />

      {/* Rules whose class names are defined differently in other sections stay here: see src/components/styles/README.md */}
      <style jsx global>{`
        .aur-line {
          display: block;
          overflow: hidden;
          padding: 0.04em 0.06em 0.14em 0;
          margin-bottom: -0.1em;
        }
        .aur-line__in--accent {
          font-style: italic;
          padding-right: 0.08em;
          background: linear-gradient(95deg, var(--ink) 0%, var(--copper) 48%, var(--ink) 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }

        .aur-magnet {
          display: inline-block;
          transition: transform 0.7s var(--ease-out);
          will-change: transform;
        }
        .aur-magnet.is-magnet {
          transition-duration: 0.22s;
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

        @media (pointer: coarse) {
          .aur-cursor,
          .aur-cursor-dot {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}