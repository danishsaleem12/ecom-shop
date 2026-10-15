'use client';

/**
 * frontend/src/components/Analytics.js — Google Analytics 4 plus the cookie notice.
 * Place in layout.js once (inside <body>). Renders nothing at all unless NEXT_PUBLIC_GA_ID is set.
 *
 *  - First visit: a small notice asks Accept / Decline. Google's scripts are NOT loaded before "Accept".
 *  - The choice is remembered in the browser (localStorage "aurelia-consent").
 *  - Visitors can change their mind later: the "Cookie settings" button in the Privacy Policy reopens the notice.
 *  - Page views for every page the visitor opens are counted by GA4's built-in "enhanced measurement"
 *    (keep "Page changes based on browser history events" switched on in the GA data stream settings).
 */

import { useEffect, useState } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import { GA_ID, CONSENT_EVENT, OPEN_SETTINGS_EVENT, readConsent, saveConsent } from '@/lib/analytics';

const CSS = `
.aur-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;max-width:560px;margin:0 auto;padding:18px 20px;border-radius:14px;background:#181513;color:#f6efe8;box-shadow:0 12px 40px rgba(0,0,0,.28);font-family:var(--aur-sans,system-ui,Arial,sans-serif);font-size:14px;line-height:1.55}
.aur-consent p{margin:0 0 14px}
.aur-consent a{color:inherit;text-decoration:underline;text-underline-offset:3px}
.aur-consent__row{display:flex;gap:10px;flex-wrap:wrap}
.aur-consent button{height:42px;padding:0 22px;border-radius:999px;border:1px solid #f6efe8;font:inherit;font-size:14px;cursor:pointer}
.aur-consent button:focus-visible{outline:2px solid #f6efe8;outline-offset:3px}
.aur-consent__yes{background:#f6efe8;color:#181513}
.aur-consent__no{background:transparent;color:#f6efe8}
@media (min-width:640px){.aur-consent{left:auto;right:24px;bottom:24px;margin:0}}
`;

export default function Analytics() {
  const [consent, setConsent] = useState(null); // null = not asked yet
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false); // false during server render / first paint: avoids a flash of the banner

  useEffect(() => {
    if (!GA_ID) return undefined;
    setConsent(readConsent());
    setOpen(readConsent() === null);
    setReady(true);
    const onChange = (e) => {
      setConsent(e.detail);
      setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener(CONSENT_EVENT, onChange);
    window.addEventListener(OPEN_SETTINGS_EVENT, onOpen);
    return () => {
      window.removeEventListener(CONSENT_EVENT, onChange);
      window.removeEventListener(OPEN_SETTINGS_EVENT, onOpen);
    };
  }, []);

  if (!GA_ID || !ready) return null;

  return (
    <>
      {consent === 'granted' && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            window.gtag = function(){ window.dataLayer.push(arguments); };
            window['ga-disable-${GA_ID}'] = false;
            window.gtag('js', new Date());
            window.gtag('config', '${GA_ID}');
          `}</Script>
        </>
      )}

      {open && (
        <div className="aur-consent" role="dialog" aria-live="polite" aria-label="Cookie notice">
          <style>{CSS}</style>
          <p>
            We would like to use analytics cookies to see which pages are visited and improve the store. They are optional, and nothing is sent to Google
            unless you accept. <Link href="/privacy#cookies">Read more</Link>
          </p>
          <div className="aur-consent__row">
            <button type="button" className="aur-consent__yes" onClick={() => saveConsent('granted')}>
              Accept
            </button>
            <button type="button" className="aur-consent__no" onClick={() => saveConsent('denied')}>
              Decline
            </button>
          </div>
        </div>
      )}
    </>
  );
}
