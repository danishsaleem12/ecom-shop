// tests/email.test.js — emails (order, status, return, newsletter, contact) and "forgot password"
const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { start, call, signIn, oid } = require("./helpers");
const mailer = require("../utils/mailer");
const tpl = require("../utils/emailTemplates");
const { hashToken } = require("../utils/passwordReset");
const User = require("../models/User");
const Order = require("../models/Order");
const Product = require("../models/Product");
const Subscriber = require("../models/Subscriber");
const ContactMessage = require("../models/ContactMessage");

/** Installs a fake mail server for this test; returns the list of emails "sent". */
function captureMail(t) {
  const outbox = [];
  mailer._setTransport({ sendMail: async (m) => void outbox.push(m) });
  t.after(() => mailer._setTransport(null));
  return outbox;
}
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const tokenFrom = (mail) => mail.text.match(/token=([0-9a-f]{64})/)[1];

// ---- templates --------------------------------------------------------------------------------

test("templates: anything a customer typed is HTML-escaped", () => {
  const order = {
    _id: oid(),
    orderNumber: "K7QM-4TXD",
    total: 1350,
    items: [{ name: "<script>alert(1)</script> Dress", price: 1000, qty: 1 }],
    shippingAddress: { fullName: 'Ana "<b>"', line1: "1 Road", city: "Lahore" },
  };
  const { html, text, subject } = tpl.orderConfirmation(order);
  assert.ok(!html.includes("<script>"));
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<b>"));
  assert.match(subject, /K7QM-4TXD/);
  assert.match(text, /Rs 1,350/);
});

test("templates: contact message is escaped and keeps the sender as a readable line", () => {
  const { html } = tpl.adminNewContact({ name: "<i>X</i>", email: "x@y.co", subject: "Hi", message: "<img src=x onerror=1>" });
  assert.ok(!html.includes("<img"));
  assert.ok(!html.includes("<i>X"));
});

test("templates: only shipped, delivered and cancelled orders have an email", () => {
  const order = { _id: oid(), orderNumber: "AAAA-BBBB", items: [] };
  assert.equal(tpl.orderStatus(order, "processing"), null);
  assert.equal(tpl.orderStatus(order, "pending"), null);
  assert.match(tpl.orderStatus(order, "shipped").subject, /on its way/i);
  assert.match(tpl.orderStatus(order, "delivered").text, /14 days/);
  assert.match(tpl.orderStatus(order, "cancelled").text, /Nothing has been charged/);
});

test("templates: a rejected return shows the note we wrote", () => {
  const order = { _id: oid(), orderNumber: "AAAA-BBBB", returnRequest: { status: "rejected", adminNote: "Worn item" } };
  assert.match(tpl.returnUpdate(order).text, /Worn item/);
});

// ---- mailer -----------------------------------------------------------------------------------

test("mailer: a failing mail server never throws, it just reports false", async (t) => {
  t.mock.method(console, "error", () => {});
  mailer._setTransport({ sendMail: async () => { throw new Error("smtp down"); } });
  t.after(() => mailer._setTransport(null));
  assert.equal(await mailer.sendMail({ to: "a@b.co", subject: "x", text: "y" }), false);
});

test("mailer: line breaks in a subject are removed (no header injection)", async (t) => {
  const outbox = captureMail(t);
  await mailer.sendMail({ to: "a@b.co", subject: "Hello\r\nBcc: evil@x.co", text: "y" });
  assert.ok(!/[\r\n]/.test(outbox[0].subject));
});

test("mailer: with no recipient nothing is sent", async (t) => {
  const outbox = captureMail(t);
  assert.equal(await mailer.sendMail({ to: "", subject: "x", text: "y" }), false);
  assert.equal(outbox.length, 0);
});

// ---- forgot password --------------------------------------------------------------------------

const forgot = (srv, email) => call(srv.base, "/api/auth/forgot-password", { method: "POST", json: { email } });

test("forgot password: an unknown email gets the same answer and no email", async (t) => {
  const outbox = captureMail(t);
  t.mock.method(User, "findOne", () => ({ select: async () => null }));
  const upd = t.mock.method(User, "updateOne", async () => ({}));
  const srv = await start();
  t.after(srv.close);

  const r = await forgot(srv, "nobody@example.com");
  assert.equal(r.status, 200);
  assert.match(r.data.message, /if an account exists/i);
  await mailer.flush();
  assert.equal(outbox.length, 0);
  assert.equal(upd.mock.callCount(), 0);
});

test("forgot password: a customer gets a link; only the token's HASH is stored; admins are not eligible", async (t) => {
  const outbox = captureMail(t);
  const user = { _id: oid(), name: "Ana", email: "ana@example.com", role: "user" };
  const findOne = t.mock.method(User, "findOne", () => ({ select: async () => user }));
  const upd = t.mock.method(User, "updateOne", async () => ({}));
  const srv = await start();
  t.after(srv.close);

  const r = await forgot(srv, " Ana@Example.com ");
  assert.equal(r.status, 200);
  await mailer.flush();

  // the lookup is for a lowercased address AND role "user"
  assert.deepEqual(findOne.mock.calls[0].arguments[0], { email: "ana@example.com", role: "user" });

  assert.equal(outbox.length, 1);
  assert.equal(outbox[0].to, "ana@example.com");
  const token = tokenFrom(outbox[0]);
  const stored = upd.mock.calls[0].arguments[1].$set;
  assert.equal(stored.passwordResetToken, sha256(token)); // hash stored, not the token
  assert.notEqual(stored.passwordResetToken, token);
  const minutes = (stored.passwordResetExpires.getTime() - Date.now()) / 60000;
  assert.ok(minutes > 55 && minutes <= 60);
});

test("forgot password: asking again within a minute does not send a second email", async (t) => {
  const outbox = captureMail(t);
  const user = {
    _id: oid(), name: "Ana", email: "ana@example.com", role: "user",
    passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000 - 5000), // issued 5 seconds ago
  };
  t.mock.method(User, "findOne", () => ({ select: async () => user }));
  const upd = t.mock.method(User, "updateOne", async () => ({}));
  const srv = await start();
  t.after(srv.close);

  assert.equal((await forgot(srv, "ana@example.com")).status, 200);
  await mailer.flush();
  assert.equal(outbox.length, 0);
  assert.equal(upd.mock.callCount(), 0);
});

test("forgot password: bad input is a 400 and the database is not touched", async (t) => {
  const findOne = t.mock.method(User, "findOne", () => ({ select: async () => null }));
  const srv = await start();
  t.after(srv.close);
  assert.equal((await forgot(srv, "")).status, 400);
  assert.equal((await forgot(srv, { $gt: "" })).status, 400);
  assert.equal((await call(srv.base, "/api/auth/forgot-password", { method: "POST", json: {} })).status, 400);
  assert.equal(findOne.mock.callCount(), 0);
});

test("forgot password: rate limited after 10 requests an hour", async (t) => {
  t.mock.method(User, "findOne", () => ({ select: async () => null }));
  const srv = await start();
  t.after(srv.close);
  let last;
  for (let i = 0; i < 11; i++) last = await forgot(srv, "a@example.com");
  assert.equal(last.status, 429);
});

// ---- reset password ---------------------------------------------------------------------------

const reset = (srv, json) => call(srv.base, "/api/auth/reset-password", { method: "POST", json });
const goodToken = "a".repeat(64);

test("reset password: a valid link sets the new password, signs out other devices and emails a notice", async (t) => {
  const outbox = captureMail(t);
  const user = { _id: oid(), name: "Ana", email: "ana@example.com", tokenVersion: 2, save: async function () { this.saved = true; } };
  let filter, update;
  t.mock.method(User, "findOneAndUpdate", async (f, u) => ((filter = f), (update = u), user));
  const srv = await start();
  t.after(srv.close);

  const r = await reset(srv, { token: goodToken, password: "brand-new-pass" });
  assert.equal(r.status, 200);
  await mailer.flush();

  assert.equal(filter.passwordResetToken, hashToken(goodToken)); // looked up by hash
  assert.ok(filter.passwordResetExpires.$gt instanceof Date); // and must not be expired
  assert.deepEqual(update, { $unset: { passwordResetToken: 1, passwordResetExpires: 1 } }); // consumed in the same step
  assert.equal(user.password, "brand-new-pass"); // the pre-save hook hashes it
  assert.equal(user.tokenVersion, 3);
  assert.equal(user.saved, true);
  assert.equal(outbox.length, 1);
  assert.match(outbox[0].subject, /password was changed/i);
  assert.equal(r.headers.get("set-cookie"), null); // not signed in automatically
});

test("reset password: an unknown, used or expired link is refused", async (t) => {
  t.mock.method(User, "findOneAndUpdate", async () => null);
  const srv = await start();
  t.after(srv.close);
  const r = await reset(srv, { token: goodToken, password: "brand-new-pass" });
  assert.equal(r.status, 400);
  assert.match(r.data.message, /invalid or has expired/i);
});

test("reset password: bad input never reaches the database", async (t) => {
  const find = t.mock.method(User, "findOneAndUpdate", async () => null);
  const srv = await start();
  t.after(srv.close);
  assert.equal((await reset(srv, { token: goodToken, password: "short" })).status, 400);
  assert.equal((await reset(srv, { token: "not-hex", password: "brand-new-pass" })).status, 400);
  assert.equal((await reset(srv, { token: { $ne: "" }, password: "brand-new-pass" })).status, 400);
  assert.equal((await reset(srv, { token: goodToken, password: { $ne: "" } })).status, 400);
  assert.equal((await reset(srv, {})).status, 400);
  assert.equal(find.mock.callCount(), 0);
});

test("reset password: wrong links count toward the brute-force limit (429 after 10)", async (t) => {
  t.mock.method(User, "findOneAndUpdate", async () => null);
  const srv = await start();
  t.after(srv.close);
  let last;
  for (let i = 0; i < 11; i++) last = await reset(srv, { token: goodToken, password: "brand-new-pass" });
  assert.equal(last.status, 429);
});

// ---- order emails -----------------------------------------------------------------------------

const address = { fullName: "Ana B", line1: "1 Road", city: "Lahore", phone: "0300", email: "ana@example.com" };

test("checkout: the customer gets a confirmation and the store gets an alert", async (t) => {
  const outbox = captureMail(t);
  process.env.ADMIN_NOTIFY_EMAIL = "owner@store.pk";
  t.after(() => delete process.env.ADMIN_NOTIFY_EMAIL);
  const { cookie } = signIn(t.mock);
  const p = { _id: oid(), name: "Dress", price: 1000, stock: 5, image: "/uploads/d.png" };
  t.mock.method(Product, "find", async () => [p]);
  t.mock.method(Product, "updateOne", async () => ({ modifiedCount: 1 }));
  t.mock.method(Order, "create", async (doc) => ({ _id: oid(), orderNumber: "K7QM-4TXD", ...doc }));
  const srv = await start();
  t.after(srv.close);

  const r = await call(srv.base, "/api/orders", {
    method: "POST", cookie,
    json: { items: [{ product: String(p._id), qty: 1 }], total: 1350, shippingAddress: address },
  });
  assert.equal(r.status, 201);
  await mailer.flush();

  const toCustomer = outbox.find((m) => m.to === "ana@example.com");
  const toStore = outbox.find((m) => m.to === "owner@store.pk");
  assert.ok(toCustomer && toStore);
  assert.match(toCustomer.subject, /K7QM-4TXD/);
  assert.match(toStore.subject, /New order K7QM-4TXD/);
});

test("checkout: with no email typed, the confirmation goes to the account's email", async (t) => {
  const outbox = captureMail(t);
  const { cookie } = signIn(t.mock); // account email: test@example.com
  const p = { _id: oid(), name: "Dress", price: 1000, stock: 5 };
  t.mock.method(Product, "find", async () => [p]);
  t.mock.method(Product, "updateOne", async () => ({ modifiedCount: 1 }));
  t.mock.method(Order, "create", async (doc) => ({ _id: oid(), ...doc }));
  const srv = await start();
  t.after(srv.close);

  const { email, ...noEmail } = address;
  const r = await call(srv.base, "/api/orders", {
    method: "POST", cookie,
    json: { items: [{ product: String(p._id), qty: 1 }], total: 1350, shippingAddress: noEmail },
  });
  assert.equal(r.status, 201);
  await mailer.flush();
  assert.deepEqual(outbox.map((m) => m.to), ["test@example.com"]);
});

test("checkout: if the mail server is down the order still succeeds", async (t) => {
  t.mock.method(console, "error", () => {});
  mailer._setTransport({ sendMail: async () => { throw new Error("smtp down"); } });
  t.after(() => mailer._setTransport(null));
  const { cookie } = signIn(t.mock);
  const p = { _id: oid(), name: "Dress", price: 1000, stock: 5 };
  t.mock.method(Product, "find", async () => [p]);
  t.mock.method(Product, "updateOne", async () => ({ modifiedCount: 1 }));
  t.mock.method(Order, "create", async (doc) => ({ _id: oid(), ...doc }));
  const srv = await start();
  t.after(srv.close);

  const r = await call(srv.base, "/api/orders", {
    method: "POST", cookie,
    json: { items: [{ product: String(p._id), qty: 1 }], total: 1350, shippingAddress: address },
  });
  assert.equal(r.status, 201);
  await mailer.flush();
});

const setStatus = (srv, id, cookie, status) =>
  call(srv.base, `/api/orders/${id}/status`, { method: "PATCH", json: { status }, cookie });

test("admin status change: shipped emails the customer, processing stays quiet", async (t) => {
  const outbox = captureMail(t);
  const { cookie } = signIn(t.mock, { role: "admin" });
  const id = oid();
  t.mock.method(Order, "findOneAndUpdate", async (f, u) => ({
    _id: id, orderNumber: "K7QM-4TXD", status: u.$set.status, items: [], shippingAddress: { email: "ana@example.com" },
  }));
  const srv = await start();
  t.after(srv.close);

  assert.equal((await setStatus(srv, id, cookie, "processing")).status, 200);
  await mailer.flush();
  assert.equal(outbox.length, 0);

  assert.equal((await setStatus(srv, id, cookie, "shipped")).status, 200);
  await mailer.flush();
  assert.equal(outbox.length, 1);
  assert.equal(outbox[0].to, "ana@example.com");
  assert.match(outbox[0].subject, /on its way/i);
});

test("admin status change: with no email on the order, the account's email is used", async (t) => {
  const outbox = captureMail(t);
  const { cookie } = signIn(t.mock, { role: "admin" }); // User.findById is mocked to return this user for any id
  const id = oid();
  t.mock.method(Order, "findOneAndUpdate", async (f, u) => ({
    _id: id, status: u.$set.status, items: [], user: oid(), shippingAddress: {},
  }));
  const srv = await start();
  t.after(srv.close);

  assert.equal((await setStatus(srv, id, cookie, "delivered")).status, 200);
  await mailer.flush();
  assert.deepEqual(outbox.map((m) => m.to), ["test@example.com"]);
});

// ---- newsletter + contact ---------------------------------------------------------------------

test("subscribe: a NEW address gets a welcome email with an unsubscribe link; a repeat does not", async (t) => {
  const outbox = captureMail(t);
  let n = 0;
  t.mock.method(Subscriber, "updateOne", async () => ({ upsertedCount: n++ === 0 ? 1 : 0 }));
  const srv = await start();
  t.after(srv.close);
  const sub = () => call(srv.base, "/api/subscribe", { method: "POST", json: { email: "Ana@Example.com" } });

  assert.equal((await sub()).status, 201);
  await mailer.flush();
  assert.equal(outbox.length, 1);
  assert.equal(outbox[0].to, "ana@example.com");
  assert.match(outbox[0].text, /\/unsubscribe\?email=ana%40example\.com&token=[0-9a-f]{32}/);

  assert.equal((await sub()).status, 201);
  await mailer.flush();
  assert.equal(outbox.length, 1); // still one
});

test("contact: the store owner is emailed and can reply straight to the sender", async (t) => {
  const outbox = captureMail(t);
  process.env.ADMIN_NOTIFY_EMAIL = "owner@store.pk";
  t.after(() => delete process.env.ADMIN_NOTIFY_EMAIL);
  t.mock.method(ContactMessage, "create", async (d) => d);
  const srv = await start();
  t.after(srv.close);

  const r = await call(srv.base, "/api/contact", {
    method: "POST",
    json: { name: "Ana", email: "ana@example.com", subject: "Sizing\r\nBcc: evil@x.co", message: "Hello there" },
  });
  assert.equal(r.status, 201);
  await mailer.flush();
  assert.equal(outbox.length, 1);
  assert.equal(outbox[0].to, "owner@store.pk");
  assert.equal(outbox[0].replyTo, "ana@example.com");
  assert.ok(!/[\r\n]/.test(outbox[0].subject));
});

test("no email is attempted at all when none is configured (tests and plain installs stay quiet)", async (t) => {
  // no captureMail(): in the test environment the mailer is switched off
  const { cookie } = signIn(t.mock, { role: "admin" });
  t.mock.method(Order, "findOneAndUpdate", async (f, u) => ({ _id: oid(), status: u.$set.status, items: [] }));
  const srv = await start();
  t.after(srv.close);
  assert.equal((await setStatus(srv, oid(), cookie, "shipped")).status, 200);
  await mailer.flush();
  assert.equal(mailer.isEnabled(), false);
});
