'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AURELIA · NEWSLETTER  ("Brand Experience" — Enter the world of Aurelia)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Place at: frontend/src/components/NewsletterSection.js
 *  Use:      <NewsletterSection />   (e.g. in src/app/page.js)
 *
 *  A short, minimal banner (well under full viewport height) that pairs a
 *  single atmospheric photo with a newsletter signup — same visual and
 *  animation language as Hero.js / NewArrivalsSection.js / CollectionsSection.js:
 *   • Reveals once when scrolled into view: letter-stagger eyebrow, masked
 *     heading lines, form + tagline fading up in sequence
 *   • Background photo with Ken Burns settle + mouse parallax
 *   • Film grain, soft golden light wash, vignette shading for legibility
 *   • Magnetic submit button, custom cursor ring with labels
 *   • Reduced-motion and touch-device fallbacks
 *
 *  Image
 *   Uses a free Unsplash placeholder for now. Swap the `image` prop for your
 *   own file (e.g. '/images/newsletter/terrace.jpg'). Remote images render
 *   unoptimized, so no next.config.js change is needed.
 *
 *  Props (all optional)
 *   eyebrow, titleLine1, titleLine2 (italic line), description
 *   placeholder, consentLabel, tagline ([line1, line2])
 *   image, imageAlt, imagePosition
 *   onSubmit(email)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState } from 'react';
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

const unsplash = (id, width = 2200) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=80`;

const isRemote = (src) => /^https?:\/\//i.test(src);

/* ═════════════════════════════════════════════════════════════════════════════
   ICONS
   ═════════════════════════════════════════════════════════════════════════════ */

const ArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12h16M14 6l6 6-6 6" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

/* ═════════════════════════════════════════════════════════════════════════════
   HOOKS + SMALL COMPONENTS
   ═════════════════════════════════════════════════════════════════════════════ */

function useMagnetic(strength = 0.32, radius = 46) {
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
   SECTION
   ═════════════════════════════════════════════════════════════════════════════ */

export default function NewsletterSection({
  eyebrow = 'Brand Experience',
  titleLine1 = 'Enter the world of',
  titleLine2 = 'Aurelia',
  description = 'Be the first to know about new arrivals, exclusive offers, and stories from our atelier.',
  placeholder = 'Your email address',
  consentLabel = 'I agree to receive updates and offers from Aurelia.',
  tagline = ['More than just', 'clothes —', "it's a feeling."],
  image = unsplash('photo-1600585152220-90363fe7e115'),
  imageAlt = 'Woman seated on a sunlit stone terrace overlooking the hills',
  imagePosition = '72% 30%',
  onSubmit,
}) {
  const rootRef = useRef(null);
  const magnetSubmit = useMagnetic(0.38, 40);

  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [sent, setSent] = useState(false);
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
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
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
    if (el) {
      el.style.setProperty('--mx', '0');
      el.style.setProperty('--my', '0');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !agreed) return;
    setSent(true);
    if (typeof onSubmit === 'function') onSubmit(email);
  };

  return (
    <section
      ref={rootRef}
      className={`${serif.variable} ${sans.variable} aur-nl ${revealed ? 'is-in' : ''} ${onScreen ? '' : 'is-offscreen'}`}
      aria-label="Newsletter signup"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {/* ── Background photo ─────────────────────────────────────────── */}
      <div className="aur-nl__media" aria-hidden="true">
        <div className="aur-nl__par">
          <div className="aur-nl__kb">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="" style={{ objectPosition: imagePosition }} draggable={false} />
          </div>
        </div>
      </div>
      <div className="aur-nl__shade" />
      <div className="aur-nl__grain" />

      {/* ── Content ──────────────────────────────────────────────────── */}
      <div className="aur-nl__inner">
        <div className="aur-nl__copy">
          <p className="aur-nl__eyebrow">
            <SplitLetters text={eyebrow} start={80} />
          </p>

          <h2 className="aur-nl__title">
            <span className="aur-line">
              <span className="aur-line__in" style={{ animationDelay: '160ms' }}>
                {titleLine1}
              </span>
            </span>
            <span className="aur-line">
              <span className="aur-line__in aur-line__in--accent" style={{ animationDelay: '300ms' }}>
                {titleLine2}
              </span>
            </span>
          </h2>

          <p className="aur-nl__text">{description}</p>

          {sent ? (
            <p className="aur-nl__done">
              <CheckIcon /> Thank you — welcome to Aurelia.
            </p>
          ) : (
            <form className="aur-nl__form" onSubmit={handleSubmit}>
              <label className="aur-nl__field">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={placeholder}
                  aria-label={placeholder}
                />
                <span ref={magnetSubmit} className="aur-magnet">
                  <button type="submit" aria-label="Subscribe" data-cursor="Join">
                    <ArrowRight />
                  </button>
                </span>
              </label>

              <label className="aur-nl__consent">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} required />
                <span>{consentLabel}</span>
              </label>
            </form>
          )}
        </div>

        <div className="aur-nl__tagline">
          <p>
            {tagline.map((l, i) => (
              <span key={i}>{l}</span>
            ))}
          </p>
          <i />
        </div>
      </div>

      <SectionCursor rootRef={rootRef} enabled={revealed} />

      <style jsx global>{`
        /* ═══════════════════════════════════════════════════════════════════
           ROOT — deliberately short: a banner, not another hero
           ═══════════════════════════════════════════════════════════════════ */
        .aur-nl {
          --cream: #f6efe8;
          --blush: #f0dcd2;
          --ink: #211b18;
          --gutter: clamp(22px, 5.6vw, 84px);
          --ease-out: cubic-bezier(0.22, 0.8, 0.2, 1);
          --ease-expo: cubic-bezier(0.19, 1, 0.22, 1);
          --mx: 0;
          --my: 0;
          position: relative;
          width: 100%;
          height: clamp(360px, 42vh, 460px);
          overflow: hidden;
          background: #171310;
          color: var(--cream);
          font-family: var(--aur-sans), system-ui, sans-serif;
          isolation: isolate;
        }
        .aur-nl a,
        .aur-nl button {
          -webkit-tap-highlight-color: transparent;
        }

        /* ═══════════════════════════════════════════════════════════════════
           BACKGROUND PHOTO
           ═══════════════════════════════════════════════════════════════════ */
        .aur-nl__media {
          position: absolute;
          inset: 0;
          z-index: 1;
        }
        .aur-nl__par {
          position: absolute;
          inset: -4%;
          transform: translate3d(calc(var(--mx) * -20px), calc(var(--my) * -12px), 0);
          transition: transform 0.9s cubic-bezier(0.2, 0.7, 0.2, 1);
          will-change: transform;
        }
        .aur-nl__kb {
          position: absolute;
          inset: 0;
          overflow: hidden;
          transform: scale(1.12);
        }
        .aur-nl.is-in .aur-nl__kb {
          animation: aurNlKB 10s cubic-bezier(0.2, 0.6, 0.3, 1) forwards;
        }
        @keyframes aurNlKB {
          from {
            transform: scale(1.16) translate3d(1.2%, 0.6%, 0);
          }
          to {
            transform: scale(1) translate3d(0, 0, 0);
          }
        }
        .aur-nl__kb img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .aur-nl__shade {
          position: absolute;
          inset: 0;
          z-index: 2;
          pointer-events: none;
          background:
            linear-gradient(90deg, rgba(18, 15, 12, 0.92) 0%, rgba(18, 15, 12, 0.7) 32%, rgba(18, 15, 12, 0.18) 58%, rgba(18, 15, 12, 0) 74%),
            linear-gradient(0deg, rgba(18, 15, 12, 0.45) 0%, rgba(18, 15, 12, 0) 30%);
        }

        .aur-nl__grain {
          position: absolute;
          inset: 0;
          z-index: 3;
          pointer-events: none;
          opacity: 0.07;
          mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
          animation: aurNlGrain 1.2s steps(6) infinite;
        }
        @keyframes aurNlGrain {
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

        /* ═══════════════════════════════════════════════════════════════════
           CONTENT
           ═══════════════════════════════════════════════════════════════════ */
        .aur-nl__inner {
          position: relative;
          z-index: 10;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          padding: 0 var(--gutter);
        }

        .aur-nl__copy {
          max-width: 460px;
        }

        .aur-nl__eyebrow {
          margin: 0 0 16px;
          font-size: 0.72rem;
          font-weight: 400;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: rgba(246, 239, 232, 0.88);
        }
        .aur-letter {
          display: inline-block;
          opacity: 0;
        }
        .aur-nl.is-in .aur-letter {
          animation: aurNlLetter 0.9s var(--ease-expo) both;
        }
        @keyframes aurNlLetter {
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

        .aur-nl__title {
          margin: 0;
          font-family: var(--aur-serif), Georgia, serif;
          font-weight: 400;
          font-size: clamp(2rem, 3.2vw, 2.9rem);
          line-height: 1.08;
          letter-spacing: -0.01em;
          color: #fff;
        }
        .aur-line {
          display: block;
          overflow: hidden;
          padding: 0.04em 0.2em 0.12em 0;
          margin-bottom: -0.08em;
        }
        .aur-line__in {
          display: inline-block;
          transform: translate3d(0, 115%, 0) rotate(3deg);
          transform-origin: left bottom;
        }
        .aur-nl.is-in .aur-line__in {
          animation: aurNlRise 1.3s var(--ease-expo) both;
        }
        .aur-line__in--accent {
          font-style: italic;
        }
        @keyframes aurNlRise {
          from {
            transform: translate3d(0, 115%, 0) rotate(3deg);
          }
          to {
            transform: translate3d(0, 0, 0) rotate(0);
          }
        }

        .aur-nl__text {
          margin: 16px 0 0;
          max-width: 40ch;
          font-size: 0.92rem;
          font-weight: 300;
          line-height: 1.6;
          color: rgba(246, 239, 232, 0.86);
          opacity: 0;
        }
        .aur-nl.is-in .aur-nl__text {
          animation: aurNlFade 1.1s ease 0.6s both;
        }
        @keyframes aurNlFade {
          from {
            opacity: 0;
            transform: translate3d(0, 14px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }

        /* ── form ──────────────────────────────────────────────────────── */
        .aur-nl__form {
          margin-top: 26px;
          opacity: 0;
        }
        .aur-nl.is-in .aur-nl__form {
          animation: aurNlFade 1.1s ease 0.82s both;
        }
        .aur-nl__field {
          display: flex;
          align-items: center;
          gap: 14px;
          max-width: 340px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(246, 239, 232, 0.4);
          transition: border-color 0.35s ease;
        }
        .aur-nl__field:focus-within {
          border-color: var(--cream);
        }
        .aur-nl__field input[type='email'] {
          flex: 1;
          min-width: 0;
          border: 0;
          background: transparent;
          color: var(--cream);
          font: inherit;
          font-size: 0.9rem;
          padding: 4px 0;
        }
        .aur-nl__field input[type='email']::placeholder {
          color: rgba(246, 239, 232, 0.55);
        }
        .aur-nl__field input[type='email']:focus {
          outline: none;
        }

        .aur-magnet {
          display: inline-flex;
          transition: transform 0.7s var(--ease-out);
          will-change: transform;
        }
        .aur-magnet.is-magnet {
          transition-duration: 0.22s;
        }
        .aur-nl__field button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          flex-shrink: 0;
          padding: 0;
          border: 1px solid rgba(246, 239, 232, 0.6);
          border-radius: 50%;
          background: transparent;
          color: var(--cream);
          cursor: pointer;
          transition: background 0.35s ease, color 0.35s ease, transform 0.45s var(--ease-out), border-color 0.35s ease;
        }
        .aur-nl__field button:hover {
          background: var(--cream);
          color: var(--ink);
          border-color: var(--cream);
        }
        .aur-nl__field button:active {
          transform: scale(0.92);
        }

        .aur-nl__consent {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin-top: 14px;
          font-size: 0.76rem;
          line-height: 1.4;
          color: rgba(246, 239, 232, 0.68);
          cursor: pointer;
        }
        .aur-nl__consent input {
          margin-top: 2px;
          width: 13px;
          height: 13px;
          accent-color: var(--blush);
          flex-shrink: 0;
        }

        .aur-nl__done {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin: 26px 0 0;
          font-size: 0.92rem;
          color: var(--cream);
          opacity: 0;
          animation: aurNlFade 0.8s ease both;
        }
        .aur-nl__done svg {
          flex-shrink: 0;
          color: #cfe3d2;
        }

        /* ── right tagline ─────────────────────────────────────────────── */
        .aur-nl__tagline {
          flex-shrink: 0;
          text-align: right;
          opacity: 0;
        }
        .aur-nl.is-in .aur-nl__tagline {
          animation: aurNlFade 1.2s ease 1s both;
        }
        .aur-nl__tagline p {
          margin: 0;
          font-family: var(--aur-serif), Georgia, serif;
          font-style: italic;
          font-size: 1.02rem;
          line-height: 1.35;
          color: rgba(246, 239, 232, 0.82);
        }
        .aur-nl__tagline p span {
          display: block;
        }
        .aur-nl__tagline i {
          display: inline-block;
          width: 30px;
          height: 1px;
          margin-top: 14px;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5));
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
          width: 40px;
          height: 40px;
          margin: -20px 0 0 -20px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.55);
          background: rgba(255, 255, 255, 0);
          transition: transform 0.5s var(--ease-out), background 0.4s ease, border-color 0.4s ease;
        }
        .aur-cursor.is-grow::before {
          transform: scale(1.5);
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.85);
        }
        .aur-cursor.has-label::before {
          transform: scale(1.85);
          background: rgba(20, 17, 14, 0.4);
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
          color: #fff;
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
          background: #fff;
          transition: transform 0.3s ease;
        }
        .aur-cursor-dot.is-grow::before {
          transform: scale(0);
        }

        /* ═══════════════════════════════════════════════════════════════════
           FOCUS + PAUSE
           ═══════════════════════════════════════════════════════════════════ */
        .aur-nl a:focus-visible,
        .aur-nl button:focus-visible,
        .aur-nl input:focus-visible {
          outline: 2px solid var(--blush);
          outline-offset: 3px;
        }
        .aur-nl.is-offscreen .aur-nl__grain {
          animation-play-state: paused;
        }

        /* ═══════════════════════════════════════════════════════════════════
           RESPONSIVE
           ═══════════════════════════════════════════════════════════════════ */
        @media (max-width: 900px) {
          .aur-nl {
            height: auto;
            min-height: 480px;
          }
          .aur-nl__inner {
            flex-direction: column;
            align-items: flex-start;
            justify-content: center;
            gap: 28px;
            padding: 64px var(--gutter);
          }
          .aur-nl__shade {
            background:
              linear-gradient(0deg, rgba(18, 15, 12, 0.94) 0%, rgba(18, 15, 12, 0.6) 40%, rgba(18, 15, 12, 0.2) 70%);
          }
          .aur-nl__tagline {
            text-align: left;
          }
        }

        @media (max-width: 480px) {
          .aur-nl__title {
            font-size: 2rem;
          }
          .aur-nl__field {
            max-width: 100%;
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
          .aur-nl *,
          .aur-nl *::before,
          .aur-nl *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
          .aur-nl__grain {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}