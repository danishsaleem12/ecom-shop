import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.NEXT_PUBLIC_API_URL = 'http://api.test';

const { imageSrc, API_URL } = await import('@/lib/imageUrl');
const { orderRef } = await import('@/lib/orderRef');
const { RETURN_REASONS, reasonLabel, RETURN_STATUS_LABEL } = await import('@/lib/returns');
const { SIZE_CHART, both } = await import('@/lib/sizeGuide');

test('imageSrc: uploads get the API address in front, full URLs are left alone', () => {
  assert.equal(API_URL, 'http://api.test');
  assert.equal(imageSrc('/uploads/a.png'), 'http://api.test/uploads/a.png');
  assert.equal(imageSrc('https://res.cloudinary.com/x/a.jpg'), 'https://res.cloudinary.com/x/a.jpg');
  assert.equal(imageSrc('HTTP://CDN.example/a.jpg'), 'HTTP://CDN.example/a.jpg');
  assert.equal(imageSrc(''), '');
  assert.equal(imageSrc(undefined), '');
});

test('orderRef: shows the order number, or the last 8 characters of the id for old orders', () => {
  assert.equal(orderRef({ orderNumber: 'K7QM-4TXD', _id: 'abc' }), 'K7QM-4TXD');
  assert.equal(orderRef({ _id: '65f1a2b3c4d5e6f7a8b9c0d1' }), 'A8B9C0D1');
  assert.equal(orderRef({}), '');
  assert.equal(orderRef(null), '');
});

test('returns: every reason has a label, unknown values show as they are', () => {
  assert.deepEqual(
    RETURN_REASONS.map((r) => r.value),
    ['wrong-size', 'not-as-described', 'damaged', 'changed-mind', 'other']
  );
  for (const r of RETURN_REASONS) assert.equal(reasonLabel(r.value), r.label);
  assert.equal(reasonLabel('something-new'), 'something-new');
});

test('returns: every backend return status has a customer-facing label', () => {
  for (const status of ['requested', 'approved', 'rejected', 'received', 'refunded']) {
    assert.ok(RETURN_STATUS_LABEL[status], status);
  }
});

test('size guide: sizes are unique, grow with every measurement, and convert to cm', () => {
  const sizes = SIZE_CHART.map((r) => r.size);
  assert.equal(new Set(sizes).size, sizes.length);
  for (const key of ['bust', 'waist', 'hips']) {
    for (let i = 1; i < SIZE_CHART.length; i++) {
      assert.ok(SIZE_CHART[i][key] > SIZE_CHART[i - 1][key], `${key} should grow from ${sizes[i - 1]} to ${sizes[i]}`);
    }
  }
  assert.equal(both(34), '34 in / 86 cm');
  assert.equal(both(36), '36 in / 91 cm');
});
