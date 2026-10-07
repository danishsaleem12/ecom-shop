'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AURELIA · NAVBAR
 * ─────────────────────────────────────────────────────────────────────────────
 *  Next.js (App Router) · plain JavaScript · no extra packages
 *
 *  What's inside
 *   • Transparent-to-glass bar that hides on scroll down and returns on scroll up
 *   • Sliding link indicator that follows the cursor and rests on the active page
 *   • Full-width mega menus (Shop, Collections) with hover intent and image cards
 *   • Full-screen search with live results, keyboard navigation, recent searches
 *     (press "/" or Ctrl/Cmd + K anywhere)
 *   • Slide-in bag drawer: quantity steppers, free-shipping progress, empty state
 *   • Account popover, wishlist and bag badges that bump when the count changes
 *   • Optional rotating announcement bar
 *   • Page scroll-progress line, animated logo, magnetic icon buttons
 *   • Mobile menu with circular reveal and accordion sub-menus
 *   • Focus trapping, Escape to close, scroll locking, reduced-motion support
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *  Cart is wired directly to CartContext (useCart()) — cartItems, quantity
 *  changes, and remove all come from/go to the real cart automatically.
 *  A page can still override the badge number with the `cartCount` prop
 *  if it ever needs to, but nothing has to pass cart items in manually
 *  anymore.
 *
 *  Auth is wired directly to AuthContext (useAuth()) — the account popover
 *  shows "Sign in / Create account" when signed out, or the person's name
 *  with "Sign out" once they're signed in. There's no `user` or `onSignOut`
 *  prop anymore; both come from AuthContext automatically.
 *
 *  Props
 *   cartCount            optional override for the badge (defaults to useCart().count)
 *   wishlistCount        number
 *   transparent          true = floats over the hero, false = always solid
 *   showAnnouncement     show the rotating announcement bar above the nav
 *   announcements        array of strings for that bar
 *   products             [{ id, name, category, price, href, hue }] used by live search
 *   freeShippingThreshold number (default 150)
 *   currency             string (default 'Rs ')
 *   onSearch(query)      optional; if omitted the router goes to /shop?search=
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { imageSrc } from '@/lib/imageUrl';

/* ═════════════════════════════════════════════════════════════════════════════
   FONTS
   ═════════════════════════════════════════════════════════════════════════════ */

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

/** Free Unsplash placeholders. Swap for your own images later. */
const unsplash = (id, width = 900) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=75`;

const NAV_LINKS = [
  { label: 'Home', href: '/' },
  {
    label: 'Shop',
    href: '/shop',
    mega: {
      columns: [
        {
          title: 'Shop by category',
          items: [
            { label: 'New arrivals', href: '/shop?sort=new', badge: 'New' },
            { label: 'Dresses', href: '/shop?category=dresses' },
            { label: 'Shirts & tops', href: '/shop?category=tops' },
            { label: 'Trousers', href: '/shop?category=trousers' },
            { label: 'Knitwear', href: '/shop?category=knitwear' },
            { label: 'Outerwear', href: '/shop?category=outerwear' },
          ],
        },
        {
          title: 'Accessories',
          items: [
            { label: 'Bags', href: '/shop?category=bags' },
            { label: 'Shoes', href: '/shop?category=shoes' },
            { label: 'Jewellery', href: '/shop?category=jewellery' },
            { label: 'Scarves', href: '/shop?category=scarves' },
            { label: 'Gift cards', href: '/gift-cards' },
          ],
        },
      ],
      cards: [
        {
          kicker: 'Just landed',
          title: 'New arrivals',
          href: '/shop?sort=new',
          image: unsplash('photo-1562636714-adbfdd55959d'),
        },
        {
          kicker: 'Best loved',
          title: 'The summer dress edit',
          href: '/shop?category=dresses',
          image: unsplash('photo-1659297949927-06fa02629af0'),
        },
      ],
    },
  },
  {
    label: 'Collections',
    href: '/collections',
    mega: {
      columns: [
        {
          title: 'Seasonal',
          items: [
            { label: 'Spring Summer', href: '/collections/spring-summer', badge: 'Now' },
            { label: 'Resort edit', href: '/collections/resort' },
            { label: 'Linen season', href: '/collections/linen' },
            { label: 'Autumn Winter', href: '/collections/autumn-winter' },
          ],
        },
        {
          title: 'Occasions',
          items: [
            { label: 'Evening', href: '/collections/evening' },
            { label: 'Wedding guest', href: '/collections/wedding-guest' },
            { label: 'Travel', href: '/collections/travel' },
            { label: 'Everyday essentials', href: '/collections/essentials' },
          ],
        },
      ],
      cards: [
        {
          kicker: 'Spring Summer',
          title: 'Sun-washed neutrals',
          href: '/collections/spring-summer',
          image: unsplash('photo-1625158244856-e5e20f733c1f'),
        },
        {
          kicker: 'After dark',
          title: 'The evening collection',
          href: '/collections/evening',
          image: unsplash('photo-1677537947200-c0c34db22a95'),
        },
      ],
    },
  },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

const DEFAULT_ANNOUNCEMENTS = [
  'Complimentary shipping on orders over Rs 15,000',
  'New season has arrived: shop Spring Summer',
  'Free returns within 30 days',
];

/** Used by live search until you pass your own `products` prop. */
const DEFAULT_PRODUCTS = [
  { id: 'p1', name: 'Relaxed Linen Shirt', category: 'Shirts & tops', price: 9600, href: '/shop/relaxed-linen-shirt', hue: 32 },
  { id: 'p2', name: 'Wide-Leg Linen Trousers', category: 'Trousers', price: 14800, href: '/shop/wide-leg-linen-trousers', hue: 40 },
  { id: 'p3', name: 'Tuscan Leather Satchel', category: 'Bags', price: 32000, href: '/shop/tuscan-leather-satchel', hue: 22 },
  { id: 'p4', name: 'Everyday Linen Dress', category: 'Dresses', price: 15800, href: '/shop/everyday-linen-dress', hue: 36 },
  { id: 'p5', name: 'Silk Slip Dress', category: 'Dresses', price: 21000, href: '/shop/silk-slip-dress', hue: 12 },
  { id: 'p6', name: 'Woven Straw Hat', category: 'Accessories', price: 7200, href: '/shop/woven-straw-hat', hue: 44 },
  { id: 'p7', name: 'Leather Strap Sandals', category: 'Shoes', price: 13400, href: '/shop/leather-strap-sandals', hue: 26 },
  { id: 'p8', name: 'Cashmere Wrap Scarf', category: 'Scarves', price: 11800, href: '/shop/cashmere-wrap-scarf', hue: 18 },
  { id: 'p9', name: 'Pearl Drop Earrings', category: 'Jewellery', price: 6400, href: '/shop/pearl-drop-earrings', hue: 48 },
  { id: 'p10', name: 'Linen Column Dress', category: 'Dresses', price: 18400, href: '/shop/linen-column-dress', hue: 30 },
  { id: 'p11', name: 'Cotton Poplin Shirt', category: 'Shirts & tops', price: 8800, href: '/shop/cotton-poplin-shirt', hue: 210 },
  { id: 'p12', name: 'Structured Linen Blazer', category: 'Outerwear', price: 23600, href: '/shop/structured-linen-blazer', hue: 28 },
];

const TRENDING = ['Linen trousers', 'Leather bag', 'Silk dress', 'Straw hat', 'Sandals'];
const RECENT_KEY = 'aurelia-recent-searches';

const swatch = (hue) => `linear-gradient(135deg, hsl(${hue} 38% 82%), hsl(${hue} 30% 50%))`;

/* ═════════════════════════════════════════════════════════════════════════════
   ICONS
   ═════════════════════════════════════════════════════════════════════════════ */

const Icon = ({ children, size = 22, stroke = 1.4 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const SearchIcon = (p) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.6-3.6" />
  </Icon>
);
const HeartIcon = (p) => (
  <Icon {...p}>
    <path d="M12 20.5s-7.5-4.6-9.2-9.4C1.7 7.8 3.6 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.4 0 5.3 3.3 4.2 6.6-1.7 4.8-9.2 9.4-9.2 9.4Z" />
  </Icon>
);
const UserIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 20.5c1-4 4.2-6 8-6s7 2 8 6" />
  </Icon>
);
const BagIcon = (p) => (
  <Icon {...p}>
    <path d="M5 8h14l-1 12H6L5 8Z" />
    <path d="M9 8V6.5A3 3 0 0 1 12 3.5a3 3 0 0 1 3 3V8" />
  </Icon>
);
const CloseIcon = (p) => (
  <Icon {...p}>
    <path d="M5 5l14 14M19 5 5 19" />
  </Icon>
);
const ArrowIcon = (p) => (
  <Icon size={16} {...p}>
    <path d="M4 12h16M14 6l6 6-6 6" />
  </Icon>
);
const ChevronIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
    <path d="m2 3.5 3 3 3-3" />
  </svg>
);
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true">
    <path d="M7 2v10M2 7h10" />
  </svg>
);
const MinusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden="true">
    <path d="M2 7h10" />
  </svg>
);
const ClockIcon = () => (
  <Icon size={16}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Icon>
);
const TruckIcon = () => (
  <Icon size={18}>
    <path d="M2 6h11v10H2zM13 10h4l3 3v3h-7" />
    <circle cx="7" cy="17.5" r="1.7" />
    <circle cx="16.5" cy="17.5" r="1.7" />
  </Icon>
);

/* ═════════════════════════════════════════════════════════════════════════════
   HOOKS
   ═════════════════════════════════════════════════════════════════════════════ */

/** Locks page scroll while an overlay is open. */
function useScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}

/** Traps Tab / Shift+Tab inside a container while it is active. */
function useFocusTrap(ref, active) {
  useEffect(() => {
    if (!active || !ref.current) return undefined;
    const el = ref.current;
    const selector = 'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])';

    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const focusable = Array.from(el.querySelectorAll(selector));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [ref, active]);
}

/** Gives focus back to whatever opened an overlay once it closes. */
function useReturnFocus(active) {
  const opener = useRef(null);
  useEffect(() => {
    if (active) {
      opener.current = document.activeElement;
      return undefined;
    }
    const node = opener.current;
    if (node && typeof node.focus === 'function') {
      node.focus({ preventScroll: true });
    }
    opener.current = null;
    return undefined;
  }, [active]);
}

/** Calls `handler` when a pointer goes down outside of `ref`. */
function useClickOutside(ref, active, handler) {
  useEffect(() => {
    if (!active) return undefined;
    const onDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) handler(e);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [ref, active, handler]);
}

/** Buttons lean toward the cursor when it comes close. */
function useMagnetic(strength = 0.35, radius = 46) {
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

/* ═════════════════════════════════════════════════════════════════════════════
   SMALL COMPONENTS
   ═════════════════════════════════════════════════════════════════════════════ */

/** Wraps an icon button so it can be magnetic without fighting its hover styles. */
function MagnetIcon({ children }) {
  const ref = useMagnetic();
  return (
    <span ref={ref} className="aur-magnet">
      {children}
    </span>
  );
}

/** Animated wordmark. Letters drop in once, then ripple on hover. */
function Logo({ small }) {
  return (
    <Link href="/" className={`aur-logo ${small ? 'is-small' : ''}`} aria-label="Aurelia home">
      <span className="aur-logo__letters" aria-hidden="true">
        {'Aurelia'.split('').map((ch, i) => (
          <span key={i} style={{ '--i': i }}>
            {ch}
          </span>
        ))}
      </span>
    </Link>
  );
}

/** Rotating announcement bar. */
function Announcement({ messages, onClose }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (messages.length < 2) return undefined;
    const id = setInterval(() => setIndex((i) => (i + 1) % messages.length), 4200);
    return () => clearInterval(id);
  }, [messages.length]);

  return (
    <div className="aur-announce" role="region" aria-label="Announcements">
      <div className="aur-announce__inner">
        <span className="aur-announce__icon">
          <TruckIcon />
        </span>
        <div className="aur-announce__track" aria-live="polite">
          {messages.map((m, i) => (
            <p key={m} className={i === index ? 'is-active' : i === (index - 1 + messages.length) % messages.length ? 'is-prev' : ''}>
              {m}
            </p>
          ))}
        </div>
        <button type="button" className="aur-announce__close" onClick={onClose} aria-label="Dismiss announcement">
          <CloseIcon size={14} />
        </button>
      </div>
    </div>
  );
}

/** One mega menu panel. */
function MegaPanel({ link, open }) {
  const tab = open ? 0 : -1;
  return (
    <div className={`aur-mega ${open ? 'is-open' : ''}`} aria-hidden={!open} data-mega={link.label}>
      <div className="aur-mega__inner">
        <div className="aur-mega__cols">
          {link.mega.columns.map((col, ci) => (
            <div className="aur-mega__col" key={col.title}>
              <h4>{col.title}</h4>
              <ul>
                {col.items.map((item, i) => (
                  <li key={item.label} style={{ '--i': ci * 6 + i }}>
                    <Link href={item.href} tabIndex={tab}>
                      <span>{item.label}</span>
                      {item.badge && <em>{item.badge}</em>}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="aur-mega__cards">
          {link.mega.cards.map((card, i) => (
            <Link key={card.title} href={card.href} className="aur-card" tabIndex={tab} style={{ '--i': i }}>
              <span className="aur-card__img">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={card.image} alt="" loading="lazy" />
              </span>
              <span className="aur-card__body">
                <small>{card.kicker}</small>
                <strong>{card.title}</strong>
                <span className="aur-card__cta">
                  Explore <ArrowIcon />
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   SEARCH OVERLAY
   ═════════════════════════════════════════════════════════════════════════════ */

function SearchOverlay({ open, onClose, products, currency, onSubmit }) {
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState([]);

  useScrollLock(open);
  useFocusTrap(panelRef, open);
  useReturnFocus(open);

  /* load recent searches */
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(RECENT_KEY) || '[]');
      if (Array.isArray(saved)) setRecent(saved.slice(0, 5));
    } catch (e) {
      setRecent([]);
    }
  }, [open]);

  /* focus input, reset state on close */
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current && inputRef.current.focus(), 420);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setQuery('');
      setActive(-1);
    }, 500);
    return () => clearTimeout(t);
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products.filter((p) => `${p.name} ${p.category}`.toLowerCase().includes(q)).slice(0, 6);
  }, [query, products]);

  useEffect(() => {
    setActive(-1);
  }, [query]);

  const remember = (value) => {
    const v = value.trim();
    if (!v) return;
    const next = [v, ...recent.filter((r) => r.toLowerCase() !== v.toLowerCase())].slice(0, 5);
    setRecent(next);
    try {
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch (e) {
      /* storage unavailable */
    }
  };

  const clearRecent = () => {
    setRecent([]);
    try {
      window.localStorage.removeItem(RECENT_KEY);
    } catch (e) {
      /* storage unavailable */
    }
  };

  const submit = (value) => {
    const v = (value ?? query).trim();
    if (!v) return;
    remember(v);
    onSubmit(v);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' && results.length) {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp' && results.length) {
      e.preventDefault();
      setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === 'Enter' && active >= 0 && results[active]) {
      e.preventDefault();
      remember(query);
      onClose();
      window.location.assign(results[active].href);
    }
  };

  const money = (n) => `${currency}${n.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
  const hasQuery = query.trim().length > 0;

  return (
    <div className={`aur-search ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <div className="aur-search__backdrop" onClick={onClose} />

      <div className="aur-search__panel" ref={panelRef} role="dialog" aria-modal="true" aria-label="Search the store">
        <div className="aur-search__top">
          <form
            className="aur-search__form"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <SearchIcon size={28} />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search linen, leather, silk…"
              aria-label="Search products"
              autoComplete="off"
              tabIndex={open ? 0 : -1}
            />
            <kbd>Esc</kbd>
          </form>
          <button type="button" className="aur-search__close" onClick={onClose} aria-label="Close search" tabIndex={open ? 0 : -1}>
            <CloseIcon size={24} />
          </button>
        </div>

        <div className="aur-search__body">
          <div className="aur-search__side">
            {recent.length > 0 && (
              <div className="aur-search__group">
                <div className="aur-search__head">
                  <h4>Recent</h4>
                  <button type="button" onClick={clearRecent} tabIndex={open ? 0 : -1}>
                    Clear
                  </button>
                </div>
                <ul>
                  {recent.map((r, i) => (
                    <li key={r} style={{ '--i': i }}>
                      <button type="button" onClick={() => submit(r)} tabIndex={open ? 0 : -1}>
                        <ClockIcon /> {r}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="aur-search__group">
              <div className="aur-search__head">
                <h4>Trending</h4>
              </div>
              <div className="aur-search__chips">
                {TRENDING.map((t, i) => (
                  <button key={t} type="button" style={{ '--i': i }} onClick={() => submit(t)} tabIndex={open ? 0 : -1}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="aur-search__results" aria-live="polite">
            {!hasQuery && (
              <div className="aur-search__hint">
                <p>Start typing to see pieces from the collection.</p>
                <span>
                  Press <kbd>↑</kbd> <kbd>↓</kbd> to browse and <kbd>Enter</kbd> to open.
                </span>
              </div>
            )}

            {hasQuery && results.length === 0 && (
              <div className="aur-search__hint">
                <p>No pieces match &ldquo;{query.trim()}&rdquo;.</p>
                <span>Try a fabric, a colour or a category, like linen or dresses.</span>
              </div>
            )}

            {results.length > 0 && (
              <>
                <div className="aur-search__head">
                  <h4>
                    {results.length} {results.length === 1 ? 'piece' : 'pieces'}
                  </h4>
                </div>
                <ul className="aur-search__list">
                  {results.map((p, i) => (
                    <li key={p.id} style={{ '--i': i }}>
                      <Link
                        href={p.href}
                        className={i === active ? 'is-active' : ''}
                        onClick={() => {
                          remember(query);
                          onClose();
                        }}
                        onMouseEnter={() => setActive(i)}
                        tabIndex={open ? 0 : -1}
                      >
                        <span className="aur-search__thumb" style={{ background: p.image ? `url(${p.image}) center/cover` : swatch(p.hue ?? 30) }} />
                        <span className="aur-search__info">
                          <strong>{p.name}</strong>
                          <small>{p.category}</small>
                        </span>
                        <span className="aur-search__price">{money(p.price)}</span>
                        <ArrowIcon />
                      </Link>
                    </li>
                  ))}
                </ul>
                <button type="button" className="aur-search__all" onClick={() => submit()} tabIndex={open ? 0 : -1}>
                  See all results for &ldquo;{query.trim()}&rdquo; <ArrowIcon />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   BAG DRAWER
   ═════════════════════════════════════════════════════════════════════════════ */

function CartDrawer({ open, onClose, items, currency, threshold, onUpdateQty, onRemoveItem }) {
  const panelRef = useRef(null);

  useScrollLock(open);
  useFocusTrap(panelRef, open);
  useReturnFocus(open);

  const count = items.reduce((sum, it) => sum + it.qty, 0);
  const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);
  const remaining = Math.max(threshold - subtotal, 0);
  const progress = threshold > 0 ? Math.min(subtotal / threshold, 1) : 1;
  const money = (n) => `${currency}${n.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`;
  const tab = open ? 0 : -1;

  return (
    <div className={`aur-cart ${open ? 'is-open' : ''}`} aria-hidden={!open}>
      <div className="aur-cart__backdrop" onClick={onClose} />

      <aside className="aur-cart__panel" ref={panelRef} role="dialog" aria-modal="true" aria-label="Shopping bag">
        <header className="aur-cart__head">
          <h2>
            Your bag <span>({count})</span>
          </h2>
          <button type="button" onClick={onClose} aria-label="Close bag" tabIndex={tab}>
            <CloseIcon size={22} />
          </button>
        </header>

        {items.length > 0 && (
          <div className="aur-cart__ship">
            <p>
              {remaining > 0 ? (
                <>
                  You&apos;re <strong>{money(remaining)}</strong> away from free shipping.
                </>
              ) : (
                <>
                  <strong>Complimentary shipping</strong> unlocked on this order.
                </>
              )}
            </p>
            <div className="aur-cart__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
              <i style={{ transform: `scaleX(${progress})` }} className={progress >= 1 ? 'is-full' : ''} />
            </div>
          </div>
        )}

        <div className="aur-cart__body">
          {items.length === 0 ? (
            <div className="aur-cart__empty">
              <svg width="92" height="92" viewBox="0 0 92 92" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 30h52l-4 46H24l-4-46Z" />
                <path d="M34 30v-4a12 12 0 0 1 24 0v4" />
                <path d="M38 50c2 3 5 4.5 8 4.5s6-1.5 8-4.5" className="aur-cart__smile" />
              </svg>
              <h3>Your bag is empty</h3>
              <p>Pieces you love will wait for you here.</p>
              <Link href="/shop" className="aur-btn aur-btn--solid" onClick={onClose} tabIndex={tab}>
                Explore the collection
              </Link>
            </div>
          ) : (
            <ul className="aur-cart__list">
              {items.map((it, i) => (
                <li key={it.id} style={{ '--i': i }}>
                  <span className="aur-cart__thumb" style={{ background: it.image ? `url(${it.image}) center/cover` : swatch(30 + i * 18) }} />

                  <div className="aur-cart__info">
                    <Link href={it.href || '/shop'} onClick={onClose} tabIndex={tab}>
                      {it.name}
                    </Link>
                    {it.variant && <small>{it.variant}</small>}

                    <div className="aur-cart__row">
                      <div className="aur-step" role="group" aria-label={`Quantity for ${it.name}`}>
                        <button type="button" onClick={() => onUpdateQty && onUpdateQty(it.id, Math.max(1, it.qty - 1))} aria-label="Decrease quantity" tabIndex={tab}>
                          <MinusIcon />
                        </button>
                        <span key={it.qty}>{it.qty}</span>
                        <button type="button" onClick={() => onUpdateQty && onUpdateQty(it.id, it.qty + 1)} aria-label="Increase quantity" tabIndex={tab}>
                          <PlusIcon />
                        </button>
                      </div>
                      <button type="button" className="aur-cart__remove" onClick={() => onRemoveItem && onRemoveItem(it.id)} tabIndex={tab}>
                        Remove
                      </button>
                    </div>
                  </div>

                  <span className="aur-cart__price">{money(it.price * it.qty)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <footer className="aur-cart__foot">
            <div className="aur-cart__total">
              <span>Subtotal</span>
              <strong>{money(subtotal)}</strong>
            </div>
            <p>Taxes and shipping are calculated at checkout.</p>
            <Link href="/checkout" className="aur-btn aur-btn--solid" onClick={onClose} tabIndex={tab}>
              Checkout <ArrowIcon />
            </Link>
            <Link href="/cart" className="aur-btn aur-btn--ghost" onClick={onClose} tabIndex={tab}>
              View bag
            </Link>
          </footer>
        )}
      </aside>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   NAVBAR
   ═════════════════════════════════════════════════════════════════════════════ */

export default function Navbar({
  cartCount,
  wishlistCount = 0,
  transparent = true,
  showAnnouncement = false,
  announcements = DEFAULT_ANNOUNCEMENTS,
  products = DEFAULT_PRODUCTS,
  freeShippingThreshold = 15000,
  currency = 'Rs ',
  onSearch,
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Real cart, straight from context — no page needs to pass cart data in.
  const { items: rawCartItems, count: contextCartCount, updateQty, removeItem } = useCart();

  // Real auth, straight from context — no page needs to pass user/onSignOut in.
  const { user, logout } = useAuth();

  const cartItems = useMemo(
    () =>
      rawCartItems.map((it) => ({
        id: it.id,
        name: it.name,
        price: it.price,
        qty: it.qty,
        image: it.image ? imageSrc(it.image) : undefined,
        href: `/shop/${it.id}`,
      })),
    [rawCartItems]
  );

  const headerRef = useRef(null);
  const linksRef = useRef(null);
  const linkRefs = useRef({});
  const accountRef = useRef(null);
  const progressRef = useRef(null);
  const openTimer = useRef(null);
  const closeTimer = useRef(null);
  const mobilePanelRef = useRef(null);

  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [mega, setMega] = useState(null);
  const [hoverLabel, setHoverLabel] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [announceClosed, setAnnounceClosed] = useState(false);
  const [indicator, setIndicator] = useState({ x: 0, w: 0, on: false });

  const totalCount = typeof cartCount === 'number' ? cartCount : contextCartCount;
  const overlayOpen = menuOpen || searchOpen || cartOpen;

  useScrollLock(menuOpen);
  useFocusTrap(mobilePanelRef, menuOpen);

  /* ── active link ─────────────────────────────────────────────────────── */
  const isActive = useCallback(
    (href) => {
      const clean = href.split('?')[0];
      return clean === '/' ? pathname === '/' : Boolean(pathname && pathname.startsWith(clean));
    },
    [pathname]
  );

  const activeLabel = useMemo(() => {
    const found = NAV_LINKS.find((l) => isActive(l.href));
    return found ? found.label : null;
  }, [isActive]);

  /* ── scroll: glass, hide/show, progress line ─────────────────────────── */
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      setScrolled(y > 24);

      if (y > lastY + 6 && y > 260) setHidden(true);
      else if (y < lastY - 6 || y < 260) setHidden(false);
      lastY = y;

      if (progressRef.current) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        const p = max > 0 ? Math.min(Math.max(y / max, 0), 1) : 0;
        progressRef.current.style.transform = `scaleX(${p.toFixed(4)})`;
      }
      ticking = false;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  /* ── close everything on route change ────────────────────────────────── */
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
    setCartOpen(false);
    setAccountOpen(false);
    setMega(null);
  }, [pathname]);

  /* ── announcement dismissed for the session ──────────────────────────── */
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem('aurelia-announce') === 'closed') setAnnounceClosed(true);
    } catch (e) {
      /* storage unavailable */
    }
  }, []);

  const closeAnnouncement = () => {
    setAnnounceClosed(true);
    try {
      window.sessionStorage.setItem('aurelia-announce', 'closed');
    } catch (e) {
      /* storage unavailable */
    }
  };

  /* ── keyboard: Escape closes, "/" and Ctrl/Cmd+K open search ─────────── */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setSearchOpen(false);
        setCartOpen(false);
        setAccountOpen(false);
        setMega(null);
        return;
      }

      const tag = e.target && e.target.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable);

      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setMenuOpen(false);
        setCartOpen(false);
        setSearchOpen(true);
      } else if (e.key === '/' && !typing) {
        e.preventDefault();
        setMenuOpen(false);
        setCartOpen(false);
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ── account popover: click outside ──────────────────────────────────── */
  const closeAccount = useCallback(() => setAccountOpen(false), []);
  useClickOutside(accountRef, accountOpen, closeAccount);

  /* ── mega menu hover intent ──────────────────────────────────────────── */
  const openMega = (label) => {
    clearTimeout(closeTimer.current);
    clearTimeout(openTimer.current);
    if (mega) {
      setMega(label);
    } else {
      openTimer.current = setTimeout(() => setMega(label), 110);
    }
  };

  const scheduleClose = () => {
    clearTimeout(openTimer.current);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setMega(null), 200);
  };

  const cancelClose = () => {
    clearTimeout(closeTimer.current);
  };

  useEffect(
    () => () => {
      clearTimeout(openTimer.current);
      clearTimeout(closeTimer.current);
    },
    []
  );

  /* ── sliding indicator ───────────────────────────────────────────────── */
  const target = hoverLabel || activeLabel;

  useEffect(() => {
    const measure = () => {
      const el = target ? linkRefs.current[target] : null;
      const parent = linksRef.current;
      if (!el || !parent) {
        setIndicator((i) => ({ ...i, on: false }));
        return;
      }
      const a = parent.getBoundingClientRect();
      const b = el.getBoundingClientRect();
      setIndicator({ x: b.left - a.left, w: b.width, on: true });
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [target, scrolled, pathname]);

  /* ── search submit ───────────────────────────────────────────────────── */
  const handleSearch = (q) => {
    setSearchOpen(false);
    setMenuOpen(false);
    if (typeof onSearch === 'function') onSearch(q);
    else router.push(`/shop?search=${encodeURIComponent(q)}`);
  };

  const openSearch = () => {
    setMenuOpen(false);
    setCartOpen(false);
    setAccountOpen(false);
    setMega(null);
    setSearchOpen(true);
  };

  const openCart = () => {
    setMenuOpen(false);
    setSearchOpen(false);
    setAccountOpen(false);
    setMega(null);
    setCartOpen(true);
  };

  const solid = scrolled || !transparent || overlayOpen || Boolean(mega);
  const showBar = showAnnouncement && !announceClosed && announcements.length > 0;
  const hideHeader = hidden && !overlayOpen && !mega && !accountOpen;

  const headerClass = [
    'aur-nav',
    solid ? 'is-solid' : '',
    hideHeader ? 'is-hidden' : '',
    showBar ? 'has-bar' : '',
    scrolled ? 'is-scrolled' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`${serif.variable} ${sans.variable} aur-shell`} style={{ display: 'contents' }}>
      {/* page dimmer behind the mega menu */}
      <div className={`aur-dim ${mega ? 'is-on' : ''}`} aria-hidden="true" />

      <header ref={headerRef} className={headerClass} onMouseLeave={scheduleClose} onMouseEnter={cancelClose}>
        {showBar && (
          <div className="aur-announce-wrap">
            <Announcement messages={announcements} onClose={closeAnnouncement} />
          </div>
        )}

        <div className="aur-nav__bar">
          <Logo small={solid} />

          {/* ── Desktop links ─────────────────────────────────────────── */}
          <nav className="aur-links" ref={linksRef} aria-label="Primary" onMouseLeave={() => setHoverLabel(null)}>
            {NAV_LINKS.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                ref={(node) => {
                  linkRefs.current[link.label] = node;
                }}
                className={`aur-link ${isActive(link.href) ? 'is-active' : ''} ${mega === link.label ? 'is-open' : ''}`}
                aria-current={isActive(link.href) ? 'page' : undefined}
                aria-haspopup={link.mega ? 'true' : undefined}
                aria-expanded={link.mega ? mega === link.label : undefined}
                onMouseEnter={() => {
                  setHoverLabel(link.label);
                  if (link.mega) openMega(link.label);
                  else scheduleClose();
                }}
                onFocus={() => {
                  setHoverLabel(link.label);
                  if (link.mega) openMega(link.label);
                  else scheduleClose();
                }}
              >
                <span>{link.label}</span>
                {link.mega && (
                  <span className="aur-link__chev">
                    <ChevronIcon />
                  </span>
                )}
              </Link>
            ))}

            <span
              className={`aur-ind ${indicator.on ? 'is-on' : ''}`}
              style={{ transform: `translate3d(${indicator.x}px, 0, 0)`, width: `${indicator.w}px` }}
              aria-hidden="true"
            />
          </nav>

          {/* ── Actions ───────────────────────────────────────────────── */}
          <div className="aur-actions">
            <MagnetIcon>
              <button type="button" className="aur-icon" aria-label="Search (press slash)" onClick={openSearch}>
                <SearchIcon />
              </button>
            </MagnetIcon>

            <MagnetIcon>
              <Link href="/wishlist" className="aur-icon aur-icon--hide-sm" aria-label={`Wishlist, ${wishlistCount} items`}>
                <HeartIcon />
                {wishlistCount > 0 && (
                  <span key={wishlistCount} className="aur-badge aur-badge--soft">
                    {wishlistCount}
                  </span>
                )}
              </Link>
            </MagnetIcon>

            <div className="aur-account" ref={accountRef}>
              <MagnetIcon>
                <button
                  type="button"
                  className="aur-icon aur-icon--hide-sm"
                  aria-label="Account menu"
                  aria-expanded={accountOpen}
                  onClick={() => {
                    setMega(null);
                    setAccountOpen((o) => !o);
                  }}
                >
                  <UserIcon />
                </button>
              </MagnetIcon>

              <div className={`aur-pop ${accountOpen ? 'is-open' : ''}`} role="menu" aria-hidden={!accountOpen}>
                {user ? (
                  <>
                    <p className="aur-pop__hello">
                      Hello, <em>{user.name}</em>
                    </p>
                    <Link href="/account/orders" role="menuitem" tabIndex={accountOpen ? 0 : -1}>
                      Orders
                    </Link>
                    <Link href="/wishlist" role="menuitem" tabIndex={accountOpen ? 0 : -1}>
                      Wishlist
                    </Link>
                    <Link href="/account" role="menuitem" tabIndex={accountOpen ? 0 : -1}>
                      Account details
                    </Link>
                    {user.role === 'admin' && (
                      <Link href="/admin/products" role="menuitem" tabIndex={accountOpen ? 0 : -1}>
                        Admin · Products
                      </Link>
                    )}
                    <button
                      type="button"
                      role="menuitem"
                      tabIndex={accountOpen ? 0 : -1}
                      onClick={() => {
                        setAccountOpen(false);
                        logout();
                      }}
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <p className="aur-pop__hello">
                      Welcome to <em>Aurelia</em>
                    </p>
                    <Link href="/login" className="aur-btn aur-btn--solid aur-btn--sm" role="menuitem" tabIndex={accountOpen ? 0 : -1}>
                      Sign in
                    </Link>
                    <Link href="/register" className="aur-btn aur-btn--ghost aur-btn--sm" role="menuitem" tabIndex={accountOpen ? 0 : -1}>
                      Create account
                    </Link>
                    <div className="aur-pop__rule" />
                    <Link href="/track-order" role="menuitem" tabIndex={accountOpen ? 0 : -1}>
                      Track an order
                    </Link>
                    <Link href="/help" role="menuitem" tabIndex={accountOpen ? 0 : -1}>
                      Help &amp; returns
                    </Link>
                  </>
                )}
              </div>
            </div>

            <MagnetIcon>
              <button type="button" className="aur-icon" aria-label={`Open bag, ${totalCount} items`} onClick={openCart}>
                <BagIcon />
                <span key={totalCount} className="aur-badge">
                  {totalCount}
                </span>
              </button>
            </MagnetIcon>

            <button
              type="button"
              className={`aur-burger ${menuOpen ? 'is-open' : ''}`}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => {
                setSearchOpen(false);
                setCartOpen(false);
                setAccountOpen(false);
                setMenuOpen((m) => !m);
              }}
            >
              <span />
              <span />
            </button>
          </div>
        </div>

        {/* ── Mega menus ──────────────────────────────────────────────── */}
        {NAV_LINKS.filter((l) => l.mega).map((link) => (
          <MegaPanel key={link.label} link={link} open={mega === link.label} />
        ))}

        <div className="aur-progress" aria-hidden="true">
          <i ref={progressRef} />
        </div>
      </header>

      {/* ── Search ────────────────────────────────────────────────────── */}
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} products={products} currency={currency} onSubmit={handleSearch} />

      {/* ── Bag ───────────────────────────────────────────────────────── */}
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cartItems}
        currency={currency}
        threshold={freeShippingThreshold}
        onUpdateQty={updateQty}
        onRemoveItem={removeItem}
      />

      {/* ── Mobile menu ───────────────────────────────────────────────── */}
      <div className={`aur-mobile ${menuOpen ? 'is-open' : ''}`} aria-hidden={!menuOpen}>
        <div className="aur-mobile__inner" ref={mobilePanelRef}>
          <button type="button" className="aur-mobile__search" onClick={openSearch} tabIndex={menuOpen ? 0 : -1} style={{ '--i': 0 }}>
            <SearchIcon size={20} /> Search the collection
          </button>

          <nav className="aur-mobile__links" aria-label="Mobile">
            {NAV_LINKS.map((link, i) => {
              const isOpen = expanded === link.label;
              return (
                <div key={link.label} className="aur-mobile__group" style={{ '--i': i + 1 }}>
                  <div className="aur-mobile__row">
                    <Link href={link.href} className={`aur-mobile__link ${isActive(link.href) ? 'is-active' : ''}`} tabIndex={menuOpen ? 0 : -1}>
                      {link.label}
                    </Link>
                    {link.mega && (
                      <button
                        type="button"
                        className={`aur-mobile__toggle ${isOpen ? 'is-open' : ''}`}
                        aria-expanded={isOpen}
                        aria-label={`Show ${link.label} menu`}
                        onClick={() => setExpanded(isOpen ? null : link.label)}
                        tabIndex={menuOpen ? 0 : -1}
                      >
                        <PlusIcon />
                      </button>
                    )}
                  </div>

                  {link.mega && (
                    <div className={`aur-mobile__sub ${isOpen ? 'is-open' : ''}`}>
                      <div>
                        {link.mega.columns.flatMap((c) => c.items).map((item) => (
                          <Link key={item.label} href={item.href} tabIndex={menuOpen && isOpen ? 0 : -1}>
                            {item.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          <div className="aur-mobile__foot" style={{ '--i': NAV_LINKS.length + 1 }}>
            <div className="aur-mobile__quick">
              <Link href="/account" tabIndex={menuOpen ? 0 : -1}>
                Account
              </Link>
              <Link href="/wishlist" tabIndex={menuOpen ? 0 : -1}>
                Wishlist ({wishlistCount})
              </Link>
              <button type="button" onClick={openCart} tabIndex={menuOpen ? 0 : -1}>
                Bag ({totalCount})
              </button>
            </div>
            <div className="aur-mobile__social">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" tabIndex={menuOpen ? 0 : -1}>
                Instagram
              </a>
              <a href="https://pinterest.com" target="_blank" rel="noopener noreferrer" tabIndex={menuOpen ? 0 : -1}>
                Pinterest
              </a>
              <a href="https://tiktok.com" target="_blank" rel="noopener noreferrer" tabIndex={menuOpen ? 0 : -1}>
                TikTok
              </a>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        /* ═══════════════════════════════════════════════════════════════════
           TOKENS
           ═══════════════════════════════════════════════════════════════════ */
        .aur-shell {
          --cream: #f6efe8;
          --blush: #f0dcd2;
          --copper: #c98a63;
          --ink: #181513;
          --panel: rgba(24, 21, 19, 0.86);
          --line: rgba(255, 255, 255, 0.12);
          --gutter: clamp(20px, 5.2vw, 96px);
          --ease-out: cubic-bezier(0.22, 0.8, 0.2, 1);
          --ease-expo: cubic-bezier(0.19, 1, 0.22, 1);
          --ease-wipe: cubic-bezier(0.76, 0, 0.18, 1);
        }

        .aur-shell a,
        .aur-shell button {
          -webkit-tap-highlight-color: transparent;
        }

        /* ═══════════════════════════════════════════════════════════════════
           HEADER SHELL
           ═══════════════════════════════════════════════════════════════════ */
        .aur-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          color: var(--cream);
          font-family: var(--aur-sans), system-ui, sans-serif;
          transition: transform 0.6s var(--ease-out), background 0.5s ease, box-shadow 0.5s ease;
        }
        .aur-nav.is-hidden {
          transform: translateY(-100%);
        }
        .aur-nav::before {
          /* soft fade so links stay legible over photography */
          content: '';
          position: absolute;
          inset: 0 0 -46px 0;
          background: linear-gradient(to bottom, rgba(18, 15, 13, 0.6), rgba(18, 15, 13, 0));
          pointer-events: none;
          transition: opacity 0.45s ease;
        }
        .aur-nav.is-solid::before {
          opacity: 0;
        }
        .aur-nav.is-solid {
          background: rgba(24, 21, 19, 0.8);
          -webkit-backdrop-filter: blur(20px) saturate(150%);
          backdrop-filter: blur(20px) saturate(150%);
          box-shadow: 0 18px 50px -28px rgba(0, 0, 0, 0.65);
        }

        .aur-nav__bar {
          position: relative;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          height: 96px;
          padding: 0 var(--gutter);
          border-bottom: 1px solid rgba(255, 255, 255, 0.2);
          transition: height 0.5s var(--ease-out), border-color 0.4s ease;
        }
        .aur-nav.is-solid .aur-nav__bar {
          height: 74px;
          border-bottom-color: rgba(255, 255, 255, 0.08);
        }

        /* ═══════════════════════════════════════════════════════════════════
           ANNOUNCEMENT BAR
           ═══════════════════════════════════════════════════════════════════ */
        .aur-announce-wrap {
          display: grid;
          grid-template-rows: 1fr;
          overflow: hidden;
          transition: grid-template-rows 0.55s var(--ease-out);
        }
        .aur-nav.is-scrolled .aur-announce-wrap {
          grid-template-rows: 0fr;
        }
        .aur-announce {
          min-height: 0;
          overflow: hidden;
          background: linear-gradient(90deg, #2a211c, #3a2b22 50%, #2a211c);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .aur-announce__inner {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          height: 40px;
          padding: 0 48px;
          font-size: 0.8rem;
          letter-spacing: 0.04em;
          color: rgba(246, 239, 232, 0.9);
        }
        .aur-announce__icon {
          display: inline-flex;
          opacity: 0.75;
        }
        .aur-announce__track {
          position: relative;
          height: 20px;
          min-width: min(420px, 62vw);
          overflow: hidden;
        }
        .aur-announce__track p {
          position: absolute;
          inset: 0;
          margin: 0;
          line-height: 20px;
          text-align: center;
          white-space: nowrap;
          opacity: 0;
          transform: translate3d(0, 100%, 0);
          transition: transform 0.7s var(--ease-expo), opacity 0.5s ease;
        }
        .aur-announce__track p.is-active {
          opacity: 1;
          transform: translate3d(0, 0, 0);
        }
        .aur-announce__track p.is-prev {
          opacity: 0;
          transform: translate3d(0, -100%, 0);
        }
        .aur-announce__close {
          position: absolute;
          top: 50%;
          right: var(--gutter);
          display: inline-flex;
          padding: 6px;
          border: 0;
          background: transparent;
          color: rgba(246, 239, 232, 0.7);
          cursor: pointer;
          transform: translateY(-50%);
          transition: color 0.3s ease, transform 0.4s var(--ease-out);
        }
        .aur-announce__close:hover {
          color: #fff;
          transform: translateY(-50%) rotate(90deg);
        }

        /* ═══════════════════════════════════════════════════════════════════
           LOGO
           ═══════════════════════════════════════════════════════════════════ */
        .aur-logo {
          justify-self: start;
          display: inline-block;
          font-family: var(--aur-serif), Georgia, serif;
          font-weight: 400;
          font-size: 2.55rem;
          line-height: 1;
          letter-spacing: -0.01em;
          color: var(--cream);
          text-decoration: none;
          transition: font-size 0.5s var(--ease-out);
        }
        .aur-logo.is-small {
          font-size: 2.2rem;
        }
        .aur-logo__letters {
          display: inline-flex;
        }
        .aur-logo__letters span {
          display: inline-block;
          opacity: 0;
          transform: translate3d(0, -60%, 0);
          filter: blur(6px);
          animation: aurLogoIn 1s var(--ease-expo) calc(0.15s + var(--i) * 0.07s) forwards;
          transition: transform 0.5s var(--ease-out) calc(var(--i) * 0.03s), color 0.4s ease calc(var(--i) * 0.03s);
        }
        @keyframes aurLogoIn {
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
            filter: blur(0);
          }
        }
        .aur-logo:hover .aur-logo__letters span {
          transform: translate3d(0, -4px, 0);
          color: var(--blush);
        }

        /* ═══════════════════════════════════════════════════════════════════
           DESKTOP LINKS + INDICATOR
           ═══════════════════════════════════════════════════════════════════ */
        .aur-links {
          position: relative;
          display: flex;
          align-items: center;
          gap: clamp(26px, 3.2vw, 54px);
        }
        .aur-link {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 34px 0;
          font-size: 1.02rem;
          font-weight: 400;
          letter-spacing: 0.01em;
          color: rgba(246, 239, 232, 0.9);
          text-decoration: none;
          transition: color 0.3s ease, padding 0.5s var(--ease-out);
        }
        .aur-nav.is-solid .aur-link {
          padding: 25px 0;
        }
        .aur-link span:first-child {
          display: inline-block;
          transition: transform 0.5s var(--ease-out);
        }
        .aur-link:hover,
        .aur-link.is-active,
        .aur-link.is-open {
          color: #fff;
        }
        .aur-link:hover span:first-child {
          transform: translateY(-1px);
        }
        .aur-link__chev {
          display: inline-flex;
          opacity: 0.6;
          transition: transform 0.45s var(--ease-out);
        }
        .aur-link.is-open .aur-link__chev {
          transform: rotate(180deg);
        }

        .aur-ind {
          position: absolute;
          left: 0;
          bottom: 27px;
          height: 1px;
          opacity: 0;
          background: linear-gradient(90deg, transparent, var(--cream) 20%, var(--cream) 80%, transparent);
          transition: transform 0.6s var(--ease-out), width 0.6s var(--ease-out), opacity 0.4s ease, bottom 0.5s var(--ease-out);
          pointer-events: none;
        }
        .aur-ind::after {
          content: '';
          position: absolute;
          left: 50%;
          top: -2px;
          width: 5px;
          height: 5px;
          margin-left: -2.5px;
          border-radius: 50%;
          background: var(--cream);
          box-shadow: 0 0 12px 2px rgba(246, 239, 232, 0.6);
        }
        .aur-ind.is-on {
          opacity: 1;
        }
        .aur-nav.is-solid .aur-ind {
          bottom: 18px;
        }

        /* ═══════════════════════════════════════════════════════════════════
           MEGA MENU
           ═══════════════════════════════════════════════════════════════════ */
        .aur-dim {
          position: fixed;
          inset: 0;
          z-index: 95;
          background: rgba(10, 8, 7, 0.5);
          -webkit-backdrop-filter: blur(3px);
          backdrop-filter: blur(3px);
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transition: opacity 0.5s ease, visibility 0s linear 0.5s;
        }
        .aur-dim.is-on {
          opacity: 1;
          visibility: visible;
          transition-delay: 0s;
        }

        .aur-mega {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: rgba(24, 21, 19, 0.94);
          -webkit-backdrop-filter: blur(24px) saturate(150%);
          backdrop-filter: blur(24px) saturate(150%);
          border-top: 1px solid var(--line);
          border-bottom: 1px solid var(--line);
          box-shadow: 0 40px 80px -30px rgba(0, 0, 0, 0.7);
          clip-path: inset(0 0 100% 0);
          opacity: 0;
          visibility: hidden;
          transition: clip-path 0.7s var(--ease-wipe), opacity 0.35s ease, visibility 0s linear 0.7s;
        }
        .aur-mega.is-open {
          clip-path: inset(0 0 0 0);
          opacity: 1;
          visibility: visible;
          transition-delay: 0s;
        }
        .aur-mega__inner {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
          gap: clamp(32px, 5vw, 96px);
          max-width: 1320px;
          margin: 0 auto;
          padding: 44px var(--gutter) 52px;
        }
        .aur-mega__cols {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 32px;
        }
        .aur-mega__col h4 {
          margin: 0 0 18px;
          font-size: 0.72rem;
          font-weight: 500;
          letter-spacing: 0.26em;
          text-transform: uppercase;
          color: rgba(246, 239, 232, 0.5);
        }
        .aur-mega__col ul {
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .aur-mega__col li {
          opacity: 0;
          transform: translate3d(0, 14px, 0);
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .aur-mega.is-open .aur-mega__col li {
          opacity: 1;
          transform: none;
          transition: opacity 0.6s ease calc(var(--i) * 55ms + 240ms), transform 0.8s var(--ease-expo) calc(var(--i) * 55ms + 240ms);
        }
        .aur-mega__col a {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 7px 0;
          font-family: var(--aur-serif), Georgia, serif;
          font-size: 1.55rem;
          line-height: 1.2;
          color: rgba(246, 239, 232, 0.86);
          text-decoration: none;
          transition: color 0.3s ease, transform 0.5s var(--ease-out);
        }
        .aur-mega__col a::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: 4px;
          width: 100%;
          height: 1px;
          background: var(--copper);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.55s var(--ease-out);
        }
        .aur-mega__col a:hover {
          color: #fff;
          transform: translateX(8px);
        }
        .aur-mega__col a:hover::after {
          transform: scaleX(1);
        }
        .aur-mega__col em {
          padding: 2px 9px;
          border-radius: 999px;
          background: rgba(201, 138, 99, 0.2);
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: 0.66rem;
          font-style: normal;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #f0c8ac;
        }

        .aur-mega__cards {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
        }
        .aur-card {
          position: relative;
          display: block;
          aspect-ratio: 4 / 5;
          overflow: hidden;
          border-radius: 22px;
          color: #fff;
          text-decoration: none;
          opacity: 0;
          transform: translate3d(0, 30px, 0) scale(0.97);
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .aur-mega.is-open .aur-card {
          opacity: 1;
          transform: none;
          transition: opacity 0.8s ease calc(var(--i) * 120ms + 300ms), transform 1s var(--ease-expo) calc(var(--i) * 120ms + 300ms);
        }
        .aur-card__img {
          position: absolute;
          inset: 0;
          overflow: hidden;
          background: #2a211c;
        }
        .aur-card__img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scale(1.08);
          transition: transform 1.4s var(--ease-out);
        }
        .aur-card:hover .aur-card__img img {
          transform: scale(1.16) translate3d(0, -1%, 0);
        }
        .aur-card::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(0deg, rgba(14, 11, 9, 0.85) 0%, rgba(14, 11, 9, 0.1) 55%, rgba(14, 11, 9, 0.1) 100%);
          pointer-events: none;
        }
        .aur-card__body {
          position: absolute;
          left: 20px;
          right: 20px;
          bottom: 20px;
          z-index: 2;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .aur-card__body small {
          font-size: 0.7rem;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(246, 239, 232, 0.72);
        }
        .aur-card__body strong {
          font-family: var(--aur-serif), Georgia, serif;
          font-size: 1.6rem;
          font-weight: 400;
          line-height: 1.12;
        }
        .aur-card__cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          font-size: 0.85rem;
          color: var(--blush);
          transform: translate3d(0, 8px, 0);
          opacity: 0;
          transition: transform 0.5s var(--ease-out), opacity 0.4s ease;
        }
        .aur-card:hover .aur-card__cta {
          opacity: 1;
          transform: none;
        }

        /* ═══════════════════════════════════════════════════════════════════
           ACTIONS + BADGES
           ═══════════════════════════════════════════════════════════════════ */
        .aur-actions {
          justify-self: end;
          display: flex;
          align-items: center;
          gap: clamp(10px, 1.4vw, 22px);
        }
        .aur-magnet {
          display: inline-flex;
          transition: transform 0.7s var(--ease-out);
          will-change: transform;
        }
        .aur-magnet.is-magnet {
          transition-duration: 0.2s;
        }
        .aur-icon {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          padding: 0;
          border: 0;
          border-radius: 50%;
          background: transparent;
          color: var(--cream);
          cursor: pointer;
          text-decoration: none;
          transition: transform 0.45s var(--ease-out), background 0.3s ease, color 0.3s ease;
        }
        .aur-icon:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }
        .aur-icon:active {
          transform: scale(0.92);
        }
        .aur-icon svg {
          transition: transform 0.5s var(--ease-out);
        }
        .aur-icon:hover svg {
          transform: scale(1.08);
        }

        .aur-badge {
          position: absolute;
          top: 2px;
          right: 0;
          min-width: 16px;
          height: 16px;
          padding: 0 4px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: var(--cream);
          color: var(--ink);
          font-size: 0.66rem;
          font-weight: 600;
          line-height: 1;
          animation: aurBump 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .aur-badge--soft {
          background: var(--copper);
          color: #fff;
        }
        @keyframes aurBump {
          0% {
            transform: scale(0.3);
          }
          100% {
            transform: scale(1);
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           ACCOUNT POPOVER
           ═══════════════════════════════════════════════════════════════════ */
        .aur-account {
          position: relative;
        }
        .aur-pop {
          position: absolute;
          top: calc(100% + 14px);
          right: -8px;
          width: 244px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 18px;
          border-radius: 22px;
          background: var(--panel);
          -webkit-backdrop-filter: blur(22px) saturate(150%);
          backdrop-filter: blur(22px) saturate(150%);
          border: 1px solid var(--line);
          box-shadow: 0 30px 60px -20px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.06);
          opacity: 0;
          visibility: hidden;
          transform: translate3d(0, -10px, 0) scale(0.96);
          transform-origin: top right;
          transition: opacity 0.3s ease, transform 0.5s var(--ease-out), visibility 0s linear 0.3s;
        }
        .aur-pop.is-open {
          opacity: 1;
          visibility: visible;
          transform: none;
          transition-delay: 0s;
        }
        .aur-pop__hello {
          margin: 0 0 10px;
          font-size: 0.85rem;
          color: rgba(246, 239, 232, 0.6);
        }
        .aur-pop__hello em {
          font-family: var(--aur-serif), Georgia, serif;
          font-size: 1.3rem;
          font-style: italic;
          color: var(--cream);
        }
        .aur-pop__rule {
          height: 1px;
          margin: 10px 0 6px;
          background: var(--line);
        }
        .aur-pop > a:not(.aur-btn),
        .aur-pop > button {
          display: block;
          width: 100%;
          padding: 10px 12px;
          border: 0;
          border-radius: 12px;
          background: transparent;
          color: rgba(246, 239, 232, 0.86);
          font: inherit;
          font-size: 0.92rem;
          text-align: left;
          text-decoration: none;
          cursor: pointer;
          transition: background 0.3s ease, color 0.3s ease, padding-left 0.4s var(--ease-out);
        }
        .aur-pop > a:not(.aur-btn):hover,
        .aur-pop > button:hover {
          background: rgba(255, 255, 255, 0.07);
          color: #fff;
          padding-left: 18px;
        }

        /* ═══════════════════════════════════════════════════════════════════
           BUTTONS (shared)
           ═══════════════════════════════════════════════════════════════════ */
        .aur-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          height: 52px;
          padding: 0 28px;
          border-radius: 999px;
          font: inherit;
          font-size: 0.95rem;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          overflow: hidden;
          transition: transform 0.45s var(--ease-out), background 0.35s ease, color 0.35s ease, box-shadow 0.45s ease, border-color 0.35s ease;
        }
        .aur-btn--sm {
          height: 42px;
          padding: 0 20px;
          font-size: 0.88rem;
        }
        .aur-btn--solid {
          border: 1px solid var(--blush);
          background: var(--blush);
          color: var(--ink);
          box-shadow: 0 14px 34px -16px rgba(240, 220, 210, 0.5);
        }
        .aur-btn--solid::before {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          left: -80%;
          width: 60%;
          background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.7), transparent);
          transform: skewX(-18deg);
        }
        .aur-btn--solid:hover {
          background: #fbeee6;
          transform: translateY(-2px);
          box-shadow: 0 20px 40px -14px rgba(240, 220, 210, 0.55);
        }
        .aur-btn--solid:hover::before {
          left: 130%;
          transition: left 0.9s ease;
        }
        .aur-btn--ghost {
          border: 1px solid rgba(255, 255, 255, 0.32);
          background: transparent;
          color: var(--cream);
        }
        .aur-btn--ghost:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.6);
          transform: translateY(-2px);
        }
        .aur-btn:active {
          transform: scale(0.98);
        }

        /* ═══════════════════════════════════════════════════════════════════
           BURGER + SCROLL PROGRESS
           ═══════════════════════════════════════════════════════════════════ */
        .aur-burger {
          display: none;
          position: relative;
          width: 42px;
          height: 42px;
          padding: 0;
          border: 0;
          background: transparent;
          cursor: pointer;
        }
        .aur-burger span {
          position: absolute;
          left: 10px;
          right: 10px;
          height: 1.5px;
          border-radius: 2px;
          background: var(--cream);
          transition: transform 0.55s var(--ease-out), top 0.45s var(--ease-out), left 0.45s var(--ease-out);
        }
        .aur-burger span:nth-child(1) {
          top: 16px;
        }
        .aur-burger span:nth-child(2) {
          top: 25px;
          left: 16px;
        }
        .aur-burger:hover span:nth-child(2) {
          left: 10px;
        }
        .aur-burger.is-open span:nth-child(1) {
          top: 21px;
          transform: rotate(45deg);
        }
        .aur-burger.is-open span:nth-child(2) {
          top: 21px;
          left: 10px;
          transform: rotate(-45deg);
        }

        .aur-progress {
          position: absolute;
          left: 0;
          right: 0;
          bottom: -1px;
          height: 2px;
          overflow: hidden;
          opacity: 0;
          transition: opacity 0.4s ease;
        }
        .aur-nav.is-scrolled .aur-progress {
          opacity: 1;
        }
        .aur-progress i {
          display: block;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, #f0dcd2, #c98a63);
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.15s linear;
        }

        /* ═══════════════════════════════════════════════════════════════════
           SEARCH OVERLAY
           ═══════════════════════════════════════════════════════════════════ */
        .aur-search {
          position: fixed;
          inset: 0;
          z-index: 120;
          font-family: var(--aur-sans), system-ui, sans-serif;
          color: var(--cream);
          visibility: hidden;
          transition: visibility 0s linear 0.8s;
        }
        .aur-search.is-open {
          visibility: visible;
          transition-delay: 0s;
        }
        .aur-search__backdrop {
          position: absolute;
          inset: 0;
          background: rgba(10, 8, 7, 0.6);
          -webkit-backdrop-filter: blur(6px);
          backdrop-filter: blur(6px);
          opacity: 0;
          transition: opacity 0.6s ease;
        }
        .aur-search.is-open .aur-search__backdrop {
          opacity: 1;
        }
        .aur-search__panel {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          max-height: 100%;
          overflow-y: auto;
          background: radial-gradient(120% 90% at 85% 0%, #3a2c24 0%, #1c1815 55%, #171310 100%);
          border-bottom: 1px solid var(--line);
          box-shadow: 0 50px 100px -40px rgba(0, 0, 0, 0.8);
          clip-path: inset(0 0 100% 0);
          transition: clip-path 0.8s var(--ease-wipe);
        }
        .aur-search.is-open .aur-search__panel {
          clip-path: inset(0 0 0 0);
        }
        .aur-search__top {
          display: flex;
          align-items: center;
          gap: 24px;
          max-width: 1180px;
          margin: 0 auto;
          padding: 44px var(--gutter) 0;
        }
        .aur-search__form {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 20px;
          padding-bottom: 18px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.28);
          transition: border-color 0.4s ease;
        }
        .aur-search__form:focus-within {
          border-bottom-color: var(--copper);
        }
        .aur-search__form input {
          flex: 1;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: #fff;
          font-family: var(--aur-serif), Georgia, serif;
          font-size: clamp(1.7rem, 3.4vw, 2.7rem);
          font-weight: 400;
        }
        .aur-search__form input::placeholder {
          color: rgba(246, 239, 232, 0.4);
          font-style: italic;
        }
        .aur-search__form input::-webkit-search-cancel-button {
          display: none;
        }
        .aur-search__form kbd,
        .aur-search__hint kbd {
          padding: 3px 8px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          background: rgba(255, 255, 255, 0.05);
          font-family: inherit;
          font-size: 0.72rem;
          color: rgba(246, 239, 232, 0.7);
        }
        .aur-search__close {
          display: inline-flex;
          padding: 10px;
          border: 0;
          border-radius: 50%;
          background: transparent;
          color: var(--cream);
          cursor: pointer;
          transition: background 0.3s ease, transform 0.5s var(--ease-out);
        }
        .aur-search__close:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: rotate(90deg);
        }

        .aur-search__body {
          display: grid;
          grid-template-columns: minmax(0, 300px) minmax(0, 1fr);
          gap: clamp(32px, 5vw, 80px);
          max-width: 1180px;
          margin: 0 auto;
          padding: 40px var(--gutter) 56px;
          min-height: 320px;
        }
        .aur-search__side,
        .aur-search__results {
          opacity: 0;
          transform: translate3d(0, 18px, 0);
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .aur-search.is-open .aur-search__side {
          opacity: 1;
          transform: none;
          transition: opacity 0.8s ease 0.45s, transform 1s var(--ease-expo) 0.45s;
        }
        .aur-search.is-open .aur-search__results {
          opacity: 1;
          transform: none;
          transition: opacity 0.8s ease 0.55s, transform 1s var(--ease-expo) 0.55s;
        }
        .aur-search__group + .aur-search__group {
          margin-top: 34px;
        }
        .aur-search__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .aur-search__head h4 {
          margin: 0;
          font-size: 0.72rem;
          font-weight: 500;
          letter-spacing: 0.26em;
          text-transform: uppercase;
          color: rgba(246, 239, 232, 0.5);
        }
        .aur-search__head button {
          border: 0;
          background: transparent;
          color: rgba(246, 239, 232, 0.55);
          font: inherit;
          font-size: 0.8rem;
          cursor: pointer;
          transition: color 0.3s ease;
        }
        .aur-search__head button:hover {
          color: #fff;
        }
        .aur-search__group ul {
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .aur-search__group li button {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 8px 0;
          border: 0;
          background: transparent;
          color: rgba(246, 239, 232, 0.8);
          font: inherit;
          font-size: 0.95rem;
          cursor: pointer;
          transition: color 0.3s ease, transform 0.4s var(--ease-out);
        }
        .aur-search__group li button:hover {
          color: #fff;
          transform: translateX(6px);
        }
        .aur-search__chips {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .aur-search__chips button {
          padding: 9px 16px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: transparent;
          color: var(--cream);
          font: inherit;
          font-size: 0.88rem;
          cursor: pointer;
          transition: background 0.3s ease, color 0.3s ease, transform 0.4s var(--ease-out), border-color 0.3s ease;
        }
        .aur-search__chips button:hover {
          background: var(--cream);
          border-color: var(--cream);
          color: var(--ink);
          transform: translateY(-2px);
        }

        .aur-search__hint p {
          margin: 6px 0 10px;
          font-family: var(--aur-serif), Georgia, serif;
          font-size: 1.8rem;
          font-style: italic;
          color: rgba(246, 239, 232, 0.85);
        }
        .aur-search__hint span {
          font-size: 0.9rem;
          color: rgba(246, 239, 232, 0.5);
        }
        .aur-search__list {
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .aur-search__list li {
          animation: aurResultIn 0.7s var(--ease-expo) calc(var(--i) * 60ms) both;
        }
        @keyframes aurResultIn {
          from {
            opacity: 0;
            transform: translate3d(0, 16px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        .aur-search__list a {
          display: grid;
          grid-template-columns: 64px minmax(0, 1fr) auto 20px;
          align-items: center;
          gap: 18px;
          padding: 12px 14px;
          border-radius: 18px;
          color: var(--cream);
          text-decoration: none;
          transition: background 0.35s ease, transform 0.45s var(--ease-out);
        }
        .aur-search__list a svg:last-child {
          opacity: 0;
          transform: translateX(-8px);
          transition: opacity 0.3s ease, transform 0.45s var(--ease-out);
        }
        .aur-search__list a:hover,
        .aur-search__list a.is-active {
          background: rgba(255, 255, 255, 0.07);
          transform: translateX(6px);
        }
        .aur-search__list a:hover svg:last-child,
        .aur-search__list a.is-active svg:last-child {
          opacity: 1;
          transform: none;
        }
        .aur-search__thumb {
          width: 64px;
          height: 78px;
          border-radius: 12px;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
        }
        .aur-search__info {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }
        .aur-search__info strong {
          font-family: var(--aur-serif), Georgia, serif;
          font-size: 1.4rem;
          font-weight: 400;
          line-height: 1.15;
        }
        .aur-search__info small {
          font-size: 0.8rem;
          color: rgba(246, 239, 232, 0.55);
        }
        .aur-search__price {
          font-size: 0.95rem;
          color: rgba(246, 239, 232, 0.85);
        }
        .aur-search__all {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin: 18px 0 0 14px;
          padding: 0;
          border: 0;
          background: transparent;
          color: var(--blush);
          font: inherit;
          font-size: 0.92rem;
          cursor: pointer;
        }
        .aur-search__all svg {
          transition: transform 0.45s var(--ease-out);
        }
        .aur-search__all:hover svg {
          transform: translateX(6px);
        }

        /* ═══════════════════════════════════════════════════════════════════
           BAG DRAWER
           ═══════════════════════════════════════════════════════════════════ */
        .aur-cart {
          position: fixed;
          inset: 0;
          z-index: 130;
          font-family: var(--aur-sans), system-ui, sans-serif;
          color: var(--cream);
          visibility: hidden;
          transition: visibility 0s linear 0.8s;
        }
        .aur-cart.is-open {
          visibility: visible;
          transition-delay: 0s;
        }
        .aur-cart__backdrop {
          position: absolute;
          inset: 0;
          background: rgba(10, 8, 7, 0.6);
          -webkit-backdrop-filter: blur(5px);
          backdrop-filter: blur(5px);
          opacity: 0;
          transition: opacity 0.6s ease;
        }
        .aur-cart.is-open .aur-cart__backdrop {
          opacity: 1;
        }
        .aur-cart__panel {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          width: min(460px, 100%);
          background: radial-gradient(120% 60% at 100% 0%, #372a22 0%, #1c1815 50%, #171310 100%);
          border-left: 1px solid var(--line);
          box-shadow: -40px 0 90px -30px rgba(0, 0, 0, 0.75);
          transform: translate3d(100%, 0, 0);
          transition: transform 0.8s var(--ease-wipe);
        }
        .aur-cart.is-open .aur-cart__panel {
          transform: none;
        }
        .aur-cart__head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 28px 28px 20px;
          border-bottom: 1px solid var(--line);
        }
        .aur-cart__head h2 {
          margin: 0;
          font-family: var(--aur-serif), Georgia, serif;
          font-size: 2rem;
          font-weight: 400;
        }
        .aur-cart__head h2 span {
          font-size: 1.1rem;
          color: rgba(246, 239, 232, 0.55);
        }
        .aur-cart__head button {
          display: inline-flex;
          padding: 8px;
          border: 0;
          border-radius: 50%;
          background: transparent;
          color: var(--cream);
          cursor: pointer;
          transition: background 0.3s ease, transform 0.5s var(--ease-out);
        }
        .aur-cart__head button:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: rotate(90deg);
        }

        .aur-cart__ship {
          padding: 18px 28px;
          border-bottom: 1px solid var(--line);
          background: rgba(255, 255, 255, 0.03);
        }
        .aur-cart__ship p {
          margin: 0 0 10px;
          font-size: 0.88rem;
          color: rgba(246, 239, 232, 0.8);
        }
        .aur-cart__ship strong {
          font-weight: 600;
          color: var(--blush);
        }
        .aur-cart__bar {
          height: 4px;
          overflow: hidden;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.12);
        }
        .aur-cart__bar i {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #f0dcd2, #c98a63);
          transform-origin: left;
          transition: transform 1s var(--ease-expo);
        }
        .aur-cart__bar i.is-full {
          background: linear-gradient(90deg, #cfe3d2, #8fbf9a);
        }

        .aur-cart__body {
          flex: 1;
          overflow-y: auto;
          padding: 8px 28px;
        }
        .aur-cart__list {
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .aur-cart__list li {
          display: grid;
          grid-template-columns: 84px minmax(0, 1fr) auto;
          gap: 16px;
          padding: 20px 0;
          border-bottom: 1px solid var(--line);
          opacity: 0;
          transform: translate3d(28px, 0, 0);
        }
        .aur-cart.is-open .aur-cart__list li {
          animation: aurCartItem 0.9s var(--ease-expo) calc(var(--i) * 80ms + 350ms) forwards;
        }
        @keyframes aurCartItem {
          to {
            opacity: 1;
            transform: none;
          }
        }
        .aur-cart__thumb {
          width: 84px;
          height: 104px;
          border-radius: 14px;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.12);
        }
        .aur-cart__info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }
        .aur-cart__info > a {
          font-family: var(--aur-serif), Georgia, serif;
          font-size: 1.35rem;
          line-height: 1.15;
          color: #fff;
          text-decoration: none;
        }
        .aur-cart__info > a:hover {
          color: var(--blush);
        }
        .aur-cart__info small {
          font-size: 0.8rem;
          color: rgba(246, 239, 232, 0.55);
        }
        .aur-cart__row {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: auto;
          padding-top: 10px;
        }
        .aur-step {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.24);
        }
        .aur-step button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          padding: 0;
          border: 0;
          border-radius: 50%;
          background: transparent;
          color: var(--cream);
          cursor: pointer;
          transition: background 0.3s ease, transform 0.3s var(--ease-out);
        }
        .aur-step button:hover {
          background: rgba(255, 255, 255, 0.12);
        }
        .aur-step button:active {
          transform: scale(0.85);
        }
        .aur-step span {
          min-width: 26px;
          text-align: center;
          font-size: 0.9rem;
          animation: aurTick 0.4s var(--ease-out);
        }
        @keyframes aurTick {
          from {
            transform: translateY(-6px);
            opacity: 0;
          }
          to {
            transform: none;
            opacity: 1;
          }
        }
        .aur-cart__remove {
          padding: 0;
          border: 0;
          background: transparent;
          color: rgba(246, 239, 232, 0.55);
          font: inherit;
          font-size: 0.8rem;
          text-decoration: underline;
          text-underline-offset: 3px;
          cursor: pointer;
          transition: color 0.3s ease;
        }
        .aur-cart__remove:hover {
          color: #fff;
        }
        .aur-cart__price {
          font-size: 0.95rem;
          color: var(--cream);
        }

        .aur-cart__empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 72px 12px 24px;
          text-align: center;
          color: rgba(246, 239, 232, 0.7);
        }
        .aur-cart__empty svg {
          color: rgba(246, 239, 232, 0.5);
          animation: aurFloat 4.5s ease-in-out infinite;
        }
        .aur-cart__smile {
          stroke-dasharray: 40;
          stroke-dashoffset: 40;
        }
        .aur-cart.is-open .aur-cart__smile {
          animation: aurDraw 1.2s ease 0.7s forwards;
        }
        @keyframes aurDraw {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes aurFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }
        .aur-cart__empty h3 {
          margin: 14px 0 0;
          font-family: var(--aur-serif), Georgia, serif;
          font-size: 1.9rem;
          font-weight: 400;
          color: #fff;
        }
        .aur-cart__empty p {
          margin: 0 0 22px;
          font-size: 0.95rem;
        }

        .aur-cart__foot {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 22px 28px 28px;
          border-top: 1px solid var(--line);
          background: rgba(0, 0, 0, 0.18);
        }
        .aur-cart__total {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
        }
        .aur-cart__total span {
          font-size: 0.9rem;
          color: rgba(246, 239, 232, 0.7);
        }
        .aur-cart__total strong {
          font-family: var(--aur-serif), Georgia, serif;
          font-size: 1.9rem;
          font-weight: 400;
          color: #fff;
        }
        .aur-cart__foot p {
          margin: -4px 0 6px;
          font-size: 0.78rem;
          color: rgba(246, 239, 232, 0.5);
        }

        /* ═══════════════════════════════════════════════════════════════════
           MOBILE MENU
           ═══════════════════════════════════════════════════════════════════ */
        .aur-mobile {
          position: fixed;
          inset: 0;
          z-index: 90;
          background: radial-gradient(120% 80% at 80% 0%, #3a2c24 0%, #1a1614 60%);
          color: var(--cream);
          font-family: var(--aur-sans), system-ui, sans-serif;
          clip-path: circle(0% at calc(100% - 44px) 44px);
          visibility: hidden;
          transition: clip-path 0.9s var(--ease-wipe), visibility 0s linear 0.9s;
        }
        .aur-mobile.is-open {
          clip-path: circle(150% at calc(100% - 44px) 44px);
          visibility: visible;
          transition-delay: 0s;
        }
        .aur-mobile__inner {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 28px;
          height: 100%;
          padding: 108px 28px 32px;
          overflow-y: auto;
        }
        .aur-mobile__search,
        .aur-mobile__group,
        .aur-mobile__foot {
          opacity: 0;
          transform: translate3d(0, 26px, 0);
          transition: opacity 0.3s ease, transform 0.3s ease;
        }
        .aur-mobile.is-open .aur-mobile__search,
        .aur-mobile.is-open .aur-mobile__group,
        .aur-mobile.is-open .aur-mobile__foot {
          opacity: 1;
          transform: none;
          transition: opacity 0.8s ease calc(var(--i) * 80ms + 380ms), transform 0.9s var(--ease-expo) calc(var(--i) * 80ms + 380ms);
        }
        .aur-mobile__search {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 14px 18px;
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.04);
          color: rgba(246, 239, 232, 0.75);
          font: inherit;
          font-size: 0.95rem;
          text-align: left;
          cursor: pointer;
        }
        .aur-mobile__links {
          flex: 1;
        }
        .aur-mobile__group {
          padding: 4px 0;
        }
        .aur-mobile__row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .aur-mobile__link {
          display: inline-block;
          font-family: var(--aur-serif), Georgia, serif;
          font-size: clamp(2.3rem, 9.5vw, 3.1rem);
          line-height: 1.15;
          color: var(--cream);
          text-decoration: none;
        }
        .aur-mobile__link.is-active {
          font-style: italic;
          color: var(--copper);
        }
        .aur-mobile__toggle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          padding: 0;
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 50%;
          background: transparent;
          color: var(--cream);
          cursor: pointer;
          transition: transform 0.5s var(--ease-out), background 0.3s ease;
        }
        .aur-mobile__toggle.is-open {
          transform: rotate(135deg);
          background: rgba(255, 255, 255, 0.1);
        }
        .aur-mobile__sub {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.6s var(--ease-out);
        }
        .aur-mobile__sub.is-open {
          grid-template-rows: 1fr;
        }
        .aur-mobile__sub > div {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 20px;
          min-height: 0;
          overflow: hidden;
        }
        .aur-mobile__sub.is-open > div {
          padding: 10px 0 14px;
        }
        .aur-mobile__sub a {
          font-size: 0.98rem;
          color: rgba(246, 239, 232, 0.65);
          text-decoration: none;
        }
        .aur-mobile__sub a:hover {
          color: #fff;
        }
        .aur-mobile__foot {
          display: flex;
          flex-direction: column;
          gap: 18px;
          padding-top: 22px;
          border-top: 1px solid rgba(255, 255, 255, 0.14);
        }
        .aur-mobile__quick,
        .aur-mobile__social {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 24px;
        }
        .aur-mobile__quick a,
        .aur-mobile__quick button {
          padding: 0;
          border: 0;
          background: transparent;
          color: var(--cream);
          font: inherit;
          font-size: 0.95rem;
          text-decoration: none;
          cursor: pointer;
        }
        .aur-mobile__social a {
          font-size: 0.82rem;
          letter-spacing: 0.08em;
          color: rgba(246, 239, 232, 0.55);
          text-decoration: none;
        }

        /* ═══════════════════════════════════════════════════════════════════
           FOCUS
           ═══════════════════════════════════════════════════════════════════ */
        .aur-shell a:focus-visible,
        .aur-shell button:focus-visible,
        .aur-shell input:focus-visible {
          outline: 2px solid var(--copper);
          outline-offset: 3px;
          border-radius: 10px;
        }
        .aur-search__form input:focus-visible {
          outline: none;
        }

        /* ═══════════════════════════════════════════════════════════════════
           RESPONSIVE
           ═══════════════════════════════════════════════════════════════════ */
        @media (max-width: 1024px) {
          .aur-links,
          .aur-mega,
          .aur-dim {
            display: none;
          }
          .aur-nav__bar {
            grid-template-columns: 1fr auto;
            height: 76px;
          }
          .aur-logo {
            font-size: 2.1rem;
          }
          .aur-burger {
            display: inline-block;
          }
          .aur-search__body {
            grid-template-columns: 1fr;
            gap: 32px;
          }
        }

        @media (max-width: 640px) {
          .aur-icon--hide-sm,
          .aur-account {
            display: none;
          }
          .aur-actions {
            gap: 4px;
          }
          .aur-announce__inner {
            padding: 0 40px 0 16px;
            font-size: 0.74rem;
          }
          .aur-announce__icon {
            display: none;
          }
          .aur-search__top {
            padding-top: 28px;
          }
          .aur-search__form kbd {
            display: none;
          }
          .aur-search__list a {
            grid-template-columns: 56px minmax(0, 1fr) auto;
          }
          .aur-search__list a svg:last-child {
            display: none;
          }
          .aur-cart__list li {
            grid-template-columns: 72px minmax(0, 1fr);
          }
          .aur-cart__price {
            grid-column: 2;
          }
          .aur-cart__thumb {
            width: 72px;
            height: 92px;
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           REDUCED MOTION
           ═══════════════════════════════════════════════════════════════════ */
        @media (prefers-reduced-motion: reduce) {
          .aur-shell *,
          .aur-shell *::before,
          .aur-shell *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            transition-delay: 0s !important;
          }
        }
      `}</style>
    </div>
  );
}