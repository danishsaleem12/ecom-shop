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

      <style jsx global>{`
        /* ═══════════════════════════════════════════════════════════════════
           ROOT
           ═══════════════════════════════════════════════════════════════════ */
        .aur-story {
          --cream: #f2ebe0;
          --ink: #2a2019;
          --ink-soft: rgba(42, 32, 25, 0.72);
          --line: rgba(42, 32, 25, 0.28);
          --copper: #b9724b;
          --gutter: clamp(20px, 3.4vw, 56px);
          --ease-out: cubic-bezier(0.22, 0.8, 0.2, 1);
          --ease-expo: cubic-bezier(0.19, 1, 0.22, 1);
          --ease-wipe: cubic-bezier(0.76, 0, 0.18, 1);
          --media-h: clamp(560px, 100vh, 860px);
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
        .aur-story a,
        .aur-story button {
          -webkit-tap-highlight-color: transparent;
        }

        .aur-story__grid {
          display: grid;
          grid-template-columns: minmax(0, 1.02fr) minmax(0, 0.96fr) clamp(150px, 15vw, 208px);
          align-items: stretch;
        }

        @keyframes aurStFade {
          from {
            opacity: 0;
            transform: translate3d(0, 16px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        @keyframes aurStGrowX {
          to {
            transform: scaleX(1);
          }
        }
        @keyframes aurStGrowY {
          to {
            transform: scaleY(1);
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           LEFT · MAIN PORTRAIT
           ═══════════════════════════════════════════════════════════════════ */
        .aur-story__media {
          position: relative;
          overflow: hidden;
          height: var(--media-h);
          background: #171310;
          clip-path: inset(0 0 0 100%);
        }
        .aur-story.is-in .aur-story__media {
          animation: aurStWipe 1.6s var(--ease-wipe) both;
        }
        @keyframes aurStWipe {
          from {
            clip-path: inset(0 0 0 100%);
          }
          to {
            clip-path: inset(0 0 0 0);
          }
        }

        .aur-story__par {
          position: absolute;
          inset: -8%;
          transform: translate3d(calc(var(--mx) * -22px), calc(var(--my) * -12px + var(--sp) * 26px), 0);
          transition: transform 0.9s cubic-bezier(0.2, 0.7, 0.2, 1);
          will-change: transform;
        }
        .aur-story__kb {
          position: absolute;
          inset: 0;
          transform: scale(1.16);
        }
        .aur-story.is-in .aur-story__kb {
          animation: aurStKB 3s var(--ease-out) 0.2s both;
        }
        @keyframes aurStKB {
          from {
            transform: scale(1.16) translate3d(1.6%, 0.8%, 0);
          }
          to {
            transform: scale(1) translate3d(0, 0, 0);
          }
        }
        .aur-story__kb img,
        .aur-story__fallback {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          -webkit-user-drag: none;
        }
        .aur-story__media .aur-story__fallback {
          background:
            linear-gradient(120deg, transparent 30%, rgba(255, 226, 180, 0.12) 46%, transparent 62%),
            radial-gradient(ellipse 70% 55% at 32% 22%, #8a6a50, transparent 72%),
            linear-gradient(165deg, #4a382a, #14100c);
        }

        .aur-story__shade {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(0deg, rgba(15, 12, 9, 0.72) 0%, rgba(15, 12, 9, 0.06) 28%, rgba(15, 12, 9, 0) 46%),
            linear-gradient(180deg, rgba(15, 12, 9, 0.62) 0%, rgba(15, 12, 9, 0) 26%);
        }

        .aur-story__dust {
          position: absolute;
          inset: 0;
          z-index: 2;
          width: 100%;
          height: 100%;
          pointer-events: none;
          opacity: 0;
          transition: opacity 2s ease 0.5s;
        }
        .aur-story.is-in .aur-story__dust {
          opacity: 1;
        }

        .aur-story__brand {
          position: absolute;
          z-index: 3;
          top: clamp(22px, 2.6vw, 40px);
          left: clamp(22px, 2.6vw, 40px);
          margin: 0;
          font-family: var(--aur-serif), Georgia, serif;
          font-weight: 400;
          font-size: clamp(1.3rem, 1.8vw, 1.7rem);
          letter-spacing: 0.02em;
          color: #f6efe8;
          opacity: 0;
        }
        .aur-story.is-in .aur-story__brand {
          animation: aurStFade 1.2s ease 1s both;
        }

        .aur-story__tag {
          position: absolute;
          z-index: 3;
          left: clamp(22px, 2.6vw, 40px);
          bottom: clamp(26px, 3vw, 44px);
          opacity: 0;
        }
        .aur-story.is-in .aur-story__tag {
          animation: aurStFade 1.2s ease 1.3s both;
        }
        .aur-story__tag i {
          display: block;
          width: 40px;
          height: 1px;
          margin-bottom: 14px;
          background: rgba(246, 239, 232, 0.55);
          transform: scaleX(0);
          transform-origin: left;
        }
        .aur-story.is-in .aur-story__tag i {
          animation: aurStGrowX 1s var(--ease-out) 1.5s both;
        }
        .aur-story__tag p {
          margin: 0;
          font-family: var(--aur-serif), Georgia, serif;
          font-style: italic;
          font-size: clamp(0.95rem, 1.1vw, 1.08rem);
          line-height: 1.4;
          color: rgba(246, 239, 232, 0.9);
        }
        .aur-story__tag p span {
          display: block;
        }

        /* ═══════════════════════════════════════════════════════════════════
           CENTER · COPY
           ═══════════════════════════════════════════════════════════════════ */
        .aur-story__content {
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: clamp(56px, 6vw, 96px) clamp(28px, 3.4vw, 56px);
        }

        .aur-story__eyebrow {
          margin: 0 0 clamp(14px, 1.6vw, 20px);
          font-size: 0.72rem;
          font-weight: 500;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: var(--copper);
        }
        .aur-letter {
          display: inline-block;
          opacity: 0;
        }
        .aur-story.is-in .aur-letter {
          animation: aurStLetter 0.9s var(--ease-expo) both;
        }
        @keyframes aurStLetter {
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

        .aur-story__title {
          display: flex;
          flex-direction: column;
          margin: 0;
          font-family: var(--aur-serif), Georgia, serif;
          font-weight: 400;
          font-size: clamp(2.1rem, 3.1vw, 3.05rem);
          line-height: 1.08;
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
        .aur-story.is-in .aur-line__in {
          animation: aurStRise 1.3s var(--ease-expo) both;
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
        .aur-story.is-in .aur-line__in--accent {
          animation: aurStRise 1.3s var(--ease-expo) both, aurStShimmer 8s ease-in-out 1.8s infinite alternate;
        }
        @keyframes aurStRise {
          from {
            transform: translate3d(0, 115%, 0) rotate(3deg);
          }
          to {
            transform: translate3d(0, 0, 0) rotate(0);
          }
        }
        @keyframes aurStShimmer {
          from {
            background-position: 0% 50%;
          }
          to {
            background-position: 100% 50%;
          }
        }

        .aur-story__body {
          max-width: 46ch;
          margin-top: clamp(20px, 2.2vw, 30px);
        }
        .aur-story__body p {
          margin: 0 0 16px;
          font-size: clamp(0.92rem, 1vw, 1rem);
          font-weight: 300;
          line-height: 1.75;
          color: var(--ink-soft);
          opacity: 0;
        }
        .aur-story.is-in .aur-story__body p {
          animation: aurStFade 1.1s ease both;
        }
        .aur-story__body p:last-child {
          margin-bottom: 0;
        }

        .aur-story__sign {
          display: flex;
          align-items: baseline;
          gap: 18px;
          margin-top: clamp(26px, 2.8vw, 38px);
          opacity: 0;
        }
        .aur-story.is-in .aur-story__sign {
          animation: aurStFade 1.2s ease 0.98s both;
        }
        .aur-story__script {
          font-family: var(--aur-script), cursive;
          font-size: clamp(2rem, 2.9vw, 2.6rem);
          color: var(--ink);
          line-height: 1;
        }
        .aur-story__subcaps {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 0.66rem;
          font-weight: 500;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }

        .aur-story__rule {
          display: block;
          width: 1px;
          height: 40px;
          margin-top: clamp(24px, 2.6vw, 34px);
          background: linear-gradient(to bottom, var(--line), transparent);
          transform-origin: top;
          transform: scaleY(0);
        }
        .aur-story.is-in .aur-story__rule {
          animation: aurStGrowY 1.2s var(--ease-out) 1.2s both;
        }

        .aur-magnet {
          display: inline-block;
          transition: transform 0.7s var(--ease-out);
          will-change: transform;
        }
        .aur-magnet.is-magnet {
          transition-duration: 0.22s;
        }

        .aur-story__scroll {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          margin-top: 16px;
          padding: 0;
          border: 0;
          background: transparent;
          color: var(--ink);
          font: inherit;
          font-size: 0.72rem;
          font-weight: 500;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          cursor: pointer;
          opacity: 0;
        }
        .aur-story.is-in .aur-story__scroll {
          animation: aurStFade 1.2s ease 1.35s both;
        }
        .aur-story__scroll-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: 1px solid rgba(42, 32, 25, 0.4);
          color: var(--ink);
          transition: background 0.35s ease, color 0.35s ease, border-color 0.35s ease, transform 0.45s var(--ease-out);
        }
        .aur-story__scroll-icon svg {
          animation: aurStBob 2.2s ease-in-out infinite;
        }
        @keyframes aurStBob {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(2px);
          }
        }
        .aur-story__scroll:hover .aur-story__scroll-icon {
          background: var(--ink);
          color: var(--cream);
          border-color: var(--ink);
          transform: scale(1.08);
        }

        /* ═══════════════════════════════════════════════════════════════════
           RIGHT · COUNT + DETAIL PHOTOS
           ═══════════════════════════════════════════════════════════════════ */
        .aur-story__side {
          display: flex;
          flex-direction: column;
          padding: clamp(24px, 2.8vw, 40px) clamp(18px, 2vw, 28px) clamp(24px, 2.8vw, 40px) 0;
        }

        .aur-story__count {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: clamp(20px, 2.4vw, 32px);
          font-size: 0.72rem;
          letter-spacing: 0.06em;
          color: var(--ink);
          opacity: 0;
        }
        .aur-story.is-in .aur-story__count {
          animation: aurStFade 1.1s ease 0.6s both;
        }
        .aur-story__count-num {
          font-weight: 500;
        }
        .aur-story__count em {
          font-style: normal;
          opacity: 0.5;
        }
        .aur-story__count > span:last-child {
          opacity: 0.55;
        }
        .aur-story__count i {
          flex: 1 1 auto;
          height: 1px;
          background: var(--line);
          transform: scaleX(0);
          transform-origin: left;
        }
        .aur-story.is-in .aur-story__count i {
          animation: aurStGrowX 1.3s var(--ease-out) 0.75s both;
        }

        .aur-story__thumbs {
          display: flex;
          flex-direction: column;
          gap: clamp(18px, 2vw, 26px);
        }

        .aur-story__thumb {
          margin: 0;
        }
        .aur-story__thumb-frame {
          position: relative;
          display: block;
          height: clamp(150px, 15.5vw, 210px);
          overflow: hidden;
          background: #22190f;
          clip-path: inset(0 0 0 100%);
        }
        .aur-story.is-in .aur-story__thumb-frame {
          animation: aurStWipe 1.4s var(--ease-wipe) calc(var(--i) * 220ms + 0.55s) both;
        }
        .aur-story__thumb-par {
          position: absolute;
          inset: -8%;
          transform: translate3d(
            calc(var(--mx) * -10px),
            calc(var(--my) * -8px + var(--sp) * (14px + var(--i) * 6px)),
            0
          );
          transition: transform 0.9s cubic-bezier(0.2, 0.7, 0.2, 1);
        }
        .aur-story__thumb-kb {
          position: absolute;
          inset: 0;
          transform: scale(1.2);
        }
        .aur-story.is-in .aur-story__thumb-kb {
          animation: aurStKB 2.4s var(--ease-out) calc(var(--i) * 220ms + 0.7s) both;
        }
        .aur-story__thumb-kb img,
        .aur-story__thumb .aur-story__fallback {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scale(1);
          transition: transform 1.2s var(--ease-out);
          -webkit-user-drag: none;
        }
        .aur-story__thumb .aur-story__fallback {
          background:
            linear-gradient(120deg, transparent 32%, rgba(255, 226, 180, 0.14) 46%, transparent 60%),
            radial-gradient(ellipse 80% 55% at 30% 22%, var(--t1, #b89b76), transparent 72%),
            linear-gradient(165deg, var(--t2, #241c15), #14100c);
        }
        .aur-story__thumb-frame:hover .aur-story__thumb-kb img,
        .aur-story__thumb-frame:hover .aur-story__fallback {
          transform: scale(1.08);
        }

        .aur-story__thumb figcaption {
          margin-top: 10px;
          font-family: var(--aur-serif), Georgia, serif;
          font-style: italic;
          font-size: 0.86rem;
          line-height: 1.4;
          color: var(--ink-soft);
          opacity: 0;
        }
        .aur-story.is-in .aur-story__thumb figcaption {
          animation: aurStFade 1.1s ease calc(var(--i) * 220ms + 1s) both;
        }
        .aur-story__thumb figcaption span {
          display: block;
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
        .aur-story a:focus-visible,
        .aur-story button:focus-visible {
          outline: 2px solid var(--copper);
          outline-offset: 4px;
        }
        .aur-story.is-offscreen .aur-story__dust,
        .aur-story.is-offscreen .aur-line__in--accent,
        .aur-story.is-offscreen .aur-story__scroll-icon svg {
          animation-play-state: paused;
        }

        /* ═══════════════════════════════════════════════════════════════════
           RESPONSIVE
           ═══════════════════════════════════════════════════════════════════ */
        @media (max-width: 1180px) {
          .aur-story__grid {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) clamp(130px, 16vw, 180px);
          }
          .aur-story__thumb-frame {
            height: clamp(130px, 17vw, 180px);
          }
        }

        @media (max-width: 980px) {
          .aur-story {
            --media-h: 560px;
          }
          .aur-story__grid {
            grid-template-columns: 1fr;
          }
          .aur-story__side {
            padding: 0 clamp(24px, 6vw, 56px) clamp(56px, 7vw, 84px);
          }
          .aur-story__thumbs {
            flex-direction: row;
          }
          .aur-story__thumb {
            flex: 1;
          }
          .aur-story__thumb-frame {
            height: clamp(180px, 30vw, 260px);
          }
          .aur-story__count {
            margin-bottom: clamp(16px, 3vw, 24px);
          }
        }

        @media (max-width: 620px) {
          .aur-story {
            --media-h: 480px;
          }
          .aur-story__content {
            padding: 48px 24px;
          }
          .aur-story__body {
            max-width: none;
          }
          .aur-story__thumbs {
            flex-direction: column;
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
          .aur-story *,
          .aur-story *::before,
          .aur-story *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
          .aur-story__dust {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}