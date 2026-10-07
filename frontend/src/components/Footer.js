'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AURELIA · FOOTER
 * ─────────────────────────────────────────────────────────────────────────────
 *  Place at: frontend/src/components/Footer.js
 *  Use:      <Footer />   (e.g. at the bottom of src/app/layout.js)
 *
 *  Same visual/animation language as Hero.js / NewArrivalsSection.js /
 *  CollectionsSection.js / NewsletterSection.js:
 *   • Sand paper backdrop with film grain, matching NewArrivalsSection
 *   • Reveals once on scroll into view: brand mark + columns fade up in a
 *     light stagger, hairline rule draws in
 *   • Magnetic newsletter submit button, underline link hovers, magnetic
 *     "Back to top" arrow
 *   • Reduced-motion and touch-device fallbacks
 *
 *  Props (all optional — sensible Aurelia defaults are filled in)
 *   logo, tagline, socials: [{ label, href, icon }]
 *   columns: [{ heading, links: [{ label, href }] }]
 *   newsletter: { heading, description, placeholder }
 *   copyright
 *   onSubscribe(email)
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
   DATA
   ═════════════════════════════════════════════════════════════════════════════ */

const DEFAULT_COLUMNS = [
  {
    heading: 'Shop',
    links: [
      { label: 'New Arrivals', href: '/shop?sort=new' },
      { label: 'Dresses', href: '/shop?category=dresses' },
      { label: 'Shirts & Tops', href: '/shop?category=tops' },
      { label: 'Trousers', href: '/shop?category=trousers' },
      { label: 'Knitwear', href: '/shop?category=knitwear' },
      { label: 'Outerwear', href: '/shop?category=outerwear' },
    ],
  },
  {
    heading: 'Collections',
    links: [
      { label: 'Spring / Summer', href: '/collections/spring-summer' },
      { label: 'Resort Edit', href: '/collections/resort' },
      { label: 'Linen Season', href: '/collections/linen' },
      { label: 'Autumn / Winter', href: '/collections/autumn-winter' },
      { label: 'Evening', href: '/collections/evening' },
      { label: 'Wedding Guest', href: '/collections/wedding-guest' },
    ],
  },
  {
    heading: 'Support',
    links: [
      { label: 'About Us', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'Track an Order', href: '/track-order' },
      { label: 'Help & Returns', href: '/help' },
      { label: 'Wishlist', href: '/wishlist' },
    ],
  },
];

// CHANGED (socials): your real contact details
const EMAIL = 'mdanishsaleem52@gmail.com';
const WHATSAPP_NUMBER = '923186039286'; // country code + number, no "+" or spaces
const WHATSAPP_TEXT = "Hi Danish! I found your website and I'd like to talk about a project.";
const LINKEDIN_URL = 'https://www.linkedin.com/in/m-danish-489a8b259';
const GITHUB_URL = 'https://github.com/danishsaleem12';

// CHANGED (socials): was Instagram / Pinterest / Facebook / X. Icons use the
// same 15px outline style as before, so the look of the footer is unchanged.
const DEFAULT_SOCIALS = [
  {
    label: 'LinkedIn',
    href: LINKEDIN_URL,
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M8 10.5V16" />
        <path d="M8 7.8v.01" />
        <path d="M12 16v-5.5" />
        <path d="M12 13c0-1.6 1-2.6 2.4-2.6s2.4 1 2.4 2.6V16" />
      </svg>
    ),
  },
  {
    label: 'GitHub',
    href: GITHUB_URL,
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
        <path d="M9 18c-4.51 2-5-2-7-2" />
      </svg>
    ),
  },
  {
    label: 'WhatsApp',
    href: `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_TEXT)}`,
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
      </svg>
    ),
  },
  {
    label: 'Email',
    href: `mailto:${EMAIL}?subject=${encodeURIComponent('Project inquiry from your website')}`,
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
  },
];

/* ═════════════════════════════════════════════════════════════════════════════
   ICONS
   ═════════════════════════════════════════════════════════════════════════════ */

const ArrowRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12h16M14 6l6 6-6 6" />
  </svg>
);

const ArrowUp = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 19V5M6 11l6-6 6 6" />
  </svg>
);

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

/* ═════════════════════════════════════════════════════════════════════════════
   HOOKS + SMALL COMPONENTS
   ═════════════════════════════════════════════════════════════════════════════ */

function useMagnetic(strength = 0.35, radius = 40) {
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

function Magnetic({ children, strength = 0.35, radius = 40, className = '' }) {
  const ref = useMagnetic(strength, radius);
  return (
    <span ref={ref} className={`aur-ft-magnet ${className}`}>
      {children}
    </span>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   FOOTER
   ═════════════════════════════════════════════════════════════════════════════ */

export default function Footer({
  logo = 'Aurelia',
  tagline = ['Timeless pieces,', 'crafted for a more', 'beautiful tomorrow.'],
  socials = DEFAULT_SOCIALS,
  columns = DEFAULT_COLUMNS,
  newsletter = {
    heading: 'Join Our Newsletter',
    description: 'Get exclusive updates, new arrivals and special offers.',
    placeholder: 'Your email address',
  },
  copyright = `© ${new Date().getFullYear()} Aurelia. All rights reserved.`,
  onSubscribe,
}) {
  const rootRef = useRef(null);
  const magnetSubmit = useMagnetic(0.4, 32);
  const magnetTop = useMagnetic(0.4, 30);

  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
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
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    setSent(true);
    if (typeof onSubscribe === 'function') onSubscribe(email);
  };

  const scrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer ref={rootRef} className={`${serif.variable} ${sans.variable} aur-ft ${revealed ? 'is-in' : ''}`}>
      <div className="aur-ft__grain" aria-hidden="true" />

      <div className="aur-ft__top">
        {/* ── Brand ───────────────────────────────────────────────────── */}
        <div className="aur-ft__brand">
          <span className="aur-ft__logo">{logo}</span>
          <p className="aur-ft__tagline">
            {tagline.map((l, i) => (
              <span key={i}>{l}</span>
            ))}
          </p>
          <i className="aur-ft__rule" />
          <div className="aur-ft__socials">
            {socials.map((s) => {
              // CHANGED (socials): web links open in a new tab; the email link
              // (mailto:) opens the mail app without leaving a blank tab behind.
              const isWeb = s.href.startsWith('http');
              return (
                <a
                  key={s.label}
                  href={s.href}
                  aria-label={s.label}
                  target={isWeb ? '_blank' : undefined}
                  rel={isWeb ? 'noreferrer noopener' : undefined}
                  data-cursor={s.label}
                >
                  {s.icon}
                </a>
              );
            })}
          </div>
        </div>

        {/* ── Link columns ────────────────────────────────────────────── */}
        {columns.map((col, i) => (
          <nav className="aur-ft__col" key={col.heading} style={{ '--i': i }} aria-label={col.heading}>
            <p className="aur-ft__heading">{col.heading}</p>
            <ul>
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        {/* ── Newsletter ──────────────────────────────────────────────── */}
        <div className="aur-ft__news" style={{ '--i': columns.length }}>
          <p className="aur-ft__heading">{newsletter.heading}</p>
          <p className="aur-ft__news-desc">{newsletter.description}</p>

          {sent ? (
            <p className="aur-ft__done">
              <CheckIcon /> You&apos;re on the list.
            </p>
          ) : (
            <form className="aur-ft__field" onSubmit={handleSubmit}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={newsletter.placeholder}
                aria-label={newsletter.placeholder}
              />
              <Magnetic strength={0.4} radius={28}>
                <button type="submit" aria-label="Subscribe" data-cursor="Join">
                  <ArrowRight />
                </button>
              </Magnetic>
            </form>
          )}
        </div>
      </div>

      {/* ── Bottom bar ────────────────────────────────────────────────── */}
      <div className="aur-ft__bottom">
        <p>{copyright}</p>
        <Magnetic strength={0.4} radius={26}>
          <button type="button" className="aur-ft__top-btn" onClick={scrollTop} data-cursor="Top">
            <span>Back to top</span>
            <ArrowUp />
          </button>
        </Magnetic>
      </div>

      <style jsx global>{`
        /* ═══════════════════════════════════════════════════════════════════
           ROOT
           ═══════════════════════════════════════════════════════════════════ */
        .aur-ft {
          --sand-1: #ddd0b8;
          --sand-2: #d0c1a3;
          --ink: #241c14;
          --ink-soft: rgba(36, 28, 20, 0.68);
          --ink-faint: rgba(36, 28, 20, 0.5);
          --line: rgba(36, 28, 20, 0.22);
          --copper: #a56a41;
          --gutter: clamp(22px, 4.6vw, 84px);
          --ease-out: cubic-bezier(0.22, 0.8, 0.2, 1);
          --ease-expo: cubic-bezier(0.19, 1, 0.22, 1);
          position: relative;
          overflow: hidden;
          isolation: isolate;
          color: var(--ink);
          font-family: var(--aur-sans), system-ui, sans-serif;
          background: linear-gradient(165deg, var(--sand-1) 0%, var(--sand-2) 100%);
          padding: clamp(44px, 5vw, 72px) var(--gutter) 0;
        }
        .aur-ft a,
        .aur-ft button {
          -webkit-tap-highlight-color: transparent;
        }

        .aur-ft__grain {
          position: absolute;
          inset: -10%;
          z-index: 0;
          pointer-events: none;
          opacity: 0.12;
          mix-blend-mode: multiply;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
          animation: aurFtGrain 1.2s steps(6) infinite;
        }
        @keyframes aurFtGrain {
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
           TOP GRID
           ═══════════════════════════════════════════════════════════════════ */
        .aur-ft__top {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: 1.5fr 1fr 1fr 1fr 1.3fr;
          gap: clamp(28px, 3.4vw, 48px);
          padding-bottom: clamp(40px, 4.4vw, 60px);
        }

        /* ── brand ─────────────────────────────────────────────────────── */
        .aur-ft__brand {
          opacity: 0;
        }
        .aur-ft.is-in .aur-ft__brand {
          animation: aurFtFade 1s ease 0.05s both;
        }
        .aur-ft__logo {
          display: inline-block;
          font-family: var(--aur-serif), Georgia, serif;
          font-size: clamp(1.7rem, 2.2vw, 2.1rem);
          font-weight: 400;
          letter-spacing: 0.01em;
          color: var(--ink);
        }
        .aur-ft__tagline {
          margin: 16px 0 0;
          max-width: 22ch;
          font-family: var(--aur-serif), Georgia, serif;
          font-style: italic;
          font-size: 0.98rem;
          line-height: 1.45;
          color: var(--ink-soft);
        }
        .aur-ft__tagline span {
          display: block;
        }
        .aur-ft__rule {
          display: block;
          width: 30px;
          height: 1px;
          margin: 20px 0;
          background: var(--line);
          transform: scaleX(0);
          transform-origin: left;
        }
        .aur-ft.is-in .aur-ft__rule {
          animation: aurFtGrowX 1s var(--ease-out) 0.4s both;
        }
        .aur-ft__socials {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .aur-ft__socials a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid var(--line);
          color: var(--ink);
          transition: background 0.35s ease, color 0.35s ease, border-color 0.35s ease, transform 0.45s var(--ease-out);
        }
        .aur-ft__socials a:hover {
          background: var(--ink);
          color: var(--sand-1);
          border-color: var(--ink);
          transform: translateY(-2px);
        }

        /* ── link columns ──────────────────────────────────────────────── */
        .aur-ft__col {
          opacity: 0;
        }
        .aur-ft.is-in .aur-ft__col {
          animation: aurFtFade 1s ease calc(var(--i) * 90ms + 0.15s) both;
        }
        .aur-ft__heading {
          margin: 0 0 18px;
          font-size: 0.68rem;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--ink);
        }
        .aur-ft__col ul {
          margin: 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .aur-ft__col a {
          position: relative;
          display: inline-block;
          font-size: 0.86rem;
          color: var(--ink-soft);
          text-decoration: none;
          background: linear-gradient(currentColor, currentColor) 0 100% / 0 1px no-repeat;
          transition: background-size 0.45s var(--ease-out), color 0.3s ease;
        }
        .aur-ft__col a:hover {
          color: var(--ink);
          background-size: 100% 1px;
        }

        /* ── newsletter ────────────────────────────────────────────────── */
        .aur-ft__news {
          opacity: 0;
        }
        .aur-ft.is-in .aur-ft__news {
          animation: aurFtFade 1s ease calc(var(--i) * 90ms + 0.15s) both;
        }
        .aur-ft__news-desc {
          margin: 0 0 20px;
          max-width: 26ch;
          font-size: 0.86rem;
          line-height: 1.55;
          color: var(--ink-soft);
        }
        .aur-ft__field {
          display: flex;
          align-items: center;
          gap: 12px;
          max-width: 260px;
          padding-bottom: 9px;
          border-bottom: 1px solid var(--line);
          transition: border-color 0.35s ease;
        }
        .aur-ft__field:focus-within {
          border-color: var(--ink);
        }
        .aur-ft__field input {
          flex: 1;
          min-width: 0;
          border: 0;
          background: transparent;
          color: var(--ink);
          font: inherit;
          font-size: 0.86rem;
          padding: 3px 0;
        }
        .aur-ft__field input::placeholder {
          color: var(--ink-faint);
        }
        .aur-ft__field input:focus {
          outline: none;
        }
        .aur-ft-magnet {
          display: inline-flex;
          transition: transform 0.7s var(--ease-out);
          will-change: transform;
        }
        .aur-ft-magnet.is-magnet {
          transition-duration: 0.22s;
        }
        .aur-ft__field button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          flex-shrink: 0;
          padding: 0;
          border-radius: 50%;
          border: 1px solid var(--ink);
          background: transparent;
          color: var(--ink);
          cursor: pointer;
          transition: background 0.35s ease, color 0.35s ease, transform 0.4s var(--ease-out);
        }
        .aur-ft__field button:hover {
          background: var(--ink);
          color: var(--sand-1);
        }
        .aur-ft__done {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin: 0;
          font-size: 0.86rem;
          color: var(--ink);
        }
        .aur-ft__done svg {
          color: #4c6b45;
          flex-shrink: 0;
        }

        /* ═══════════════════════════════════════════════════════════════════
           BOTTOM BAR
           ═══════════════════════════════════════════════════════════════════ */
        .aur-ft__bottom {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: clamp(18px, 2vw, 24px) 0;
          border-top: 1px solid var(--line);
          opacity: 0;
        }
        .aur-ft.is-in .aur-ft__bottom {
          animation: aurFtFade 1s ease 0.5s both;
        }
        .aur-ft__bottom p {
          margin: 0;
          font-size: 0.78rem;
          color: var(--ink-faint);
        }
        .aur-ft__top-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 0;
          background: transparent;
          color: var(--ink-soft);
          font: inherit;
          font-size: 0.78rem;
          cursor: pointer;
          transition: color 0.3s ease;
        }
        .aur-ft__top-btn:hover {
          color: var(--ink);
        }
        .aur-ft__top-btn svg {
          transition: transform 0.4s var(--ease-out);
        }
        .aur-ft__top-btn:hover svg {
          transform: translateY(-2px);
        }

        /* ═══════════════════════════════════════════════════════════════════
           FOCUS
           ═══════════════════════════════════════════════════════════════════ */
        .aur-ft a:focus-visible,
        .aur-ft button:focus-visible,
        .aur-ft input:focus-visible {
          outline: 2px solid var(--copper);
          outline-offset: 3px;
        }

        /* ═══════════════════════════════════════════════════════════════════
           RESPONSIVE
           ═══════════════════════════════════════════════════════════════════ */
        @media (max-width: 1080px) {
          .aur-ft__top {
            grid-template-columns: 1fr 1fr 1fr;
            row-gap: 40px;
          }
          .aur-ft__brand {
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 640px) {
          .aur-ft__top {
            grid-template-columns: 1fr 1fr;
          }
          .aur-ft__news {
            grid-column: 1 / -1;
          }
          .aur-ft__bottom {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
        }

        @media (max-width: 420px) {
          .aur-ft__top {
            grid-template-columns: 1fr;
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           REDUCED MOTION
           ═══════════════════════════════════════════════════════════════════ */
        @media (prefers-reduced-motion: reduce) {
          .aur-ft *,
          .aur-ft *::before,
          .aur-ft *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
          .aur-ft__grain {
            display: none;
          }
        }
      `}</style>
    </footer>
  );
}