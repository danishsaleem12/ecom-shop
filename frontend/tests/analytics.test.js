import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installFakeBrowser } from './helpers.js';

process.env.NEXT_PUBLIC_GA_ID = 'G-TEST12345';
const analytics = await import('@/lib/analytics');
const { GA_ID, CONSENT_KEY, CONSENT_EVENT, readConsent, saveConsent, trackEvent, trackPurchase } = analytics;

const ORDER = {
  _id: 'o1',
  total: 5000,
  items: [
    { product: 'p1', name: 'Linen Shirt', size: 'M', color: 'Black', price: 2000, qty: 2 },
    { name: 'Scarf', price: 500, qty: 1 },
  ],
};

function withBrowser(t, options) {
  const browser = installFakeBrowser(options);
  t.after(() => browser.restore());
  return browser;
}

test('GA_ID is only accepted when it looks like a real measurement ID', () => {
  assert.equal(GA_ID, 'G-TEST12345');
});

test('readConsent: only "granted" and "denied" count; anything else means "not asked yet"', (t) => {
  const { win } = withBrowser(t);
  assert.equal(readConsent(), null);
  win.localStorage.setItem(CONSENT_KEY, 'maybe');
  assert.equal(readConsent(), null);
  win.localStorage.setItem(CONSENT_KEY, 'granted');
  assert.equal(readConsent(), 'granted');
  win.localStorage.setItem(CONSENT_KEY, 'denied');
  assert.equal(readConsent(), 'denied');
});

test('readConsent: blocked storage is treated as "not asked", so nothing is tracked', (t) => {
  withBrowser(t, { blockStorage: true });
  assert.equal(readConsent(), null);
});

test('saveConsent: stores the choice and tells the banner and scripts about it', (t) => {
  const { win } = withBrowser(t);
  const heard = [];
  win.addEventListener(CONSENT_EVENT, (e) => heard.push(e.detail));
  saveConsent('granted');
  assert.equal(win.localStorage.getItem(CONSENT_KEY), 'granted');
  assert.deepEqual(heard, ['granted']);
});

test('saveConsent("denied"): switches Google off and clears its cookies but not other cookies', (t) => {
  const { win, document } = withBrowser(t);
  saveConsent('denied');
  assert.equal(win['ga-disable-G-TEST12345'], true);
  const cleared = document.cookieWrites.map((c) => c.split('=')[0]);
  assert.ok(cleared.includes('_ga'));
  assert.ok(cleared.includes('_ga_ABC123'));
  assert.ok(!cleared.includes('theme'));
  assert.ok(document.cookieWrites.every((c) => c.includes('expires=Thu, 01 Jan 1970')));
  assert.ok(document.cookieWrites.some((c) => c.includes('domain=.example.com'))); // the parent domain too
});

test('saveConsent: still works when storage is blocked', (t) => {
  const { win } = withBrowser(t, { blockStorage: true });
  const heard = [];
  win.addEventListener(CONSENT_EVENT, (e) => heard.push(e.detail));
  assert.doesNotThrow(() => saveConsent('granted'));
  assert.deepEqual(heard, ['granted']);
});

test('trackEvent: sends nothing until the visitor has accepted', (t) => {
  const { win } = withBrowser(t);
  trackEvent('add_to_cart', { value: 1 });
  assert.equal(win.gtagCalls.length, 0); // not asked yet
  win.localStorage.setItem(CONSENT_KEY, 'denied');
  trackEvent('add_to_cart', { value: 1 });
  assert.equal(win.gtagCalls.length, 0);
  win.localStorage.setItem(CONSENT_KEY, 'granted');
  trackEvent('add_to_cart', { value: 1 });
  assert.deepEqual(win.gtagCalls, [['event', 'add_to_cart', { value: 1 }]]);
});

test('trackEvent: a failing gtag never breaks the page', (t) => {
  const { win } = withBrowser(t);
  win.localStorage.setItem(CONSENT_KEY, 'granted');
  win.gtag = () => {
    throw new Error('blocked by an ad blocker');
  };
  assert.doesNotThrow(() => trackEvent('x'));
});

test('trackPurchase: sends one GA4 purchase with items, shipping and variant', (t) => {
  const { win } = withBrowser(t);
  win.localStorage.setItem(CONSENT_KEY, 'granted');
  trackPurchase(ORDER, 'K7QM-4TXD');
  assert.equal(win.gtagCalls.length, 1);
  const [kind, name, data] = win.gtagCalls[0];
  assert.equal(kind, 'event');
  assert.equal(name, 'purchase');
  assert.equal(data.transaction_id, 'K7QM-4TXD');
  assert.equal(data.currency, 'PKR');
  assert.equal(data.value, 5000);
  assert.equal(data.shipping, 500); // total 5000 - items 4500
  assert.deepEqual(data.items[0], {
    item_id: 'p1',
    item_name: 'Linen Shirt',
    item_variant: 'M / Black',
    price: 2000,
    quantity: 2,
  });
  assert.equal(data.items[1].item_id, 'Scarf'); // no product id: falls back to the name
  assert.equal(data.items[1].item_variant, undefined);
});

test('trackPurchase: a page refresh in the same tab does not count the order twice', (t) => {
  const { win } = withBrowser(t);
  win.localStorage.setItem(CONSENT_KEY, 'granted');
  trackPurchase(ORDER, 'K7QM-4TXD');
  trackPurchase(ORDER, 'K7QM-4TXD');
  assert.equal(win.gtagCalls.length, 1);
  trackPurchase({ ...ORDER, _id: 'o2' }, 'ZZZZ-1111'); // a different order is counted
  assert.equal(win.gtagCalls.length, 2);
});

test('trackPurchase: needs consent and a non-empty order', (t) => {
  const { win } = withBrowser(t);
  trackPurchase(ORDER, 'A'); // no consent yet
  win.localStorage.setItem(CONSENT_KEY, 'granted');
  trackPurchase({ _id: 'o3', items: [] }, 'B');
  trackPurchase(null, 'C');
  assert.equal(win.gtagCalls.length, 0);
});

test('trackPurchase: when the order has no total, value is the items subtotal with no shipping', (t) => {
  const { win } = withBrowser(t);
  win.localStorage.setItem(CONSENT_KEY, 'granted');
  trackPurchase({ _id: 'o4', items: ORDER.items }, 'D');
  const data = win.gtagCalls[0][2];
  assert.equal(data.value, 4500);
  assert.equal(data.shipping, 0);
});

test('trackPurchase: still counts when sessionStorage is blocked', (t) => {
  const { win } = withBrowser(t);
  win.localStorage.setItem(CONSENT_KEY, 'granted');
  win.sessionStorage.getItem = () => {
    throw new Error('blocked');
  };
  trackPurchase(ORDER, 'E');
  assert.equal(win.gtagCalls.length, 1);
});
