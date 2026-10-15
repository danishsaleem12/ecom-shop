'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AURELIA · CONTACT HERO
 * ─────────────────────────────────────────────────────────────────────────────
 *  Place at: frontend/src/components/ContactHero.js
 *  Use:      <ContactHero />   inside src/app/contact/page.js, under your <Navbar />
 *
 *  Single full-bleed editorial photo with copy on the left and a "Get in touch"
 *  details column on the right. Same theme, tokens, easing curves and
 *  atmosphere as Hero.js / AboutHero.js:
 *   • Letter-stagger eyebrow with hairline, line-mask headline reveal and an
 *     italic shimmer accent line
 *   • Ken Burns settle + mouse parallax on the photo
 *   • Golden-dust canvas pushed away by the cursor, sun glow, grain, vignette,
 *     left + right shade so both text columns stay legible
 *   • Right column: hairline title, four contact rows (icon, label, value) that
 *     fade in one after another; each row is a real mailto / tel / maps link
 *   • Magnetic circular "Scroll to explore" button (bottom left)
 *   • Custom cursor ring with data-cursor labels
 *   • Reduced-motion and touch-device fallbacks, stacks neatly on mobile
 *
 *  Image
 *   Uses a free Unsplash placeholder for now. Save your own photo (the woman on
 *   the terrace) as /public/images/contact/contact-hero.jpg and pass it in:
 *     <ContactHero image="/images/contact/contact-hero.jpg" />
 *   Remote images are loaded with `unoptimized`, so no next.config.js change
 *   is needed.
 *
 *  Props (all optional)
 *   eyebrow, titleLines: [{ text, accent }], description
 *   infoTitle, contacts: [{ icon, label, value, href }]
 *   scrollLabel, scrollTarget (element id to scroll to, defaults to next screen)
 *   image, imageAlt, imagePosition, accent: [c1, c2, c3]
 *
 *  NOTE: every class starts with "ch-" (keyframes with "ch") so nothing clashes
 *  with the other sections' global styles when they share a page.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Cormorant_Garamond, Figtree } from 'next/font/google';
import { STORE, addressOneLine, mapsHref, telHref, hoursOneLine } from '@/lib/store';
import './styles/ContactHero.css';

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

const unsplash = (id, width = 2400) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=80`;

const isRemote = (src) => /^https?:\/\//i.test(src);

/** Minimum time the reveal waits before running, so it never feels rushed. */
const READY_MIN_MS = 260;
/** Hard cap so a slow image never blocks the reveal. */
const READY_MAX_MS = 3200;

/* ═════════════════════════════════════════════════════════════════════════════
   ICONS
   ═════════════════════════════════════════════════════════════════════════════ */

const iconProps = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

const MailIcon = () => (
  <svg {...iconProps}>
    <rect x="3" y="5.5" width="18" height="13" rx="1.5" />
    <path d="m3.5 7 8.5 6.5L20.5 7" />
  </svg>
);

const HeadsetIcon = () => (
  <svg {...iconProps}>
    <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
    <rect x="3" y="13.5" width="3.6" height="5.5" rx="1.6" />
    <rect x="17.4" y="13.5" width="3.6" height="5.5" rx="1.6" />
    <path d="M19.2 19c0 1.6-1.8 2.4-4.4 2.4" />
  </svg>
);

const PinIcon = () => (
  <svg {...iconProps}>
    <path d="M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 0 1 13 0c0 5.3-6.5 11-6.5 11Z" />
    <circle cx="12" cy="10" r="2.3" />
  </svg>
);

const ClockIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5.2l3.2 2" />
  </svg>
);

const ArrowDown = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 4v16M6 14l6 6 6-6" />
  </svg>
);

/* ═════════════════════════════════════════════════════════════════════════════
   DATA — edit copy here
   ═════════════════════════════════════════════════════════════════════════════ */

// All values come from src/lib/store.js
const CONTACTS = [
  { icon: <MailIcon />, label: 'General Enquiries', value: STORE.email, href: `mailto:${STORE.email}` },
  { icon: <HeadsetIcon />, label: 'Customer Care', value: STORE.phone, href: telHref() },
  { icon: <PinIcon />, label: 'Our Studio', value: addressOneLine(), href: mapsHref() },
  { icon: <ClockIcon />, label: 'Opening Hours', value: hoursOneLine() },
].filter((c) => c.value); // anything left empty in store.js is not shown

/* ═════════════════════════════════════════════════════════════════════════════
   HOOKS
   ═════════════════════════════════════════════════════════════════════════════ */

/** Magnetic hover: the element leans toward the cursor when it gets close. */
function useMagnetic(strength = 0.32, radius = 70) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (window.matchMedia('(pointer: coarse)').matches) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    let active = false;

    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
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
   SMALL COMPONENTS (lifted from Hero.js / AboutHero.js)
   ═════════════════════════════════════════════════════════════════════════════ */

/** Splits text into letters so each one can fade in with a stagger. */
function SplitLetters({ text, step = 34, start = 0 }) {
  return (
    <span aria-label={text}>
      {text.split('').map((ch, i) => (
        <span key={`${ch}-${i}`} className="ch-letter" aria-hidden="true" style={{ animationDelay: `${start + i * step}ms` }}>
          {ch === ' ' ? '\u00A0' : ch}
        </span>
      ))}
    </span>
  );
}

/** Golden dust drifting through the sunlight, nudged away from the cursor. */
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
      x: rand(width * 0.3, width),
      y: initial ? rand(0, height) : height + rand(0, 60),
      r: rand(0.6, 2.6),
      vx: rand(-0.1, 0.28),
      vy: rand(-0.5, -0.08),
      alpha: rand(0.25, 0.95),
      phase: rand(0, Math.PI * 2),
      speed: rand(0.008, 0.028),
      halo: rand(3, 7),
    });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = width < 820 ? 22 : 64;
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
        if (d2 < 150 * 150) {
          const d = Math.sqrt(d2) || 1;
          const force = (150 - d) / 150;
          p.x += (dx / d) * force * 2.6;
          p.y += (dy / d) * force * 2.6;
        }

        p.x += p.vx + Math.sin(p.phase) * 0.12;
        p.y += p.vy;
        p.phase += p.speed;

        if (p.y < -20 || p.x > width + 20 || p.x < -20) {
          particles[i] = spawn(false);
          continue;
        }

        const twinkle = 0.55 + 0.45 * Math.sin(p.phase * 2.2);
        const a = p.alpha * twinkle;

        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 210, 150, ${(a * 0.16).toFixed(3)})`;
        ctx.arc(p.x, p.y, p.r * p.halo, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 232, 196, ${a.toFixed(3)})`;
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

  return <canvas ref={canvasRef} className="ch-dust" aria-hidden="true" />;
}

/** Follows the mouse with a soft ring; grows + labels over clickable things. */
function HeroCursor({ rootRef, enabled }) {
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
      <div ref={ringRef} className={`ch-cursor ${visible ? 'is-visible' : ''} ${grow ? 'is-grow' : ''} ${label ? 'has-label' : ''}`} aria-hidden="true">
        <span className="ch-cursor__label">{label}</span>
      </div>
      <div ref={dotRef} className={`ch-cursor-dot ${visible ? 'is-visible' : ''} ${grow ? 'is-grow' : ''}`} aria-hidden="true" />
    </>
  );
}

/** One contact row: icon, label, value. Renders as a link when it has an href. */
function ContactRow({ item, index }) {
  const body = (
    <>
      <span className="ch-row__icon">{item.icon}</span>
      <span className="ch-row__body">
        <span className="ch-row__label">{item.label}</span>
        <span className="ch-row__value">{item.value}</span>
      </span>
    </>
  );

  const style = { '--i': index };

  if (item.href) {
    const external = /^https?:\/\//i.test(item.href);
    return (
      <li className="ch-row" style={style}>
        <a
          href={item.href}
          className="ch-row__link"
          data-cursor={external ? 'Open' : item.href.startsWith('tel:') ? 'Call' : 'Write'}
          {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
        >
          {body}
        </a>
      </li>
    );
  }

  return (
    <li className="ch-row" style={style}>
      <div className="ch-row__link ch-row__link--static">{body}</div>
    </li>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   CONTACT HERO
   ═════════════════════════════════════════════════════════════════════════════ */

export default function ContactHero({
  eyebrow = 'Contact Aurelia',
  titleLines = [{ text: 'Let’s Begin a' }, { text: 'Conversation.', accent: true }],
  description = 'Whether you have a question about a piece, an order, or simply want to say hello, we’d love to hear from you.',
  infoTitle = 'Get in touch',
  contacts = CONTACTS,
  scrollLabel = 'Scroll to explore',
  scrollTarget,
  image = unsplash('photo-1700317440744-a126fc87b900'),
  imageAlt = 'Woman in a lace dress looking out over the sea from a sunlit stone terrace',
  imagePosition = '50% 40%',
  accent = ['#f3ddd2', '#dcae94', '#b9724b'],
}) {
  const rootRef = useRef(null);
  const magnetScroll = useMagnetic(0.35, 60);

  const [tabHidden, setTabHidden] = useState(false);
  const [inView, setInView] = useState(true);
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [ready, setReady] = useState(false);

  /* ── reveal gate: waits for the photo (capped) ───────────────────────── */
  useEffect(() => {
    const min = setTimeout(() => setMinTimePassed(true), READY_MIN_MS);
    const max = setTimeout(() => setImageLoaded(true), READY_MAX_MS);
    return () => {
      clearTimeout(min);
      clearTimeout(max);
    };
  }, []);

  useEffect(() => {
    if (minTimePassed && imageLoaded) setReady(true);
  }, [minTimePassed, imageLoaded]);

  /* ── visibility: tab hidden + scrolled out of view ───────────────────── */
  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* ── pointer: parallax ───────────────────────────────────────────────── */
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
    const target = scrollTarget ? document.getElementById(scrollTarget) : null;
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const h = rootRef.current ? rootRef.current.offsetHeight : window.innerHeight;
    window.scrollTo({ top: h, behavior: 'smooth' });
  }, [scrollTarget]);

  return (
    <section
      ref={rootRef}
      className={`${serif.variable} ${sans.variable} ch ${ready ? 'is-ready' : ''} ${inView ? '' : 'is-offscreen'}`}
      style={{ '--a1': accent[0], '--a2': accent[1], '--a3': accent[2] }}
      aria-label="Contact Aurelia"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {/* ── Background photo ─────────────────────────────────────────── */}
      <div className="ch__media" aria-hidden="true">
        <div className="ch__parallax">
          <div className="ch__kb">
            <Image
              src={image}
              alt={imageAlt}
              fill
              sizes="100vw"
              priority
              quality={90}
              unoptimized={isRemote(image)}
              onLoad={() => setImageLoaded(true)}
              style={{ objectFit: 'cover', objectPosition: imagePosition }}
            />
          </div>
        </div>
      </div>

      {/* ── Light, atmosphere, particles ─────────────────────────────── */}
      <div className="ch__shade" />
      <div className="ch__sun" />
      <div className="ch__sun ch__sun--b" />
      <DustCanvas running={ready && inView && !tabHidden} />
      <div className="ch__vignette" />
      <div className="ch__grain" />

      {/* ── Content ──────────────────────────────────────────────────── */}
      <div className="ch__inner">
        {/* Left: copy */}
        <div className="ch-copy">
          <p className="ch-eyebrow">
            <span className="ch-eyebrow__label">
              <SplitLetters text={eyebrow} start={80} />
            </span>
            <i className="ch-eyebrow__line" />
          </p>

          <h1 className="ch-title">
            {titleLines.map((line, i) => (
              <span className="ch-line" key={i}>
                <span
                  className={`ch-line__in ${line.accent ? 'ch-line__in--accent' : ''}`}
                  style={{ animationDelay: `${160 + i * 140}ms` }}
                >
                  {line.text}
                </span>
              </span>
            ))}
          </h1>

          <p className="ch-text">{description}</p>
        </div>

        {/* Right: get in touch */}
        <aside className="ch-info" aria-label={infoTitle}>
          <p className="ch-info__title">
            <span>{infoTitle}</span>
            <i className="ch-info__line" />
          </p>
          <ul className="ch-info__list">
            {contacts.map((item, i) => (
              <ContactRow key={item.label} item={item} index={i} />
            ))}
          </ul>
        </aside>
      </div>

      {/* ── Scroll cue, bottom left ──────────────────────────────────── */}
      <span ref={magnetScroll} className="ch-magnet ch-scroll-wrap">
        <button type="button" className="ch-scroll" onClick={scrollDown} aria-label={scrollLabel} data-cursor="Scroll">
          <span className="ch-scroll__circle">
            <ArrowDown />
          </span>
          <span className="ch-scroll__label">{scrollLabel}</span>
        </button>
      </span>

      <HeroCursor rootRef={rootRef} enabled={ready} />

    </section>
  );
}