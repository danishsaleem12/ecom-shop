// tests/verification.test.js — "confirm your email" at sign-up
const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const jwt = require("jsonwebtoken");
const { start, call, signIn, oid } = require("./helpers"); // helpers sets the environment, so it must load first
const mailer = require("../utils/mailer");
const tpl = require("../utils/emailTemplates");
const { VERIFY_TTL_MS } = require("../utils/emailVerification");
const { COOKIE_NAME } = require("../middleware/auth");
const User = require("../models/User");
const Product = require("../models/Product");

function captureMail(t) {
  const outbox = [];
  mailer._setTransport({ sendMail: async (m) => void outbox.push(m) });
  t.after(() => mailer._setTransport(null));
  return outbox;
}
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const tokenFrom = (mail) => mail.text.match(/verify-email\?token=([0-9a-f]{64})/)[1];
const goodToken = "b".repeat(64);
const post = (srv, path, json, cookie) => call(srv.base, `/api/auth${path}`, { method: "POST", json, cookie });

// ---- sign-up ----------------------------------------------------------------------------------------

test("register: the account starts unverified, only the token's HASH is stored, and the link is emailed", async (t) => {
  const outbox = captureMail(t);
  t.mock.method(User, "findOne", async () => null);
  let created;
  t.mock.method(User, "create", async (doc) => ((created = doc), { _id: oid(), role: "user", ...doc }));
  const srv = await start();
  t.after(srv.close);

  const r = await post(srv, "/register", { name: "Ana", email: "ana@example.com", password: "long-enough-pw" });
  assert.equal(r.status, 201);
  assert.equal(r.data.user.emailVerified, false);
  assert.match(r.headers.get("set-cookie"), /aurelia_token=/); // still signed in: they can browse right away
  await mailer.flush();

  assert.equal(created.emailVerified, false);
  assert.equal(outbox.length, 1);
  assert.equal(outbox[0].to, "ana@example.com");
  assert.match(outbox[0].subject, /confirm your email/i);
  const token = tokenFrom(outbox[0]);
  assert.equal(created.emailVerificationToken, sha256(token)); // the hash is stored, not the token
  assert.notEqual(created.emailVerificationToken, token);
  const hours = (created.emailVerificationExpires.getTime() - Date.now()) / 3600000;
  assert.ok(hours > 23 && hours <= 24);
  assert.ok(!r.text.includes(token)); // the token is never in the API response
});

test("login: an unverified customer can still sign in (they just cannot order yet)", async (t) => {
  const user = { _id: oid(), name: "Ana", email: "ana@example.com", role: "user", emailVerified: false, comparePassword: async () => true };
  t.mock.method(User, "findOne", () => ({ select: async () => user }));
  const srv = await start();
  t.after(srv.close);

  const r = await post(srv, "/login", { email: "ana@example.com", password: "long-enough-pw" });
  assert.equal(r.status, 200);
  assert.equal(r.data.user.emailVerified, false);
});

test("accounts from before this feature (no emailVerified field) count as verified", async (t) => {
  const user = { _id: oid(), name: "Old", email: "old@example.com", role: "user", comparePassword: async () => true };
  t.mock.method(User, "findOne", () => ({ select: async () => user }));
  const srv = await start();
  t.after(srv.close);

  const r = await post(srv, "/login", { email: "old@example.com", password: "long-enough-pw" });
  assert.equal(r.data.user.emailVerified, true);
});

// ---- the link ---------------------------------------------------------------------------------------

test("verify-email: a valid link verifies the account, is looked up by hash and is consumed in the same step", async (t) => {
  let filter, update;
  t.mock.method(User, "findOneAndUpdate", async (f, u) => ((filter = f), (update = u), { _id: oid() }));
  const srv = await start();
  t.after(srv.close);

  const r = await post(srv, "/verify-email", { token: goodToken }); // no cookie: it may be opened on another device
  assert.equal(r.status, 200);
  assert.equal(filter.emailVerificationToken, sha256(goodToken));
  assert.ok(filter.emailVerificationExpires.$gt instanceof Date);
  assert.deepEqual(update, { $set: { emailVerified: true }, $unset: { emailVerificationToken: 1, emailVerificationExpires: 1 } });
});

test("verify-email: an unknown, used or expired link is refused", async (t) => {
  t.mock.method(User, "findOneAndUpdate", async () => null);
  const srv = await start();
  t.after(srv.close);

  const r = await post(srv, "/verify-email", { token: goodToken });
  assert.equal(r.status, 400);
  assert.match(r.data.message, /invalid or has expired/i);
});

test("verify-email: bad input never reaches the database", async (t) => {
  const find = t.mock.method(User, "findOneAndUpdate", async () => null);
  const srv = await start();
  t.after(srv.close);

  assert.equal((await post(srv, "/verify-email", { token: "not-hex" })).status, 400);
  assert.equal((await post(srv, "/verify-email", { token: { $ne: "" } })).status, 400);
  assert.equal((await post(srv, "/verify-email", {})).status, 400);
  assert.equal(find.mock.callCount(), 0);
});

test("verify-email: wrong links count toward the brute-force limit (429 after 10)", async (t) => {
  t.mock.method(User, "findOneAndUpdate", async () => null);
  const srv = await start();
  t.after(srv.close);

  for (let i = 0; i < 10; i++) assert.equal((await post(srv, "/verify-email", { token: goodToken })).status, 400);
  assert.equal((await post(srv, "/verify-email", { token: goodToken })).status, 429);
});

// ---- asking for a new link --------------------------------------------------------------------------

// Signs in as an unverified customer. resend-verification loads the user a second time with .select(), so the
// mocked findById has to answer both the plain call (auth) and the .select() call.
function signInUnverified(t, { lastIssuedMsAgo } = {}) {
  const user = { _id: oid(), name: "Ana", email: "ana@example.com", role: "user", emailVerified: false };
  const withExpiry = {
    ...user,
    emailVerificationExpires: lastIssuedMsAgo === undefined ? undefined : new Date(Date.now() - lastIssuedMsAgo + VERIFY_TTL_MS),
  };
  t.mock.method(User, "findById", () => Object.assign(Promise.resolve(user), { select: async () => withExpiry }));
  return { user, cookie: `${COOKIE_NAME}=${jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET)}` };
}

test("resend-verification needs a signed-in customer", async (t) => {
  const srv = await start();
  t.after(srv.close);
  assert.equal((await post(srv, "/resend-verification", {})).status, 401);
});

test("resend-verification: sends a fresh link and stores only its hash", async (t) => {
  const outbox = captureMail(t);
  const { cookie } = signInUnverified(t);
  const upd = t.mock.method(User, "updateOne", async () => ({}));
  const srv = await start();
  t.after(srv.close);

  const r = await post(srv, "/resend-verification", {}, cookie);
  assert.equal(r.status, 200);
  await mailer.flush();

  assert.equal(outbox.length, 1);
  assert.equal(outbox[0].to, "ana@example.com");
  const token = tokenFrom(outbox[0]);
  assert.equal(upd.mock.calls[0].arguments[1].$set.emailVerificationToken, sha256(token));
});

test("resend-verification: asking again within a minute sends nothing", async (t) => {
  const outbox = captureMail(t);
  const { cookie } = signInUnverified(t, { lastIssuedMsAgo: 5000 });
  const upd = t.mock.method(User, "updateOne", async () => ({}));
  const srv = await start();
  t.after(srv.close);

  const r = await post(srv, "/resend-verification", {}, cookie);
  assert.equal(r.status, 429);
  await mailer.flush();
  assert.equal(outbox.length, 0);
  assert.equal(upd.mock.callCount(), 0);
});

test("resend-verification: an already verified customer is told so and no email is sent", async (t) => {
  const outbox = captureMail(t);
  const { cookie } = signIn(t.mock, { role: "user" }); // no emailVerified flag = verified
  const srv = await start();
  t.after(srv.close);

  const r = await post(srv, "/resend-verification", {}, cookie);
  assert.equal(r.status, 200);
  assert.equal(r.data.alreadyVerified, true);
  await mailer.flush();
  assert.equal(outbox.length, 0);
});

// ---- the rule: confirm before ordering --------------------------------------------------------------

test("an unverified customer cannot place an order", async (t) => {
  const { user, cookie } = signIn(t.mock, { role: "user" });
  user.emailVerified = false;
  const find = t.mock.method(Product, "find", async () => []);
  const srv = await start();
  t.after(srv.close);

  const r = await call(srv.base, "/api/orders", {
    method: "POST",
    cookie,
    json: { items: [{ product: String(oid()), qty: 1 }], total: 100, shippingAddress: { fullName: "A", line1: "1 Rd", city: "Lahore", phone: "03001234567" } },
  });
  assert.equal(r.status, 403);
  assert.equal(r.data.code, "EMAIL_NOT_VERIFIED");
  assert.equal(find.mock.callCount(), 0); // refused before touching products or stock
});

// ---- password reset also proves the mailbox ---------------------------------------------------------

test("a completed password reset also marks the email verified", async (t) => {
  const user = { _id: oid(), name: "Ana", email: "ana@example.com", tokenVersion: 0, emailVerified: false, save: async function () {} };
  t.mock.method(User, "findOneAndUpdate", async () => user);
  const srv = await start();
  t.after(srv.close);

  const r = await post(srv, "/reset-password", { token: goodToken, password: "brand-new-pass" });
  assert.equal(r.status, 200);
  assert.equal(user.emailVerified, true);
});

// ---- template ---------------------------------------------------------------------------------------

test("verification email: the name is HTML-escaped and the link is in both versions", () => {
  const url = `http://localhost:3000/verify-email?token=${goodToken}`;
  const { html, text } = tpl.emailVerification({ name: "<b>Ana</b>" }, url, 24);
  assert.ok(!html.includes("<b>Ana</b>"));
  assert.ok(html.includes(goodToken));
  assert.ok(text.includes(url));
  assert.match(text, /24 hours/);
});
