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

const DETAILS = [
  { label: 'Our Studio', lines: ['123 Fashion Lane,', 'New York, NY 10001'] },
  { label: 'Opening Hours', lines: ['Mon – Fri: 9am – 6pm', '(EST)'] },
  { label: 'Phone', lines: ['+1 (555) 123-4567'] },
];

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
      if (typeof onSubmit === 'function') await onSubmit(payload);
      else await new Promise((resolve) => setTimeout(resolve, 900)); // demo only
      setStatus('sent');
      setValues({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
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
                {status === 'error' && 'Something went wrong. Please try again in a moment.'}
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

      <style jsx global>{`
        /* ═══════════════════════════════════════════════════════════════════
           ROOT — soft paper, tokens (same as AureliaWoman.js)
           ═══════════════════════════════════════════════════════════════════ */
        .gt {
          --ink: #3a3129;
          --ink-deep: #2d251e;
          --ink-soft: rgba(58, 49, 41, 0.82);
          --muted: #7a6957;
          --line: rgba(58, 49, 41, 0.34);
          --field-line: rgba(58, 49, 41, 0.3);
          --copper: #c98a63;
          --danger: #9a4a36;
          --btn: #4a3f35;
          --gutter: clamp(22px, 5.4vw, 104px);
          --gutter-r: 0px;
          --gap: clamp(28px, 4.2vw, 76px);
          --ease-out: cubic-bezier(0.22, 0.8, 0.2, 1);
          --ease-expo: cubic-bezier(0.19, 1, 0.22, 1);
          --ease-wipe: cubic-bezier(0.76, 0, 0.18, 1);
          --mx: 0;
          --my: 0;
          --sp: 0;
          position: relative;
          display: flex;
          align-items: flex-start;
          min-height: 100vh;
          min-height: 100svh;
          overflow: hidden;
          isolation: isolate;
          color: var(--ink);
          font-family: var(--aur-serif), Georgia, serif;
          background:
            radial-gradient(ellipse 60% 70% at 0% 0%, rgba(255, 250, 242, 0.55), transparent 65%),
            radial-gradient(ellipse 50% 60% at 100% 100%, rgba(255, 250, 242, 0.4), transparent 70%),
            linear-gradient(160deg, #e0d7cb 0%, #d8cec1 55%, #d2c7b9 100%);
        }
        .gt a,
        .gt button {
          -webkit-tap-highlight-color: transparent;
        }

        /* paper grain (static) */
        .gt::before {
          content: '';
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          opacity: 0.2;
          mix-blend-mode: multiply;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.35  0 0 0 0 0.28  0 0 0 0 0.2  0 0 0 0.9 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
        }

        /* drifting light on the paper */
        .gt-light {
          position: absolute;
          inset: -8%;
          z-index: 0;
          pointer-events: none;
          background:
            linear-gradient(115deg, transparent 40%, rgba(255, 244, 224, 0.26) 52%, transparent 64%),
            radial-gradient(40% 40% at 8% 6%, rgba(255, 246, 228, 0.45), transparent 70%);
          animation: gtLight 14s ease-in-out infinite alternate;
        }
        @keyframes gtLight {
          from {
            opacity: 0.5;
            transform: translate3d(-2.5%, 0, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(2.5%, 1.5%, 0);
          }
        }

        /* leaf shadows, top-left (two layers) */
        .gt-shadow {
          position: absolute;
          z-index: 1;
          pointer-events: none;
          width: min(30vw, 480px);
          color: rgba(64, 48, 33, 0.2);
          filter: blur(5px);
        }
        .gt-shadow--tl {
          top: -26px;
          left: -26px;
          transform: scaleX(-1);
        }
        .gt-shadow--b {
          top: 26px;
          left: -100px;
          width: min(24vw, 380px);
          color: rgba(64, 48, 33, 0.13);
          filter: blur(10px);
        }
        .gt-leaves {
          display: block;
          width: 100%;
          height: auto;
          transform-origin: 100% 0;
          animation: gtSway 9s ease-in-out infinite alternate;
        }
        .gt-shadow--b .gt-leaves {
          animation-duration: 12s;
          animation-direction: alternate-reverse;
        }
        @keyframes gtSway {
          from {
            transform: rotate(-1.8deg) translate3d(0, 0, 0);
          }
          to {
            transform: rotate(2.4deg) translate3d(-8px, 6px, 0);
          }
        }

        @keyframes gtFade {
          from {
            opacity: 0;
            transform: translate3d(0, 16px, 0);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
          }
        }
        @keyframes gtGrowX {
          to {
            transform: scaleX(1);
          }
        }
        @keyframes gtGrowY {
          to {
            transform: scaleY(1);
          }
        }
        @keyframes gtOpen {
          from {
            clip-path: inset(0 0 0 100%);
          }
          to {
            clip-path: inset(0 0 0 0);
          }
        }
        @keyframes gtKB {
          from {
            transform: scale(1.16) translate3d(1.2%, 0.8%, 0);
          }
          to {
            transform: scale(1) translate3d(0, 0, 0);
          }
        }

        /* small caps label used everywhere */
        .gt-label {
          margin: 0;
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: 0.62rem;
          font-weight: 600;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: var(--ink);
        }

        /* ═══════════════════════════════════════════════════════════════════
           GRID — copy | form | photo
           ═══════════════════════════════════════════════════════════════════ */
        .gt-grid {
          position: relative;
          z-index: 3;
          width: 100%;
          display: grid;
          grid-template-columns: minmax(0, 30fr) minmax(0, 25fr) minmax(0, 45fr);
          align-items: start;
          column-gap: var(--gap);
          padding: clamp(104px, 9.4vw, 148px) var(--gutter-r) clamp(84px, 8vw, 120px) var(--gutter);
        }

        /* ═══════════════════════════════════════════════════════════════════
           LEFT — copy
           ═══════════════════════════════════════════════════════════════════ */
        .gt-copy {
          position: relative;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }
        .gt-copy__main {
          transform: translate3d(calc(var(--mx) * 6px), 0, 0);
          transition: transform 0.8s cubic-bezier(0.2, 0.7, 0.2, 1);
        }

        .gt-eyebrow {
          display: flex;
          align-items: center;
          gap: 14px;
          margin: 0 0 clamp(14px, 1.6vw, 22px);
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: 0.62rem;
          font-weight: 500;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: var(--ink);
        }
        .gt-eyebrow__num {
          opacity: 0;
        }
        .gt.is-in .gt-eyebrow__num {
          animation: gtFade 1s ease 0.15s both;
        }
        .gt-eyebrow__line {
          display: block;
          flex: 0 0 26px;
          height: 1px;
          background: var(--line);
          transform: scaleX(0);
          transform-origin: left;
        }
        .gt.is-in .gt-eyebrow__line {
          animation: gtGrowX 1.2s var(--ease-out) 0.35s both;
        }
        .gt-letter {
          display: inline-block;
          opacity: 0;
        }
        .gt.is-in .gt-letter {
          animation: gtLetter 0.9s var(--ease-expo) both;
        }
        @keyframes gtLetter {
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

        .gt-title {
          margin: 0;
          font-weight: 400;
          font-size: clamp(2.4rem, 3.75vw, 4.1rem);
          line-height: 1.08;
          letter-spacing: -0.02em;
          color: var(--ink-deep);
        }
        .gt-line {
          display: block;
          overflow: hidden;
          padding: 0.04em 0.2em 0.14em 0;
          margin-bottom: -0.1em;
          white-space: nowrap;
        }
        .gt-line__in {
          display: inline-block;
          transform: translate3d(0, 115%, 0) rotate(3deg);
          transform-origin: left bottom;
        }
        .gt.is-in .gt-line__in {
          animation: gtRise 1.35s var(--ease-expo) both;
        }
        .gt-line__in--accent {
          font-style: italic;
          padding-right: 0.08em;
          background: linear-gradient(95deg, #8b7560 0%, #6c5a49 45%, #a08a72 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
        }
        .gt.is-in .gt-line__in--accent {
          animation: gtRise 1.35s var(--ease-expo) both, gtShimmer 8s ease-in-out 1.8s infinite alternate;
        }
        @keyframes gtRise {
          from {
            transform: translate3d(0, 115%, 0) rotate(3deg);
          }
          to {
            transform: translate3d(0, 0, 0) rotate(0);
          }
        }
        @keyframes gtShimmer {
          from {
            background-position: 0% 50%;
          }
          to {
            background-position: 100% 50%;
          }
        }

        .gt-desc {
          margin: clamp(20px, 2vw, 30px) 0 0;
          max-width: 40ch;
          font-size: clamp(0.92rem, 1vw, 1.02rem);
          font-weight: 500;
          line-height: 1.7;
          color: var(--ink-soft);
          opacity: 0;
        }
        .gt.is-in .gt-desc {
          animation: gtFade 1.2s ease 0.95s both;
        }

        /* ── Ways to reach us ───────────────────────────────────────────── */
        .gt-ways {
          margin-top: clamp(30px, 4vw, 58px);
          max-width: 400px;
        }
        .gt-ways__title {
          margin-bottom: clamp(10px, 1.2vw, 16px);
          opacity: 0;
        }
        .gt.is-in .gt-ways__title {
          animation: gtFade 1s ease 1.1s both;
        }
        .gt-ways__list {
          display: flex;
          flex-direction: column;
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .gt-way {
          opacity: 0;
        }
        .gt.is-in .gt-way {
          animation: gtFade 1s ease calc(var(--i) * 110ms + 1.2s) both;
        }
        .gt-way__btn {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          width: 100%;
          padding: clamp(11px, 1.15vw, 16px) 0;
          border: 0;
          background: transparent;
          color: inherit;
          font: inherit;
          text-align: left;
          cursor: pointer;
        }
        .gt-way__icon {
          flex: 0 0 auto;
          display: inline-flex;
          margin-top: 2px;
          color: var(--ink);
          transition: color 0.4s ease, transform 0.5s var(--ease-out);
        }
        .gt-way__body {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }
        .gt-way__title {
          font-size: clamp(1.02rem, 1.15vw, 1.16rem);
          font-weight: 500;
          line-height: 1.2;
          color: var(--ink-deep);
        }
        .gt-way__text {
          max-width: 30ch;
          font-size: clamp(0.82rem, 0.88vw, 0.9rem);
          font-weight: 500;
          line-height: 1.5;
          color: var(--muted);
        }
        .gt-way__arrow {
          flex: 0 0 auto;
          display: inline-flex;
          margin-top: 4px;
          color: var(--ink);
          transition: transform 0.5s var(--ease-out), color 0.4s ease;
        }
        .gt-way__btn:hover .gt-way__arrow,
        .gt-way__btn:focus-visible .gt-way__arrow {
          transform: translateX(6px);
          color: var(--copper);
        }
        .gt-way__btn:hover .gt-way__icon,
        .gt-way__btn:focus-visible .gt-way__icon {
          color: var(--copper);
          transform: translateY(-2px);
        }

        /* ── sprig + note ───────────────────────────────────────────────── */
        .gt-note {
          display: flex;
          align-items: flex-end;
          gap: 14px;
          margin-top: clamp(22px, 3vw, 44px);
          opacity: 0;
        }
        .gt.is-in .gt-note {
          animation: gtFade 1.2s ease 1.7s both;
        }
        .gt-sprig {
          flex: 0 0 auto;
          width: clamp(38px, 3.4vw, 52px);
          height: auto;
          margin-bottom: -6px;
          color: rgba(58, 49, 41, 0.72);
        }
        .gt-note__text {
          display: flex;
          align-items: center;
          gap: 16px;
          padding-bottom: 4px;
        }
        .gt-note__line {
          display: block;
          flex: 0 0 26px;
          height: 1px;
          background: var(--line);
        }
        .gt-note p {
          margin: 0;
          font-size: clamp(0.84rem, 0.92vw, 0.95rem);
          font-style: italic;
          font-weight: 500;
          line-height: 1.6;
          color: var(--ink-soft);
        }

        /* vertical divider between copy and form */
        .gt-divider {
          position: absolute;
          top: 44%;
          bottom: 0;
          right: calc(var(--gap) / -2);
          width: 1px;
          background: var(--line);
          transform: scaleY(0);
          transform-origin: top;
        }
        .gt.is-in .gt-divider {
          animation: gtGrowY 1.6s var(--ease-out) 1.2s both;
        }

        /* ═══════════════════════════════════════════════════════════════════
           MIDDLE — script tagline + form
           ═══════════════════════════════════════════════════════════════════ */
        .gt-formcol {
          min-width: 0;
          transform: translate3d(calc(var(--mx) * 4px), 0, 0);
          transition: transform 0.8s cubic-bezier(0.2, 0.7, 0.2, 1);
        }

        .gt-script {
          width: fit-content;
          margin: clamp(2px, 1vw, 14px) 0 clamp(38px, 5.4vw, 74px) clamp(18px, 3.2vw, 52px);
          color: #7a6350;
        }
        .gt-script p {
          margin: 0;
          font-family: var(--aur-script), 'Snell Roundhand', cursive;
          font-size: clamp(1.7rem, 2.4vw, 2.6rem);
          line-height: 0.96;
          transform: rotate(-9deg);
          transform-origin: left bottom;
        }
        .gt-script p span {
          display: block;
          white-space: nowrap;
          opacity: 0;
        }
        .gt-script p span:nth-child(2) {
          padding-left: 0.5em;
        }
        .gt-script p span:nth-child(3) {
          padding-left: 0.9em;
        }
        .gt-script p span:nth-child(4) {
          padding-left: 1.5em;
        }
        .gt.is-in .gt-script p span {
          animation: gtInk 1.3s var(--ease-out) calc(var(--i) * 220ms + 0.9s) both;
        }
        @keyframes gtInk {
          from {
            opacity: 0;
            transform: translate3d(-10px, 8px, 0);
            filter: blur(3px);
          }
          to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
            filter: blur(0);
          }
        }
        .gt-script__line {
          display: block;
          width: 36px;
          height: 1px;
          margin: clamp(18px, 2vw, 28px) 0 0 clamp(60px, 6vw, 96px);
          background: var(--line);
          transform: scaleX(0);
          transform-origin: left;
        }
        .gt.is-in .gt-script__line {
          animation: gtGrowX 1.2s var(--ease-out) 1.9s both;
        }

        .gt-form {
          max-width: 400px;
        }
        .gt-form__title {
          margin-bottom: clamp(20px, 2.4vw, 34px);
          opacity: 0;
        }
        .gt.is-in .gt-form__title {
          animation: gtFade 1s ease 1.1s both;
        }

        .gt-field {
          position: relative;
          margin-bottom: clamp(18px, 2.2vw, 30px);
          opacity: 0;
        }
        .gt.is-in .gt-field {
          animation: gtFade 1s ease calc(var(--i) * 110ms + 1.25s) both;
        }
        .gt-field__label {
          display: block;
          margin-bottom: 8px;
          font-size: 0.56rem;
          letter-spacing: 0.26em;
        }
        .gt-field__label b {
          margin-left: 4px;
          font-weight: 600;
          color: var(--ink);
        }

        .gt-field input,
        .gt-field textarea,
        .gt-select select {
          display: block;
          width: 100%;
          padding: 6px 0 10px;
          border: 0;
          border-bottom: 1px solid var(--field-line);
          border-radius: 0;
          background: transparent;
          color: var(--ink-deep);
          font-family: var(--aur-serif), Georgia, serif;
          font-size: clamp(1rem, 1.1vw, 1.1rem);
          font-weight: 500;
          line-height: 1.4;
          outline: none;
          transition: border-color 0.4s ease;
        }
        .gt-field input::placeholder,
        .gt-field textarea::placeholder {
          color: rgba(58, 49, 41, 0.5);
          font-weight: 400;
        }
        .gt-field input:hover,
        .gt-field textarea:hover,
        .gt-select select:hover {
          border-bottom-color: rgba(58, 49, 41, 0.55);
        }
        .gt-field input:focus,
        .gt-field textarea:focus,
        .gt-select select:focus {
          border-bottom-color: var(--ink);
        }
        .gt-field textarea {
          min-height: 108px;
          resize: vertical;
        }
        .gt-field.has-error input,
        .gt-field.has-error textarea,
        .gt-field.has-error select {
          border-bottom-color: var(--danger);
        }

        .gt-select {
          position: relative;
        }
        .gt-select select {
          appearance: none;
          -webkit-appearance: none;
          padding-right: 28px;
          cursor: pointer;
          color: rgba(58, 49, 41, 0.62);
        }
        .gt-select select.has-value {
          color: var(--ink-deep);
        }
        .gt-select select option {
          color: var(--ink-deep);
          background: #ebe3d8;
        }
        .gt-select__chev {
          position: absolute;
          right: 0;
          top: 50%;
          display: inline-flex;
          margin-top: -11px;
          color: var(--ink);
          pointer-events: none;
        }

        .gt-error {
          display: block;
          margin-top: 6px;
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: 0.72rem;
          font-weight: 500;
          letter-spacing: 0.02em;
          color: var(--danger);
        }

        .gt-submit {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 18px;
          margin-top: clamp(24px, 3vw, 40px);
          opacity: 0;
        }
        .gt.is-in .gt-submit {
          animation: gtFade 1s ease calc(var(--i) * 110ms + 1.25s) both;
        }
        .gt-btn {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 18px;
          height: 52px;
          padding: 0 34px;
          border: 0;
          border-radius: 2px;
          background: var(--btn);
          color: #f3ece3;
          font-family: var(--aur-serif), Georgia, serif;
          font-size: 1.04rem;
          font-weight: 500;
          letter-spacing: 0.01em;
          cursor: pointer;
          overflow: hidden;
          box-shadow: 0 14px 30px -16px rgba(45, 37, 30, 0.7);
          transition: transform 0.5s var(--ease-out), box-shadow 0.5s ease, background 0.4s ease;
        }
        .gt-btn::before {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          width: 50%;
          left: -70%;
          background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.18), transparent);
          transform: skewX(-18deg);
        }
        .gt-btn:hover:not(:disabled) {
          background: #3d332a;
          transform: translateY(-3px);
          box-shadow: 0 22px 38px -16px rgba(45, 37, 30, 0.75);
        }
        .gt-btn:hover:not(:disabled)::before {
          left: 130%;
          transition: left 0.9s ease;
        }
        .gt-btn:active:not(:disabled) {
          transform: translateY(-1px) scale(0.985);
        }
        .gt-btn:disabled {
          cursor: progress;
          opacity: 0.8;
        }
        .gt-btn.is-sent {
          background: #5b6b4f;
        }
        .gt-btn__label {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .gt-btn__arrow {
          position: relative;
          display: inline-flex;
          transition: transform 0.45s var(--ease-out);
        }
        .gt-btn:hover .gt-btn__arrow {
          transform: translateX(6px);
        }
        .gt-status {
          margin: 0;
          min-height: 1.2em;
          font-size: 0.92rem;
          font-style: italic;
          font-weight: 500;
          color: #5b6b4f;
          opacity: 0;
          transition: opacity 0.5s ease;
        }
        .gt-status.is-shown {
          opacity: 1;
        }
        .gt-status.is-error {
          color: var(--danger);
        }

        /* ═══════════════════════════════════════════════════════════════════
           RIGHT — photo, details, inset card
           ═══════════════════════════════════════════════════════════════════ */
        .gt-media {
          position: relative;
          min-width: 0;
        }
        .gt-photo {
          position: relative;
          margin: 0;
          height: clamp(460px, 71vh, 780px);
        }
        .gt-clip {
          position: absolute;
          inset: 0;
          display: block;
          overflow: hidden;
          background: #d9cebe;
          clip-path: inset(0 0 0 100%);
        }
        .gt.is-in .gt-clip {
          animation: gtOpen 1.7s var(--ease-wipe) 0.15s both;
        }
        .gt-par {
          position: absolute;
          inset: -6%;
          transform: translate3d(calc(var(--mx) * -14px), calc(var(--my) * -8px + var(--sp) * 16px), 0);
          transition: transform 0.9s cubic-bezier(0.2, 0.7, 0.2, 1);
          will-change: transform;
        }
        .gt-kb {
          position: absolute;
          inset: 0;
          transform: scale(1.16);
        }
        .gt.is-in .gt-kb {
          animation: gtKB 3s var(--ease-out) 0.25s both;
        }
        .gt-kb img,
        .gt-kb .gt-fallback {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transform: scale(1);
          transition: transform 1.4s var(--ease-out);
          -webkit-user-drag: none;
        }
        .gt-fallback {
          background:
            radial-gradient(ellipse 70% 50% at 70% 20%, rgba(255, 250, 240, 0.6), transparent 72%),
            linear-gradient(170deg, #d6c9b6, #ab977c);
        }
        .gt-photo:hover .gt-kb img,
        .gt-photo:hover .gt-kb .gt-fallback {
          transform: scale(1.04);
        }

        /* studio / hours / phone over the photo */
        .gt-info {
          position: absolute;
          top: 7%;
          left: 58%;
          display: flex;
          flex-direction: column;
          gap: clamp(16px, 2vw, 28px);
          color: var(--ink-deep);
          transform: translate3d(calc(var(--mx) * -8px), calc(var(--my) * -5px), 0);
          transition: transform 0.9s cubic-bezier(0.2, 0.7, 0.2, 1);
        }
        .gt-info__item {
          opacity: 0;
        }
        .gt.is-in .gt-info__item {
          animation: gtFade 1s ease calc(var(--i) * 140ms + 1.3s) both;
        }
        .gt-info__label {
          font-size: 0.56rem;
          letter-spacing: 0.3em;
        }
        .gt-info__line {
          display: block;
          width: 30px;
          height: 1px;
          margin: 10px 0 12px;
          background: rgba(58, 49, 41, 0.5);
        }
        .gt-info__value {
          margin: 0;
          font-size: clamp(0.92rem, 1vw, 1.02rem);
          font-weight: 500;
          line-height: 1.5;
          color: var(--ink-deep);
        }
        .gt-info__value span {
          display: block;
        }

        /* inset photo with a cream frame */
        .gt-card {
          position: absolute;
          left: 55%;
          bottom: clamp(-52px, -3.6vw, -36px);
          width: clamp(120px, 11.4vw, 176px);
          margin: 0;
          opacity: 0;
        }
        .gt.is-in .gt-card {
          animation: gtFade 1.2s ease 1.5s both;
        }
        .gt-card__frame {
          display: block;
          padding: clamp(6px, 0.6vw, 9px);
          background: #efe7db;
          box-shadow: 0 24px 40px -22px rgba(45, 37, 30, 0.6);
          transform: translate3d(calc(var(--mx) * -6px), calc(var(--my) * -4px), 0);
          transition: transform 0.9s cubic-bezier(0.2, 0.7, 0.2, 1);
        }
        .gt-card__img {
          display: block;
          aspect-ratio: 4 / 5.6;
          overflow: hidden;
          background: #d9cebe;
        }
        .gt-card__img img,
        .gt-card__img .gt-fallback {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 1.2s var(--ease-out);
          -webkit-user-drag: none;
        }
        .gt-card:hover .gt-card__img img,
        .gt-card:hover .gt-card__img .gt-fallback {
          transform: scale(1.06);
        }

        /* "Visit our studio →" in script */
        .gt-visit {
          position: absolute;
          right: clamp(28px, 4.4vw, 84px);
          bottom: clamp(-74px, -5vw, -50px);
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #6f5a48;
          text-decoration: none;
          transform: rotate(-7deg);
          transform-origin: right bottom;
          opacity: 0;
        }
        .gt.is-in .gt-visit {
          animation: gtFade 1.2s ease 1.8s both;
        }
        .gt-visit span {
          font-family: var(--aur-script), 'Snell Roundhand', cursive;
          font-size: clamp(1.3rem, 1.7vw, 1.8rem);
          line-height: 1;
        }
        .gt-visit svg {
          transition: transform 0.5s var(--ease-out);
        }
        .gt-visit:hover svg,
        .gt-visit:focus-visible svg {
          transform: translateX(6px);
        }

        /* ═══════════════════════════════════════════════════════════════════
           CURSOR — ink on paper, white over the photo
           ═══════════════════════════════════════════════════════════════════ */
        .gt-cursor,
        .gt-cursor-dot {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 200;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.35s ease;
        }
        .gt-cursor.is-visible,
        .gt-cursor-dot.is-visible {
          opacity: 1;
        }
        .gt-cursor::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 40px;
          height: 40px;
          margin: -20px 0 0 -20px;
          border-radius: 50%;
          border: 1px solid rgba(58, 49, 41, 0.55);
          background: rgba(58, 49, 41, 0);
          transition: transform 0.5s var(--ease-out), background 0.4s ease, border-color 0.4s ease;
        }
        .gt-cursor.is-grow::before {
          transform: scale(1.5);
          background: rgba(58, 49, 41, 0.06);
          border-color: rgba(58, 49, 41, 0.8);
        }
        .gt-cursor.has-label::before {
          transform: scale(1.9);
          background: rgba(238, 230, 219, 0.6);
          -webkit-backdrop-filter: blur(6px);
          backdrop-filter: blur(6px);
        }
        .gt-cursor__label {
          position: absolute;
          top: 0;
          left: 0;
          transform: translate(-50%, -50%);
          font-family: var(--aur-sans), system-ui, sans-serif;
          font-size: 0.64rem;
          font-weight: 500;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ink);
          white-space: nowrap;
          opacity: 0;
          transition: opacity 0.3s ease;
        }
        .gt-cursor.has-label .gt-cursor__label {
          opacity: 1;
        }
        .gt-cursor-dot::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 6px;
          height: 6px;
          margin: -3px 0 0 -3px;
          border-radius: 50%;
          background: var(--ink);
          transition: transform 0.3s ease, background 0.3s ease;
        }
        .gt-cursor-dot.is-grow::before {
          transform: scale(0);
        }
        .gt-cursor.is-photo::before {
          border-color: rgba(255, 255, 255, 0.65);
        }
        .gt-cursor.is-photo.is-grow::before {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.9);
        }
        .gt-cursor.is-photo.has-label::before {
          background: rgba(40, 30, 22, 0.4);
        }
        .gt-cursor.is-photo .gt-cursor__label {
          color: #fff;
        }
        .gt-cursor-dot.is-photo::before {
          background: #fff;
        }

        /* ═══════════════════════════════════════════════════════════════════
           FOCUS + PAUSE
           ═══════════════════════════════════════════════════════════════════ */
        .gt a:focus-visible,
        .gt button:focus-visible {
          outline: 2px solid var(--copper);
          outline-offset: 4px;
        }
        .gt.is-offscreen .gt-light,
        .gt.is-offscreen .gt-leaves,
        .gt.is-offscreen .gt-line__in--accent {
          animation-play-state: paused;
        }

        /* ═══════════════════════════════════════════════════════════════════
           RESPONSIVE
           ═══════════════════════════════════════════════════════════════════ */
        @media (max-width: 1280px) {
          .gt-grid {
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            row-gap: clamp(48px, 6vw, 80px);
            padding-right: var(--gutter);
          }
          .gt-media {
            grid-column: 1 / -1;
            margin-bottom: 70px;
          }
          .gt-photo {
            height: clamp(380px, 52vw, 620px);
          }
          .gt-info {
            left: auto;
            right: 6%;
          }
          .gt-card {
            left: 8%;
          }
        }

        @media (max-width: 860px) {
          .gt {
            min-height: 0;
          }
          .gt-grid {
            grid-template-columns: minmax(0, 1fr);
            padding: 92px var(--gutter) 64px;
          }
          .gt-divider {
            display: none;
          }
          .gt-ways {
            max-width: none;
          }
          .gt-form {
            max-width: none;
          }
          .gt-script {
            margin-left: 12px;
          }
          .gt-title {
            font-size: clamp(2.2rem, 9.5vw, 3.4rem);
          }
          .gt-photo {
            height: clamp(340px, 92vw, 520px);
          }
          .gt-info {
            position: static;
            flex-direction: row;
            flex-wrap: wrap;
            gap: 22px 32px;
            margin-top: 30px;
            transform: none;
          }
          .gt-card {
            left: auto;
            right: 8%;
            bottom: auto;
            top: calc(clamp(340px, 92vw, 520px) - 60px);
          }
          .gt-visit {
            position: relative;
            right: auto;
            bottom: auto;
            display: flex;
            margin: 26px 0 0 8px;
            transform: rotate(-4deg);
          }
          .gt-media {
            margin-bottom: 0;
          }
        }

        @media (pointer: coarse) {
          .gt-cursor,
          .gt-cursor-dot {
            display: none;
          }
        }

        /* ═══════════════════════════════════════════════════════════════════
           REDUCED MOTION
           ═══════════════════════════════════════════════════════════════════ */
        @media (prefers-reduced-motion: reduce) {
          .gt *,
          .gt *::before,
          .gt *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            transition-delay: 0s !important;
          }
        }
      `}</style>
    </section>
  );
}