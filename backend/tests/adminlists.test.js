// tests/adminlists.test.js — pagination + search on the admin lists (orders, subscribers) and bulk edit / delete of products
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { start, call, signIn, oid } = require("./helpers");
const Order = require("../models/Order");
const User = require("../models/User");
const Subscriber = require("../models/Subscriber");
const Product = require("../models/Product");
const UPLOAD_DIR = require("../utils/uploadDir");

// ---- orders ---------------------------------------------------------------------------------------------

// Mocks everything GET /api/orders/admin/all touches and records what it was asked
function mockOrders(t, { rows = [], total = 0, grouped = [], owners = [] } = {}) {
  const seen = {};
  t.mock.method(Order, "countDocuments", async (f) => ((seen.filter = f), total));
  t.mock.method(Order, "aggregate", async (pipeline) => ((seen.pipeline = pipeline), grouped));
  t.mock.method(Order, "find", (f) => {
    seen.findFilter = f;
    const q = {
      sort: (s) => ((seen.sort = s), q),
      skip: (n) => ((seen.skip = n), q),
      limit: (n) => ((seen.limit = n), q),
      populate: async () => rows,
    };
    return q;
  });
  t.mock.method(User, "find", () => ({ select: () => ({ limit: async () => owners }) }));
  return seen;
}

test("admin orders: first page by default, with totals and per-status counts", async (t) => {
  const seen = mockOrders(t, {
    rows: [{ _id: oid() }],
    total: 45,
    grouped: [{ _id: "pending", n: 5 }, { _id: "delivered", n: 40 }],
  });
  const { cookie } = signIn(t.mock, { role: "admin" });
  const srv = await start();
  t.after(srv.close);

  const r = await call(srv.base, "/api/orders/admin/all", { cookie });
  assert.equal(r.status, 200);
  assert.equal(r.data.orders.length, 1);
  assert.equal(r.data.total, 45);
  assert.equal(r.data.page, 1);
  assert.equal(r.data.limit, 20);
  assert.equal(r.data.pages, 3);
  assert.deepEqual(r.data.counts, { pending: 5, processing: 0, shipped: 0, delivered: 40, cancelled: 0, all: 45 });
  assert.equal(seen.skip, 0);
  assert.equal(seen.limit, 20);
  assert.deepEqual(seen.sort, { createdAt: -1, _id: -1 });
});

test("admin orders: ?page and ?limit are honoured and clamped", async (t) => {
  const seen = mockOrders(t);
  const { cookie } = signIn(t.mock, { role: "admin" });
  const srv = await start();
  t.after(srv.close);

  await call(srv.base, "/api/orders/admin/all?page=3&limit=10", { cookie });
  assert.deepEqual([seen.skip, seen.limit], [20, 10]);

  await call(srv.base, "/api/orders/admin/all?page=2&limit=5000", { cookie }); // limit capped at 100
  assert.deepEqual([seen.skip, seen.limit], [100, 100]);

  await call(srv.base, "/api/orders/admin/all?page=abc&limit=-4", { cookie }); // junk falls back to the defaults
  assert.deepEqual([seen.skip, seen.limit], [0, 1]);

  const empty = await call(srv.base, "/api/orders/admin/all?page=9", { cookie });
  assert.equal(empty.data.pages, 1); // pages is never 0
});

test("admin orders: status filter, bad status and the counts ignore the status tab", async (t) => {
  const seen = mockOrders(t);
  const { cookie } = signIn(t.mock, { role: "admin" });
  const srv = await start();
  t.after(srv.close);

  await call(srv.base, "/api/orders/admin/all?status=shipped", { cookie });
  assert.equal(seen.findFilter.status, "shipped");
  assert.deepEqual(seen.pipeline[0], { $match: {} }); // tab counts are computed without the status filter

  assert.equal((await call(srv.base, "/api/orders/admin/all?status=bogus", { cookie })).status, 400);
});

test("admin orders: ?search= finds an order number typed any way, plus name, email, phone and tracking", async (t) => {
  const seen = mockOrders(t, { owners: [{ _id: oid() }] });
  const { cookie } = signIn(t.mock, { role: "admin" });
  const srv = await start();
  t.after(srv.close);

  await call(srv.base, "/api/orders/admin/all?status=pending&search=" + encodeURIComponent("#k7qm 4t"), { cookie });
  const or = seen.findFilter.$or;
  assert.equal(seen.findFilter.status, "pending");
  const numberRx = or.find((c) => c.orderNumber)?.orderNumber;
  assert.ok(numberRx.test("K7QM-4TXD"), "partial number matches across the hyphen");
  assert.ok(!numberRx.test("ZZZZ-4TXD"));
  assert.ok(or.some((c) => c["shippingAddress.email"]));
  assert.ok(or.some((c) => c["shippingAddress.fullName"]));
  assert.ok(or.some((c) => c["shippingAddress.phone"]));
  assert.ok(or.some((c) => c.trackingNumber));
  assert.ok(or.some((c) => c.user?.$in?.length === 1), "orders of matching accounts are included");
  assert.deepEqual(seen.pipeline[0], { $match: { $or: or } }); // counts follow the search, not the status
});

test("admin orders: search text can't inject a regex, and a non-text search is ignored", async (t) => {
  const seen = mockOrders(t);
  const { cookie } = signIn(t.mock, { role: "admin" });
  const srv = await start();
  t.after(srv.close);

  await call(srv.base, "/api/orders/admin/all?search=" + encodeURIComponent("(.*"), { cookie });
  const rx = seen.findFilter.$or[0]["shippingAddress.fullName"];
  assert.ok(rx.test("a (.* b") && !rx.test("anything"));

  await call(srv.base, "/api/orders/admin/all?search=a&search=b", { cookie }); // repeated parameter -> no search at all
  assert.deepEqual(seen.findFilter, {});
});

// ---- subscribers ----------------------------------------------------------------------------------------

function mockSubscribers(t, rows, total = rows.length) {
  const seen = {};
  t.mock.method(Subscriber, "countDocuments", async (f) => ((seen.countFilter = f), total));
  t.mock.method(Subscriber, "find", (f) => {
    seen.filter = f;
    const q = {
      sort: () => q,
      skip: (n) => ((seen.skip = n), q),
      limit: (n) => ((seen.limit = n), q),
      then: (resolve, reject) => Promise.resolve(rows).then(resolve, reject), // awaited without skip/limit by the export
    };
    return q;
  });
  return seen;
}

test("subscribers: paginated, searchable, with totals", async (t) => {
  const seen = mockSubscribers(t, [{ _id: "1", email: "ana@example.com", createdAt: new Date() }], 60);
  const { cookie } = signIn(t.mock, { role: "admin" });
  const srv = await start();
  t.after(srv.close);

  const r = await call(srv.base, "/api/subscribe?page=2&limit=25&search=ana", { cookie });
  assert.equal(r.status, 200);
  assert.equal(r.data.total, 60);
  assert.equal(r.data.pages, 3);
  assert.equal(r.data.page, 2);
  assert.equal(seen.skip, 25);
  assert.equal(seen.limit, 25);
  assert.ok(seen.filter.email.test("Ana@Example.com"));
  assert.deepEqual(seen.countFilter, seen.filter);

  await call(srv.base, "/api/subscribe", { cookie });
  assert.deepEqual([seen.skip, seen.limit], [0, 25]);
  assert.deepEqual(seen.filter, {});
});

test("subscribers export: every row as a CSV, formula-looking values defused, admin only", async (t) => {
  const when = new Date("2026-10-01T00:00:00Z");
  const seen = mockSubscribers(t, [
    { _id: "1", email: "ana@example.com", createdAt: when },
    { _id: "2", email: "=cmd@evil.com", createdAt: when },
  ]);
  const srv = await start();
  t.after(srv.close);
  assert.equal((await call(srv.base, "/api/subscribe/export")).status, 401);
  assert.equal((await call(srv.base, "/api/subscribe/export", { cookie: signIn(t.mock, { role: "user" }).cookie })).status, 403);

  const { cookie } = signIn(t.mock, { role: "admin" });
  const r = await call(srv.base, "/api/subscribe/export?search=" + encodeURIComponent("example"), { cookie });
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-type"), /text\/csv/);
  assert.match(r.headers.get("content-disposition"), /subscribers\.csv/);
  const lines = r.text.split("\n");
  assert.equal(lines[0], "email,subscribed_at,unsubscribe_url");
  assert.equal(lines.length, 3); // header + both rows, no paging
  assert.ok(lines[1].startsWith('"ana@example.com","2026-10-01T00:00:00.000Z","http'));
  assert.ok(lines[2].startsWith(`"'=cmd@evil.com"`));
  assert.equal(seen.skip, undefined);
  assert.ok(seen.filter.email instanceof RegExp);
});

// ---- products: bulk delete ------------------------------------------------------------------------------

test("bulk delete: admin only, validates the id list", async (t) => {
  const srv = await start();
  t.after(srv.close);
  const post = (json, cookie) => call(srv.base, "/api/products/bulk-delete", { method: "POST", json, cookie });
  assert.equal((await post({ ids: [String(oid())] })).status, 401);
  assert.equal((await post({ ids: [String(oid())] }, signIn(t.mock, { role: "user" }).cookie)).status, 403);

  const { cookie } = signIn(t.mock, { role: "admin" });
  assert.equal((await post({}, cookie)).status, 400);
  assert.equal((await post({ ids: [] }, cookie)).status, 400);
  assert.equal((await post({ ids: ["nope"] }, cookie)).status, 400);
  const tooMany = Array.from({ length: 101 }, () => String(oid()));
  assert.equal((await post({ ids: tooMany }, cookie)).status, 400);
});

test("bulk delete: removes the products that exist and their stored images", async (t) => {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const cover = `bulk-${Date.now()}-a.jpg`;
  const extra = `bulk-${Date.now()}-b.jpg`;
  for (const f of [cover, extra]) fs.writeFileSync(path.join(UPLOAD_DIR, f), "x");

  const found = { _id: oid(), name: "Hat", image: `/uploads/${cover}`, images: [`/uploads/${extra}`] };
  const ghost = oid(); // already deleted by someone else
  t.mock.method(Product, "find", async () => [found]);
  const del = t.mock.method(Product, "deleteMany", async () => ({ deletedCount: 1 }));
  const { cookie } = signIn(t.mock, { role: "admin" });
  const srv = await start();
  t.after(srv.close);

  const r = await call(srv.base, "/api/products/bulk-delete", { method: "POST", json: { ids: [String(found._id), String(ghost), String(found._id)] }, cookie });
  assert.equal(r.status, 200);
  assert.deepEqual(r.data, { deleted: 1 });
  assert.deepEqual(del.mock.calls[0].arguments[0], { _id: { $in: [found._id] } });
  await new Promise((resolve) => setTimeout(resolve, 100)); // image removal runs in the background
  assert.ok(!fs.existsSync(path.join(UPLOAD_DIR, cover)));
  assert.ok(!fs.existsSync(path.join(UPLOAD_DIR, extra)));
});

// ---- products: bulk edit --------------------------------------------------------------------------------

const makeProduct = (over = {}) =>
  new Product({ name: "Dress", description: "d", price: 1000, image: "/uploads/a.jpg", category: "dresses", stock: 5, collections: ["linen"], ...over });

// Real Product documents (so the real validation hook runs); save() only validates instead of touching a database
function mockProducts(t, list) {
  t.mock.method(Product, "find", async () => list);
  t.mock.method(Product.prototype, "save", async function save() {
    await this.validate();
    return this;
  });
}

const patch = (srv, json, cookie) => call(srv.base, "/api/products/bulk", { method: "PATCH", json, cookie });

test("bulk edit: admin only, and the request is validated", async (t) => {
  const srv = await start();
  t.after(srv.close);
  const id = String(oid());
  assert.equal((await patch(srv, { ids: [id], changes: { category: "x" } })).status, 401);
  assert.equal((await patch(srv, { ids: [id], changes: { category: "x" } }, signIn(t.mock, { role: "user" }).cookie)).status, 403);

  const { cookie } = signIn(t.mock, { role: "admin" });
  const bad = [
    { ids: [], changes: { category: "x" } },
    { ids: ["nope"], changes: { category: "x" } },
    { ids: [id] },
    { ids: [id], changes: {} },
    { ids: [id], changes: { category: "  " } },
    { ids: [id], changes: { price: { mode: "set", value: -1 } } },
    { ids: [id], changes: { price: { mode: "decrease", value: 100 } } },
    { ids: [id], changes: { price: { mode: "increase", value: 0 } } },
    { ids: [id], changes: { price: { mode: "double", value: 5 } } },
    { ids: [id], changes: { stock: { mode: "set", value: 1.5 } } },
    { ids: [id], changes: { stock: { mode: "set", value: -2 } } },
    { ids: [id], changes: { collections: { add: ["linen"], remove: ["linen"] } } },
    { ids: [id], changes: { collections: { add: ["Bad Slug!"] } } },
    { ids: [id], changes: { collections: ["linen"] } },
  ];
  for (const body of bad) assert.equal((await patch(srv, body, cookie)).status, 400, JSON.stringify(body));
});

test("bulk edit: category, collections, price and stock are applied to every selected product", async (t) => {
  const a = makeProduct({ name: "A", price: 1000, collections: ["linen", "travel"] });
  const b = makeProduct({ name: "B", price: 999, collections: [] });
  mockProducts(t, [a, b]);
  const { cookie } = signIn(t.mock, { role: "admin" });
  const srv = await start();
  t.after(srv.close);

  const r = await patch(
    srv,
    {
      ids: [String(a._id), String(b._id)],
      changes: {
        category: " Summer ",
        collections: { add: ["resort", "linen"], remove: ["travel"] },
        price: { mode: "increase", value: 10 },
        stock: { mode: "set", value: 12 },
      },
    },
    cookie
  );
  assert.equal(r.status, 200);
  assert.deepEqual(r.data, { updated: 2, missing: 0, stockSkipped: [], failed: [] });
  assert.equal(a.category, "Summer");
  assert.deepEqual([...a.collections], ["linen", "resort"]);
  assert.deepEqual([...b.collections], ["resort", "linen"]);
  assert.equal(a.price, 1100);
  assert.equal(b.price, 1099); // 999 * 1.1 = 1098.9 -> whole rupees
  assert.equal(a.stock, 12);
});

test("bulk edit: price set / decrease, and products with sizes keep their variant stock", async (t) => {
  const plain = makeProduct({ name: "Plain", price: 2000 });
  const sized = makeProduct({ name: "Sized", price: 2000, variants: [{ size: "S", stock: 2 }, { size: "M", stock: 3 }] });
  mockProducts(t, [plain, sized]);
  const { cookie } = signIn(t.mock, { role: "admin" });
  const srv = await start();
  t.after(srv.close);

  const ids = [String(plain._id), String(sized._id)];
  let r = await patch(srv, { ids, changes: { price: { mode: "decrease", value: 25 } } }, cookie);
  assert.equal(r.data.updated, 2);
  assert.equal(plain.price, 1500);
  assert.equal(sized.price, 1500);

  r = await patch(srv, { ids, changes: { price: { mode: "set", value: "999" }, stock: { mode: "set", value: 0 } } }, cookie);
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.stockSkipped, ["Sized"]);
  assert.equal(plain.price, 999);
  assert.equal(sized.price, 999); // other changes still apply to it
  assert.equal(plain.stock, 0);
  assert.equal(sized.stock, 5); // still the total of its variants
});

test("bulk edit: one product failing validation doesn't stop the others, and missing ids are counted", async (t) => {
  const good = makeProduct({ name: "Good" });
  const broken = makeProduct({ name: "Broken", variants: [{ size: "M", stock: 1 }, { size: "m", stock: 1 }] }); // duplicate variant
  mockProducts(t, [good, broken]);
  const { cookie } = signIn(t.mock, { role: "admin" });
  const srv = await start();
  t.after(srv.close);

  const r = await patch(srv, { ids: [String(good._id), String(broken._id), String(oid())], changes: { category: "sale" } }, cookie);
  assert.equal(r.status, 200);
  assert.equal(r.data.updated, 1);
  assert.equal(r.data.missing, 1);
  assert.equal(r.data.failed.length, 1);
  assert.equal(r.data.failed[0].name, "Broken");
  assert.match(r.data.failed[0].message, /Duplicate variant/);
  assert.equal(good.category, "sale");
});

// ---- products list: stable order for paging -------------------------------------------------------------

test("products list: every sort has an _id tiebreaker so pages don't overlap", async (t) => {
  const seen = {};
  t.mock.method(Product, "countDocuments", async () => 0);
  t.mock.method(Product, "find", () => {
    const q = { sort: (s) => ((seen.sort = s), q), skip: () => q, limit: () => q, then: (res) => res([]) };
    return q;
  });
  const srv = await start();
  t.after(srv.close);
  for (const sort of ["featured", "newest", "price-asc", "price-desc", "name-asc"]) {
    await call(srv.base, `/api/products?sort=${sort}&page=1&limit=5`);
    assert.ok("_id" in seen.sort, `${sort} sorts by _id last`);
  }
});
