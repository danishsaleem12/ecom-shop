// tests/tracking.test.js — tracking number + courier on orders
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { start, call, signIn, oid } = require("./helpers");
const mailer = require("../utils/mailer");
const tpl = require("../utils/emailTemplates");
const Order = require("../models/Order");

function captureMail(t) {
  const outbox = [];
  mailer._setTransport({ sendMail: async (m) => void outbox.push(m) });
  t.after(() => mailer._setTransport(null));
  return outbox;
}

const patch = (srv, path, cookie, json) => call(srv.base, path, { method: "PATCH", json, cookie });

// ---- status route (shipping with tracking) -------------------------------------------------------

test("ship with tracking: saved on the order and put in the shipped email", async (t) => {
  const outbox = captureMail(t);
  const { cookie } = signIn(t.mock, { role: "admin" });
  const id = oid();
  let update;
  t.mock.method(Order, "findOneAndUpdate", async (f, u) => {
    update = u;
    return { _id: id, orderNumber: "K7QM-4TXD", status: u.$set.status, trackingNumber: u.$set.trackingNumber, courier: u.$set.courier, items: [], shippingAddress: { email: "ana@example.com" } };
  });
  const srv = await start();
  t.after(srv.close);

  const r = await patch(srv, `/api/orders/${id}/status`, cookie, { status: "shipped", trackingNumber: "  TCS-123456 ", courier: "TCS" });
  assert.equal(r.status, 200);
  assert.equal(update.$set.trackingNumber, "TCS-123456"); // trimmed
  assert.equal(update.$set.courier, "TCS");
  await mailer.flush();
  assert.match(outbox[0].text, /Tracking number: TCS-123456 \(TCS\)/);
  assert.match(outbox[0].html, /TCS-123456/);
});

test("ship without tracking still works and the email has no tracking line", async (t) => {
  const outbox = captureMail(t);
  const { cookie } = signIn(t.mock, { role: "admin" });
  const id = oid();
  let update;
  t.mock.method(Order, "findOneAndUpdate", async (f, u) => (update = u, { _id: id, status: u.$set.status, items: [], shippingAddress: { email: "ana@example.com" } }));
  const srv = await start();
  t.after(srv.close);

  assert.equal((await patch(srv, `/api/orders/${id}/status`, cookie, { status: "shipped" })).status, 200);
  assert.deepEqual(update.$set, { status: "shipped" });
  assert.equal(update.$unset, undefined);
  await mailer.flush();
  assert.doesNotMatch(outbox[0].text, /Tracking/);
});

test("tracking details are ignored for other statuses and refused when too long or not text", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  const id = oid();
  let update;
  t.mock.method(Order, "findOneAndUpdate", async (f, u) => (update = u, { _id: id, status: u.$set.status, items: [] }));
  const srv = await start();
  t.after(srv.close);

  assert.equal((await patch(srv, `/api/orders/${id}/status`, cookie, { status: "processing", trackingNumber: "X1" })).status, 200);
  assert.deepEqual(update.$set, { status: "processing" });

  const long = await patch(srv, `/api/orders/${id}/status`, cookie, { status: "shipped", trackingNumber: "x".repeat(61) });
  assert.equal(long.status, 400);
  assert.match(long.data.message, /at most 60/);
  assert.equal((await patch(srv, `/api/orders/${id}/status`, cookie, { status: "shipped", courier: 5 })).status, 400);
});

// ---- tracking route ------------------------------------------------------------------------------

test("tracking route: admin only", async (t) => {
  const srv = await start();
  t.after(srv.close);
  assert.equal((await patch(srv, `/api/orders/${oid()}/tracking`, undefined, { trackingNumber: "A1" })).status, 401);

  const { cookie } = signIn(t.mock, { role: "user" });
  assert.equal((await patch(srv, `/api/orders/${oid()}/tracking`, cookie, { trackingNumber: "A1" })).status, 403);
});

test("tracking route: sets, and an empty string clears", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  const id = oid();
  const calls = [];
  t.mock.method(Order, "findOneAndUpdate", async (f, u) => (calls.push([f, u]), { _id: id, status: "shipped" }));
  const srv = await start();
  t.after(srv.close);

  assert.equal((await patch(srv, `/api/orders/${id}/tracking`, cookie, { trackingNumber: "LEO-9", courier: "Leopards" })).status, 200);
  assert.deepEqual(calls[0][1], { $set: { trackingNumber: "LEO-9", courier: "Leopards" } });
  assert.deepEqual(calls[0][0].status, { $ne: "cancelled" });

  assert.equal((await patch(srv, `/api/orders/${id}/tracking`, cookie, { trackingNumber: "", courier: "" })).status, 200);
  assert.deepEqual(calls[1][1], { $unset: { trackingNumber: "", courier: "" } });
});

test("tracking route: nothing sent -> 400; cancelled order -> 409; unknown order -> 404; bad id -> 404", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  const find = t.mock.method(Order, "findOneAndUpdate", async () => null);
  let existing = { status: "cancelled" };
  t.mock.method(Order, "findById", () => ({ select: async () => existing }));
  const srv = await start();
  t.after(srv.close);

  assert.equal((await patch(srv, `/api/orders/${oid()}/tracking`, cookie, {})).status, 400);
  assert.equal(find.mock.callCount(), 0);
  assert.equal((await patch(srv, `/api/orders/${oid()}/tracking`, cookie, { trackingNumber: "A1" })).status, 409);
  existing = null;
  assert.equal((await patch(srv, `/api/orders/${oid()}/tracking`, cookie, { trackingNumber: "A1" })).status, 404);
  assert.equal((await patch(srv, "/api/orders/not-an-id/tracking", cookie, { trackingNumber: "A1" })).status, 404);
});

// ---- email template + guest tracking -------------------------------------------------------------

test("template: only the shipped email shows tracking, and it is HTML-escaped", () => {
  const order = { _id: oid(), orderNumber: "K7QM-4TXD", items: [], trackingNumber: "<b>1</b>", courier: "TCS" };
  const shipped = tpl.orderStatus(order, "shipped");
  assert.match(shipped.html, /&lt;b&gt;1&lt;\/b&gt;/);
  assert.doesNotMatch(shipped.html, /<b>1<\/b>/);
  assert.doesNotMatch(tpl.orderStatus(order, "delivered").text, /Tracking number/);
});

test("track-order lookup returns the tracking number and courier", async (t) => {
  const User = require("../models/User");
  t.mock.method(User, "find", () => ({ select: async () => [] }));
  const order = {
    _id: oid(), orderNumber: "K7QM-4TXD", status: "shipped", total: 1350, trackingNumber: "TCS-1", courier: "TCS",
    createdAt: new Date(), updatedAt: new Date(), items: [{ name: "Dress", price: 1000, qty: 1 }],
    shippingAddress: { email: "ana@example.com" },
  };
  t.mock.method(Order, "find", () => ({ sort: () => ({ limit: async () => [order] }) }));
  const srv = await start();
  t.after(srv.close);

  const r = await call(srv.base, "/api/orders/track", { method: "POST", json: { orderNumber: "K7QM-4TXD", email: "ana@example.com" } });
  assert.equal(r.status, 200);
  assert.equal(r.data.order.trackingNumber, "TCS-1");
  assert.equal(r.data.order.courier, "TCS");
});
