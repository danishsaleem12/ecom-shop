// tests/users.test.js — customer list and admin-account management
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { start, call, signIn, oid } = require("./helpers");
const User = require("../models/User");
const Order = require("../models/Order");

function chain(rows, seen = {}) {
  const q = {
    sort: (s) => ((seen.sort = s), q),
    skip: (n) => ((seen.skip = n), q),
    limit: (n) => ((seen.limit = n), q),
    select: () => q,
    lean: async () => rows,
  };
  return q;
}

const row = (extra = {}) => ({ _id: oid(), name: "Sara Khan", email: "sara@example.com", role: "user", createdAt: new Date(), password: "HASH", tokenVersion: 3, ...extra });

// A stand-in for a Mongoose document
function fakeUser(fields) {
  const u = row(fields);
  u.save = async () => u;
  return u;
}

test("every route needs an admin", async (t) => {
  const { user, cookie } = signIn(t.mock);
  t.mock.method(User, "countDocuments", async () => 0);
  t.mock.method(User, "find", () => chain([]));
  t.mock.method(Order, "aggregate", async () => []);
  const srv = await start();
  t.after(srv.close);

  assert.equal((await call(srv.base, "/api/users")).status, 401);
  for (const [method, path, json] of [["GET", "/api/users"], ["GET", `/api/users/${oid()}`], ["POST", "/api/users/admin", {}], ["PATCH", `/api/users/${oid()}/role`, { role: "admin" }]]) {
    assert.equal((await call(srv.base, path, { method, cookie, json })).status, 403, `${method} ${path}`);
  }
  user.role = "admin";
  assert.equal((await call(srv.base, "/api/users", { cookie })).status, 200);
});

test("list: accounts with order count and spend, never the password", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  const sara = row();
  const seen = {};
  t.mock.method(User, "countDocuments", async (f) => (f.role === "admin" && !f.$or ? 2 : 41));
  t.mock.method(User, "find", (f) => ((seen.filter = f), chain([sara, row({ name: "New Person" })], seen)));
  const last = new Date("2026-10-01T10:00:00Z");
  const agg = t.mock.method(Order, "aggregate", async () => [{ _id: sara._id, orders: 3, spent: 4500, lastOrderAt: last }]);
  const srv = await start();
  t.after(srv.close);

  const r = await call(srv.base, "/api/users?role=user&search=sa.ra", { cookie });
  assert.equal(r.status, 200);
  assert.equal(r.data.users.length, 2);
  assert.deepEqual([r.data.users[0].orders, r.data.users[0].spent], [3, 4500]);
  assert.deepEqual([r.data.users[1].orders, r.data.users[1].spent], [0, 0]); // never ordered
  assert.equal(r.data.users[0].password, undefined);
  assert.equal(r.data.users[0].tokenVersion, undefined);
  assert.equal(r.data.total, 41);
  assert.equal(r.data.admins, 2);
  assert.equal(seen.filter.role, "user");
  assert.equal(seen.filter.$or[0].name.$regex, "sa\\.ra"); // the search text is escaped
  assert.equal(agg.mock.calls[0].arguments[0][0].$match.status.$ne, "cancelled");
});

test("detail: the account and its latest orders; unknown or malformed ids are 404", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  const sara = row();
  t.mock.method(User, "findOne", () => ({ lean: async () => sara }));
  t.mock.method(Order, "aggregate", async () => [{ _id: sara._id, orders: 1, spent: 900 }]);
  t.mock.method(Order, "find", () => chain([{ _id: oid(), orderNumber: "AB12-CD34", status: "delivered", total: 900 }]));
  const srv = await start();
  t.after(srv.close);

  const r = await call(srv.base, `/api/users/${sara._id}`, { cookie });
  assert.equal(r.status, 200);
  assert.equal(r.data.user.email, "sara@example.com");
  assert.equal(r.data.user.password, undefined);
  assert.equal(r.data.recentOrders[0].orderNumber, "AB12-CD34");
  assert.equal((await call(srv.base, "/api/users/not-an-id", { cookie })).status, 404);
});

test("create admin: validates, refuses an existing email, stores a verified admin", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  let existing = null;
  t.mock.method(User, "findOne", async () => existing);
  const create = t.mock.method(User, "create", async (doc) => ({ ...doc, _id: oid(), createdAt: new Date() }));
  const srv = await start();
  t.after(srv.close);
  const post = (json) => call(srv.base, "/api/users/admin", { method: "POST", cookie, json });

  for (const body of [{}, { name: "A", email: "nope", password: "longenough" }, { name: "A", email: "a@b.co", password: "short" }, { name: " ", email: "a@b.co", password: "longenough" }, { name: "A", email: "a@b.co", password: 12345678 }]) {
    assert.equal((await post(body)).status, 400, JSON.stringify(body));
  }
  assert.equal(create.mock.callCount(), 0);

  const ok = await post({ name: " Ali Raza ", email: " ALI@Example.com ", password: "longenough" });
  assert.equal(ok.status, 201);
  const saved = create.mock.calls[0].arguments[0];
  assert.deepEqual([saved.name, saved.email, saved.role, saved.emailVerified], ["Ali Raza", "ali@example.com", "admin", true]);
  assert.equal(ok.data.user.password, undefined);

  existing = row();
  assert.equal((await post({ name: "Ali", email: "ali@example.com", password: "longenough" })).status, 409);
  assert.equal(create.mock.callCount(), 1);
});

test("role: promote a customer; demote an admin and end their sessions", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  const target = fakeUser({ role: "user" });
  t.mock.method(User, "findOne", async () => target);
  const srv = await start();
  t.after(srv.close);
  const patch = (role) => call(srv.base, `/api/users/${target._id}/role`, { method: "PATCH", cookie, json: { role } });

  let r = await patch("admin");
  assert.equal(r.status, 200);
  assert.equal(target.role, "admin");
  assert.equal(target.tokenVersion, 3); // promoting doesn't sign anyone out

  r = await patch("user");
  assert.equal(r.status, 200);
  assert.equal(target.role, "user");
  assert.equal(target.tokenVersion, 4); // demoted: every old session stops working
  assert.equal(r.data.user.tokenVersion, undefined);
});

test("role: bad role, own account, malformed or unknown id", async (t) => {
  const { user, cookie } = signIn(t.mock, { role: "admin" });
  const find = t.mock.method(User, "findOne", async () => null);
  const srv = await start();
  t.after(srv.close);
  const patch = (id, json) => call(srv.base, `/api/users/${id}/role`, { method: "PATCH", cookie, json });

  assert.equal((await patch(oid(), { role: "owner" })).status, 400);
  assert.equal((await patch(oid(), {})).status, 400);
  const own = await patch(user._id, { role: "user" });
  assert.equal(own.status, 400);
  assert.match(own.data.message, /own role/);
  assert.equal(find.mock.callCount(), 0); // refused before touching the database
  assert.equal((await patch("nope", { role: "admin" })).status, 404);
  assert.equal((await patch(oid(), { role: "admin" })).status, 404);
});
