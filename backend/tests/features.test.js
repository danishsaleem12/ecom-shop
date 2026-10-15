const { test } = require("node:test");
const assert = require("node:assert/strict");
const { start, call, signIn, oid } = require("./helpers");
const Order = require("../models/Order");
const Product = require("../models/Product");
const User = require("../models/User");
const ContactMessage = require("../models/ContactMessage");
const Subscriber = require("../models/Subscriber");

// ---- contact ---------------------------------------------------------------------------------

test("contact: a valid message is saved", async (t) => {
  let saved;
  t.mock.method(ContactMessage, "create", async (doc) => ((saved = doc), doc));
  const srv = await start();
  t.after(srv.close);
  const body = { name: "Ana", email: "ana@example.com", subject: "Customer care", message: "Hello" };
  const r = await call(srv.base, "/api/contact", { method: "POST", json: body });
  assert.equal(r.status, 201);
  assert.equal(saved.email, "ana@example.com");
});

test("contact: missing fields / bad email are rejected", async (t) => {
  const create = t.mock.method(ContactMessage, "create", async () => ({}));
  const srv = await start();
  t.after(srv.close);
  const ok = { name: "Ana", email: "ana@example.com", subject: "x", message: "hi" };
  assert.equal((await call(srv.base, "/api/contact", { method: "POST", json: { ...ok, message: " " } })).status, 400);
  assert.equal((await call(srv.base, "/api/contact", { method: "POST", json: { ...ok, email: "nope" } })).status, 400);
  assert.equal((await call(srv.base, "/api/contact", { method: "POST", json: { ...ok, name: { $gt: "" } } })).status, 400);
  assert.equal(create.mock.callCount(), 0);
});

test("contact: listing messages is admin only", async (t) => {
  const srv = await start();
  t.after(srv.close);
  assert.equal((await call(srv.base, "/api/contact")).status, 401);
  const { cookie } = signIn(t.mock, { role: "user" });
  assert.equal((await call(srv.base, "/api/contact", { cookie })).status, 403);
});

test("contact: admin lists messages with an unread count", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  const msgs = [{ read: false }, { read: true }, { read: false }];
  t.mock.method(ContactMessage, "find", () => ({ sort: () => ({ limit: async () => msgs }) }));
  const srv = await start();
  t.after(srv.close);
  const r = await call(srv.base, "/api/contact", { cookie });
  assert.equal(r.status, 200);
  assert.equal(r.data.unread, 2);
});

// ---- subscribe -------------------------------------------------------------------------------

test("subscribe: stores a lowercased email, and repeats are fine", async (t) => {
  const upd = t.mock.method(Subscriber, "updateOne", async () => ({}));
  const srv = await start();
  t.after(srv.close);
  const r = await call(srv.base, "/api/subscribe", { method: "POST", json: { email: " Ana@Example.com " } });
  assert.equal(r.status, 201);
  assert.deepEqual(upd.mock.calls[0].arguments[0], { email: "ana@example.com" });
  assert.equal((await call(srv.base, "/api/subscribe", { method: "POST", json: { email: "bad" } })).status, 400);
});

test("subscribe: list is admin only", async (t) => {
  const srv = await start();
  t.after(srv.close);
  assert.equal((await call(srv.base, "/api/subscribe")).status, 401);
});

// ---- admin order status ----------------------------------------------------------------------

const setStatus = (srv, id, status, cookie) =>
  call(srv.base, `/api/orders/${id}/status`, { method: "PATCH", json: { status }, cookie });

test("status: admin only", async (t) => {
  const srv = await start();
  t.after(srv.close);
  assert.equal((await setStatus(srv, oid(), "shipped")).status, 401);
  const { cookie } = signIn(t.mock, { role: "user" });
  assert.equal((await setStatus(srv, oid(), "shipped", cookie)).status, 403);
});

test("status: pending -> processing only matches orders that may move there", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  let filter;
  t.mock.method(Order, "findOneAndUpdate", async (f) => ((filter = f), { status: "processing" }));
  const srv = await start();
  t.after(srv.close);
  const r = await setStatus(srv, oid(), "processing", cookie);
  assert.equal(r.status, 200);
  assert.deepEqual(filter.status, { $in: ["pending"] });
});

test("status: unknown status is rejected; illegal move gives 409", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  t.mock.method(Order, "findOneAndUpdate", async () => null);
  t.mock.method(Order, "findById", () => ({ select: async () => ({ status: "delivered" }) }));
  const srv = await start();
  t.after(srv.close);
  assert.equal((await setStatus(srv, oid(), "pending", cookie)).status, 400);
  assert.equal((await setStatus(srv, oid(), "bogus", cookie)).status, 400);
  const r = await setStatus(srv, oid(), "shipped", cookie);
  assert.equal(r.status, 409);
});

test("status: admin cancelling puts the stock back", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  const p = oid();
  t.mock.method(Order, "findOneAndUpdate", async () => ({ _id: oid(), status: "pending", items: [{ product: p, qty: 3 }] }));
  const inc = t.mock.method(Product, "updateOne", async () => ({ modifiedCount: 1 }));
  const srv = await start();
  t.after(srv.close);
  const r = await setStatus(srv, oid(), "cancelled", cookie);
  assert.equal(r.status, 200);
  assert.equal(r.data.order.status, "cancelled");
  assert.deepEqual(inc.mock.calls[0].arguments[1], { $inc: { stock: 3 } });
});

// ---- guest tracking --------------------------------------------------------------------------

const track = (srv, orderNumber, email) =>
  call(srv.base, "/api/orders/track", { method: "POST", json: { orderNumber, email } });

test("track: order number + matching email works without signing in, and hides private details", async (t) => {
  const id = oid();
  const order = {
    _id: id, status: "shipped", total: 5000, createdAt: new Date(), updatedAt: new Date(),
    shippingAddress: { phone: "0300", line1: "secret street", email: "ana@example.com" },
    items: [{ name: "Dress", price: 5000, qty: 1, image: "/x.png" }],
  };
  t.mock.method(User, "find", () => ({ select: async () => [] }));
  t.mock.method(Order, "find", () => ({ sort: () => ({ limit: async () => [order] }) }));
  const srv = await start();
  t.after(srv.close);
  const code = String(id).slice(-8).toUpperCase();
  const r = await track(srv, `#${code}`, "ANA@example.com");
  assert.equal(r.status, 200);
  assert.equal(r.data.order.status, "shipped");
  assert.equal(r.text.includes("secret street"), false);
  assert.equal(r.text.includes("0300"), false);
});

test("track: wrong number or email -> same 404; junk -> 404 without hitting the database", async (t) => {
  t.mock.method(User, "find", () => ({ select: async () => [] }));
  const find = t.mock.method(Order, "find", () => ({ sort: () => ({ limit: async () => [] }) }));
  const srv = await start();
  t.after(srv.close);
  assert.equal((await track(srv, "AAAAAAAA", "a@b.co")).status, 404);
  const before = find.mock.callCount();
  assert.equal((await track(srv, "not-a-code", "a@b.co")).status, 404);
  assert.equal(find.mock.callCount(), before);
  assert.equal((await call(srv.base, "/api/orders/track", { method: "POST", json: { orderNumber: 1 } })).status, 400);
});

test("orders: admin list is admin only", async (t) => {
  const srv = await start();
  t.after(srv.close);
  assert.equal((await call(srv.base, "/api/orders/admin/all")).status, 401);
  const { cookie } = signIn(t.mock, { role: "user" });
  assert.equal((await call(srv.base, "/api/orders/admin/all", { cookie })).status, 403);
});

test("track: works with the new order number, in any case and with or without the hyphen", async (t) => {
  const order = {
    _id: oid(), orderNumber: "K7QM-4TXD", status: "processing", total: 5000, createdAt: new Date(), updatedAt: new Date(),
    shippingAddress: { email: "ana@example.com" },
    items: [{ name: "Dress", price: 5000, qty: 1 }],
  };
  t.mock.method(User, "find", () => ({ select: async () => [] }));
  t.mock.method(Order, "find", () => ({ sort: () => ({ limit: async () => [order] }) }));
  const srv = await start();
  t.after(srv.close);

  for (const typed of ["K7QM-4TXD", "k7qm4txd", "#k7qm 4txd"]) {
    const r = await track(srv, typed, "ana@example.com");
    assert.equal(r.status, 200, typed);
    assert.equal(r.data.order.orderNumber, "K7QM-4TXD");
  }
  assert.equal((await track(srv, "K7QM-4TXE", "ana@example.com")).status, 404); // wrong number
});
