// tests/addresses.test.js — saved delivery addresses on the customer's account
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { start, call, oid } = require("./helpers"); // helpers sets the environment, so it must load first
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { COOKIE_NAME } = require("../middleware/auth");
const { MAX_ADDRESSES } = require("../utils/addresses");

const GOOD = { label: "Home", fullName: "Ana Khan", phone: "0300 1234567", line1: "House 4, Street 2, DHA", city: "Lahore", postalCode: "54000" };
const addr = (over = {}) => ({ ...GOOD, ...over });

// A real (in-memory) User document, so the subdocument helpers (.id, .pull, .set) behave like in production.
// Only save() is replaced, so nothing touches a database.
function signInAs(t, addresses = []) {
  const user = new User({ name: "Ana", email: "ana@example.com", password: "irrelevant", addresses });
  t.mock.method(User, "findById", async () => user);
  t.mock.method(User.prototype, "save", async function save() {
    return this;
  });
  const token = jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET);
  return { user, cookie: `${COOKIE_NAME}=${token}` };
}

const send = (srv, method, path, cookie, json) => call(srv.base, `/api/addresses${path}`, { method, json, cookie });

test("addresses need a signed-in customer", async (t) => {
  const srv = await start();
  t.after(srv.close);
  assert.equal((await call(srv.base, "/api/addresses")).status, 401);
  assert.equal((await call(srv.base, "/api/addresses", { method: "POST", json: GOOD })).status, 401);
});

test("the first saved address becomes the default, the next one does not", async (t) => {
  const { cookie } = signInAs(t);
  const srv = await start();
  t.after(srv.close);

  const first = await send(srv, "POST", "", cookie, addr());
  assert.equal(first.status, 201);
  assert.equal(first.data.address.isDefault, true);
  assert.equal(first.data.address.city, "Lahore");

  const second = await send(srv, "POST", "", cookie, addr({ label: "Office", city: "Karachi" }));
  assert.equal(second.status, 201);
  assert.equal(second.data.address.isDefault, false);
  assert.equal(second.data.addresses.length, 2);
  assert.equal(second.data.addresses[0].label, "Home"); // default first
});

test("saving with isDefault moves the default flag", async (t) => {
  const { cookie } = signInAs(t);
  const srv = await start();
  t.after(srv.close);

  await send(srv, "POST", "", cookie, addr());
  const r = await send(srv, "POST", "", cookie, addr({ label: "Office", isDefault: true }));
  assert.equal(r.status, 201);
  assert.deepEqual(r.data.addresses.map((a) => [a.label, a.isDefault]), [["Office", true], ["Home", false]]);
});

test("input is trimmed and bad input is refused with a clear message", async (t) => {
  const { user, cookie } = signInAs(t);
  const srv = await start();
  t.after(srv.close);

  const ok = await send(srv, "POST", "", cookie, addr({ fullName: "  Ana Khan  ", city: " Lahore " }));
  assert.equal(ok.data.address.fullName, "Ana Khan");
  assert.equal(ok.data.address.city, "Lahore");

  for (const [body, pattern] of [
    [addr({ city: "" }), /City is required/],
    [addr({ line1: undefined }), /Address is required/],
    [addr({ fullName: "   " }), /Full name is required/],
    [addr({ phone: "abc" }), /valid phone/],
    [addr({ phone: 12345678 }), /Phone must be text/],
    [addr({ label: "x".repeat(31) }), /Label can be at most 30/],
    [addr({ isDefault: "yes" }), /isDefault/],
  ]) {
    const r = await send(srv, "POST", "", cookie, body);
    assert.equal(r.status, 400, JSON.stringify(body));
    assert.match(r.data.message, pattern);
  }
  assert.equal(user.addresses.length, 1); // none of the refused ones were saved
});

test(`at most ${MAX_ADDRESSES} addresses can be saved`, async (t) => {
  const { cookie } = signInAs(t, Array.from({ length: MAX_ADDRESSES }, (_, i) => addr({ label: `A${i}`, isDefault: i === 0 })));
  const srv = await start();
  t.after(srv.close);

  const r = await send(srv, "POST", "", cookie, addr());
  assert.equal(r.status, 409);
  assert.match(r.data.message, /up to 5/);
});

test("GET lists the default address first", async (t) => {
  const { cookie } = signInAs(t, [addr({ label: "Office" }), addr({ label: "Home", isDefault: true })]);
  const srv = await start();
  t.after(srv.close);

  const r = await send(srv, "GET", "", cookie);
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.addresses.map((a) => a.label), ["Home", "Office"]);
});

test("editing an address changes its fields; unknown and malformed ids are 404", async (t) => {
  const { user, cookie } = signInAs(t, [addr({ isDefault: true })]);
  const srv = await start();
  t.after(srv.close);
  const id = String(user.addresses[0]._id);

  const r = await send(srv, "PUT", `/${id}`, cookie, addr({ line1: "New street 9", postalCode: "" }));
  assert.equal(r.status, 200);
  assert.equal(r.data.address.line1, "New street 9");
  assert.equal(r.data.address.postalCode, "");
  assert.equal(r.data.address.isDefault, true); // unticking the default is ignored

  assert.equal((await send(srv, "PUT", `/${oid()}`, cookie, addr())).status, 404);
  assert.equal((await send(srv, "PUT", "/not-an-id", cookie, addr())).status, 404);
  assert.equal((await send(srv, "PUT", `/${id}`, cookie, addr({ city: "" }))).status, 400);
});

test("PATCH /:id/default makes that address the only default", async (t) => {
  const { user, cookie } = signInAs(t, [addr({ label: "Home", isDefault: true }), addr({ label: "Office" })]);
  const srv = await start();
  t.after(srv.close);

  const r = await send(srv, "PATCH", `/${user.addresses[1]._id}/default`, cookie);
  assert.equal(r.status, 200);
  assert.deepEqual(r.data.addresses.map((a) => [a.label, a.isDefault]), [["Office", true], ["Home", false]]);
  assert.equal((await send(srv, "PATCH", `/${oid()}/default`, cookie)).status, 404);
});

test("deleting the default hands the role to another address; deleting the last one leaves none", async (t) => {
  const { user, cookie } = signInAs(t, [addr({ label: "Home", isDefault: true }), addr({ label: "Office" })]);
  const srv = await start();
  t.after(srv.close);

  const home = String(user.addresses[0]._id);
  const first = await send(srv, "DELETE", `/${home}`, cookie);
  assert.equal(first.status, 200);
  assert.deepEqual(first.data.addresses.map((a) => [a.label, a.isDefault]), [["Office", true]]);

  assert.equal((await send(srv, "DELETE", `/${home}`, cookie)).status, 404); // already gone

  const last = await send(srv, "DELETE", `/${user.addresses[0]._id}`, cookie);
  assert.deepEqual(last.data.addresses, []);
});
