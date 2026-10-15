// tests/account.test.js — "download my data" and "delete my account"
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { start, call, oid } = require("./helpers"); // helpers sets the environment, so it must load first
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Order = require("../models/Order");
const Review = require("../models/Review");
const Product = require("../models/Product");
const Subscriber = require("../models/Subscriber");
const ContactMessage = require("../models/ContactMessage");
const { COOKIE_NAME } = require("../middleware/auth");

// A signed-in customer for protect(); .select("+password") (used by the password check) resolves the same object.
const session = (t, over = {}) => {
  const user = {
    _id: oid(), name: "Ana Khan", email: "ana@example.com", role: "user", emailVerified: true,
    createdAt: new Date("2026-01-05"),
    addresses: [{ label: "Home", fullName: "Ana Khan", phone: "0300 1234567", line1: "House 4, DHA", city: "Lahore", postalCode: "54000", isDefault: true }],
    comparePassword: async (candidate) => candidate === "right-password-1",
    ...over,
  };
  t.mock.method(User, "findById", () => {
    const p = Promise.resolve(user);
    p.select = async () => user;
    return p;
  });
  const cookie = `${COOKIE_NAME}=${jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET)}`;
  return { user, cookie };
};

const del = (base, cookie, json) => call(base, "/api/auth/me", { method: "DELETE", cookie, json });
const exportData = (base, cookie) => call(base, "/api/auth/me/export", { cookie });

// Stubs for everything the export reads
function stubExportData(t, { orders = [], reviews = [], subscriber = null, messages = [] } = {}) {
  t.mock.method(Order, "find", () => ({ sort: () => ({ lean: async () => orders }) }));
  t.mock.method(Review, "find", () => ({ sort: () => ({ populate: () => ({ lean: async () => reviews }) }) }));
  t.mock.method(Subscriber, "findOne", () => ({ lean: async () => subscriber }));
  t.mock.method(ContactMessage, "find", () => ({ sort: () => ({ lean: async () => messages }) }));
}

// Stubs for everything deleting touches; returns what was called
function stubErase(t, { activeOrder = false, openReturn = false, reviewedProducts = [] } = {}) {
  const calls = { orderUpdate: null, reviewsDeleted: 0, subscribersDeleted: 0, messagesDeleted: 0, userDeleted: 0, ratingsRefreshed: [] };
  t.mock.method(Order, "exists", async (q) => {
    if (q.status) return activeOrder ? { _id: oid() } : null;
    if (q["returnRequest.status"]) return openReturn ? { _id: oid() } : null;
    return null;
  });
  t.mock.method(Review, "distinct", async () => reviewedProducts);
  t.mock.method(Review, "deleteMany", async () => void (calls.reviewsDeleted += 1));
  t.mock.method(Review, "aggregate", async () => []);
  t.mock.method(Product, "updateOne", async (filter) => void calls.ratingsRefreshed.push(String(filter._id)));
  t.mock.method(Order, "updateMany", async (filter, update) => void (calls.orderUpdate = { filter, update }));
  t.mock.method(Subscriber, "deleteMany", async () => void (calls.subscribersDeleted += 1));
  t.mock.method(ContactMessage, "deleteMany", async () => void (calls.messagesDeleted += 1));
  t.mock.method(User, "deleteOne", async () => void (calls.userDeleted += 1));
  return calls;
}

// ---- export -------------------------------------------------------------------------------------

test("export: needs a signed-in customer", async (t) => {
  const srv = await start();
  t.after(srv.close);
  assert.equal((await exportData(srv.base)).status, 401);
});

test("export: sends a JSON download with the customer's own data and no secrets", async (t) => {
  const { cookie } = session(t);
  stubExportData(t, {
    orders: [{
      orderNumber: "K7QM-4TXD", createdAt: new Date("2026-02-01"), status: "delivered", total: 4500, discount: 0,
      items: [{ name: "Straw hat", qty: 1, price: 4500, size: "M", product: oid() }],
      shippingAddress: { fullName: "Ana Khan", line1: "House 4, DHA", city: "Lahore", phone: "0300 1234567" },
    }],
    reviews: [{ product: { name: "Straw hat" }, rating: 5, title: "Lovely", comment: "Great", status: "published", createdAt: new Date("2026-02-10") }],
    subscriber: { createdAt: new Date("2026-01-06") },
    messages: [{ subject: "Question", message: "Hi", createdAt: new Date("2026-01-07") }],
  });
  const srv = await start();
  t.after(srv.close);

  const r = await exportData(srv.base, cookie);
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-disposition"), /^attachment; filename="aurelia-my-data-\d{4}-\d{2}-\d{2}\.json"$/);
  assert.equal(r.headers.get("cache-control"), "no-store");
  assert.equal(r.data.account.email, "ana@example.com");
  assert.equal(r.data.addresses[0].city, "Lahore");
  assert.equal(r.data.orders[0].orderNumber, "K7QM-4TXD");
  assert.equal(r.data.orders[0].items[0].name, "Straw hat");
  assert.equal(r.data.reviews[0].product, "Straw hat");
  assert.equal(r.data.newsletter.subscribed, true);
  assert.equal(r.data.contactMessages.length, 1);
  assert.ok(!/password|tokenVersion|passwordReset/i.test(r.text));
});

test("export: an account with no orders, reviews or newsletter still gets a complete file", async (t) => {
  const { cookie } = session(t);
  stubExportData(t);
  const srv = await start();
  t.after(srv.close);

  const r = await exportData(srv.base, cookie);
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.orders, []);
  assert.deepEqual(r.data.reviews, []);
  assert.deepEqual(r.data.newsletter, { subscribed: false });
});

// ---- delete -------------------------------------------------------------------------------------

test("delete: needs a signed-in customer", async (t) => {
  const srv = await start();
  t.after(srv.close);
  assert.equal((await del(srv.base, undefined, { password: "x" })).status, 401);
});

test("delete: refused without the password, or with a wrong one, and nothing is removed", async (t) => {
  const { cookie } = session(t);
  const calls = stubErase(t);
  const srv = await start();
  t.after(srv.close);

  const none = await del(srv.base, cookie, {});
  assert.equal(none.status, 400);
  assert.match(none.data.message, /password/i);

  const wrong = await del(srv.base, cookie, { password: "not-my-password" });
  assert.equal(wrong.status, 400);
  assert.equal(wrong.data.message, "Password is incorrect");

  assert.equal(calls.userDeleted, 0);
  assert.equal(calls.reviewsDeleted, 0);
  assert.equal(wrong.headers.get("set-cookie"), null);
});

test("delete: refused while an order is still on its way", async (t) => {
  const { cookie } = session(t);
  const calls = stubErase(t, { activeOrder: true });
  const srv = await start();
  t.after(srv.close);

  const r = await del(srv.base, cookie, { password: "right-password-1" });
  assert.equal(r.status, 409);
  assert.match(r.data.message, /order/i);
  assert.equal(calls.userDeleted, 0);
  assert.equal(calls.orderUpdate, null);
});

test("delete: refused while a return is still open", async (t) => {
  const { cookie } = session(t);
  const calls = stubErase(t, { openReturn: true });
  const srv = await start();
  t.after(srv.close);

  const r = await del(srv.base, cookie, { password: "right-password-1" });
  assert.equal(r.status, 409);
  assert.match(r.data.message, /return/i);
  assert.equal(calls.userDeleted, 0);
});

test("delete: admin accounts can't delete themselves here", async (t) => {
  const { cookie } = session(t, { role: "admin" });
  const calls = stubErase(t);
  const srv = await start();
  t.after(srv.close);

  const r = await del(srv.base, cookie, { password: "right-password-1" });
  assert.equal(r.status, 409);
  assert.match(r.data.message, /admin/i);
  assert.equal(calls.userDeleted, 0);
});

test("delete: removes the personal data, keeps the orders anonymous, signs the browser out", async (t) => {
  const { user, cookie } = session(t);
  const productId = oid();
  const calls = stubErase(t, { reviewedProducts: [productId] });
  const srv = await start();
  t.after(srv.close);

  const r = await del(srv.base, cookie, { password: "right-password-1" });
  assert.equal(r.status, 200);

  assert.equal(calls.userDeleted, 1);
  assert.equal(calls.reviewsDeleted, 1);
  assert.deepEqual(calls.ratingsRefreshed, [String(productId)]); // the product's rating is worked out again without the review
  assert.equal(calls.subscribersDeleted, 1);
  assert.equal(calls.messagesDeleted, 1);

  // orders are kept, not deleted: only the personal fields are cleared
  assert.equal(String(calls.orderUpdate.filter.user), String(user._id));
  assert.equal(calls.orderUpdate.update.$set["shippingAddress.fullName"], "Deleted customer");
  for (const field of ["shippingAddress.line1", "shippingAddress.phone", "shippingAddress.email", "notes"]) {
    assert.equal(calls.orderUpdate.update.$unset[field], 1, `${field} should be cleared`);
  }

  // the login cookie is cleared
  assert.match(r.headers.get("set-cookie"), /aurelia_token=;/);
});

test("delete: wrong-password guesses are rate limited (429 after 10 failures)", async (t) => {
  const { cookie } = session(t);
  stubErase(t);
  const srv = await start();
  t.after(srv.close);

  for (let i = 0; i < 10; i++) assert.equal((await del(srv.base, cookie, { password: "nope" })).status, 400);
  assert.equal((await del(srv.base, cookie, { password: "nope" })).status, 429);
});
