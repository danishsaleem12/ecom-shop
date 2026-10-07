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

const CONTACTS = [
  { icon: <MailIcon />, label: 'General Enquiries', value: 'hello@aurelia.com', href: 'mailto:hello@aurelia.com' },
  { icon: <HeadsetIcon />, label: 'Customer Care', value: '+1 (555) 123-4567', href: 'tel:+15551234567' },
  {
    icon: <PinIcon />,
    label: 'Our Studio',
    value: '123 Fashion Lane, New York, NY 10001',
    href: 'https://maps.google.com/?q=123+Fashion+Lane,+New+York,+NY+10001',
  },
  { icon: <ClockIcon />, label: 'Opening Hours', value: 'Mon – Fri: 9am – 6pm (EST)' },
];

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

      <style jsx global>{`
        /* ═══════════════════════════════════════════════════════════════════
           ROOT — same tokens as Hero.js
           ═══════════════════════════════════════════════════════════════════ */
        .ch {
          --cream: #f6efe8;
          --blush: #f0dcd2;
          --copper: #c98a63;
          --ink: #211b18;
          --a1: #f3ddd2;
          --a2: #dcae94;
          --a3: #b9724b;
          --gutter: clamp(22px, 6.6vw, 124px);
          --gutter-r: clamp(22px, 5.4vw, 104px);
          --ease-out: cubic-bezier(0.22, 0.8, 0.2, 1);
          --ease-expo: cubic-bezier(0.19, 1, 0.22, 1);
          --mx: 0;
          --my: 0;
          position: relative;
          width: 100%;
          height: 100vh;
          height: 100svh;
          min-height: 680px;
          overflow: hidden;
          background: #171310;
          color: var(--cream);
          font-family: var(--aur-serif), Georgia, serif;
          isolation: isolate;
        }
        .ch a,
        .ch button {
          -webkit-tap-highlight-color: transparent;
        }

        @keyframes chFade {
          from {
            opacity: 0;
            transform: translate3d(0, 16px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        @keyframes chGrow {
          from {
            transform: scaleX(0);
          }
          to {
            transform: scaleX(1);
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           BACKGROUND PHOTO
           ═══════════════════════════════════════════════════════════════════ */
        .ch__media {
          position: absolute;
          inset: 0;
          z-index: 1;
        }
        .ch__parallax {
          position: absolute;
          inset: -3%;
          transform: translate3d(calc(var(--mx) * -26px), calc(var(--my) * -16px), 0);
          transition: transform 0.9s cubic-bezier(0.2, 0.7, 0.2, 1);
          will-change: transform;
        }
        .ch__kb {
          position: absolute;
          inset: 0;
          transform: scale(1.1);
        }
        .ch.is-ready .ch__kb {
          animation: chKB 13s cubic-bezier(0.2, 0.6, 0.3, 1) forwards;
        }
        @keyframes chKB {
          from {
            transform: scale(1.14) translate3d(1.4%, 0.6%, 0);
          }
          to {
            transform: scale(1) translate3d(0, 0, 0);
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           ATMOSPHERE — Hero.js layers, plus a right shade for the info column
           ═══════════════════════════════════════════════════════════════════ */
        .ch__shade {
          position: absolute;
          inset: 0;
          z-index: 4;
          pointer-events: none;
          background:
            linear-gradient(90deg, rgba(21, 18, 15, 0.82) 0%, rgba(21, 18, 15, 0.6) 22%, rgba(21, 18, 15, 0.16) 46%, rgba(21, 18, 15, 0) 62%),
            linear-gradient(270deg, rgba(21, 18, 15, 0.55) 0%, rgba(21, 18, 15, 0.3) 22%, rgba(21, 18, 15, 0) 44%),
            linear-gradient(180deg, rgba(21, 18, 15, 0.5) 0%, rgba(21, 18, 15, 0) 22%),
            linear-gradient(0deg, rgba(21, 18, 15, 0.55) 0%, rgba(21, 18, 15, 0) 28%);
        }

        .ch__sun {
          position: absolute;
          inset: 0;
          z-index: 4;
          pointer-events: none;
          mix-blend-mode: soft-light;
          background: radial-gradient(60% 70% at 62% 30%, rgba(255, 214, 160, 0.6), rgba(255, 214, 160, 0) 70%);
          animation: chSun 9s ease-in-out infinite alternate;
        }
        .ch__sun--b {
          background: radial-gradient(40% 50% at 92% 8%, rgba(255, 236, 200, 0.55), rgba(255, 236, 200, 0) 70%);
          animation-duration: 13s;
          animation-direction: alternate-reverse;
        }
        @keyframes chSun {
          from {
            opacity: 0.5;
            transform: translate3d(0, 0, 0) scale(1);
          }
          to {
            opacity: 1;
            transform: translate3d(-2.5%, 2.5%, 0) scale(1.06);
          }
        }

        .ch-dust {
          position: absolute;
          inset: 0;
          z-index: 5;
          width: 100%;
          height: 100%;
          pointer-events: none;
          opacity: 0;
          transition: opacity 2s ease 0.4s;
        }
        .ch.is-ready .ch-dust {
          opacity: 1;
        }

        .ch__vignette {
          position: absolute;
          inset: 0;
          z-index: 5;
          pointer-events: none;
          background: radial-gradient(120% 100% at 55% 50%, rgba(0, 0, 0, 0) 55%, rgba(8, 6, 5, 0.5) 100%);
        }

        .ch__grain {
          position: absolute;
          inset: 0;
          z-index: 6;
          pointer-events: none;
          opacity: 0.085;
          mix-blend-mode: overlay;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
          animation: chGrain 1.2s steps(6) infinite;
        }
        @keyframes chGrain {
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
           LAYOUT
           ═══════════════════════════════════════════════════════════════════ */
        .ch__inner {
          position: relative;
          z-index: 10;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 96px var(--gutter-r) 96px var(--gutter);
        }

        /* ═══════════════════════════════════════════════════════════════════
           LEFT — copy
           ═══════════════════════════════════════════════════════════════════ */
        .ch-copy {
          max-width: 640px;
          margin-top: -6vh;
          transform: translate3d(calc(var(--mx) * 8px), 0, 0);
          transition: transform 0.8s cubic-bezier(0.2, 0.7, 0.2, 1);
        }

        .ch-eyebrow {
          display: flex;
          align-items: center;
          gap: 16px;
          margin: 0 0 clamp(18px, 2vw, 28px);
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: 0.68rem;
          font-weight: 400;
          letter-spacing: 0.34em;
          text-transform: uppercase;
          color: rgba(246, 239, 232, 0.9);
        }
        .ch-letter {
          display: inline-block;
          opacity: 0;
        }
        .ch.is-ready .ch-letter {
          animation: chLetter 0.9s var(--ease-expo) both;
        }
        @keyframes chLetter {
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
        .ch-eyebrow__line {
          display: block;
          width: 46px;
          height: 1px;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0));
          transform: scaleX(0);
          transform-origin: left;
        }
        .ch.is-ready .ch-eyebrow__line {
          animation: chGrow 1.4s var(--ease-out) 0.7s both;
        }

        .ch-title {
          margin: 0;
          font-weight: 400;
          font-size: clamp(3rem, 5.4vw, 6rem);
          line-height: 1.02;
          letter-spacing: -0.02em;
          color: #fff;
        }
        .ch-line {
          display: block;
          overflow: hidden;
          padding: 0.04em 0.2em 0.14em 0;
          margin-bottom: -0.1em;
        }
        .ch-line__in {
          display: inline-block;
          transform: translate3d(0, 115%, 0) rotate(3deg);
          transform-origin: left bottom;
        }
        .ch.is-ready .ch-line__in {
          animation: chRise 1.35s var(--ease-expo) both;
        }
        .ch-line__in--accent {
          font-style: italic;
          padding-right: 0.08em;
          background: linear-gradient(95deg, var(--a1) 0%, var(--a2) 45%, var(--a3) 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }
        .ch.is-ready .ch-line__in--accent {
          animation: chRise 1.35s var(--ease-expo) both, chShimmer 7s ease-in-out 1.8s infinite alternate;
        }
        @keyframes chRise {
          from {
            transform: translate3d(0, 115%, 0) rotate(3deg);
          }
          to {
            transform: translate3d(0, 0, 0) rotate(0);
          }
        }
        @keyframes chShimmer {
          from {
            background-position: 0% 50%;
          }
          to {
            background-position: 100% 50%;
          }
        }

        .ch-text {
          margin: 30px 0 0;
          max-width: 34ch;
          font-size: clamp(1.02rem, 1.2vw, 1.22rem);
          font-weight: 400;
          line-height: 1.62;
          color: rgba(246, 239, 232, 0.92);
          opacity: 0;
        }
        .ch.is-ready .ch-text {
          animation: chFade 1.2s ease 0.62s both;
        }

        /* ═══════════════════════════════════════════════════════════════════
           RIGHT — get in touch
           ═══════════════════════════════════════════════════════════════════ */
        .ch-info {
          position: absolute;
          top: 23%;
          right: var(--gutter-r);
          width: clamp(280px, 27vw, 400px);
          transform: translate3d(calc(var(--mx) * -10px), calc(var(--my) * -6px), 0);
          transition: transform 0.9s cubic-bezier(0.2, 0.7, 0.2, 1);
        }
        .ch-info__title {
          display: flex;
          align-items: center;
          gap: 16px;
          margin: 0 0 clamp(20px, 2.4vw, 32px);
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: 0.62rem;
          font-weight: 500;
          letter-spacing: 0.34em;
          text-transform: uppercase;
          color: rgba(246, 239, 232, 0.92);
          opacity: 0;
        }
        .ch.is-ready .ch-info__title {
          animation: chFade 1.2s ease 0.95s both;
        }
        .ch-info__line {
          display: block;
          width: 42px;
          height: 1px;
          background: linear-gradient(90deg, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0));
          transform: scaleX(0);
          transform-origin: left;
        }
        .ch.is-ready .ch-info__line {
          animation: chGrow 1.4s var(--ease-out) 1.25s both;
        }

        .ch-info__list {
          display: flex;
          flex-direction: column;
          gap: clamp(20px, 2.5vw, 32px);
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .ch-row {
          opacity: 0;
        }
        .ch.is-ready .ch-row {
          animation: chFade 1.1s ease calc(var(--i) * 130ms + 1.1s) both;
        }
        .ch-row__link {
          display: flex;
          align-items: flex-start;
          gap: 18px;
          color: inherit;
          text-decoration: none;
        }
        .ch-row__icon {
          flex: 0 0 auto;
          display: inline-flex;
          margin-top: 2px;
          color: rgba(246, 239, 232, 0.95);
          transition: color 0.4s ease, transform 0.5s var(--ease-out);
        }
        .ch-row__link:hover .ch-row__icon,
        .ch-row__link:focus-visible .ch-row__icon {
          color: var(--a2);
          transform: translateY(-2px) scale(1.08);
        }
        .ch-row__body {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }
        .ch-row__label {
          font-size: clamp(1.02rem, 1.12vw, 1.16rem);
          font-weight: 500;
          line-height: 1.2;
          color: #fff;
        }
        .ch-row__value {
          position: relative;
          align-self: flex-start;
          font-size: clamp(0.88rem, 0.98vw, 1rem);
          font-weight: 400;
          line-height: 1.4;
          color: rgba(246, 239, 232, 0.86);
        }
        .ch-row__link:not(.ch-row__link--static) .ch-row__value::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          bottom: -2px;
          height: 1px;
          background: currentColor;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.6s var(--ease-out);
        }
        .ch-row__link:not(.ch-row__link--static):hover .ch-row__value::after,
        .ch-row__link:not(.ch-row__link--static):focus-visible .ch-row__value::after {
          transform: scaleX(1);
        }

        /* ═══════════════════════════════════════════════════════════════════
           SCROLL CUE — bottom left
           ═══════════════════════════════════════════════════════════════════ */
        .ch-magnet {
          display: inline-flex;
          transition: transform 0.7s var(--ease-out);
          will-change: transform;
        }
        .ch-magnet.is-magnet {
          transition-duration: 0.22s;
        }
        .ch-scroll-wrap {
          position: absolute;
          z-index: 10;
          left: var(--gutter);
          bottom: 40px;
          opacity: 0;
        }
        .ch.is-ready .ch-scroll-wrap {
          animation: chFade 1.3s ease 1.5s both;
        }
        .ch-scroll {
          display: inline-flex;
          align-items: center;
          gap: 16px;
          padding: 0;
          border: 0;
          background: transparent;
          color: var(--cream);
          font: inherit;
          cursor: pointer;
        }
        .ch-scroll__circle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 46px;
          height: 46px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.6);
          background: rgba(255, 255, 255, 0.02);
          transition: background 0.35s ease, color 0.35s ease, transform 0.45s var(--ease-out), border-color 0.35s ease;
        }
        .ch-scroll__circle svg {
          animation: chBob 2.2s ease-in-out infinite;
        }
        @keyframes chBob {
          0%,
          100% {
            transform: translateY(-2px);
          }
          50% {
            transform: translateY(3px);
          }
        }
        .ch-scroll:hover .ch-scroll__circle {
          background: var(--cream);
          color: var(--ink);
          border-color: var(--cream);
          transform: scale(1.08);
        }
        .ch-scroll:active .ch-scroll__circle {
          transform: scale(0.94);
        }
        .ch-scroll__label {
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: 0.6rem;
          font-weight: 500;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: rgba(246, 239, 232, 0.9);
        }

        /* ═══════════════════════════════════════════════════════════════════
           CUSTOM CURSOR — identical to Hero.js
           ═══════════════════════════════════════════════════════════════════ */
        .ch-cursor,
        .ch-cursor-dot {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 200;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.35s ease;
        }
        .ch-cursor.is-visible,
        .ch-cursor-dot.is-visible {
          opacity: 1;
        }
        .ch-cursor::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 44px;
          height: 44px;
          margin: -22px 0 0 -22px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.55);
          background: rgba(255, 255, 255, 0);
          transition: transform 0.5s var(--ease-out), background 0.4s ease, border-color 0.4s ease;
        }
        .ch-cursor.is-grow::before {
          transform: scale(1.55);
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.85);
        }
        .ch-cursor.has-label::before {
          transform: scale(1.9);
          background: rgba(20, 17, 14, 0.4);
          -webkit-backdrop-filter: blur(6px);
          backdrop-filter: blur(6px);
        }
        .ch-cursor__label {
          position: absolute;
          top: 0;
          left: 0;
          transform: translate(-50%, -50%);
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: 0.68rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #fff;
          white-space: nowrap;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .ch-cursor.has-label .ch-cursor__label {
          opacity: 1;
        }
        .ch-cursor-dot::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 6px;
          height: 6px;
          margin: -3px 0 0 -3px;
          border-radius: 50%;
          background: #fff;
          transition: transform 0.3s ease, opacity 0.3s ease;
        }
        .ch-cursor-dot.is-grow::before {
          transform: scale(0);
        }

        /* ═══════════════════════════════════════════════════════════════════
           FOCUS + PAUSE STATES
           ═══════════════════════════════════════════════════════════════════ */
        .ch a:focus-visible,
        .ch button:focus-visible {
          outline: 2px solid var(--copper);
          outline-offset: 4px;
        }
        .ch.is-offscreen .ch__sun,
        .ch.is-offscreen .ch__grain,
        .ch.is-offscreen .ch-line__in--accent,
        .ch.is-offscreen .ch-scroll__circle svg {
          animation-play-state: paused;
        }

        /* ═══════════════════════════════════════════════════════════════════
           RESPONSIVE
           ═══════════════════════════════════════════════════════════════════ */
        @media (max-width: 1100px) {
          .ch {
            height: auto;
            min-height: 100vh;
            min-height: 100svh;
          }
          .ch__shade {
            background:
              linear-gradient(180deg, rgba(21, 18, 15, 0.6) 0%, rgba(21, 18, 15, 0) 22%),
              linear-gradient(0deg, rgba(21, 18, 15, 0.96) 0%, rgba(21, 18, 15, 0.82) 46%, rgba(21, 18, 15, 0.2) 80%, rgba(21, 18, 15, 0) 100%);
          }
          .ch__inner {
            height: auto;
            min-height: 100vh;
            min-height: 100svh;
            justify-content: flex-end;
            gap: 40px;
            padding: 120px 24px 56px 24px;
          }
          .ch-copy {
            margin-top: 0;
            max-width: 560px;
          }
          .ch-title {
            font-size: clamp(2.6rem, 10.5vw, 4.4rem);
          }
          .ch-info {
            position: static;
            width: 100%;
            max-width: 420px;
            transform: none;
          }
          .ch-scroll-wrap {
            display: none;
          }
        }

        @media (max-width: 820px) {
          .ch-eyebrow {
            font-size: 0.62rem;
            letter-spacing: 0.3em;
          }
          .ch-text {
            margin-top: 20px;
          }
        }

        @media (pointer: coarse) {
          .ch-cursor,
          .ch-cursor-dot {
            display: none;
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           REDUCED MOTION
           ═══════════════════════════════════════════════════════════════════ */
        @media (prefers-reduced-motion: reduce) {
          .ch *,
          .ch *::before,
          .ch *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
          .ch__grain,
          .ch-dust {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}