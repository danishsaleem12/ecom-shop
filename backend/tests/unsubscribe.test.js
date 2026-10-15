// tests/unsubscribe.test.js — newsletter unsubscribe links
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { start, call, signIn } = require("./helpers");
const Subscriber = require("../models/Subscriber");
const { unsubscribeToken, isValidUnsubscribeToken, unsubscribeUrl } = require("../utils/unsubscribe");

test("unsubscribe token: stable, case-insensitive, different per address", () => {
  assert.equal(unsubscribeToken("Ana@Example.com"), unsubscribeToken(" ana@example.com "));
  assert.notEqual(unsubscribeToken("ana@example.com"), unsubscribeToken("bob@example.com"));
  assert.match(unsubscribeToken("ana@example.com"), /^[0-9a-f]{32}$/);
});

test("unsubscribe token: only the matching token is accepted", () => {
  const good = unsubscribeToken("ana@example.com");
  assert.equal(isValidUnsubscribeToken("ana@example.com", good), true);
  assert.equal(isValidUnsubscribeToken("bob@example.com", good), false);
  assert.equal(isValidUnsubscribeToken("ana@example.com", good.slice(1)), false);
  assert.equal(isValidUnsubscribeToken("ana@example.com", ""), false);
  assert.equal(isValidUnsubscribeToken("ana@example.com", { $gt: "" }), false);
  assert.equal(isValidUnsubscribeToken(undefined, good), false);
});

test("unsubscribe url: points at the storefront page with the email and token", () => {
  const url = new URL(unsubscribeUrl("Ana+news@Example.com"));
  assert.equal(url.pathname, "/unsubscribe");
  assert.equal(url.searchParams.get("email"), "ana+news@example.com");
  assert.equal(url.searchParams.get("token"), unsubscribeToken("ana+news@example.com"));
});

test("unsubscribe: a valid link removes the address (and says OK again on a repeat)", async (t) => {
  const del = t.mock.method(Subscriber, "deleteOne", async () => ({ deletedCount: 1 }));
  const srv = await start();
  t.after(srv.close);
  const body = { email: "Ana@Example.com", token: unsubscribeToken("ana@example.com") };
  const r = await call(srv.base, "/api/subscribe/unsubscribe", { method: "POST", json: body });
  assert.equal(r.status, 200);
  assert.deepEqual(del.mock.calls[0].arguments[0], { email: "ana@example.com" });
  assert.equal((await call(srv.base, "/api/subscribe/unsubscribe", { method: "POST", json: body })).status, 200);
});

test("unsubscribe: a wrong, missing or non-string token is refused and nothing is deleted", async (t) => {
  const del = t.mock.method(Subscriber, "deleteOne", async () => ({}));
  const srv = await start();
  t.after(srv.close);
  const post = (json) => call(srv.base, "/api/subscribe/unsubscribe", { method: "POST", json });
  assert.equal((await post({ email: "ana@example.com", token: "0".repeat(32) })).status, 400);
  assert.equal((await post({ email: "ana@example.com" })).status, 400);
  assert.equal((await post({ email: { $ne: "" }, token: unsubscribeToken("ana@example.com") })).status, 400);
  assert.equal((await post({})).status, 400);
  assert.equal(del.mock.callCount(), 0);
});

test("unsubscribe: also rate limited (429 after 10 attempts in the window)", async (t) => {
  t.mock.method(Subscriber, "deleteOne", async () => ({}));
  const srv = await start();
  t.after(srv.close);
  let last;
  for (let i = 0; i < 11; i++) {
    last = await call(srv.base, "/api/subscribe/unsubscribe", { method: "POST", json: { email: "a@b.co", token: "x" } });
  }
  assert.equal(last.status, 429);
});

test("subscribers list: each subscriber comes with an unsubscribe link", async (t) => {
  const when = new Date("2026-10-01T00:00:00Z");
  t.mock.method(Subscriber, "countDocuments", async () => 1);
  t.mock.method(Subscriber, "find", () => {
    const q = { sort: () => q, skip: () => q, limit: async () => [{ _id: "1", email: "ana@example.com", createdAt: when, __v: 0 }] };
    return q;
  });
  const srv = await start();
  t.after(srv.close);
  const { cookie } = signIn(t.mock, { role: "admin" });
  const r = await call(srv.base, "/api/subscribe", { cookie });
  assert.equal(r.status, 200);
  assert.equal(r.data.subscribers.length, 1);
  assert.equal(r.data.subscribers[0].email, "ana@example.com");
  const url = new URL(r.data.subscribers[0].unsubscribeUrl);
  assert.equal(url.searchParams.get("token"), unsubscribeToken("ana@example.com"));
  assert.equal(r.data.subscribers[0].__v, undefined);
});
