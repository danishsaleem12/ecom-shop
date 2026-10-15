import { test } from 'node:test';
import assert from 'node:assert/strict';

const { STORE, addressOneLine, mapsHref, telHref, hoursOneLine, whatsappHref } = await import('@/lib/store');

const originals = new WeakMap(); // per test: STORE values as they were before the test changed them

/** Changes STORE.<key> for the rest of this test only (it is put back afterwards, even if called twice). */
function setStore(t, key, value) {
  if (!originals.has(t)) {
    originals.set(t, {});
    t.after(() => Object.assign(STORE, originals.get(t)));
  }
  const saved = originals.get(t);
  if (!(key in saved)) saved[key] = STORE[key];
  STORE[key] = value;
}

test('store details: the fields the Footer, Contact and Help pages read all exist', () => {
  assert.ok(STORE.name);
  assert.match(STORE.email, /^[^@\s]+@[^@\s]+\.[^@\s]+$/);
  assert.match(STORE.supportEmail, /^[^@\s]+@[^@\s]+\.[^@\s]+$/);
  assert.ok(Array.isArray(STORE.address) && STORE.address.length > 0);
  assert.ok(STORE.legal.lastUpdated && STORE.legal.jurisdiction);
});

test('telHref strips spaces and punctuation from the phone number', (t) => {
  setStore(t, 'phone', '+92 (300) 123-4567');
  assert.equal(telHref(), 'tel:+923001234567');
});

test('addressOneLine skips empty lines; mapsHref encodes it for the URL', (t) => {
  setStore(t, 'address', ['12 Main Blvd', '', 'Lahore, Punjab']);
  assert.equal(addressOneLine(), '12 Main Blvd, Lahore, Punjab');
  assert.equal(mapsHref(), 'https://maps.google.com/?q=12%20Main%20Blvd%2C%20Lahore%2C%20Punjab');
});

test('hoursOneLine adds the timezone only when there is one, and nothing without opening days', (t) => {
  setStore(t, 'hours', { days: 'Mon – Sat: 10am – 7pm', tz: 'PKT' });
  assert.equal(hoursOneLine(), 'Mon – Sat: 10am – 7pm (PKT)');
  setStore(t, 'hours', { days: 'Mon – Sat: 10am – 7pm', tz: '' });
  assert.equal(hoursOneLine(), 'Mon – Sat: 10am – 7pm');
  setStore(t, 'hours', { days: '', tz: 'PKT' });
  assert.equal(hoursOneLine(), '');
});

test('whatsappHref builds a wa.me link with an encoded message', (t) => {
  setStore(t, 'whatsapp', '923001234567');
  assert.equal(
    whatsappHref('Hi there & hello'),
    'https://wa.me/923001234567?text=Hi%20there%20%26%20hello'
  );
  assert.match(whatsappHref(), /^https:\/\/wa\.me\/923001234567\?text=Hi!/);
});
