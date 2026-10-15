// tests/newsletters.test.js — sending a newsletter to the subscriber list from the admin
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { start, call, signIn, oid } = require("./helpers");
const Newsletter = require("../models/Newsletter");
const Subscriber = require("../models/Subscriber");
const mailer = require("../utils/mailer");
const tpl = require("../utils/emailTemplates");

process.env.NEWSLETTER_DELAY_MS = "0"; // no pause between batches in tests

const good = { subject: "  Autumn   edit ", body: "New arrivals.\n\nShop now.", buttonLabel: "Shop", buttonUrl: "https://shop.example.com/shop" };

// Installs a fake mail transport that records every email; `failFor` lists addresses that should fail
function fakeMail(t, { failFor = [] } = {}) {
  const sent = [];
  mailer._setTransport({
    sendMail: async (mail) => {
      if (failFor.includes(mail.to)) throw new Error("mailbox full");
      sent.push(mail);
    },
  });
  t.after(() => mailer._setTransport(null));
  return sent;
}

// ---- the email itself ---------------------------------------------------------------------------------

test("template: paragraphs, escaped text, a button, and a personal unsubscribe link", () => {
  const m = tpl.newsletter("a@b.com", { subject: "Hi <b>", body: "One\nstill one\n\nTwo <script>x</script>", buttonLabel: "Go", buttonUrl: "https://x.com/a?b=1&c=2" });
  assert.doesNotMatch(m.html, /<script>/);
  assert.match(m.html, /Two &lt;script&gt;/);
  assert.match(m.html, /One<br>still one/);
  assert.match(m.html, /href="https:\/\/x\.com\/a\?b=1&amp;c=2"/);
  assert.match(m.text, /Go: https:\/\/x\.com/);
  assert.match(m.text, /unsubscribe\?email=a%40b\.com&token=/);
  assert.match(m.headers["List-Unsubscribe"], /^<.*\/unsubscribe\?email=a%40b\.com/);
});

test("template: a button link that is not http(s) is dropped", () => {
  const m = tpl.newsletter("a@b.com", { subject: "s", body: "x", buttonLabel: "Go", buttonUrl: "javascript:alert(1)" });
  assert.doesNotMatch(m.html, /javascript:/);
  assert.doesNotMatch(m.text, /Go:/);
});

// ---- access and validation ----------------------------------------------------------------------------

test("only admins can use the newsletter routes", async (t) => {
  const { user, cookie } = signIn(t.mock);
  t.mock.method(Newsletter, "countDocuments", async () => 0);
  t.mock.method(Newsletter, "find", () => ({ sort: () => ({ skip: () => ({ limit: () => ({ lean: async () => [] }) }) }) }));
  const srv = await start();
  t.after(srv.close);

  assert.equal((await call(srv.base, "/api/newsletters")).status, 401);
  assert.equal((await call(srv.base, "/api/newsletters", { cookie })).status, 403);
  assert.equal((await call(srv.base, "/api/newsletters", { method: "POST", cookie, json: good })).status, 403);
  user.role = "admin";
  const r = await call(srv.base, "/api/newsletters", { cookie });
  assert.equal(r.status, 200);
  assert.deepEqual([r.data.total, r.data.pages], [0, 1]);
});

test("send: bad input is a 400 and nothing is sent", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  const sent = fakeMail(t);
  const create = t.mock.method(Newsletter, "create", async () => ({}));
  const srv = await start();
  t.after(srv.close);

  const bad = [
    {},
    { ...good, subject: " " },
    { ...good, subject: "x".repeat(151) },
    { ...good, body: "" },
    { ...good, body: "x".repeat(10001) },
    { ...good, buttonUrl: "" }, // label without a link
    { ...good, buttonLabel: "" }, // link without a label
    { ...good, buttonUrl: "ftp://x.com" },
    { ...good, buttonLabel: "x".repeat(41) },
    { ...good, subject: 42 },
  ];
  for (const body of bad) {
    assert.equal((await call(srv.base, "/api/newsletters", { method: "POST", cookie, json: body })).status, 400, JSON.stringify(body).slice(0, 70));
    assert.equal((await call(srv.base, "/api/newsletters/test", { method: "POST", cookie, json: body })).status, 400);
  }
  assert.equal(create.mock.callCount(), 0);
  assert.equal(sent.length, 0);
});

// ---- test email ---------------------------------------------------------------------------------------

test("test: sends one copy to the admin's own address", async (t) => {
  const { user, cookie } = signIn(t.mock, { role: "admin" });
  const sent = fakeMail(t);
  const srv = await start();
  t.after(srv.close);

  const r = await call(srv.base, "/api/newsletters/test", { method: "POST", cookie, json: good });
  assert.equal(r.status, 200);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, user.email);
  assert.equal(sent[0].subject, "Autumn edit"); // tidy single-spaced subject
});

test("test: a mail server problem is a 502, not a crash", async (t) => {
  const { user, cookie } = signIn(t.mock, { role: "admin" });
  fakeMail(t, { failFor: ["test@example.com"] });
  t.mock.method(console, "error", () => {});
  const srv = await start();
  t.after(srv.close);

  assert.equal(user.email, "test@example.com");
  assert.equal((await call(srv.base, "/api/newsletters/test", { method: "POST", cookie, json: good })).status, 502);
});

// ---- sending to the list ------------------------------------------------------------------------------

function mockList(t, emails, { busy = false } = {}) {
  const updates = [];
  t.mock.method(Newsletter, "exists", async () => (busy ? { _id: oid() } : null));
  t.mock.method(Subscriber, "find", () => ({ lean: async () => emails.map((email) => ({ _id: oid(), email })) }));
  const create = t.mock.method(Newsletter, "create", async (doc) => ({ ...doc, _id: oid(), status: "sending", sent: 0, failed: 0 }));
  t.mock.method(Newsletter, "updateOne", async (filter, update) => (updates.push(update.$set), { acknowledged: true }));
  return { updates, create };
}

test("send: every subscriber gets their own copy with their own unsubscribe link; the result is recorded", async (t) => {
  const { user, cookie } = signIn(t.mock, { role: "admin" });
  const emails = Array.from({ length: 23 }, (_, i) => `person${i}@example.com`); // more than one batch
  const sent = fakeMail(t);
  const { updates, create } = mockList(t, emails);
  const srv = await start();
  t.after(srv.close);

  const r = await call(srv.base, "/api/newsletters", { method: "POST", cookie, json: good });
  assert.equal(r.status, 202);
  assert.equal(r.data.newsletter.recipients, 23);
  assert.equal(create.mock.calls[0].arguments[0].subject, "Autumn edit");
  assert.equal(String(create.mock.calls[0].arguments[0].createdBy), String(user._id));

  await mailer.flush();
  assert.equal(sent.length, 23);
  assert.deepEqual(new Set(sent.map((m) => m.to)), new Set(emails));
  for (const m of sent) assert.ok(m.text.includes(encodeURIComponent(m.to)), "link is for that address"); // not someone else's
  const last = updates[updates.length - 1];
  assert.deepEqual([last.status, last.sent, last.failed], ["sent", 23, 0]);
  assert.ok(last.finishedAt instanceof Date);
});

test("send: addresses that fail are counted and the rest still go out", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  const sent = fakeMail(t, { failFor: ["bad@example.com"] });
  t.mock.method(console, "error", () => {});
  const { updates } = mockList(t, ["a@example.com", "bad@example.com", "b@example.com"]);
  const srv = await start();
  t.after(srv.close);

  assert.equal((await call(srv.base, "/api/newsletters", { method: "POST", cookie, json: good })).status, 202);
  await mailer.flush();
  assert.deepEqual(sent.map((m) => m.to).sort(), ["a@example.com", "b@example.com"]);
  const last = updates[updates.length - 1];
  assert.deepEqual([last.status, last.sent, last.failed], ["sent", 2, 1]);
});

test("send: if nothing could be delivered the newsletter is marked failed", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  fakeMail(t, { failFor: ["a@example.com"] });
  t.mock.method(console, "error", () => {});
  const { updates } = mockList(t, ["a@example.com"]);
  const srv = await start();
  t.after(srv.close);

  await call(srv.base, "/api/newsletters", { method: "POST", cookie, json: good });
  await mailer.flush();
  assert.equal(updates[updates.length - 1].status, "failed");
});

test("send: refused while another newsletter is still sending, and with no subscribers", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  const sent = fakeMail(t);
  const busy = mockList(t, ["a@example.com"], { busy: true });
  const srv = await start();
  t.after(srv.close);

  assert.equal((await call(srv.base, "/api/newsletters", { method: "POST", cookie, json: good })).status, 409);
  assert.equal(busy.create.mock.callCount(), 0);
  assert.equal(sent.length, 0);
});

test("send: an empty list is a 400", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  fakeMail(t);
  const { create } = mockList(t, []);
  const srv = await start();
  t.after(srv.close);

  const r = await call(srv.base, "/api/newsletters", { method: "POST", cookie, json: good });
  assert.equal(r.status, 400);
  assert.equal(create.mock.callCount(), 0);
});

test("send: in production without SMTP settings it says so instead of failing silently", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  const srv = await start();
  t.after(srv.close);
  process.env.NODE_ENV = "production";
  t.after(() => (process.env.NODE_ENV = "test"));

  const r = await call(srv.base, "/api/newsletters", { method: "POST", cookie, json: good });
  assert.equal(r.status, 503);
  assert.match(r.data.message, /SMTP_HOST/);
});
