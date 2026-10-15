import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mockFetch, jsonResponse } from './helpers.js';

process.env.NEXT_PUBLIC_API_URL = 'http://api.test';

const { POLICY, pkr } = await import('@/lib/policy');
const { getPolicy } = await import('@/lib/getPolicy');

test('pkr formats rupees with thousands separators and no decimals', () => {
  assert.equal(pkr(15000), 'Rs 15,000');
  assert.equal(pkr(350), 'Rs 350');
  assert.equal(pkr(0), 'Rs 0');
  assert.equal(pkr('2500'), 'Rs 2,500'); // numbers that arrive as strings from the API
  assert.equal(pkr(1999.6), 'Rs 2,000'); // rounded, never "Rs 1,999.6"
});

test('fallback POLICY has every number the pages print', () => {
  for (const key of ['returnWindowDays', 'freeShippingThreshold', 'shippingFee']) {
    assert.equal(typeof POLICY[key], 'number', key);
    assert.ok(POLICY[key] > 0, key);
  }
  for (const key of ['homeCity', 'deliveryCity', 'deliveryNationwide', 'refundDays']) {
    assert.equal(typeof POLICY[key], 'string', key);
    assert.ok(POLICY[key].length > 0, key);
  }
});

test('getPolicy: live numbers from /api/config replace the defaults', async (t) => {
  const fetchMock = mockFetch(t, async () =>
    jsonResponse({ freeShippingThreshold: 20000, shippingFee: 500, returnWindowDays: 7 })
  );
  const policy = await getPolicy();
  assert.equal(policy.freeShippingThreshold, 20000);
  assert.equal(policy.shippingFee, 500);
  assert.equal(policy.returnWindowDays, 7);
  assert.equal(policy.homeCity, POLICY.homeCity); // website-only copy is untouched
  assert.equal(fetchMock.mock.calls[0].arguments[0], 'http://api.test/api/config');
});

test('getPolicy: a bad or missing number keeps the default for that field only', async (t) => {
  mockFetch(t, async () =>
    jsonResponse({ freeShippingThreshold: 'lots', shippingFee: -5, returnWindowDays: 21, somethingElse: 1 })
  );
  const policy = await getPolicy();
  assert.equal(policy.freeShippingThreshold, POLICY.freeShippingThreshold);
  assert.equal(policy.shippingFee, POLICY.shippingFee);
  assert.equal(policy.returnWindowDays, 21);
  assert.equal(policy.somethingElse, undefined); // only the three known fields are accepted
});

test('getPolicy: zero is a valid value (free shipping on everything)', async (t) => {
  mockFetch(t, async () => jsonResponse({ shippingFee: 0 }));
  assert.equal((await getPolicy()).shippingFee, 0);
});

test('getPolicy: falls back to the defaults when the backend errors or is unreachable', async (t) => {
  mockFetch(t, async () => jsonResponse({}, { ok: false, status: 500 }));
  assert.deepEqual(await getPolicy(), POLICY);

  t.mock.restoreAll();
  mockFetch(t, async () => {
    throw new Error('connect ECONNREFUSED');
  });
  assert.deepEqual(await getPolicy(), POLICY);
});
