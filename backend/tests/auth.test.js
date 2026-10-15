const { test } = require("node:test");
const assert = require("node:assert/strict");
const { start, call, quietErrors, oid } = require("./helpers");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { COOKIE_NAME } = require("../middleware/auth");

const creds = { email: "a@example.com", password: "wrong-password" };
const login = (base, json = creds) => call(base, "/api/auth/login", { method: "POST", json });

test("responses carry helmet's security headers and hide x-powered-by", async (t) => {
  const srv = await start();
  t.after(srv.close);
  const r = await call(srv.base, "/api/health");
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.equal(r.headers.get("x-powered-by"), null);
});

test("login: blocked with 429 after 10 failed attempts", async (t) => {
  t.mock.method(User, "findOne", () => ({ select: async () => null })); // no such user -> 401
  const srv = await start();
  t.after(srv.close);

  for (let i = 0; i < 10; i++) assert.equal((await login(srv.base)).status, 401);

  const blocked = await login(srv.base);
  assert.equal(blocked.status, 429);
  assert.match(blocked.data.message, /too many/i);
});

test("login: successful logins do not count toward the limit", async (t) => {
  const user = { _id: oid(), name: "A", email: "a@example.com", role: "user", comparePassword: async () => true };
  t.mock.method(User, "findOne", () => ({ select: async () => user }));
  const srv = await start();
  t.after(srv.close);

  for (let i = 0; i < 15; i++) assert.equal((await login(srv.base)).status, 200);
});

test("login: rejects non-string credentials with 400 (no query-operator injection)", async (t) => {
  const findOne = t.mock.method(User, "findOne", () => ({ select: async () => null }));
  const srv = await start();
  t.after(srv.close);

  const r = await login(srv.base, { email: { $gt: "" }, password: "whatever123" });
  assert.equal(r.status, 400);
  assert.equal(findOne.mock.callCount(), 0);
});

test("login: a database failure returns a generic 500 without leaking details", async (t) => {
  quietErrors(t.mock);
  t.mock.method(User, "findOne", () => {
    throw new Error("connection to secret-host:27017 refused");
  });
  const srv = await start();
  t.after(srv.close);

  const r = await login(srv.base);
  assert.equal(r.status, 500);
  assert.equal(r.data.message, "Failed to sign in");
  assert.equal(r.data.error, undefined);
  assert.ok(!r.text.includes("secret-host"));
});

test("register: blocked with 429 after 10 attempts in the window", async (t) => {
  const srv = await start();
  t.after(srv.close);
  const register = () => call(srv.base, "/api/auth/register", { method: "POST", json: {} });

  for (let i = 0; i < 10; i++) assert.equal((await register()).status, 400);
  assert.equal((await register()).status, 429);
});

test("register: duplicate email gives 409", async (t) => {
  t.mock.method(User, "findOne", async () => ({ _id: oid() }));
  const srv = await start();
  t.after(srv.close);

  const r = await call(srv.base, "/api/auth/register", {
    method: "POST",
    json: { name: "A", email: "a@example.com", password: "long-enough-pw" },
  });
  assert.equal(r.status, 409);
});

test("register: success sets the auth cookie and never returns the password", async (t) => {
  t.mock.method(User, "findOne", async () => null);
  t.mock.method(User, "create", async (doc) => ({ _id: oid(), role: "user", ...doc }));
  const srv = await start();
  t.after(srv.close);

  const r = await call(srv.base, "/api/auth/register", {
    method: "POST",
    json: { name: "A", email: "a@example.com", password: "long-enough-pw" },
  });
  assert.equal(r.status, 201);
  assert.equal(r.data.user.email, "a@example.com");
  assert.ok(!r.text.includes("long-enough-pw"));
  assert.match(r.headers.get("set-cookie"), /aurelia_token=/);
});

test("register: rejects short passwords", async (t) => {
  const srv = await start();
  t.after(srv.close);
  const r = await call(srv.base, "/api/auth/register", {
    method: "POST",
    json: { name: "A", email: "a@example.com", password: "short" },
  });
  assert.equal(r.status, 400);
});

// ---- separate customer / admin sign-in -------------------------------------------------------

const account = (role) => ({ _id: oid(), name: "A", email: "a@example.com", role, comparePassword: async () => true });
const stubUser = (t, user) => t.mock.method(User, "findOne", () => ({ select: async () => user }));
const adminLogin = (base) => call(base, "/api/auth/admin/login", { method: "POST", json: creds });

test("customer login: an admin account is refused with the generic message", async (t) => {
  stubUser(t, account("admin"));
  const srv = await start();
  t.after(srv.close);

  const r = await login(srv.base);
  assert.equal(r.status, 401);
  assert.equal(r.data.message, "Incorrect email or password");
  assert.equal(r.headers.get("set-cookie"), null);
});

test("admin login: an admin account signs in and gets the cookie", async (t) => {
  stubUser(t, account("admin"));
  const srv = await start();
  t.after(srv.close);

  const r = await adminLogin(srv.base);
  assert.equal(r.status, 200);
  assert.equal(r.data.user.role, "admin");
  assert.match(r.headers.get("set-cookie"), /aurelia_token=/);
});

test("admin login: a customer account is refused with the generic message", async (t) => {
  stubUser(t, account("user"));
  const srv = await start();
  t.after(srv.close);

  const r = await adminLogin(srv.base);
  assert.equal(r.status, 401);
  assert.equal(r.data.message, "Incorrect email or password");
  assert.equal(r.headers.get("set-cookie"), null);
});

test("admin login: a wrong password for an admin is refused", async (t) => {
  stubUser(t, { ...account("admin"), comparePassword: async () => false });
  const srv = await start();
  t.after(srv.close);
  assert.equal((await adminLogin(srv.base)).status, 401);
});

test("admin login: also rate limited after 10 failed attempts", async (t) => {
  stubUser(t, null);
  const srv = await start();
  t.after(srv.close);

  for (let i = 0; i < 10; i++) assert.equal((await adminLogin(srv.base)).status, 401);
  assert.equal((await adminLogin(srv.base)).status, 429);
});

// ---- password change needs the current password + tokens are invalidated (tokenVersion) -----------

// A signed-in user for protect(): findById resolves the user, and .select("+password") (used by the
// password check) resolves the same object. `tv` is the version stamped into the token.
const session = (t, { tokenVersion, tv } = {}) => {
  const user = {
    _id: oid(), name: "A", email: "a@example.com", role: "user",
    tokenVersion, saved: 0,
    comparePassword: async (candidate) => candidate === "old-password-1",
    save: async function () { this.saved += 1; },
  };
  t.mock.method(User, "findById", () => {
    const p = Promise.resolve(user);
    p.select = async () => user;
    return p;
  });
  const payload = { id: String(user._id), ...(tv !== undefined ? { tv } : {}) };
  const cookie = `${COOKIE_NAME}=${jwt.sign(payload, process.env.JWT_SECRET)}`;
  return { user, cookie };
};
const putMe = (base, cookie, json) => call(base, "/api/auth/me", { method: "PUT", cookie, json });

test("password change: refused without the current password", async (t) => {
  const { user, cookie } = session(t);
  const srv = await start();
  t.after(srv.close);

  const r = await putMe(srv.base, cookie, { password: "brand-new-pw-1" });
  assert.equal(r.status, 400);
  assert.match(r.data.message, /current password/i);
  assert.equal(user.saved, 0);
});

test("password change: refused when the current password is wrong", async (t) => {
  const { user, cookie } = session(t);
  const srv = await start();
  t.after(srv.close);

  const r = await putMe(srv.base, cookie, { password: "brand-new-pw-1", currentPassword: "not-my-password" });
  assert.equal(r.status, 400);
  assert.equal(r.data.message, "Current password is incorrect");
  assert.equal(user.saved, 0);
  assert.equal(r.headers.get("set-cookie"), null);
});

test("password change: new password must differ from the current one", async (t) => {
  const { user, cookie } = session(t);
  const srv = await start();
  t.after(srv.close);

  const r = await putMe(srv.base, cookie, { password: "old-password-1", currentPassword: "old-password-1" });
  assert.equal(r.status, 400);
  assert.match(r.data.message, /different/i);
  assert.equal(user.saved, 0);
});

test("password change: success bumps the token version and re-issues this device's cookie", async (t) => {
  const { user, cookie } = session(t, { tokenVersion: 2, tv: 2 });
  const srv = await start();
  t.after(srv.close);

  const r = await putMe(srv.base, cookie, { password: "brand-new-pw-1", currentPassword: "old-password-1" });
  assert.equal(r.status, 200);
  assert.equal(user.password, "brand-new-pw-1"); // the pre-save hook hashes it in the real model
  assert.equal(user.tokenVersion, 3);
  assert.equal(user.saved, 1);
  assert.ok(!r.text.includes("brand-new-pw-1"));

  const setCookie = r.headers.get("set-cookie");
  assert.match(setCookie, /aurelia_token=/);
  const fresh = jwt.verify(setCookie.match(/aurelia_token=([^;]+)/)[1], process.env.JWT_SECRET);
  assert.equal(fresh.tv, 3); // the new cookie matches the new version
});

test("password change: wrong-guess attempts are rate limited (429 after 10 failures)", async (t) => {
  const { cookie } = session(t);
  const srv = await start();
  t.after(srv.close);

  for (let i = 0; i < 10; i++) {
    assert.equal((await putMe(srv.base, cookie, { password: "brand-new-pw-1", currentPassword: "nope" })).status, 400);
  }
  assert.equal((await putMe(srv.base, cookie, { password: "brand-new-pw-1", currentPassword: "nope" })).status, 429);
});

test("token version: a token from before the last logout / password change is rejected", async (t) => {
  const { cookie } = session(t, { tokenVersion: 1, tv: 0 }); // account is at version 1, token says 0
  const srv = await start();
  t.after(srv.close);

  const r = await call(srv.base, "/api/auth/me", { cookie });
  assert.equal(r.status, 401);
  assert.match(r.data.message, /sign in again/i);
});

test("token version: a current token works, and tokens issued before this feature (no tv) still work", async (t) => {
  const current = session(t, { tokenVersion: 4, tv: 4 });
  const srv = await start();
  t.after(srv.close);
  assert.equal((await call(srv.base, "/api/auth/me", { cookie: current.cookie })).status, 200);
});

test("token version: old tokens without tv are accepted while the account is still at version 0", async (t) => {
  const legacy = session(t); // user has no tokenVersion, token has no tv
  const srv = await start();
  t.after(srv.close);
  assert.equal((await call(srv.base, "/api/auth/me", { cookie: legacy.cookie })).status, 200);
});

test("logout: bumps the token version for a current token and clears the cookie", async (t) => {
  const { user, cookie } = session(t, { tokenVersion: 0, tv: 0 });
  const updateOne = t.mock.method(User, "updateOne", async () => ({}));
  const srv = await start();
  t.after(srv.close);

  const r = await call(srv.base, "/api/auth/logout", { method: "POST", cookie });
  assert.equal(r.status, 200);
  assert.equal(updateOne.mock.callCount(), 1);
  assert.deepEqual(updateOne.mock.calls[0].arguments[0], { _id: user._id });
  assert.deepEqual(updateOne.mock.calls[0].arguments[1], { $inc: { tokenVersion: 1 } });
  assert.match(r.headers.get("set-cookie"), /aurelia_token=;/);
});

test("logout: with no cookie, or a stale token, it just clears the cookie and changes nothing", async (t) => {
  const stale = session(t, { tokenVersion: 3, tv: 1 });
  const updateOne = t.mock.method(User, "updateOne", async () => ({}));
  const srv = await start();
  t.after(srv.close);

  const none = await call(srv.base, "/api/auth/logout", { method: "POST" });
  const old = await call(srv.base, "/api/auth/logout", { method: "POST", cookie: stale.cookie });
  assert.equal(none.status, 200);
  assert.equal(old.status, 200);
  assert.equal(updateOne.mock.callCount(), 0);
});
