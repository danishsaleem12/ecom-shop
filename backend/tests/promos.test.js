const { test } = require("node:test");
const assert = require("node:assert/strict");
const { start, call, signIn, quietErrors, oid } = require("./helpers");
const Order = require("../models/Order");
const Product = require("../models/Product");
const PromoCode = require("../models/PromoCode");
const { computeDiscount, normalizePromoCode } = require("../utils/promo");

const day = 24 * 60 * 60 * 1000;
// A stored code as the database would hand it back
const code = (extra = {}) => ({
  _id: oid(), code: "SAVE10", type: "percent", value: 10, minSubtotal: 0, usedCount: 0, perUserLimit: 1, active: true, ...extra,
});
const validate = (srv, cookie, body) => call(srv.base, "/api/promos/validate", { method: "POST", json: body, cookie });

// ---- the rules (no server needed) ---------------------------------------------------------------------

test("promo: codes are typed any way and stored in capitals", () => {
  assert.equal(normalizePromoCode("  summer 10 "), "SUMMER10");
  assert.equal(normalizePromoCode(42), "");
});

test("promo: percent, fixed and free-shipping discounts; never more than the order", () => {
  assert.equal(computeDiscount({ type: "percent", value: 10 }, { subtotal: 2000, shipping: 350 }), 200);
  assert.equal(computeDiscount({ type: "percent", value: 50, maxDiscount: 300 }, { subtotal: 2000, shipping: 350 }), 300);
  assert.equal(computeDiscount({ type: "percent", value: 33.333 }, { subtotal: 1000, shipping: 0 }), 333.33);
  assert.equal(computeDiscount({ type: "fixed", value: 500 }, { subtotal: 2000, shipping: 350 }), 500);
  assert.equal(computeDiscount({ type: "fixed", value: 5000 }, { subtotal: 2000, shipping: 350 }), 2000); // items can't go below 0
  assert.equal(computeDiscount({ type: "shipping", value: 0 }, { subtotal: 2000, shipping: 350 }), 350);
  assert.equal(computeDiscount({ type: "shipping", value: 0 }, { subtotal: 20000, shipping: 0 }), 0);
});

// ---- POST /api/promos/validate ------------------------------------------------------------------------

test("validate: needs a signed-in user", async (t) => {
  const srv = await start();
  t.after(srv.close);
  assert.equal((await validate(srv, undefined, { code: "SAVE10", subtotal: 1000 })).status, 401);
});

test("validate: a good code answers with the discount (code typed in lower case)", async (t) => {
  const { cookie } = signIn(t.mock);
  const find = t.mock.method(PromoCode, "findOne", async () => code());
  t.mock.method(Order, "countDocuments", async () => 0);
  const srv = await start();
  t.after(srv.close);

  const r = await validate(srv, cookie, { code: " save10 ", subtotal: 2000 });
  assert.equal(r.status, 200);
  assert.deepEqual(r.data, { valid: true, code: "SAVE10", type: "percent", value: 10, discount: 200 });
  assert.deepEqual(find.mock.calls[0].arguments[0], { code: "SAVE10" });
});

test("validate: unknown and switched-off codes get the same answer", async (t) => {
  const { cookie } = signIn(t.mock);
  let found = null;
  t.mock.method(PromoCode, "findOne", async () => found);
  const srv = await start();
  t.after(srv.close);

  const missing = await validate(srv, cookie, { code: "NOPE", subtotal: 2000 });
  found = code({ active: false });
  const off = await validate(srv, cookie, { code: "SAVE10", subtotal: 2000 });
  assert.equal(missing.status, 400);
  assert.equal(missing.data.message, off.data.message);
  assert.equal(missing.data.valid, false);
});

test("validate: expired, not started, fully redeemed and below the minimum are all refused with a reason", async (t) => {
  const { cookie } = signIn(t.mock);
  let doc;
  t.mock.method(PromoCode, "findOne", async () => doc);
  t.mock.method(Order, "countDocuments", async () => 0);
  const srv = await start();
  t.after(srv.close);
  const ask = async (d) => ((doc = d), (await validate(srv, cookie, { code: "SAVE10", subtotal: 2000 })).data.message);

  assert.match(await ask(code({ expiresAt: new Date(Date.now() - day) })), /expired/);
  assert.match(await ask(code({ startsAt: new Date(Date.now() + day) })), /isn't active yet/);
  assert.match(await ask(code({ usageLimit: 5, usedCount: 5 })), /fully redeemed/);
  assert.match(await ask(code({ minSubtotal: 3000 })), /Spend Rs 3,000 or more/);
});

test("validate: a free-shipping code on an order that already ships free is refused", async (t) => {
  const { cookie } = signIn(t.mock);
  t.mock.method(PromoCode, "findOne", async () => code({ type: "shipping", value: 0 }));
  t.mock.method(Order, "countDocuments", async () => 0);
  const srv = await start();
  t.after(srv.close);
  const r = await validate(srv, cookie, { code: "SAVE10", subtotal: 20000 });
  assert.equal(r.status, 400);
  assert.match(r.data.message, /already ships free/);
});

test("validate: the per-customer limit counts that customer's not-cancelled orders", async (t) => {
  const { user, cookie } = signIn(t.mock);
  t.mock.method(PromoCode, "findOne", async () => code({ perUserLimit: 1 }));
  const count = t.mock.method(Order, "countDocuments", async () => 1);
  const srv = await start();
  t.after(srv.close);

  const r = await validate(srv, cookie, { code: "SAVE10", subtotal: 2000 });
  assert.equal(r.status, 400);
  assert.match(r.data.message, /already used/);
  const filter = count.mock.calls[0].arguments[0];
  assert.equal(String(filter.user), String(user._id));
  assert.equal(filter["promo.code"], "SAVE10");
  assert.deepEqual(filter.status, { $ne: "cancelled" });
});

test("validate: a missing code or subtotal -> 400 without a database lookup", async (t) => {
  const { cookie } = signIn(t.mock);
  const find = t.mock.method(PromoCode, "findOne", async () => null);
  const srv = await start();
  t.after(srv.close);
  assert.equal((await validate(srv, cookie, { subtotal: 1000 })).status, 400);
  assert.equal((await validate(srv, cookie, { code: "SAVE10" })).status, 400);
  assert.equal((await validate(srv, cookie, { code: "SAVE10", subtotal: "1000" })).status, 400);
  assert.equal(find.mock.callCount(), 0);
});

test("validate: wrong codes are rate limited (20 per 15 minutes)", async (t) => {
  const { cookie } = signIn(t.mock);
  t.mock.method(PromoCode, "findOne", async () => null);
  const srv = await start();
  t.after(srv.close);
  let last;
  for (let i = 0; i < 21; i++) last = await validate(srv, cookie, { code: `GUESS${i}`, subtotal: 1000 });
  assert.equal(last.status, 429);
});

// ---- checkout with a code -----------------------------------------------------------------------------

const address = { fullName: "A B", line1: "1 Road", city: "Lahore", phone: "0300" };
const place = (srv, cookie, body) => call(srv.base, "/api/orders", { method: "POST", json: body, cookie });
const dress = (price = 1000, stock = 5) => ({ _id: oid(), name: "Dress", price, stock, image: "/uploads/d.png" });

// Records every Product / PromoCode updateOne; `redeem` is the modifiedCount the promo update reports
function trackUpdates(t, { redeem = 1 } = {}) {
  const stock = [];
  const promo = [];
  t.mock.method(Product, "updateOne", async (filter, update) => (stock.push([filter, update]), { modifiedCount: 1 }));
  t.mock.method(PromoCode, "updateOne", async (filter, update) => (promo.push([filter, update]), { modifiedCount: update.$inc.usedCount === 1 ? redeem : 1 }));
  return { stock, promo };
}

test("checkout: a percent code is applied from the database, counted, and saved on the order", async (t) => {
  const { cookie } = signIn(t.mock);
  const p = dress(1000);
  const promo = code({ usageLimit: 10 });
  t.mock.method(Product, "find", async () => [p]);
  t.mock.method(PromoCode, "findOne", async () => promo);
  t.mock.method(Order, "countDocuments", async () => 0);
  const { stock, promo: promoCalls } = trackUpdates(t);
  const create = t.mock.method(Order, "create", async (doc) => ({ _id: oid(), ...doc }));
  const srv = await start();
  t.after(srv.close);

  // 1000 + 350 shipping - 100 (10%) = 1250
  const r = await place(srv, cookie, { items: [{ product: String(p._id), qty: 1 }], total: 1250, promoCode: "save10", shippingAddress: address });
  assert.equal(r.status, 201);
  const saved = create.mock.calls[0].arguments[0];
  assert.equal(saved.total, 1250);
  assert.equal(saved.discount, 100);
  assert.equal(saved.promo.code, "SAVE10");
  assert.equal(String(saved.promo.id), String(promo._id));
  assert.equal(stock.length, 1);
  // one use counted, only while below the limit
  assert.deepEqual(promoCalls[0][1], { $inc: { usedCount: 1 } });
  assert.deepEqual(promoCalls[0][0].usedCount, { $lt: 10 });
});

test("checkout: ignoring the discount in the total -> 409 price mismatch and nothing is taken", async (t) => {
  const { cookie } = signIn(t.mock);
  const p = dress(1000);
  t.mock.method(Product, "find", async () => [p]);
  t.mock.method(PromoCode, "findOne", async () => code());
  t.mock.method(Order, "countDocuments", async () => 0);
  const { stock, promo } = trackUpdates(t);
  const srv = await start();
  t.after(srv.close);

  const r = await place(srv, cookie, { items: [{ product: String(p._id), qty: 1 }], total: 1350, promoCode: "SAVE10", shippingAddress: address });
  assert.equal(r.status, 409);
  assert.equal(stock.length + promo.length, 0);
});

test("checkout: a code that is no longer valid -> 409 PROMO_INVALID, no stock taken, no use counted", async (t) => {
  const { cookie } = signIn(t.mock);
  const p = dress(1000);
  t.mock.method(Product, "find", async () => [p]);
  t.mock.method(PromoCode, "findOne", async () => code({ expiresAt: new Date(Date.now() - day) }));
  const { stock, promo } = trackUpdates(t);
  const create = t.mock.method(Order, "create", async () => ({}));
  const srv = await start();
  t.after(srv.close);

  const r = await place(srv, cookie, { items: [{ product: String(p._id), qty: 1 }], total: 1250, promoCode: "SAVE10", shippingAddress: address });
  assert.equal(r.status, 409);
  assert.equal(r.data.code, "PROMO_INVALID");
  assert.match(r.data.message, /expired/);
  assert.equal(stock.length + promo.length + create.mock.callCount(), 0);
});

test("checkout: if the last use is taken by someone else mid-checkout, stock goes back and the order is refused", async (t) => {
  const { cookie } = signIn(t.mock);
  const p = dress(1000);
  t.mock.method(Product, "find", async () => [p]);
  t.mock.method(PromoCode, "findOne", async () => code({ usageLimit: 1 }));
  t.mock.method(Order, "countDocuments", async () => 0);
  const { stock } = trackUpdates(t, { redeem: 0 });
  const create = t.mock.method(Order, "create", async () => ({}));
  const srv = await start();
  t.after(srv.close);

  const r = await place(srv, cookie, { items: [{ product: String(p._id), qty: 1 }], total: 1250, promoCode: "SAVE10", shippingAddress: address });
  assert.equal(r.status, 409);
  assert.equal(r.data.code, "PROMO_INVALID");
  assert.equal(create.mock.callCount(), 0);
  assert.deepEqual(stock[1][1], { $inc: { stock: 1 } }); // the unit that was taken is returned
});

test("checkout: if saving the order fails after the use was counted, the use is given back", async (t) => {
  quietErrors(t.mock);
  const { cookie } = signIn(t.mock);
  const p = dress(1000);
  t.mock.method(Product, "find", async () => [p]);
  t.mock.method(PromoCode, "findOne", async () => code());
  t.mock.method(Order, "countDocuments", async () => 0);
  const { promo } = trackUpdates(t);
  t.mock.method(Order, "create", async () => {
    throw new Error("db down");
  });
  const srv = await start();
  t.after(srv.close);

  const r = await place(srv, cookie, { items: [{ product: String(p._id), qty: 1 }], total: 1250, promoCode: "SAVE10", shippingAddress: address });
  assert.equal(r.status, 500);
  assert.deepEqual(promo.map(([, u]) => u.$inc.usedCount), [1, -1]);
});

test("checkout: a free-shipping code waives the fee; no code means nothing changes", async (t) => {
  const { cookie } = signIn(t.mock);
  const p = dress(1000);
  t.mock.method(Product, "find", async () => [p]);
  t.mock.method(PromoCode, "findOne", async () => code({ type: "shipping", value: 0 }));
  t.mock.method(Order, "countDocuments", async () => 0);
  trackUpdates(t);
  const create = t.mock.method(Order, "create", async (doc) => ({ _id: oid(), ...doc }));
  const srv = await start();
  t.after(srv.close);

  const free = await place(srv, cookie, { items: [{ product: String(p._id), qty: 1 }], total: 1000, promoCode: "SAVE10", shippingAddress: address });
  assert.equal(free.status, 201);
  assert.equal(create.mock.calls[0].arguments[0].discount, 350);

  const plain = await place(srv, cookie, { items: [{ product: String(p._id), qty: 1 }], total: 1350, shippingAddress: address });
  assert.equal(plain.status, 201);
  assert.equal(create.mock.calls[1].arguments[0].discount, undefined);
  assert.equal(create.mock.calls[1].arguments[0].promo, undefined);
});

// ---- cancel gives the use back ------------------------------------------------------------------------

test("cancel: an order that used a code gives the use back", async (t) => {
  const { cookie } = signIn(t.mock);
  const promoId = oid();
  const order = { _id: oid(), status: "pending", items: [{ product: oid(), qty: 1 }], promo: { id: promoId, code: "SAVE10" } };
  t.mock.method(Order, "findOneAndUpdate", async () => order);
  t.mock.method(Product, "updateOne", async () => ({ modifiedCount: 1 }));
  const release = t.mock.method(PromoCode, "updateOne", async () => ({ modifiedCount: 1 }));
  const srv = await start();
  t.after(srv.close);

  const r = await call(srv.base, `/api/orders/${order._id}/cancel`, { method: "POST", cookie });
  assert.equal(r.status, 200);
  const [filter, update] = release.mock.calls[0].arguments;
  assert.equal(String(filter._id), String(promoId));
  assert.deepEqual(update, { $inc: { usedCount: -1 } });
});

// ---- admin ---------------------------------------------------------------------------------------------

const admin = (srv, cookie, method, path, json) => call(srv.base, `/api/promos${path}`, { method, cookie, json });

test("admin promos: customers get 403, signed-out visitors 401", async (t) => {
  const { cookie } = signIn(t.mock);
  const srv = await start();
  t.after(srv.close);
  assert.equal((await admin(srv, cookie, "GET", "")).status, 403);
  assert.equal((await admin(srv, cookie, "POST", "", { code: "X1X", type: "fixed", value: 5 })).status, 403);
  assert.equal((await admin(srv, undefined, "GET", "")).status, 401);
});

test("admin promos: list is paged and searchable", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  let seen;
  t.mock.method(PromoCode, "countDocuments", async (f) => ((seen = f), 1));
  t.mock.method(PromoCode, "find", () => {
    const q = { sort: () => q, skip: () => q, limit: () => q, then: (res) => res([code()]) };
    return q;
  });
  const srv = await start();
  t.after(srv.close);

  const r = await admin(srv, cookie, "GET", "?search=sav&page=1&limit=10");
  assert.equal(r.status, 200);
  assert.equal(r.data.total, 1);
  assert.equal(r.data.promos.length, 1);
  assert.ok(seen.$or[0].code instanceof RegExp);
});

test("admin promos: create stores the code in capitals with clean types", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  const create = t.mock.method(PromoCode, "create", async (doc) => ({ _id: oid(), ...doc }));
  const srv = await start();
  t.after(srv.close);

  const r = await admin(srv, cookie, "POST", "", {
    code: " welcome 15 ".replace(" ", ""), type: "percent", value: "15", minSubtotal: "3000", maxDiscount: "1000",
    usageLimit: "", perUserLimit: 1, startsAt: "2026-11-01T00:00:00.000Z", expiresAt: "2026-11-30T23:59:59.000Z", active: true, description: "  Black Friday ",
  });
  assert.equal(r.status, 201);
  const doc = create.mock.calls[0].arguments[0];
  assert.equal(doc.code, "WELCOME15");
  assert.equal(doc.value, 15);
  assert.equal(doc.minSubtotal, 3000);
  assert.equal(doc.maxDiscount, 1000);
  assert.equal(doc.usageLimit, undefined);
  assert.equal(doc.description, "Black Friday");
  assert.ok(doc.expiresAt instanceof Date);
});

test("admin promos: uses per customer defaults to 1 when not sent, and \"\" means unlimited", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  const create = t.mock.method(PromoCode, "create", async (doc) => ({ _id: oid(), ...doc }));
  const srv = await start();
  t.after(srv.close);

  await admin(srv, cookie, "POST", "", { code: "ONCE10", type: "fixed", value: 100 });
  await admin(srv, cookie, "POST", "", { code: "MANY10", type: "fixed", value: 100, perUserLimit: "" });
  assert.equal(create.mock.calls[0].arguments[0].perUserLimit, 1);
  assert.equal(create.mock.calls[1].arguments[0].perUserLimit, undefined);
  // a code loaded without the field stays unlimited (no schema default fills it in)
  assert.equal(new PromoCode({ code: "MANY10", type: "fixed", value: 100 }).perUserLimit, undefined);
});

test("admin promos: create refuses a bad code, an unknown type and non-numbers", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  const create = t.mock.method(PromoCode, "create", async () => ({}));
  const srv = await start();
  t.after(srv.close);

  assert.equal((await admin(srv, cookie, "POST", "", { code: "no", type: "fixed", value: 5 })).status, 400);
  assert.equal((await admin(srv, cookie, "POST", "", { code: "has space!", type: "fixed", value: 5 })).status, 400);
  assert.equal((await admin(srv, cookie, "POST", "", { code: "OK10", type: "bogus", value: 5 })).status, 400);
  assert.equal((await admin(srv, cookie, "POST", "", { code: "OK10", value: 5 })).status, 400);
  assert.equal((await admin(srv, cookie, "POST", "", { code: "OK10", type: "fixed", value: "abc" })).status, 400);
  assert.equal((await admin(srv, cookie, "POST", "", { code: "OK10", type: "fixed", value: 5, usageLimit: 2.5 })).status, 400);
  assert.equal(create.mock.callCount(), 0);
});

test("admin promos: the model refuses 150% and an end date before the start date", async () => {
  // validate() (what save() runs) also runs the cross-field rules; it resolves when fine and rejects with the field errors
  const errorsOf = (f) => new PromoCode({ code: "TEST10", ...f }).validate().then(() => ({}), (e) => e.errors);
  assert.ok((await errorsOf({ type: "percent", value: 150 })).value);
  assert.ok((await errorsOf({ type: "percent", value: 0 })).value);
  assert.ok((await errorsOf({ type: "fixed", value: 0 })).value);
  assert.ok((await errorsOf({ type: "fixed", value: 5, startsAt: new Date("2026-12-02"), expiresAt: new Date("2026-12-01") })).expiresAt);
  assert.deepEqual(await errorsOf({ type: "shipping" }), {});
  assert.deepEqual(await errorsOf({ type: "percent", value: 100 }), {});
});

test("admin promos: a duplicate code -> 409", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  t.mock.method(PromoCode, "create", async () => {
    throw Object.assign(new Error("E11000"), { code: 11000 });
  });
  const srv = await start();
  t.after(srv.close);
  const r = await admin(srv, cookie, "POST", "", { code: "DUPE10", type: "fixed", value: 100 });
  assert.equal(r.status, 409);
  assert.match(r.data.message, /already exists/);
});

test("admin promos: edit changes only what was sent and can clear a limit; the code can't be renamed", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  const doc = new PromoCode({ code: "KEEP10", type: "percent", value: 10, usageLimit: 5 });
  t.mock.method(PromoCode, "findById", async () => doc);
  const save = t.mock.method(doc, "save", async () => doc);
  const srv = await start();
  t.after(srv.close);

  const r = await admin(srv, cookie, "PATCH", `/${doc._id}`, { code: "RENAMED", active: false, usageLimit: "" });
  assert.equal(r.status, 200);
  assert.equal(save.mock.callCount(), 1);
  assert.equal(doc.code, "KEEP10");
  assert.equal(doc.active, false);
  assert.equal(doc.usageLimit, undefined);
  assert.equal(doc.value, 10);
});

test("admin promos: edit / delete an unknown or malformed id -> 404", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  t.mock.method(PromoCode, "findById", async () => null);
  t.mock.method(PromoCode, "findByIdAndDelete", async () => null);
  const srv = await start();
  t.after(srv.close);
  assert.equal((await admin(srv, cookie, "PATCH", `/${oid()}`, { active: false })).status, 404);
  assert.equal((await admin(srv, cookie, "PATCH", "/not-an-id", { active: false })).status, 404);
  assert.equal((await admin(srv, cookie, "DELETE", `/${oid()}`)).status, 404);
});

test("admin promos: delete", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  t.mock.method(PromoCode, "findByIdAndDelete", async () => code());
  const srv = await start();
  t.after(srv.close);
  assert.equal((await admin(srv, cookie, "DELETE", `/${oid()}`)).status, 200);
});
