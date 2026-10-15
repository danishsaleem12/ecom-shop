import { test } from 'node:test';
import assert from 'node:assert/strict';

const { buildFaqGroups, flattenFaqs } = await import('@/lib/faqs');
const { POLICY } = await import('@/lib/policy');

const LIVE = { ...POLICY, freeShippingThreshold: 12345, shippingFee: 678, returnWindowDays: 9 };

test('faq groups: unique ids, and every question has an answer', () => {
  const groups = buildFaqGroups(POLICY);
  assert.ok(groups.length > 0);
  const ids = groups.map((g) => g.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const g of groups) {
    assert.ok(g.title && g.items.length > 0, g.id);
    for (const item of g.items) {
      assert.ok(item.q.trim().length > 3, 'every FAQ needs a question');
      assert.ok(item.a.trim().length > 20, `"${item.q}" needs an answer`);
      assert.ok(!/undefined|NaN|\[object/.test(item.a), `"${item.q}" printed a broken value`);
    }
  }
});

test('faq links are on-site paths with a label', () => {
  for (const item of flattenFaqs(buildFaqGroups(POLICY))) {
    if (!item.link) continue;
    assert.match(item.link.href, /^\/[a-z-]/, item.q);
    assert.ok(item.link.label, item.q);
  }
});

test('faq answers use the live policy numbers, not hardcoded ones', () => {
  const text = flattenFaqs(buildFaqGroups(LIVE)).map((i) => i.a).join('\n');
  assert.match(text, /Rs 12,345/); // free-shipping threshold
  assert.match(text, /Rs 678/); // shipping fee
  assert.match(text, /within 9 days/); // return window
  assert.ok(!text.includes('15,000'), 'the default threshold leaked into the answer');
});

test('flattenFaqs returns every question once, in order', () => {
  const groups = buildFaqGroups(POLICY);
  const flat = flattenFaqs(groups);
  assert.equal(flat.length, groups.reduce((n, g) => n + g.items.length, 0));
  assert.equal(flat[0], groups[0].items[0]);
});
