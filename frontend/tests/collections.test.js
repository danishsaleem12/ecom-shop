import { test } from 'node:test';
import assert from 'node:assert/strict';

const { CATEGORIES, COLLECTIONS, getCollectionBySlug, getCategoryById, resolveCollectionPage } = await import(
  '@/lib/collections'
);

test('collection slugs are unique and each href points at its own slug', () => {
  const slugs = COLLECTIONS.map((c) => c.slug);
  assert.equal(new Set(slugs).size, slugs.length, 'duplicate collection slug');
  for (const c of COLLECTIONS) assert.equal(c.href, `/collections/${c.slug}`, c.slug);
});

test('every collection has the copy and images its page needs', () => {
  for (const c of COLLECTIONS) {
    assert.ok(c.title && c.description && c.image, c.slug);
    assert.equal(c.tint.length, 2, `${c.slug} tint`);
    assert.ok(c.thumbs.length > 0, `${c.slug} thumbs`);
    for (const th of c.thumbs) assert.ok(th.image && th.tint.length === 2, `${c.slug} thumb`);
  }
});

// This is the "does every /collections/... link render a page" check: the Navbar and the collections list
// link to these slugs, so each one must resolve to a real collection.
test('every item listed under a category is a real collection', () => {
  for (const cat of CATEGORIES) {
    assert.ok(cat.items.length > 0, cat.id);
    for (const item of cat.items) {
      assert.ok(getCollectionBySlug(item.slug), `"${item.slug}" (in ${cat.id}) has no collection`);
    }
  }
});

test('every category link and every collection slug resolves to a page', () => {
  for (const cat of CATEGORIES) {
    assert.equal(cat.href, `/collections/${cat.id}`);
    assert.ok(resolveCollectionPage(cat.id), cat.id);
  }
  for (const c of COLLECTIONS) assert.ok(resolveCollectionPage(c.slug), c.slug);
});

test('category ids never clash with collection slugs (the page would pick the wrong one)', () => {
  for (const cat of CATEGORIES) assert.equal(getCollectionBySlug(cat.id), null, cat.id);
});

test('resolveCollectionPage: a collection asks the backend for just itself', () => {
  const page = resolveCollectionPage('evening');
  assert.equal(page.kind, 'collection');
  assert.deepEqual(page.slugs, ['evening']);
  assert.equal(page.title, getCollectionBySlug('evening').title);
});

test('resolveCollectionPage: a category asks for every collection inside it', () => {
  const page = resolveCollectionPage('seasonal');
  assert.equal(page.kind, 'category');
  assert.equal(page.title, 'Seasonal');
  assert.deepEqual(page.slugs, getCategoryById('seasonal').items.map((i) => i.slug));
  assert.equal(page.image, getCollectionBySlug(getCategoryById('seasonal').items[0].slug).image);
});

test('resolveCollectionPage: unknown slugs give null (the page shows 404)', () => {
  assert.equal(resolveCollectionPage('nope'), null);
  assert.equal(resolveCollectionPage(''), null);
  assert.equal(getCategoryById('nope'), null);
});
