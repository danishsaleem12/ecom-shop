const { test } = require("node:test");
const assert = require("node:assert/strict");
const { start, call, signIn, quietErrors, oid } = require("./helpers");
const Order = require("../models/Order");

const DAY = 24 * 60 * 60 * 1000;
const ago = (days) => new Date(Date.now() - days * DAY);

const deliveredOrder = (overrides = {}) => ({
  _id: oid(),
  status: "delivered",
  deliveredAt: ago(2),
  updatedAt: ago(2),
  items: [
    { name: "Linen Dress", price: 5000, qty: 1 },
    { name: "Silk Scarf", price: 1800, qty: 2 },
  ],
  ...overrides,
});

const requestReturn = (srv, id, cookie, json) =>
  call(srv.base, `/api/orders/${id}/return`, { method: "POST", json, cookie });
const good = { reason: "wrong-size", items: [0] };

// ---- customer: request a return --------------------------------------------------------------

test("return request: needs a signed-in user; a malformed id is a 404", async (t) => {
  const srv = await start();
  t.after(srv.close);
  assert.equal((await requestReturn(srv, oid(), undefined, good)).status, 401);
  const { cookie } = signIn(t.mock);
  assert.equal((await requestReturn(srv, "not-an-id", cookie, good)).status, 404);
});

test("return request: rejects bad input before touching the database", async (t) => {
  const { cookie } = signIn(t.mock);
  const findOne = t.mock.method(Order, "findOne", async () => deliveredOrder());
  const srv = await start();
  t.after(srv.close);
  const id = oid();

  assert.equal((await requestReturn(srv, id, cookie, { items: [0] })).status, 400); // no reason
  assert.equal((await requestReturn(srv, id, cookie, { reason: "because", items: [0] })).status, 400); // unknown reason
  assert.equal((await requestReturn(srv, id, cookie, { reason: "wrong-size", items: [] })).status, 400); // no items
  assert.equal((await requestReturn(srv, id, cookie, { reason: "wrong-size" })).status, 400);
  const other = await requestReturn(srv, id, cookie, { reason: "other", items: [0] });
  assert.equal(other.status, 400); // "other" needs details
  assert.match(other.data.message, /tell us/i);
  assert.equal((await requestReturn(srv, id, cookie, { ...good, details: "x".repeat(501) })).status, 400);
  assert.equal((await requestReturn(srv, id, cookie, { ...good, details: 5 })).status, 400);
  assert.equal(findOne.mock.callCount(), 0);
});

test("return request: unknown order, someone else's order, or not delivered", async (t) => {
  const { cookie } = signIn(t.mock);
  const findOne = t.mock.method(Order, "findOne", async () => null);
  const srv = await start();
  t.after(srv.close);
  assert.equal((await requestReturn(srv, oid(), cookie, good)).status, 404);

  findOne.mock.mockImplementation(async () => deliveredOrder({ status: "shipped" }));
  const r = await requestReturn(srv, oid(), cookie, good);
  assert.equal(r.status, 409);
  assert.match(r.data.message, /only delivered/i);
});

test("return request: an order that already has a request, or is past the window, is refused", async (t) => {
  const { cookie } = signIn(t.mock);
  const findOne = t.mock.method(Order, "findOne", async () => deliveredOrder({ returnRequest: { status: "requested" } }));
  const update = t.mock.method(Order, "findOneAndUpdate", async () => ({}));
  const srv = await start();
  t.after(srv.close);

  const dup = await requestReturn(srv, oid(), cookie, good);
  assert.equal(dup.status, 409);
  assert.match(dup.data.message, /already been requested/i);

  findOne.mock.mockImplementation(async () => deliveredOrder({ deliveredAt: ago(20) }));
  const late = await requestReturn(srv, oid(), cookie, good);
  assert.equal(late.status, 409);
  assert.match(late.data.message, /14-day/);
  assert.equal(update.mock.callCount(), 0);
});

test("return request: success stores a snapshot of the picked items (de-duplicated) with one atomic update", async (t) => {
  const { user, cookie } = signIn(t.mock);
  const order = deliveredOrder();
  t.mock.method(Order, "findOne", async () => order);
  const update = t.mock.method(Order, "findOneAndUpdate", async (filter, change) => ({ ...order, returnRequest: change.$set.returnRequest }));
  const srv = await start();
  t.after(srv.close);

  const r = await requestReturn(srv, order._id, cookie, { reason: "damaged", details: "  zip is broken ", items: [1, 1, 0] });
  assert.equal(r.status, 201);

  const [filter, change, options] = update.mock.calls[0].arguments;
  assert.equal(String(filter.user), String(user._id)); // only the owner's order
  assert.equal(filter.status, "delivered");
  assert.deepEqual(filter.returnRequest, { $exists: false }); // only if there is no request yet
  const rr = change.$set.returnRequest;
  assert.equal(rr.status, "requested");
  assert.equal(rr.reason, "damaged");
  assert.equal(rr.details, "zip is broken"); // trimmed
  assert.deepEqual(rr.items, [{ name: "Silk Scarf", qty: 2 }, { name: "Linen Dress", qty: 1 }]);
  assert.equal(options.new, true);
  assert.equal(r.data.order.returnRequest.reason, "damaged");
});

test("return request: lost race (someone else created it first) -> 409", async (t) => {
  const { cookie } = signIn(t.mock);
  t.mock.method(Order, "findOne", async () => deliveredOrder());
  t.mock.method(Order, "findOneAndUpdate", async () => null);
  const srv = await start();
  t.after(srv.close);
  assert.equal((await requestReturn(srv, oid(), cookie, good)).status, 409);
});

test("return request: item numbers outside the order are refused", async (t) => {
  const { cookie } = signIn(t.mock);
  t.mock.method(Order, "findOne", async () => deliveredOrder());
  const update = t.mock.method(Order, "findOneAndUpdate", async () => ({}));
  const srv = await start();
  t.after(srv.close);
  for (const items of [[2], [-1], [0.5], ["0"]]) {
    assert.equal((await requestReturn(srv, oid(), cookie, { ...good, items })).status, 400, JSON.stringify(items));
  }
  assert.equal(update.mock.callCount(), 0);
});

test("return window: orders delivered before deliveredAt existed count from their last update", async (t) => {
  const { cookie } = signIn(t.mock);
  const findOne = t.mock.method(Order, "findOne", async () => deliveredOrder({ deliveredAt: undefined, updatedAt: ago(3) }));
  t.mock.method(Order, "findOneAndUpdate", async () => ({}));
  const srv = await start();
  t.after(srv.close);
  assert.equal((await requestReturn(srv, oid(), cookie, good)).status, 201);

  findOne.mock.mockImplementation(async () => deliveredOrder({ deliveredAt: undefined, updatedAt: ago(30) }));
  assert.equal((await requestReturn(srv, oid(), cookie, good)).status, 409);
});

test("return request: a database failure is a generic 500", async (t) => {
  quietErrors(t.mock);
  const { cookie } = signIn(t.mock);
  t.mock.method(Order, "findOne", async () => {
    throw new Error("connection to secret-host refused");
  });
  const srv = await start();
  t.after(srv.close);
  const r = await requestReturn(srv, oid(), cookie, good);
  assert.equal(r.status, 500);
  assert.equal(r.data.message, "Failed to request return");
  assert.ok(!r.text.includes("secret-host"));
});

// ---- admin: move a return along ---------------------------------------------------------------

const setReturn = (srv, id, cookie, json) => call(srv.base, `/api/orders/${id}/return`, { method: "PATCH", json, cookie });

test("return admin: admin only", async (t) => {
  const srv = await start();
  t.after(srv.close);
  assert.equal((await setReturn(srv, oid(), undefined, { status: "approved" })).status, 401);
  const { cookie } = signIn(t.mock, { role: "user" });
  assert.equal((await setReturn(srv, oid(), cookie, { status: "approved" })).status, 403);
});

test("return admin: validates status and note", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  const update = t.mock.method(Order, "findOneAndUpdate", async () => ({}));
  const srv = await start();
  t.after(srv.close);
  const id = oid();

  assert.equal((await setReturn(srv, "nope", cookie, { status: "approved" })).status, 404);
  assert.equal((await setReturn(srv, id, cookie, { status: "requested" })).status, 400); // can't go back
  assert.equal((await setReturn(srv, id, cookie, { status: "bogus" })).status, 400);
  assert.equal((await setReturn(srv, id, cookie, { status: "approved", adminNote: 5 })).status, 400);
  assert.equal((await setReturn(srv, id, cookie, { status: "approved", adminNote: "x".repeat(501) })).status, 400);
  const noNote = await setReturn(srv, id, cookie, { status: "rejected", adminNote: "   " });
  assert.equal(noNote.status, 400);
  assert.match(noNote.data.message, /explaining why/i);
  assert.equal(update.mock.callCount(), 0);
});

test("return admin: each status only matches a request that may move there, and the note is saved", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  const update = t.mock.method(Order, "findOneAndUpdate", async () => ({ _id: oid(), returnRequest: { status: "x" } }));
  const srv = await start();
  t.after(srv.close);

  assert.equal((await setReturn(srv, oid(), cookie, { status: "approved", adminNote: " Send it to our shop " })).status, 200);
  let [filter, change] = update.mock.calls[0].arguments;
  assert.deepEqual(filter["returnRequest.status"], { $in: ["requested"] });
  assert.equal(change.$set["returnRequest.status"], "approved");
  assert.equal(change.$set["returnRequest.adminNote"], "Send it to our shop");
  assert.equal(change.$set["returnRequest.resolvedAt"], undefined); // not final yet

  await setReturn(srv, oid(), cookie, { status: "received" });
  [filter] = update.mock.calls[1].arguments;
  assert.deepEqual(filter["returnRequest.status"], { $in: ["approved"] });

  await setReturn(srv, oid(), cookie, { status: "refunded" });
  [filter, change] = update.mock.calls[2].arguments;
  assert.deepEqual(filter["returnRequest.status"], { $in: ["received"] });
  assert.ok(change.$set["returnRequest.resolvedAt"] instanceof Date); // final
  assert.equal("returnRequest.adminNote" in change.$set, false); // note untouched when not sent

  await setReturn(srv, oid(), cookie, { status: "rejected", adminNote: "Worn item" });
  [, change] = update.mock.calls[3].arguments;
  assert.ok(change.$set["returnRequest.resolvedAt"] instanceof Date);
});

test("return admin: illegal move -> 409, no such request -> 404", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  t.mock.method(Order, "findOneAndUpdate", async () => null);
  const findById = t.mock.method(Order, "findById", () => ({ select: async () => ({ returnRequest: { status: "refunded" } }) }));
  const srv = await start();
  t.after(srv.close);

  const illegal = await setReturn(srv, oid(), cookie, { status: "approved" });
  assert.equal(illegal.status, 409);
  assert.match(illegal.data.message, /refunded and can't be changed to approved/);

  const same = await setReturn(srv, oid(), cookie, { status: "refunded" });
  assert.equal(same.status, 409);
  assert.match(same.data.message, /already refunded/);

  findById.mock.mockImplementation(() => ({ select: async () => ({}) })); // order exists, no return request
  assert.equal((await setReturn(srv, oid(), cookie, { status: "approved" })).status, 404);
  findById.mock.mockImplementation(() => ({ select: async () => null }));
  assert.equal((await setReturn(srv, oid(), cookie, { status: "approved" })).status, 404);
});

test("return admin: list is admin only, filters by status, newest request first", async (t) => {
  const srv = await start();
  t.after(srv.close);
  assert.equal((await call(srv.base, "/api/orders/admin/returns")).status, 401);
  assert.equal((await call(srv.base, "/api/orders/admin/returns", { cookie: signIn(t.mock, { role: "user" }).cookie })).status, 403);

  const { cookie } = signIn(t.mock, { role: "admin" });
  let filter, sort;
  t.mock.method(Order, "find", (f) => {
    filter = f;
    return { sort: (s) => ((sort = s), { limit: () => ({ populate: async () => [{ _id: oid() }] }) }) };
  });
  const all = await call(srv.base, "/api/orders/admin/returns", { cookie });
  assert.equal(all.status, 200);
  assert.deepEqual(filter, { returnRequest: { $exists: true } });
  assert.deepEqual(sort, { "returnRequest.requestedAt": -1 });

  await call(srv.base, "/api/orders/admin/returns?status=requested", { cookie });
  assert.equal(filter["returnRequest.status"], "requested");
  assert.equal((await call(srv.base, "/api/orders/admin/returns?status=bogus", { cookie })).status, 400);
});

// ---- order status + model ---------------------------------------------------------------------

test("order status: marking delivered records deliveredAt (other statuses don't)", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  const update = t.mock.method(Order, "findOneAndUpdate", async () => ({ status: "x" }));
  const srv = await start();
  t.after(srv.close);
  const patch = (status) => call(srv.base, `/api/orders/${oid()}/status`, { method: "PATCH", json: { status }, cookie });

  await patch("delivered");
  assert.ok(update.mock.calls[0].arguments[1].$set.deliveredAt instanceof Date);
  await patch("shipped");
  assert.equal("deliveredAt" in update.mock.calls[1].arguments[1].$set, false);
});

test("order model: returnableUntil is 14 days after delivery, only while a return is still possible", () => {
  const delivered = new Order({ status: "delivered", deliveredAt: ago(2) });
  const until = delivered.toJSON().returnableUntil;
  const days = (until.getTime() - Date.now()) / DAY;
  assert.ok(days > 11.9 && days < 12.1, `got ${days}`);
  assert.equal(delivered.toJSON().id, undefined); // only _id is exposed

  assert.equal(new Order({ status: "shipped", deliveredAt: ago(1) }).toJSON().returnableUntil, undefined);
  assert.equal(new Order({ status: "delivered" }).toJSON().returnableUntil, undefined); // nothing to count from
  const requested = new Order({ status: "delivered", deliveredAt: ago(1), returnRequest: { reason: "other", details: "x" } });
  assert.equal(requested.toJSON().returnableUntil, undefined);
  assert.equal(requested.returnRequest.status, "requested"); // default status
});

test("order model: a return request needs a known reason and keeps notes short", () => {
  const bad = new Order({ returnRequest: { reason: "nope", details: "x".repeat(501) } }).validateSync();
  assert.ok(bad.errors["returnRequest.reason"]);
  assert.ok(bad.errors["returnRequest.details"]);
});
