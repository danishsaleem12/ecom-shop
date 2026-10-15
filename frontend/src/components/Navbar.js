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
 *   products             optional. Leave it out and the live search asks the backend
 *                        (GET /api/products?search=). Pass [{ id, name, category, price, href }]
 *                        only if you want to search a fixed list instead.
 *   freeShippingThreshold number (default: the store's free-shipping threshold from GET /api/config)
 *   currency             string (default 'Rs ')
 *   onSearch(query)      optional; if omitted the router goes to /shop?search=
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { API_URL, imageSrc } from '@/lib/imageUrl';
import { STORE } from '@/lib/store';
import { pkr } from '@/lib/policy';
import { usePolicy } from '@/context/PolicyContext';
import './styles/Navbar.css';
import { SITE_IMAGES } from '@/lib/siteImages';

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
          ],
        },
      ],
      cards: [
        {
          kicker: 'Just landed',
          title: 'New arrivals',
          href: '/shop?sort=new',
          image: SITE_IMAGES.navCards.newArrivals,
        },
        {
          kicker: 'Best loved',
          title: 'The summer dress edit',
          href: '/shop?category=dresses',
          image: SITE_IMAGES.navCards.summerDresses,
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
            { label: 'Everyday essentials', href: '/collections/everyday-essentials' },
          ],
        },
      ],
      cards: [
        {
          kicker: 'Spring Summer',
          title: 'Sun-washed neutrals',
          href: '/collections/spring-summer',
          image: SITE_IMAGES.navCards.springSummer,
        },
        {
          kicker: 'After dark',
          title: 'The evening collection',
          href: '/collections/evening',
          image: SITE_IMAGES.navCards.evening,
        },
      ],
    },
  },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

// Default announcement texts. The numbers come from the backend (GET /api/config) via usePolicy(), so they can never
// disagree with what checkout charges or what the Terms say.
const defaultAnnouncements = (policy) => [
  `Complimentary shipping on orders of ${pkr(policy.freeShippingThreshold)} or more`,
  'New season has arrived: shop Spring Summer',
  `Easy returns within ${policy.returnWindowDays} days of delivery`,
];

const socialLinks = [
  ['Instagram', STORE.social.instagram],
  ['Facebook', STORE.social.facebook],
  ['TikTok', STORE.social.tiktok],
  ['Pinterest', STORE.social.pinterest],
].filter(([, url]) => url);

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
  const [paused, setPaused] = useState(false); // hovering or focusing the bar stops the rotation (WCAG 2.2.2)

  useEffect(() => {
    if (messages.length < 2 || paused) return undefined;
    const id = setInterval(() => setIndex((i) => (i + 1) % messages.length), 4200);
    return () => clearInterval(id);
  }, [messages.length, paused]);

  return (
    <div
      className="aur-announce"
      role="region"
      aria-label="Announcements"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="aur-announce__inner">
        <span className="aur-announce__icon">
          <TruckIcon />
        </span>
        <div className="aur-announce__track" aria-live="off">
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

  /* Live results come from the backend (GET /api/products?search=). `remote` remembers which
     query it answers, so "still loading" is simply "remote.q is not the current query yet". */
  const [remote, setRemote] = useState({ q: '', items: [], failed: false });
  const trimmed = query.trim();
  const useFixedList = Array.isArray(products);

  useEffect(() => {
    if (useFixedList || !trimmed) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/api/products?search=${encodeURIComponent(trimmed)}&limit=6`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('search failed');
        const list = await res.json();
        setRemote({
          q: trimmed,
          failed: false,
          items: list.map((p) => ({
            id: p._id,
            name: p.name,
            category: p.category,
            price: p.price,
            image: p.image ? imageSrc(p.image) : undefined,
            href: `/shop/${p._id}`,
          })),
        });
      } catch (err) {
        if (err?.name === 'AbortError') return;
        setRemote({ q: trimmed, items: [], failed: true });
      }
    }, 250); // wait for a pause in typing so we don't fire a request per keystroke
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed, useFixedList]);

  const results = useMemo(() => {
    if (!trimmed) return [];
    if (useFixedList) {
      const q = trimmed.toLowerCase();
      return products.filter((p) => `${p.name} ${p.category}`.toLowerCase().includes(q)).slice(0, 6);
    }
    return remote.q === trimmed ? remote.items : [];
  }, [trimmed, useFixedList, products, remote]);

  const searching = !useFixedList && !!trimmed && remote.q !== trimmed;
  const searchFailed = !useFixedList && remote.q === trimmed && remote.failed;

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

            {hasQuery && searching && (
              <div className="aur-search__hint">
                <p>Searching&hellip;</p>
              </div>
            )}

            {hasQuery && searchFailed && (
              <div className="aur-search__hint">
                <p>We couldn&apos;t search just now.</p>
                <span>Check your connection and try again.</span>
              </div>
            )}

            {hasQuery && !searching && !searchFailed && results.length === 0 && (
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
  announcements: announcementsProp,
  products,
  freeShippingThreshold: freeShippingProp,
  currency = 'Rs ',
  onSearch,
}) {
  const pathname = usePathname();
  const router = useRouter();
  const policy = usePolicy();
  const freeShippingThreshold = freeShippingProp ?? policy.freeShippingThreshold;
  const announcements = useMemo(
    () => announcementsProp ?? defaultAnnouncements(policy),
    [announcementsProp, policy]
  );

  // Real cart, straight from context — no page needs to pass cart data in.
  const { items: rawCartItems, count: contextCartCount, updateQty, removeItem } = useCart();

  // Real auth, straight from context — no page needs to pass user/onSignOut in.
  const { user, logout } = useAuth();

  const cartItems = useMemo(
    () =>
      rawCartItems.map((it) => ({
        id: it.key || it.id, // the bag line (product + option); the drawer uses it to change/remove that line
        name: it.name,
        variant: [it.size, it.color].filter(Boolean).join(' / ') || undefined,
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
                    <Link href="/account/addresses" role="menuitem" tabIndex={accountOpen ? 0 : -1}>
                      Saved addresses
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
            {/* Your own profiles from src/lib/store.js. Any that are empty there are not shown. */}
            {socialLinks.length > 0 && (
              <div className="aur-mobile__social">
                {socialLinks.map(([label, url]) => (
                  <a key={label} href={url} target="_blank" rel="noopener noreferrer" tabIndex={menuOpen ? 0 : -1}>
                    {label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}