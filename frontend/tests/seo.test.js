import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mockFetch, jsonResponse } from './helpers.js';

process.env.NEXT_PUBLIC_API_URL = 'http://api.test';
process.env.NEXT_PUBLIC_SITE_URL = 'https://www.aurelia.test/'; // trailing slash on purpose

const { SITE_URL, absoluteUrl, snippet, openGraphFor, jsonLdString, productImages, productJsonLd, breadcrumbJsonLd, getProduct, getAllProducts } =
  await import('@/lib/seo');

const PRODUCT = {
  _id: 'p1',
  name: 'Linen Shirt',
  description: 'Soft linen.',
  price: 4500,
  stock: 3,
  category: 'tops',
  image: '/uploads/shirt.png',
  images: ['/uploads/shirt.png', 'https://cdn.test/shirt-2.jpg'],
};

test('SITE_URL drops the trailing slash; absoluteUrl joins paths with exactly one slash', () => {
  assert.equal(SITE_URL, 'https://www.aurelia.test');
  assert.equal(absoluteUrl('/shop'), 'https://www.aurelia.test/shop');
  assert.equal(absoluteUrl('shop'), 'https://www.aurelia.test/shop');
  assert.equal(absoluteUrl(), 'https://www.aurelia.test/');
});

test('snippet: collapses whitespace, cuts at a word boundary, adds an ellipsis only when cut', () => {
  assert.equal(snippet('  Hello \n  world  '), 'Hello world');
  assert.equal(snippet(null), '');
  const cut = snippet('one two three four five six', 15);
  assert.ok(cut.endsWith('…'));
  assert.ok(cut.length <= 15);
  assert.ok(!/\s…$/.test(cut));
  assert.equal(cut, 'one two three…');
});

test('openGraphFor: always carries site name and locale; optional parts only when given', () => {
  const og = openGraphFor({ title: 'Shop', description: 'All pieces', path: '/shop', images: ['https://x/a.jpg'] });
  assert.deepEqual(og, {
    type: 'website',
    siteName: 'Aurelia',
    locale: 'en_PK',
    title: 'Shop',
    description: 'All pieces',
    url: '/shop',
    images: [{ url: 'https://x/a.jpg' }],
  });
  const bare = openGraphFor({ title: 'Cart' });
  assert.equal('description' in bare, false);
  assert.equal('url' in bare, false);
  assert.equal('images' in bare, false);
  assert.equal('images' in openGraphFor({ title: 'x', images: [] }), false);
});

test('jsonLdString: a "<" in product data cannot close the <script> tag', () => {
  const out = jsonLdString({ name: '</script><script>alert(1)</script>' });
  assert.ok(!out.includes('<'));
  assert.deepEqual(JSON.parse(out), { name: '</script><script>alert(1)</script>' });
});

test('productImages: absolute addresses, no repeats, capped', () => {
  assert.deepEqual(productImages(PRODUCT), ['http://api.test/uploads/shirt.png', 'https://cdn.test/shirt-2.jpg']);
  const many = { image: '/a', images: ['/b', '/c', '/d'] };
  assert.equal(productImages(many, 2).length, 2);
  assert.deepEqual(productImages({}), []);
});

test('productJsonLd: price, stock status and URL', () => {
  const ld = productJsonLd(PRODUCT);
  assert.equal(ld['@type'], 'Product');
  assert.equal(ld.name, 'Linen Shirt');
  assert.equal(ld.category, 'tops');
  assert.equal(ld.offers.priceCurrency, 'PKR');
  assert.equal(ld.offers.price, 4500);
  assert.equal(ld.offers.url, 'https://www.aurelia.test/shop/p1');
  assert.equal(ld.offers.availability, 'https://schema.org/InStock');
  assert.equal(productJsonLd({ ...PRODUCT, stock: 0 }).offers.availability, 'https://schema.org/OutOfStock');
});

test('productJsonLd: stars only after a real review; "general" category and return policy are optional', () => {
  assert.equal('aggregateRating' in productJsonLd(PRODUCT), false);
  assert.equal('aggregateRating' in productJsonLd({ ...PRODUCT, ratingCount: 2, ratingAverage: 0 }), false);
  const rated = productJsonLd({ ...PRODUCT, ratingCount: 2, ratingAverage: '4.5' });
  assert.equal(rated.aggregateRating.ratingValue, 4.5);
  assert.equal(rated.aggregateRating.reviewCount, 2);
  assert.equal('category' in productJsonLd({ ...PRODUCT, category: 'general' }), false);
  assert.equal('hasMerchantReturnPolicy' in productJsonLd(PRODUCT).offers, false);
  assert.equal(productJsonLd(PRODUCT, { returnWindowDays: 14 }).offers.hasMerchantReturnPolicy.merchantReturnDays, 14);
});

test('breadcrumbJsonLd numbers the trail from 1 with absolute links', () => {
  const ld = breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'Shop', path: '/shop' }]);
  assert.deepEqual(
    ld.itemListElement.map((c) => [c.position, c.name, c.item]),
    [[1, 'Home', 'https://www.aurelia.test/'], [2, 'Shop', 'https://www.aurelia.test/shop']]
  );
});

test('getProduct: returns the product, or null for a 404 / unreachable backend', async (t) => {
  const fetchMock = mockFetch(t, async () => jsonResponse(PRODUCT));
  assert.deepEqual(await getProduct('p 1'), PRODUCT);
  assert.equal(fetchMock.mock.calls[0].arguments[0], 'http://api.test/api/products/p%201'); // id is URL-encoded

  t.mock.restoreAll();
  mockFetch(t, async () => jsonResponse({}, { ok: false, status: 404 }));
  assert.equal(await getProduct('missing'), null);

  t.mock.restoreAll();
  mockFetch(t, async () => {
    throw new Error('network down');
  });
  assert.equal(await getProduct('p2'), null);
});

test('getAllProducts: a list, or [] when the backend fails or sends something that is not a list', async (t) => {
  mockFetch(t, async () => jsonResponse([PRODUCT]));
  assert.deepEqual(await getAllProducts(), [PRODUCT]);

  t.mock.restoreAll();
  mockFetch(t, async () => jsonResponse({ error: 'oops' }));
  assert.deepEqual(await getAllProducts(), []);

  t.mock.restoreAll();
  mockFetch(t, async () => jsonResponse([], { ok: false, status: 500 }));
  assert.deepEqual(await getAllProducts(), []);

  t.mock.restoreAll();
  mockFetch(t, async () => {
    throw new Error('network down');
  });
  assert.deepEqual(await getAllProducts(), []);
});
