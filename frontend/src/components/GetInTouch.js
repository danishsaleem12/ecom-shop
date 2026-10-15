'use client';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  AURELIA · GET IN TOUCH
 * ─────────────────────────────────────────────────────────────────────────────
 *  Place at: frontend/src/components/GetInTouch.js
 *  Use:      <GetInTouch />   inside src/app/contact/page.js, under <ContactHero />
 *
 *  Layout (same as the reference)
 *   ┌────────────────────┬──────────────────┬───────────────────────────┐
 *   │ 02 — Get in touch  │  script tagline  │                           │
 *   │ We'd Love to       │                  │   photo (bleeds to the    │
 *   │ Hear From You.     │  Send us a       │   right edge) with        │
 *   │ paragraph          │  message         │   studio / hours / phone  │
 *   │ Ways to reach us   │  ── name         │   details on top          │
 *   │  · General         │  ── email        │                           │
 *   │  · Customer care   │  ── subject      │          ┌────────┐       │
 *   │  · Press & media   │  ── message      │          │ inset  │       │
 *   │  · Collaborations  │  [Send Message]  │          └────────┘       │
 *   │ olive sprig + note │                  │        Visit our studio → │
 *   └────────────────────┴──────────────────┴───────────────────────────┘
 *
 *  Same soft paper background, ink colours, fonts and easing as
 *  AureliaWoman.js. No dust / particles here — those are for the hero only.
 *   • Plays once when scrolled into view: letter-stagger eyebrow, line-mask
 *     headline with shimmer, hairlines that draw, rows and fields fade in
 *   • Photo opens with a clip reveal and a Ken Burns settle, gentle mouse +
 *     scroll parallax, swaying leaf shadows, drifting light on the paper
 *   • Clicking a "Ways to reach us" row picks that subject in the form and
 *     moves focus to the first field
 *   • Working form: validation, sending / sent / error states
 *   • Custom cursor ring (ink on paper, white over the photo)
 *   • Reduced-motion + touch fallbacks, stacks on tablet and mobile
 *
 *  IMAGES  →  /public/images/contact/
 *    contact-studio.jpg   large photo, about 4:5 (olive vase, linen, coast view)
 *    contact-card.jpg     small inset photo, about 4:5 (olive sprig + brand card)
 *  A missing photo shows a soft gradient, so nothing breaks. You can also pass
 *  full URLs through the props.
 *
 *  Props (all optional)
 *   sectionNumber, eyebrow, titleLines: [{ text, accent }], description
 *   waysTitle, ways: [{ icon, title, text, subject }]
 *   note: [line1, line2]
 *   script: [lines]  (the handwritten tagline)
 *   formTitle, subjects: [string]
 *   image, imageAlt, imagePosition, cardImage, cardAlt
 *   details: [{ label, lines: [string] }]
 *   visitLabel, visitHref
 *   onSubmit(values) → Promise   (send to your backend / email service;
 *                                  throw an error to show the error state)
 *
 *  NOTE: every class starts with "gt-" (keyframes with "gt") so nothing clashes
 *  with the other sections' global styles when they share a page.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Cormorant_Garamond, Figtree, Mrs_Saint_Delafield } from 'next/font/google';
import { STORE } from '@/lib/store';
import { API_URL } from '@/lib/imageUrl';
import './styles/GetInTouch.css';

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

const script = Mrs_Saint_Delafield({
  subsets: ['latin'],
  weight: '400',
  variable: '--aur-script',
  display: 'swap',
});

/* ═════════════════════════════════════════════════════════════════════════════
   ICONS
   ═════════════════════════════════════════════════════════════════════════════ */

const ico = {
  width: 26,
  height: 26,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.15,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

const MailIcon = () => (
  <svg {...ico}>
    <rect x="3" y="5.5" width="18" height="13" rx="1.6" />
    <path d="m3.5 7 8.5 6.5L20.5 7" />
  </svg>
);

const HeadsetIcon = () => (
  <svg {...ico}>
    <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
    <rect x="3" y="13.5" width="3.6" height="5.5" rx="1.6" />
    <rect x="17.4" y="13.5" width="3.6" height="5.5" rx="1.6" />
    <path d="M19.2 19c0 1.6-1.8 2.4-4.4 2.4" />
  </svg>
);

const MegaphoneIcon = () => (
  <svg {...ico}>
    <path d="M3 10.5v3a1 1 0 0 0 1 1h2.5l9 4.5V5L6.5 9.5H4a1 1 0 0 0-1 1Z" />
    <path d="M6.5 14.5 8 20h2.6l-1.2-5.2" />
    <path d="M19 9.5a4 4 0 0 1 0 5" />
  </svg>
);

const PeopleIcon = () => (
  <svg {...ico}>
    <circle cx="12" cy="8" r="2.8" />
    <path d="M6.8 19.5c.2-3 2.3-5 5.2-5s5 2 5.2 5" />
    <circle cx="5.6" cy="10.2" r="2" />
    <path d="M1.8 18.2c.2-2.2 1.6-3.6 3.6-3.7" />
    <circle cx="18.4" cy="10.2" r="2" />
    <path d="M22.2 18.2c-.2-2.2-1.6-3.6-3.6-3.7" />
  </svg>
);

const ArrowRight = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12h16M14 6l6 6-6 6" />
  </svg>
);

const ChevronDown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m6 9 6 6 6-6" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

/* ═════════════════════════════════════════════════════════════════════════════
   DATA — edit copy and images here
   ═════════════════════════════════════════════════════════════════════════════ */

const IMG = '/images/contact';

const SUBJECTS = ['General enquiry', 'Customer care', 'Press & media', 'Collaboration', 'Something else'];

const WAYS = [
  { icon: <MailIcon />, title: 'General Enquiries', text: 'Questions about our collections, services or anything else.', subject: 'General enquiry' },
  { icon: <HeadsetIcon />, title: 'Customer Care', text: 'Need help with an order, delivery or return?', subject: 'Customer care' },
  { icon: <MegaphoneIcon />, title: 'Press & Media', text: 'For press inquiries, media requests or brand features.', subject: 'Press & media' },
  { icon: <PeopleIcon />, title: 'Collaborations', text: 'Interested in working together? We’d love to hear your ideas.', subject: 'Collaboration' },
];

// All values come from src/lib/store.js
// A row with nothing to show is left out (so an empty phone number doesn't leave a blank row).
const DETAILS = [
  { label: 'Our Studio', lines: STORE.address.filter(Boolean) },
  { label: 'Opening Hours', lines: [STORE.hours.days, STORE.hours.days && STORE.hours.tz && `(${STORE.hours.tz})`].filter(Boolean) },
  { label: 'Phone', lines: [STORE.phone].filter(Boolean) },
].filter((d) => d.lines.length > 0);

const FIELD_LIMITS = { name: 80, email: 120, message: 2000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ═════════════════════════════════════════════════════════════════════════════
   SMALL COMPONENTS
   ═════════════════════════════════════════════════════════════════════════════ */

/** Letters fade + rise one after another. */
function SplitLetters({ text, step = 40, start = 0 }) {
  return (
    <span aria-label={text}>
      {text.split('').map((ch, i) => (
        <span key={`${ch}-${i}`} className="gt-letter" aria-hidden="true" style={{ animationDelay: `${start + i * step}ms` }}>
          {ch === ' ' ? '\u00A0' : ch}
        </span>
      ))}
    </span>
  );
}

/** Photo with a graceful gradient fallback when the file doesn't exist yet. */
function CardImage({ src, alt, position }) {
  const [failed, setFailed] = useState(!src);
  const ref = useRef(null);

  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) return <span className="gt-fallback" aria-hidden="true" />;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt={alt}
      loading="lazy"
      draggable={false}
      onError={() => setFailed(true)}
      style={position ? { objectPosition: position } : undefined}
    />
  );
}

/** Blurred foliage silhouette that sways, like leaves in front of a window. */
function Leaves({ className }) {
  const leaves = [
    [372, 40, -30], [340, 62, 40], [318, 84, -50], [292, 100, 30], [262, 130, -60],
    [238, 150, 20], [214, 182, -40], [188, 204, 50], [160, 236, -20], [132, 262, 60],
    [110, 296, -30], [352, 24, 60], [300, 70, 80], [246, 110, 70],
  ];
  return (
    <svg className={className} viewBox="0 0 400 340" aria-hidden="true">
      <path d="M400 10C330 44 260 96 190 190S90 300 60 340" fill="none" stroke="currentColor" strokeWidth="3" />
      {leaves.map(([x, y, r], i) => (
        <ellipse key={i} cx="0" cy="-20" rx="11" ry="26" fill="currentColor" transform={`translate(${x} ${y}) rotate(${r})`} />
      ))}
    </svg>
  );
}

/** Hand-drawn olive sprig (bottom left of the copy column). */
function Sprig() {
  const leaves = [
    [30, 92, -28, 1], [58, 86, 34, 1], [26, 74, -32, 0.95], [56, 68, 36, 0.95],
    [24, 56, -34, 0.9], [54, 50, 38, 0.9], [26, 38, -32, 0.8], [50, 32, 36, 0.8],
    [34, 20, -20, 0.7], [46, 14, 24, 0.65],
  ];
  return (
    <svg className="gt-sprig" viewBox="0 0 80 150" fill="none" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 146C20 118 36 84 44 4" />
      {leaves.map(([x, y, r, s], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
          <path d="M0 0C-4-8-4-18 0-28 4-18 4-8 0 0Z" />
          <path d="M0 0V-24" strokeWidth="0.5" />
        </g>
      ))}
    </svg>
  );
}

/** Soft ring that follows the mouse. Ink on paper, white over the photo. */
function SectionCursor({ rootRef, enabled }) {
  const ringRef = useRef(null);
  const dotRef = useRef(null);
  const [label, setLabel] = useState('');
  const [grow, setGrow] = useState(false);
  const [visible, setVisible] = useState(false);
  const [onPhoto, setOnPhoto] = useState(false);
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
      const target = e.target.closest ? e.target.closest('a, button, select, [data-cursor]') : null;
      const isField = Boolean(e.target.closest && e.target.closest('input, textarea'));
      setGrow(Boolean(target) && !isField);
      setLabel(target && !isField ? target.getAttribute('data-cursor') || '' : '');
      setOnPhoto(Boolean(e.target.closest && e.target.closest('.gt-photo')));
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

  const tone = onPhoto ? 'is-photo' : '';

  return (
    <>
      <div ref={ringRef} className={`gt-cursor ${tone} ${visible ? 'is-visible' : ''} ${grow ? 'is-grow' : ''} ${label ? 'has-label' : ''}`} aria-hidden="true">
        <span className="gt-cursor__label">{label}</span>
      </div>
      <div ref={dotRef} className={`gt-cursor-dot ${tone} ${visible ? 'is-visible' : ''} ${grow ? 'is-grow' : ''}`} aria-hidden="true" />
    </>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   GET IN TOUCH
   ═════════════════════════════════════════════════════════════════════════════ */

export default function GetInTouch({
  sectionNumber = '02',
  eyebrow = 'Get in Touch',
  titleLines = [{ text: 'We’d Love to' }, { text: 'Hear From You.', accent: true }],
  description = 'Whether you have a question about a piece, an order, or simply want to say hello, we’d love to hear from you. Our team is here to help and will get back to you as soon as possible.',
  waysTitle = 'Ways to Reach Us',
  ways = WAYS,
  note = ['Every message matters.', 'Thank you for being part of the Aurelia story.'],
  scriptLines = ['Better', 'Questions,', 'Brighter', 'Conversations.'],
  formTitle = 'Send Us a Message',
  subjects = SUBJECTS,
  image = `${IMG}/contact-studio.jpg`,
  imageAlt = 'An olive branch in a stone vase beside a linen cloth, with a sunlit coastal town beyond the terrace',
  imagePosition = '50% 50%',
  cardImage = `${IMG}/contact-card.jpg`,
  cardAlt = 'An olive sprig resting on stone beside an Aurelia card',
  details = DETAILS,
  visitLabel = 'Visit our studio',
  visitHref = '/about',
  onSubmit,
}) {
  const rootRef = useRef(null);
  const nameRef = useRef(null);
  const formRef = useRef(null);

  const [revealed, setRevealed] = useState(false);
  const [onScreen, setOnScreen] = useState(false);

  const [values, setValues] = useState({ name: '', email: '', subject: '', message: '' });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [serverError, setServerError] = useState('');

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
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
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

  /* ── pointer: mouse parallax ─────────────────────────────────────────── */
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

  /* ── form ────────────────────────────────────────────────────────────── */
  const setField = (key) => (e) => {
    const { value } = e.target;
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
    if (status === 'sent' || status === 'error') setStatus('idle');
  };

  const validate = () => {
    const next = {};
    if (!values.name.trim()) next.name = 'Please tell us your name.';
    if (!values.email.trim()) next.email = 'Please enter your email.';
    else if (!EMAIL_RE.test(values.email.trim())) next.email = 'That email doesn’t look right.';
    if (!values.subject) next.subject = 'Please choose a subject.';
    if (!values.message.trim()) next.message = 'Please write us a few words.';
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (status === 'sending') return;

    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) {
      const first = formRef.current && formRef.current.querySelector('[aria-invalid="true"]');
      if (first) first.focus();
      return;
    }

    setStatus('sending');
    const payload = {
      name: values.name.trim(),
      email: values.email.trim(),
      subject: values.subject,
      message: values.message.trim(),
    };

    try {
      setServerError('');
      if (typeof onSubmit === 'function') await onSubmit(payload);
      else {
        const res = await fetch(`${API_URL}/api/contact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.message || 'Something went wrong. Please try again in a moment.');
      }
      setStatus('sent');
      setValues({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setServerError(err instanceof TypeError ? 'Could not reach the server. Please try again in a moment.' : err.message);
      setStatus('error');
    }
  };

  /** Picks the subject from a "Ways to reach us" row and jumps to the form. */
  const chooseWay = (subject) => {
    setValues((v) => ({ ...v, subject }));
    setErrors((er) => ({ ...er, subject: undefined }));
    if (status === 'sent' || status === 'error') setStatus('idle');
    const form = formRef.current;
    if (form && window.matchMedia('(max-width: 1100px)').matches) {
      form.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (nameRef.current) nameRef.current.focus({ preventScroll: true });
  };

  const fieldId = (k) => `gt-${k}`;
  const errId = (k) => `gt-${k}-error`;

  return (
    <section
      id="get-in-touch"
      ref={rootRef}
      className={`${serif.variable} ${sans.variable} ${script.variable} gt ${revealed ? 'is-in' : ''} ${onScreen ? '' : 'is-offscreen'}`}
      aria-label="Get in touch"
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {/* ── Atmosphere: light + leaf shadows ─────────────────────────── */}
      <div className="gt-light" aria-hidden="true" />
      <div className="gt-shadow gt-shadow--tl" aria-hidden="true">
        <Leaves className="gt-leaves" />
      </div>
      <div className="gt-shadow gt-shadow--tl gt-shadow--b" aria-hidden="true">
        <Leaves className="gt-leaves" />
      </div>

      <div className="gt-grid">
        {/* ══ Left: copy + ways to reach us ═══════════════════════════ */}
        <div className="gt-copy">
          <div className="gt-copy__main">
            <p className="gt-eyebrow">
              <span className="gt-eyebrow__num">{sectionNumber}</span>
              <i className="gt-eyebrow__line" />
              <span className="gt-eyebrow__label">
                <SplitLetters text={eyebrow} start={260} />
              </span>
            </p>

            <h2 className="gt-title">
              {titleLines.map((line, i) => (
                <span className="gt-line" key={i}>
                  <span
                    className={`gt-line__in ${line.accent ? 'gt-line__in--accent' : ''}`}
                    style={{ animationDelay: `${240 + i * 150}ms` }}
                  >
                    {line.text}
                  </span>
                </span>
              ))}
            </h2>

            <p className="gt-desc">{description}</p>
          </div>

          <div className="gt-ways">
            <p className="gt-label gt-ways__title">{waysTitle}</p>
            <ul className="gt-ways__list">
              {ways.map((w, i) => (
                <li key={w.title} className="gt-way" style={{ '--i': i }}>
                  <button type="button" className="gt-way__btn" onClick={() => chooseWay(w.subject)} data-cursor="Write">
                    <span className="gt-way__icon">{w.icon}</span>
                    <span className="gt-way__body">
                      <span className="gt-way__title">{w.title}</span>
                      <span className="gt-way__text">{w.text}</span>
                    </span>
                    <span className="gt-way__arrow">
                      <ArrowRight />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="gt-note">
            <Sprig />
            <div className="gt-note__text">
              <i className="gt-note__line" />
              <p>
                {note[0]}
                <br />
                {note[1]}
              </p>
            </div>
          </div>

          <i className="gt-divider" aria-hidden="true" />
        </div>

        {/* ══ Middle: script tagline + form ═══════════════════════════ */}
        <div className="gt-formcol">
          <div className="gt-script" aria-hidden="true">
            <p>
              {scriptLines.map((l, i) => (
                <span key={l} style={{ '--i': i }}>
                  {l}
                </span>
              ))}
            </p>
            <i className="gt-script__line" />
          </div>

          <form ref={formRef} className="gt-form" onSubmit={handleSubmit} noValidate aria-label={formTitle}>
            <p className="gt-label gt-form__title">{formTitle}</p>

            <div className={`gt-field ${errors.name ? 'has-error' : ''}`} style={{ '--i': 0 }}>
              <label htmlFor={fieldId('name')} className="gt-label gt-field__label">
                Your name <b aria-hidden="true">•</b>
              </label>
              <input
                ref={nameRef}
                id={fieldId('name')}
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Enter your name"
                maxLength={FIELD_LIMITS.name}
                value={values.name}
                onChange={setField('name')}
                aria-required="true"
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? errId('name') : undefined}
              />
              {errors.name && (
                <span id={errId('name')} className="gt-error" role="alert">
                  {errors.name}
                </span>
              )}
            </div>

            <div className={`gt-field ${errors.email ? 'has-error' : ''}`} style={{ '--i': 1 }}>
              <label htmlFor={fieldId('email')} className="gt-label gt-field__label">
                Your email <b aria-hidden="true">•</b>
              </label>
              <input
                id={fieldId('email')}
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                maxLength={FIELD_LIMITS.email}
                value={values.email}
                onChange={setField('email')}
                aria-required="true"
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? errId('email') : undefined}
              />
              {errors.email && (
                <span id={errId('email')} className="gt-error" role="alert">
                  {errors.email}
                </span>
              )}
            </div>

            <div className={`gt-field ${errors.subject ? 'has-error' : ''}`} style={{ '--i': 2 }}>
              <label htmlFor={fieldId('subject')} className="gt-label gt-field__label">
                Subject <b aria-hidden="true">•</b>
              </label>
              <div className="gt-select">
                <select
                  id={fieldId('subject')}
                  name="subject"
                  value={values.subject}
                  onChange={setField('subject')}
                  className={values.subject ? 'has-value' : ''}
                  aria-required="true"
                  aria-invalid={Boolean(errors.subject)}
                  aria-describedby={errors.subject ? errId('subject') : undefined}
                >
                  <option value="" disabled>
                    Select a subject
                  </option>
                  {subjects.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <span className="gt-select__chev">
                  <ChevronDown />
                </span>
              </div>
              {errors.subject && (
                <span id={errId('subject')} className="gt-error" role="alert">
                  {errors.subject}
                </span>
              )}
            </div>

            <div className={`gt-field gt-field--area ${errors.message ? 'has-error' : ''}`} style={{ '--i': 3 }}>
              <label htmlFor={fieldId('message')} className="gt-label gt-field__label">
                Your message <b aria-hidden="true">•</b>
              </label>
              <textarea
                id={fieldId('message')}
                name="message"
                rows={4}
                placeholder="Tell us how we can help you..."
                maxLength={FIELD_LIMITS.message}
                value={values.message}
                onChange={setField('message')}
                aria-required="true"
                aria-invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? errId('message') : undefined}
              />
              {errors.message && (
                <span id={errId('message')} className="gt-error" role="alert">
                  {errors.message}
                </span>
              )}
            </div>

            <div className="gt-submit" style={{ '--i': 4 }}>
              <button type="submit" className={`gt-btn ${status === 'sent' ? 'is-sent' : ''}`} disabled={status === 'sending'} data-cursor="Send">
                <span className="gt-btn__label">
                  {status === 'sending' && 'Sending…'}
                  {status === 'sent' && (
                    <>
                      <CheckIcon /> Message sent
                    </>
                  )}
                  {(status === 'idle' || status === 'error') && 'Send Message'}
                </span>
                {(status === 'idle' || status === 'error') && (
                  <span className="gt-btn__arrow">
                    <ArrowRight size={17} />
                  </span>
                )}
              </button>

              <p className={`gt-status ${status === 'sent' || status === 'error' ? 'is-shown' : ''} ${status === 'error' ? 'is-error' : ''}`} role="status" aria-live="polite">
                {status === 'sent' && 'Thank you — we’ll be in touch soon.'}
                {status === 'error' && (serverError || 'Something went wrong. Please try again in a moment.')}
              </p>
            </div>
          </form>
        </div>

        {/* ══ Right: photo + details + inset ═══════════════════════════ */}
        <div className="gt-media">
          <figure className="gt-photo" data-cursor="View">
            <span className="gt-clip">
              <span className="gt-par">
                <span className="gt-kb">
                  <CardImage src={image} alt={imageAlt} position={imagePosition} />
                </span>
              </span>
            </span>
          </figure>

          <div className="gt-info">
            {details.map((d, i) => (
              <div className="gt-info__item" key={d.label} style={{ '--i': i }}>
                <p className="gt-label gt-info__label">{d.label}</p>
                <i className="gt-info__line" />
                <p className="gt-info__value">
                  {d.lines.map((l, j) => (
                    <span key={j}>{l}</span>
                  ))}
                </p>
              </div>
            ))}
          </div>

          <figure className="gt-card" data-cursor="View">
            <span className="gt-card__frame">
              <span className="gt-card__img">
                <CardImage src={cardImage} alt={cardAlt} />
              </span>
            </span>
          </figure>

          <Link href={visitHref} className="gt-visit" data-cursor="Visit">
            <span>{visitLabel}</span>
            <ArrowRight size={20} />
          </Link>
        </div>
      </div>

      <SectionCursor rootRef={rootRef} enabled={revealed} />

    </section>
  );
}