// tests/cart.test.js — the cart saved on the customer's account
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { start, call, oid } = require("./helpers"); // helpers sets the environment, so it must load first
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Product = require("../models/Product");
const { COOKIE_NAME } = require("../middleware/auth");
const { parseCartLines, mergeLines } = require("../utils/cart");

const session = (t, cart = []) => {
  const user = { _id: oid(), name: "Ana", email: "ana@example.com", role: "user", cart };
  t.mock.method(User, "findById", async () => user);
  const saves = [];
  t.mock.method(User, "updateOne", async (filter, update) => void saves.push(update.$set.cart));
  const cookie = `${COOKIE_NAME}=${jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET)}`;
  return { user, cookie, saves };
};

const shirt = (over = {}) => ({
  _id: oid(), name: "Linen shirt", price: 5000, image: "/uploads/shirt.jpg", stock: 10,
  variants: [{ _id: oid(), size: "M", color: "Black", stock: 4 }, { _id: oid(), size: "L", color: "Black", stock: 0 }],
  ...over,
});
const hat = (over = {}) => ({ _id: oid(), name: "Straw hat", price: 2500, image: "/uploads/hat.jpg", stock: 3, variants: [], ...over });
const catalog = (t, products) => t.mock.method(Product, "find", async () => products);

const api = (base, path, cookie, method = "GET", json) => call(base, `/api/cart${path}`, { method, cookie, json });

// ---- the line rules -----------------------------------------------------------------------------

test("parseCartLines: accepts good lines, keeps the larger quantity of duplicates, caps quantity at 99", () => {
  const a = String(oid());
  const v = String(oid());
  const { lines, error } = parseCartLines([{ product: a, qty: 2 }, { product: a, qty: 5 }, { product: a, variant: v, qty: 500 }]);
  assert.equal(error, undefined);
  assert.deepEqual(lines, [{ product: a, qty: 5 }, { product: a, variant: v, qty: 99 }]);
});

test("parseCartLines: rejects things that are not a cart", () => {
  const id = String(oid());
  assert.ok(parseCartLines("nope").error);
  assert.ok(parseCartLines([{ product: "not-an-id", qty: 1 }]).error);
  assert.ok(parseCartLines([{ product: id, variant: "bad", qty: 1 }]).error);
  assert.ok(parseCartLines([{ product: id, qty: 0 }]).error);
  assert.ok(parseCartLines([{ product: id, qty: 1.5 }]).error);
  assert.ok(parseCartLines(Array.from({ length: 51 }, () => ({ product: String(oid()), qty: 1 }))).error);
});

test("mergeLines: an item in both carts keeps the bigger quantity (so syncing twice never doubles it)", () => {
  const a = String(oid());
  const b = String(oid());
  const merged = mergeLines([{ product: a, qty: 3 }], [{ product: a, qty: 2 }, { product: b, qty: 1 }]);
  assert.deepEqual(merged, [{ product: a, qty: 3 }, { product: b, qty: 1 }]);
});

// ---- routes -------------------------------------------------------------------------------------

test("cart: every route needs a signed-in customer", async (t) => {
  const srv = await start();
  t.after(srv.close);
  assert.equal((await api(srv.base, "", undefined)).status, 401);
  assert.equal((await api(srv.base, "", undefined, "PUT", { items: [] })).status, 401);
  assert.equal((await api(srv.base, "/merge", undefined, "POST", { items: [] })).status, 401);
});

test("GET: returns the saved cart with current price and stock, and leaves out items that are gone or sold out", async (t) => {
  const p = hat();
  const sold = hat({ stock: 0 });
  const { cookie } = session(t, [
    { product: p._id, qty: 2 },
    { product: sold._id, qty: 1 },
    { product: oid(), qty: 1 }, // deleted product
  ]);
  catalog(t, [p, sold]);
  const srv = await start();
  t.after(srv.close);

  const r = await api(srv.base, "", cookie);
  assert.equal(r.status, 200);
  assert.equal(r.data.items.length, 1);
  assert.deepEqual(r.data.items[0], { key: String(p._id), id: String(p._id), name: "Straw hat", price: 2500, image: "/uploads/hat.jpg", stock: 3, qty: 2 });
});

test("GET: a variant line shows its own size/colour and stock; quantity is trimmed to what is left", async (t) => {
  const s = shirt();
  const m = s.variants[0];
  const { cookie } = session(t, [{ product: s._id, variant: m._id, qty: 9 }, { product: s._id, variant: s.variants[1]._id, qty: 1 }]);
  catalog(t, [s]);
  const srv = await start();
  t.after(srv.close);

  const r = await api(srv.base, "", cookie);
  assert.equal(r.data.items.length, 1); // the sold-out L is gone
  assert.equal(r.data.items[0].key, `${s._id}:${m._id}`);
  assert.equal(r.data.items[0].size, "M");
  assert.equal(r.data.items[0].color, "Black");
  assert.equal(r.data.items[0].stock, 4);
  assert.equal(r.data.items[0].qty, 4);
});

test("GET: an empty cart answers an empty list without touching products", async (t) => {
  const { cookie } = session(t, []);
  const find = t.mock.method(Product, "find", async () => { throw new Error("should not be called"); });
  const srv = await start();
  t.after(srv.close);

  const r = await api(srv.base, "", cookie);
  assert.deepEqual(r.data, { items: [] });
  assert.equal(find.mock.callCount(), 0);
});

test("PUT: replaces the saved cart", async (t) => {
  const { cookie, saves } = session(t);
  const id = String(oid());
  const srv = await start();
  t.after(srv.close);

  const r = await api(srv.base, "", cookie, "PUT", { items: [{ product: id, qty: 2 }] });
  assert.equal(r.status, 200);
  assert.deepEqual(saves, [[{ product: id, qty: 2 }]]);

  const emptied = await api(srv.base, "", cookie, "PUT", { items: [] });
  assert.equal(emptied.status, 200);
  assert.deepEqual(saves[1], []);
});

test("PUT: bad data is refused and nothing is saved", async (t) => {
  const { cookie, saves } = session(t);
  const srv = await start();
  t.after(srv.close);

  assert.equal((await api(srv.base, "", cookie, "PUT", { items: [{ product: "x", qty: 1 }] })).status, 400);
  assert.equal((await api(srv.base, "", cookie, "PUT", {})).status, 400);
  assert.equal(saves.length, 0);
});

test("POST /merge: combines this browser's cart with the saved one and saves the result", async (t) => {
  const a = hat();
  const b = hat({ name: "Scarf", price: 1800 });
  const { cookie, saves } = session(t, [{ product: a._id, qty: 1 }]);
  catalog(t, [a, b]);
  const srv = await start();
  t.after(srv.close);

  const r = await api(srv.base, "/merge", cookie, "POST", { items: [{ product: String(a._id), qty: 2 }, { product: String(b._id), qty: 1 }] });
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.items.map((i) => [i.name, i.qty]), [["Straw hat", 2], ["Scarf", 1]]);
  assert.deepEqual(saves[0], [{ product: String(a._id), qty: 2 }, { product: String(b._id), qty: 1 }]);
});

test("POST /merge: items that no longer exist are dropped, also from what gets saved", async (t) => {
  const a = hat();
  const { cookie, saves } = session(t, [{ product: oid(), qty: 3 }]); // saved earlier, product since deleted
  catalog(t, [a]);
  const srv = await start();
  t.after(srv.close);

  const r = await api(srv.base, "/merge", cookie, "POST", { items: [{ product: String(a._id), qty: 1 }] });
  assert.equal(r.data.items.length, 1);
  assert.deepEqual(saves[0], [{ product: String(a._id), qty: 1 }]);
});
