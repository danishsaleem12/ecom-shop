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
import Link from 'next/link';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import { API_URL } from '@/lib/imageUrl';
import './styles/Newslettersection.css';

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
  consentLabel = (
    <>
      I agree to receive updates and offers from Aurelia and accept the{' '}
      <Link href="/privacy" target="_blank" rel="noopener">
        Privacy Policy
      </Link>
      . I can unsubscribe at any time.
    </>
  ),
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !agreed || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Could not subscribe. Please try again.');
      setSent(true);
      if (typeof onSubmit === 'function') onSubmit(email);
    } catch (err) {
      setError(err instanceof TypeError ? 'Could not reach the server. Please try again.' : err.message);
    } finally {
      setSubmitting(false);
    }
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
                  <button type="submit" aria-label="Subscribe" data-cursor="Join" disabled={submitting}>
                    <ArrowRight />
                  </button>
                </span>
              </label>

              <label className="aur-nl__consent">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} required />
                <span>{consentLabel}</span>
              </label>
              {error && (
                <p className="aur-nl__error" role="alert">
                  {error}
                </p>
              )}
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

      {/* Rules whose class names are defined differently in other sections stay here: see src/components/styles/README.md */}
      <style jsx global>{`
        .aur-line {
          display: block;
          overflow: hidden;
          padding: 0.04em 0.2em 0.12em 0;
          margin-bottom: -0.08em;
        }
        .aur-line__in--accent {
          font-style: italic;
        }

        .aur-magnet {
          display: inline-flex;
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