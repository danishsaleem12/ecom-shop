const { test } = require("node:test");
const assert = require("node:assert/strict");
const { start, call, signIn, oid } = require("./helpers");
const Order = require("../models/Order");
const Product = require("../models/Product");

const address = { fullName: "A B", line1: "1 Road", city: "Lahore", phone: "0300" };
const place = (srv, cookie, body) => call(srv.base, "/api/orders", { method: "POST", json: body, cookie });

// A shirt with two variants; `variants` mimics what Mongoose returns (each has an _id)
const shirt = () => {
  const v = [
    { _id: oid(), size: "M", color: "Black", stock: 3 },
    { _id: oid(), size: "L", color: "", stock: 0 },
  ];
  return { _id: oid(), name: "Shirt", price: 1000, stock: 3, image: "/s.png", variants: v };
};

function trackStock(t, modified = () => 1) {
  const calls = [];
  t.mock.method(Product, "updateOne", async (filter, update) => {
    calls.push([filter, update]);
    return { modifiedCount: modified(calls.length) };
  });
  return calls;
}

// ---- model --------------------------------------------------------------------------------------

test("model: product stock is the sum of its variants", async () => {
  const p = new Product({
    name: "Shirt", description: "d", price: 10, image: "/x.png", stock: 99,
    variants: [{ size: "S", stock: 2 }, { size: "M", stock: 5 }],
  });
  await p.validate();
  assert.equal(p.stock, 7);
});

test("model: a variant needs a size or a color, and combinations can't repeat", async () => {
  const empty = new Product({ name: "S", description: "d", price: 1, image: "/x.png", variants: [{ stock: 1 }] });
  await assert.rejects(() => empty.validate(), /size or a color/);
  const dup = new Product({
    name: "S", description: "d", price: 1, image: "/x.png",
    variants: [{ size: "M", color: "Black" }, { size: " m ", color: "black" }],
  });
  await assert.rejects(() => dup.validate(), /Duplicate variant/);
});

test("model: a product without variants keeps its own stock", async () => {
  const p = new Product({ name: "S", description: "d", price: 1, image: "/x.png", stock: 4 });
  await p.validate();
  assert.equal(p.stock, 4);
});

// ---- checkout -----------------------------------------------------------------------------------

test("checkout: a variant is bought atomically against ITS stock and the order remembers size/color", async (t) => {
  const { cookie } = signIn(t.mock);
  const p = shirt();
  const [m] = p.variants;
  t.mock.method(Product, "find", async () => [p]);
  const calls = trackStock(t);
  const create = t.mock.method(Order, "create", async (doc) => ({ _id: oid(), ...doc }));
  const srv = await start();
  t.after(srv.close);

  const r = await place(srv, cookie, {
    items: [{ product: String(p._id), variant: String(m._id), qty: 2 }],
    total: 2350, // 2 x 1000 + 350 shipping
    shippingAddress: address,
  });
  assert.equal(r.status, 201);
  const line = create.mock.calls[0].arguments[0].items[0];
  assert.equal(line.size, "M");
  assert.equal(line.color, "Black");
  assert.equal(String(line.variant), String(m._id));
  assert.deepEqual(calls[0][1], { $inc: { "variants.$.stock": -2, stock: -2 } });
  assert.deepEqual(calls[0][0].variants.$elemMatch.stock, { $gte: 2 });
});

test("checkout: a product with variants can't be bought without choosing one", async (t) => {
  const { cookie } = signIn(t.mock);
  const p = shirt();
  t.mock.method(Product, "find", async () => [p]);
  const calls = trackStock(t);
  const srv = await start();
  t.after(srv.close);

  const r = await place(srv, cookie, { items: [{ product: String(p._id), qty: 1 }], total: 1350, shippingAddress: address });
  assert.equal(r.status, 409);
  assert.match(r.data.message, /choose a size or color/);
  assert.equal(r.data.currentItems[0].variants.length, 2);
  assert.equal(calls.length, 0);
});

test("checkout: a sold-out variant is refused even though another variant has stock", async (t) => {
  const { cookie } = signIn(t.mock);
  const p = shirt();
  const [, l] = p.variants; // stock 0
  t.mock.method(Product, "find", async () => [p]);
  const calls = trackStock(t);
  const srv = await start();
  t.after(srv.close);

  const r = await place(srv, cookie, {
    items: [{ product: String(p._id), variant: String(l._id), qty: 1 }],
    total: 1350,
    shippingAddress: address,
  });
  assert.equal(r.status, 409);
  assert.match(r.data.message, /Shirt \(L\) is out of stock/);
  assert.equal(calls.length, 0);
});

test("checkout: asking for more than a variant has -> 409 'Only N left'", async (t) => {
  const { cookie } = signIn(t.mock);
  const p = shirt();
  const [m] = p.variants;
  t.mock.method(Product, "find", async () => [p]);
  trackStock(t);
  const srv = await start();
  t.after(srv.close);

  const r = await place(srv, cookie, {
    items: [{ product: String(p._id), variant: String(m._id), qty: 4 }],
    total: 4350,
    shippingAddress: address,
  });
  assert.equal(r.status, 409);
  assert.match(r.data.message, /Only 3 of Shirt \(M \/ Black\) left/);
});

test("checkout: an unknown variant id -> 409 'no longer available'", async (t) => {
  const { cookie } = signIn(t.mock);
  const p = shirt();
  t.mock.method(Product, "find", async () => [p]);
  trackStock(t);
  const srv = await start();
  t.after(srv.close);

  const r = await place(srv, cookie, {
    items: [{ product: String(p._id), variant: String(oid()), qty: 1 }],
    total: 1350,
    shippingAddress: address,
  });
  assert.equal(r.status, 409);
  assert.match(r.data.message, /no longer available/);
});

test("checkout: two variants of one product are separate lines; a failed 2nd take returns the 1st", async (t) => {
  const { cookie } = signIn(t.mock);
  const p = shirt();
  p.variants[1].stock = 2; // make L buyable
  const [m, l] = p.variants;
  t.mock.method(Product, "find", async () => [p]);
  const calls = trackStock(t, (n) => (n === 2 ? 0 : 1)); // 2nd take loses the race
  const create = t.mock.method(Order, "create", async () => ({}));
  const srv = await start();
  t.after(srv.close);

  const r = await place(srv, cookie, {
    items: [
      { product: String(p._id), variant: String(m._id), qty: 1 },
      { product: String(p._id), variant: String(l._id), qty: 1 },
    ],
    total: 2350,
    shippingAddress: address,
  });
  assert.equal(r.status, 409);
  assert.equal(create.mock.callCount(), 0);
  // call 3 puts the first variant's unit back
  assert.deepEqual(calls[2][1], { $inc: { "variants.$.stock": 1, stock: 1 } });
  assert.equal(String(calls[2][0]["variants._id"]), String(m._id));
});

// ---- cancel -------------------------------------------------------------------------------------

test("cancel: stock goes back to the variant that was bought", async (t) => {
  const { cookie } = signIn(t.mock);
  const [pid, vid] = [oid(), oid()];
  const order = { _id: oid(), status: "pending", items: [{ product: pid, variant: vid, qty: 2 }] };
  t.mock.method(Order, "findOneAndUpdate", async () => order);
  const calls = trackStock(t);
  const srv = await start();
  t.after(srv.close);

  const r = await call(srv.base, `/api/orders/${order._id}/cancel`, { method: "POST", cookie });
  assert.equal(r.status, 200);
  assert.deepEqual(calls[0][1], { $inc: { "variants.$.stock": 2, stock: 2 } });
  assert.equal(String(calls[0][0]["variants._id"]), String(vid));
});
