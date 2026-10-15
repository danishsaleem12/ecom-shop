import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mockFetch, jsonResponse } from './helpers.js';

const {
  isOnlinePayment,
  needsPayment,
  methodLabel,
  paymentSummary,
  paymentTone,
  validPayment,
  submitPayment,
  requestPayment,
} = await import('@/lib/payment');

const payfast = { gateway: 'payfast', url: 'https://ipguat.apps.net.pk/Ecommerce/api/Transaction/PostTransaction', method: 'POST', fields: { BASKET_ID: 'K7QM-4TXD', TXNAMT: 2500 } };

test('cash on delivery orders never need online payment', () => {
  const cod = { paymentMethod: 'cod', paymentStatus: 'unpaid', status: 'pending' };
  assert.equal(isOnlinePayment(cod), false);
  assert.equal(needsPayment(cod), false);
  assert.equal(methodLabel(cod), 'Cash on delivery');
  assert.equal(paymentSummary(cod), 'Cash on delivery');
  assert.equal(needsPayment({}), false); // old orders have no payment fields
});

test('card orders need payment until the webhook marks them paid', () => {
  assert.equal(needsPayment({ paymentMethod: 'card', paymentStatus: 'unpaid', status: 'pending' }), true);
  assert.equal(needsPayment({ paymentMethod: 'card', status: 'pending' }), true); // status missing = unpaid
  assert.equal(needsPayment({ paymentMethod: 'card', paymentStatus: 'failed', status: 'pending' }), true);
  assert.equal(needsPayment({ paymentMethod: 'card', paymentStatus: 'paid', status: 'processing' }), false);
  assert.equal(needsPayment({ paymentMethod: 'card', paymentStatus: 'refunded', status: 'cancelled' }), false);
  assert.equal(needsPayment({ paymentMethod: 'card', paymentStatus: 'unpaid', status: 'cancelled' }), false); // nothing to pay on a cancelled order
});

test('summary and tone for card orders', () => {
  assert.equal(paymentSummary({ paymentMethod: 'card', paymentStatus: 'paid' }), 'Card · Paid');
  assert.equal(paymentSummary({ paymentMethod: 'card', paymentStatus: 'failed' }), 'Card · Payment failed');
  assert.equal(paymentSummary({ paymentMethod: 'card' }), 'Card · Awaiting payment');
  assert.equal(paymentTone({ paymentStatus: 'paid' }), 'ok');
  assert.equal(paymentTone({ paymentStatus: 'failed' }), 'bad');
  assert.equal(paymentTone({ paymentStatus: 'unpaid' }), 'warn');
});

test('validPayment only accepts a https address and a fields object', () => {
  assert.equal(validPayment(payfast), payfast);
  assert.equal(validPayment(null), null);
  assert.equal(validPayment({ url: payfast.url }), null);
  assert.equal(validPayment({ ...payfast, fields: [] }), null);
  assert.equal(validPayment({ ...payfast, url: 'http://evil.example/pay' }), null);
  assert.equal(validPayment({ ...payfast, url: 'javascript:alert(1)' }), null);
  assert.equal(validPayment({ ...payfast, url: 'not a url' }), null);
  assert.ok(validPayment({ ...payfast, url: 'http://localhost:4000/fake-payfast' })); // local testing
});

// A tiny fake document: enough for submitPayment to build and submit a form
const fakeDocument = () => {
  const submitted = [];
  const body = { children: [], appendChild(el) { this.children.push(el); } };
  return {
    submitted,
    body,
    createElement: (tag) => ({
      tag,
      style: {},
      children: [],
      appendChild(el) { this.children.push(el); },
      submit() { submitted.push(this); },
    }),
  };
};

test('submitPayment posts every field to PayFast as hidden inputs', () => {
  const doc = fakeDocument();
  assert.equal(submitPayment(payfast, doc), true);
  const [form] = doc.submitted;
  assert.equal(form.method, 'POST');
  assert.equal(form.action, payfast.url);
  assert.deepEqual(
    form.children.map((i) => [i.type, i.name, i.value]),
    [['hidden', 'BASKET_ID', 'K7QM-4TXD'], ['hidden', 'TXNAMT', '2500']]
  );
});

test('submitPayment does nothing for an unusable payment', () => {
  const doc = fakeDocument();
  assert.equal(submitPayment({ url: 'http://evil.example', fields: {} }, doc), false);
  assert.equal(submitPayment(undefined, doc), false);
  assert.equal(doc.submitted.length, 0);
});

test('requestPayment: returns the payment form, or a clear message', async (t) => {
  const calls = [];
  mockFetch(t, async (url, opts) => {
    calls.push([url, opts.method]);
    return jsonResponse({ payment: payfast });
  });
  const ok = await requestPayment('http://api.test', 'abc123');
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.payment, payfast);
  assert.deepEqual(calls, [['http://api.test/api/orders/abc123/pay', 'POST']]);

  mockFetch(t, async () => jsonResponse({ message: 'This order is already paid.' }, { ok: false, status: 409 }));
  const refused = await requestPayment('http://api.test', 'abc123');
  assert.equal(refused.ok, false);
  assert.equal(refused.message, 'This order is already paid.');

  mockFetch(t, async () => jsonResponse({ payment: { url: 'http://evil.example', fields: {} } }));
  assert.equal((await requestPayment('http://api.test', 'abc123')).ok, false);

  mockFetch(t, async () => {
    throw new Error('offline');
  });
  const offline = await requestPayment('http://api.test', 'abc123');
  assert.equal(offline.ok, false);
  assert.match(offline.message, /connection/);
});

test('JazzCash and Easypaisa orders count as online payments with their own labels', async () => {
  const { ONLINE_METHODS, gatewayName, paidVia } = await import('../src/lib/payment.js');
  assert.deepEqual(ONLINE_METHODS, ['card', 'jazzcash', 'easypaisa']);
  for (const [method, label, short, gateway] of [
    ['card', 'Card (PayFast)', 'Card', 'PayFast'],
    ['jazzcash', 'JazzCash', 'JazzCash', 'JazzCash'],
    ['easypaisa', 'Easypaisa', 'Easypaisa', 'Easypaisa'],
  ]) {
    const order = { paymentMethod: method, paymentStatus: 'unpaid', status: 'pending' };
    assert.equal(isOnlinePayment(order), true);
    assert.equal(methodLabel(order), label);
    assert.equal(paymentSummary(order), `${short} · Awaiting payment`);
    assert.equal(paymentSummary({ ...order, paymentStatus: 'paid' }), `${short} · Paid`);
    assert.equal(needsPayment(order), true);
    assert.equal(needsPayment({ ...order, paymentStatus: 'paid' }), false);
    assert.equal(needsPayment({ ...order, status: 'cancelled' }), false);
    assert.equal(gatewayName(method), gateway);
    assert.equal(gatewayName(order), gateway);
  }
  assert.equal(paidVia('card'), 'by card through PayFast');
  assert.equal(paidVia({ paymentMethod: 'jazzcash' }), 'with JazzCash');
  assert.equal(gatewayName('bitcoin'), 'the payment provider');
  assert.equal(isOnlinePayment({ paymentMethod: 'cod' }), false);
});
