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
import { STORE, whatsappHref } from '@/lib/store';
import { API_URL } from '@/lib/imageUrl';
import './styles/Footer.css';

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
      { label: 'FAQ', href: '/faq' },
      { label: 'Size Guide', href: '/size-guide' },
      { label: 'Care Guide', href: '/care' },
      { label: 'Wishlist', href: '/wishlist' },
    ],
  },
];

// Socials come from src/lib/store.js. Any entry whose value is empty is hidden.
// (The old personal email / WhatsApp / LinkedIn / GitHub links are gone.)
const DEFAULT_SOCIALS = [
  STORE.social.instagram && {
    label: 'Instagram',
    href: STORE.social.instagram,
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <path d="M17.5 6.5v.01" />
      </svg>
    ),
  },
  STORE.whatsapp && {
    label: 'WhatsApp',
    href: whatsappHref(),
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
      </svg>
    ),
  },
  STORE.email && {
    label: 'Email',
    href: `mailto:${STORE.email}`,
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
  },
].filter(Boolean); // drop the ones that are hidden

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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || submitting) return;
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
      if (typeof onSubscribe === 'function') onSubscribe(email);
    } catch (err) {
      setError(err instanceof TypeError ? 'Could not reach the server. Please try again.' : err.message);
    } finally {
      setSubmitting(false);
    }
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
                <button type="submit" aria-label="Subscribe" data-cursor="Join" disabled={submitting}>
                  <ArrowRight />
                </button>
              </Magnetic>
            </form>
          )}
          {error && !sent && (
            <p className="aur-ft__error" role="alert">
              {error}
            </p>
          )}
          {!sent && (
            <p className="aur-ft__fine">
              By subscribing you agree to our <Link href="/privacy">Privacy Policy</Link>. You can unsubscribe at any time.
            </p>
          )}
        </div>
      </div>

      {/* ── Bottom bar ────────────────────────────────────────────────── */}
      <div className="aur-ft__bottom">
        <p>{copyright}</p>
        <nav className="aur-ft__legal" aria-label="Legal">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/shipping">Shipping</Link>
        </nav>
        <Link href="/admin/login" className="aur-ft__admin" data-cursor="Admin">
          Admin
        </Link>
        <Magnetic strength={0.4} radius={26}>
          <button type="button" className="aur-ft__top-btn" onClick={scrollTop} data-cursor="Top">
            <span>Back to top</span>
            <ArrowUp />
          </button>
        </Magnetic>
      </div>

    </footer>
  );
}