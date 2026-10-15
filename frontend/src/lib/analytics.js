// frontend/src/lib/analytics.js
// Google Analytics 4 + the visitor's cookie choice. Everything here is OFF until you set NEXT_PUBLIC_GA_ID
// (e.g. G-ABC123XYZ) in the frontend environment and rebuild. No ID = no scripts, no banner, no tracking.
//
// Opt-in: Google's scripts are not even downloaded until the visitor presses "Accept".

// Only a real-looking measurement ID is accepted: the value ends up inside an inline script.
const RAW_ID = (process.env.NEXT_PUBLIC_GA_ID || '').trim();
export const GA_ID = /^G-[A-Z0-9]{4,20}$/.test(RAW_ID) ? RAW_ID : '';

export const CONSENT_KEY = 'aurelia-consent'; // 'granted' | 'denied' (absent = not asked yet)
export const CONSENT_EVENT = 'aurelia-consent-change'; // fired on window so the banner and the scripts stay in sync
export const OPEN_SETTINGS_EVENT = 'aurelia-consent-open'; // fired by the "Cookie settings" button

export function readConsent() {
  try {
    const v = window.localStorage.getItem(CONSENT_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null; // storage blocked: treat as "not asked", nothing is tracked
  }
}

export function saveConsent(value) {
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* storage blocked: the choice only lasts until the page reloads */
  }
  if (value === 'denied') stopTracking();
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}

/** After "Decline": tell Google to stop and remove the cookies it already set (_ga, _ga_XXXX). */
function stopTracking() {
  if (GA_ID) window[`ga-disable-${GA_ID}`] = true;
  const host = window.location.hostname.split('.');
  const domains = [undefined, window.location.hostname];
  for (let i = 1; i < host.length - 1; i++) domains.push(`.${host.slice(i).join('.')}`); // parent domains, e.g. .yourstore.com
  document.cookie.split(';').forEach((c) => {
    const name = c.split('=')[0].trim();
    if (name !== '_ga' && !name.startsWith('_ga_')) return;
    domains.forEach((d) => {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ''}`;
    });
  });
}

/** Runs `fn` once Google's script has defined window.gtag (it loads a moment after the page). Gives up after ~12 s. */
function whenReady(fn, tries = 40) {
  if (typeof window.gtag === 'function') return fn();
  if (tries > 0) window.setTimeout(() => whenReady(fn, tries - 1), 300);
  return undefined;
}

/** Sends a GA4 event. Does nothing unless analytics is on and accepted, so it is safe to call anywhere. */
export function trackEvent(name, params = {}) {
  if (!GA_ID || typeof window === 'undefined' || readConsent() !== 'granted') return;
  whenReady(() => {
    try {
      window.gtag('event', name, params);
    } catch {
      /* analytics must never break the page */
    }
  });
}

/** GA4 "purchase" event for a placed order. Once per order per browser tab session (a refresh must not count it twice). */
export function trackPurchase(order, orderNumber) {
  if (!GA_ID || typeof window === 'undefined' || !order?.items?.length || readConsent() !== 'granted') return;
  const key = `aurelia-purchase-${order._id || orderNumber}`;
  whenReady(() => {
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, '1');
    } catch {
      /* storage blocked: may count twice on refresh, which is better than not counting */
    }
    const subtotal = order.items.reduce((n, it) => n + it.price * it.qty, 0);
    const value = Number(order.total) || subtotal;
    try {
      window.gtag('event', 'purchase', {
        transaction_id: orderNumber || String(order._id),
        currency: 'PKR',
        value,
        shipping: Math.max(0, value - subtotal),
        items: order.items.map((it) => ({
          item_id: String(it.product || it.name),
          item_name: it.name,
          item_variant: [it.size, it.color].filter(Boolean).join(' / ') || undefined,
          price: it.price,
          quantity: it.qty,
        })),
      });
    } catch {
      /* analytics must never break the page */
    }
  });
}
