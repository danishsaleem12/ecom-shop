const { test } = require("node:test");
const assert = require("node:assert/strict");
const { start, call, signIn, quietErrors, oid } = require("./helpers");
const Order = require("../models/Order");
const Product = require("../models/Product");

const cancel = (srv, id, cookie) => call(srv.base, `/api/orders/${id}/cancel`, { method: "POST", cookie });
const inc = (calls) => calls.map(([filter, update]) => [String(filter._id), update.$inc.stock]);

// Records every Product.updateOne call; `fail(n)` can make the nth call (1-based) throw.
function trackStock(t, { fail } = {}) {
  const calls = [];
  t.mock.method(Product, "updateOne", async (filter, update) => {
    calls.push([filter, update]);
    if (fail && fail === calls.length) throw new Error("db down");
    return { modifiedCount: 1 };
  });
  return calls;
}

// ---- cancel ----------------------------------------------------------------------------------

test("cancel: needs a signed-in user", async (t) => {
  const srv = await start();
  t.after(srv.close);
  assert.equal((await cancel(srv, oid())).status, 401);
});

test("cancel: a pending order is cancelled and every item's stock goes back", async (t) => {
  const { user, cookie } = signIn(t.mock);
  const [p1, p2] = [oid(), oid()];
  const order = { _id: oid(), status: "pending", items: [{ product: p1, qty: 2 }, { product: p2, qty: 1 }] };
  let filter;
  t.mock.method(Order, "findOneAndUpdate", async (f) => ((filter = f), order));
  const calls = trackStock(t);
  const srv = await start();
  t.after(srv.close);

  const r = await cancel(srv, order._id, cookie);
  assert.equal(r.status, 200);
  assert.equal(r.data.order.status, "cancelled");
  assert.deepEqual(inc(calls), [[String(p1), 2], [String(p2), 1]]);
  // only the owner's pending/processing order can be flipped
  assert.equal(String(filter.user), String(user._id));
  assert.deepEqual(filter.status, { $in: ["pending", "processing"] });
});

test("cancel: items whose product was deleted are skipped", async (t) => {
  const { cookie } = signIn(t.mock);
  const p1 = oid();
  const order = { _id: oid(), status: "processing", items: [{ product: null, qty: 3 }, { product: p1, qty: 1 }] };
  t.mock.method(Order, "findOneAndUpdate", async () => order);
  const calls = trackStock(t);
  const srv = await start();
  t.after(srv.close);

  assert.equal((await cancel(srv, order._id, cookie)).status, 200);
  assert.deepEqual(inc(calls), [[String(p1), 1]]);
});

test("cancel: unknown order (or someone else's) -> 404, no stock touched", async (t) => {
  const { cookie } = signIn(t.mock);
  t.mock.method(Order, "findOneAndUpdate", async () => null);
  t.mock.method(Order, "findOne", () => ({ select: async () => null }));
  const calls = trackStock(t);
  const srv = await start();
  t.after(srv.close);

  assert.equal((await cancel(srv, oid(), cookie)).status, 404);
  assert.equal(calls.length, 0);
});

test("cancel: a shipped order can't be cancelled (409) and stock is untouched", async (t) => {
  const { cookie } = signIn(t.mock);
  t.mock.method(Order, "findOneAndUpdate", async () => null);
  t.mock.method(Order, "findOne", () => ({ select: async () => ({ status: "shipped" }) }));
  const calls = trackStock(t);
  const srv = await start();
  t.after(srv.close);

  const r = await cancel(srv, oid(), cookie);
  assert.equal(r.status, 409);
  assert.match(r.data.message, /shipped/);
  assert.equal(calls.length, 0);
});

test("cancel: cancelling twice returns 409 and does not restore stock again", async (t) => {
  const { cookie } = signIn(t.mock);
  t.mock.method(Order, "findOneAndUpdate", async () => null); // already cancelled -> filter no longer matches
  t.mock.method(Order, "findOne", () => ({ select: async () => ({ status: "cancelled" }) }));
  const calls = trackStock(t);
  const srv = await start();
  t.after(srv.close);

  const r = await cancel(srv, oid(), cookie);
  assert.equal(r.status, 409);
  assert.match(r.data.message, /already cancelled/);
  assert.equal(calls.length, 0);
});

test("cancel: a malformed id -> 404 without querying the database", async (t) => {
  const { cookie } = signIn(t.mock);
  const find = t.mock.method(Order, "findOneAndUpdate", async () => null);
  const srv = await start();
  t.after(srv.close);

  assert.equal((await cancel(srv, "not-an-id", cookie)).status, 404);
  assert.equal(find.mock.callCount(), 0);
});

test("cancel: if restoring stock fails midway, it is undone and the order goes back to its old status", async (t) => {
  quietErrors(t.mock);
  const { cookie } = signIn(t.mock);
  const [p1, p2] = [oid(), oid()];
  const order = { _id: oid(), status: "pending", items: [{ product: p1, qty: 2 }, { product: p2, qty: 1 }] };
  t.mock.method(Order, "findOneAndUpdate", async () => order);
  const statusRevert = [];
  t.mock.method(Order, "updateOne", async (f, u) => (statusRevert.push([f, u]), { modifiedCount: 1 }));
  const calls = trackStock(t, { fail: 2 }); // 1st product restored, 2nd one fails
  const srv = await start();
  t.after(srv.close);

  const r = await cancel(srv, order._id, cookie);
  assert.equal(r.status, 500);
  assert.equal(r.data.message, "Failed to cancel order");
  // +2 for p1, +1 for p2 (throws), then p1's +2 is taken back out
  assert.deepEqual(inc(calls), [[String(p1), 2], [String(p2), 1], [String(p1), -2]]);
  assert.deepEqual(statusRevert[0][1], { $set: { status: "pending" } });
});

// ---- checkout (existing behaviour the cancel feature depends on) ----------------------------

const address = { fullName: "A B", line1: "1 Road", city: "Lahore", phone: "0300" };
const place = (srv, cookie, body) => call(srv.base, "/api/orders", { method: "POST", json: body, cookie });
const dress = (price = 1000, stock = 5) => ({ _id: oid(), name: "Dress", price, stock, image: "/uploads/d.png" });

test("checkout: empty bag -> 400", async (t) => {
  const { cookie } = signIn(t.mock);
  const srv = await start();
  t.after(srv.close);
  assert.equal((await place(srv, cookie, { items: [], total: 0, shippingAddress: address })).status, 400);
});

test("checkout: stale prices -> 409 and no stock is taken", async (t) => {
  const { cookie } = signIn(t.mock);
  const p = dress();
  t.mock.method(Product, "find", async () => [p]);
  const calls = trackStock(t);
  const srv = await start();
  t.after(srv.close);

  const r = await place(srv, cookie, { items: [{ product: String(p._id), qty: 1 }], total: 1, shippingAddress: address });
  assert.equal(r.status, 409);
  assert.equal(r.data.currentItems[0].price, 1000);
  assert.equal(calls.length, 0);
});

test("checkout: success prices from the database (item + shipping) and takes stock", async (t) => {
  const { cookie } = signIn(t.mock);
  const p = dress(1000);
  t.mock.method(Product, "find", async () => [p]);
  const calls = trackStock(t);
  const create = t.mock.method(Order, "create", async (doc) => ({ _id: oid(), ...doc }));
  const srv = await start();
  t.after(srv.close);

  const r = await place(srv, cookie, { items: [{ product: String(p._id), qty: 1 }], total: 1350, shippingAddress: address });
  assert.equal(r.status, 201);
  assert.equal(create.mock.calls[0].arguments[0].total, 1350); // 1000 + 350 shipping
  assert.deepEqual(calls[0][1], { $inc: { stock: -1 } });
  assert.deepEqual(calls[0][0].stock, { $gte: 1 });
});

test("checkout: if the last unit sells out mid-checkout, stock already taken is put back", async (t) => {
  const { cookie } = signIn(t.mock);
  const [a, b] = [dress(1000), dress(2000)];
  t.mock.method(Product, "find", async () => [a, b]);
  const calls = [];
  t.mock.method(Product, "updateOne", async (filter, update) => {
    calls.push([filter, update]);
    return { modifiedCount: calls.length === 2 ? 0 : 1 }; // 2nd product just sold out
  });
  const create = t.mock.method(Order, "create", async () => ({}));
  const srv = await start();
  t.after(srv.close);

  const r = await place(srv, cookie, {
    items: [{ product: String(a._id), qty: 1 }, { product: String(b._id), qty: 1 }],
    total: 3350,
    shippingAddress: address,
  });
  assert.equal(r.status, 409);
  assert.equal(create.mock.callCount(), 0);
  assert.deepEqual(calls[2][1], { $inc: { stock: 1 } }); // first product's unit returned
  assert.equal(String(calls[2][0]._id), String(a._id));
});

// ---- order numbers at checkout ----------------------------------------------------------------

const duplicateNumberError = () => Object.assign(new Error("E11000 duplicate key error"), { code: 11000, keyPattern: { orderNumber: 1 } });

test("checkout: if the drawn order number is already taken, it draws again and succeeds", async (t) => {
  const { cookie } = signIn(t.mock);
  const p = dress(1000);
  t.mock.method(Product, "find", async () => [p]);
  trackStock(t);
  let n = 0;
  const create = t.mock.method(Order, "create", async (doc) => {
    if (++n === 1) throw duplicateNumberError();
    return { _id: oid(), ...doc };
  });
  const srv = await start();
  t.after(srv.close);

  const r = await place(srv, cookie, { items: [{ product: String(p._id), qty: 1 }], total: 1350, shippingAddress: address });
  assert.equal(r.status, 201);
  assert.equal(create.mock.callCount(), 2);
});

test("checkout: if every attempt hits a taken number, it fails cleanly (500) and the stock goes back", async (t) => {
  quietErrors(t.mock);
  const { cookie } = signIn(t.mock);
  const p = dress(1000);
  t.mock.method(Product, "find", async () => [p]);
  const calls = trackStock(t);
  const create = t.mock.method(Order, "create", async () => {
    throw duplicateNumberError();
  });
  const srv = await start();
  t.after(srv.close);

  const r = await place(srv, cookie, { items: [{ product: String(p._id), qty: 1 }], total: 1350, shippingAddress: address });
  assert.equal(r.status, 500);
  assert.equal(create.mock.callCount(), 5);
  assert.deepEqual(calls[calls.length - 1][1], { $inc: { stock: 1 } }); // the unit was put back
});

test("checkout: a different database error is NOT retried", async (t) => {
  quietErrors(t.mock);
  const { cookie } = signIn(t.mock);
  const p = dress(1000);
  t.mock.method(Product, "find", async () => [p]);
  trackStock(t);
  const create = t.mock.method(Order, "create", async () => {
    throw new Error("connection lost");
  });
  const srv = await start();
  t.after(srv.close);

  const r = await place(srv, cookie, { items: [{ product: String(p._id), qty: 1 }], total: 1350, shippingAddress: address });
  assert.equal(r.status, 500);
  assert.equal(create.mock.callCount(), 1);
});
