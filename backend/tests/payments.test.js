// Online payment (PayFast): the payment form, the webhook, paying again, expiring unpaid orders.
// No database and no network: model methods and fetch are mocked like in the other test files.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { start, call, signIn, quietErrors, oid } = require("./helpers");
const Order = require("../models/Order");
const Product = require("../models/Product");
const payfast = require("../utils/payfast");
const { expireUnpaidOrders } = require("../utils/expireUnpaidOrders");

const ENV = {
  PAYFAST_MERCHANT_ID: "10001",
  PAYFAST_SECURED_KEY: "s3cret-key",
  PAYFAST_ENV: "sandbox",
  BACKEND_URL: "https://api.example.com",
  FRONTEND_URL: "https://shop.example.com",
};

const ENV_KEYS = [...Object.keys(ENV), "PAYFAST_STORE_ID", "PAYFAST_BASE_URL", "PAYFAST_MERCHANT_NAME"];
const savedEnv = new WeakMap(); // test context -> the environment as it was before the test touched it

/** Sets the PayFast environment for one test (may be called again in the same test) and restores the old values afterwards. */
function withPayfast(t, extra = {}) {
  if (!savedEnv.has(t)) {
    const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
    savedEnv.set(t, saved);
    t.after(() => ENV_KEYS.forEach((k) => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k]))));
  }
  for (const k of ENV_KEYS) delete process.env[k];
  Object.assign(process.env, { ...ENV, ...extra });
}

const withoutPayfast = (t) => withPayfast(t, { PAYFAST_MERCHANT_ID: "", PAYFAST_SECURED_KEY: "", BACKEND_URL: "" });

const realFetch = globalThis.fetch;

/** Pretends to be PayFast's token endpoint. */
function fakeTokenServer(t, { ok = true } = {}) {
  return t.mock.method(globalThis, "fetch", async (url, opts) => {
    if (String(url).includes("/GetAccessToken")) {
      return ok
        ? { ok: true, status: 200, json: async () => ({ ACCESS_TOKEN: "tok-123" }) }
        : { ok: false, status: 500, json: async () => ({}) };
    }
    return realFetch(url, opts); // anything else (the test's own calls to the app) goes through
  });
}

const address = { fullName: "Ana", line1: "12 Main St", city: "Lahore", phone: "03001234567" };
const cardOrder = (extra = {}) => ({
  _id: oid(),
  orderNumber: "K7QM-4TXD",
  user: undefined,
  items: [],
  total: 1350,
  status: "pending",
  paymentMethod: "card",
  paymentStatus: "unpaid",
  shippingAddress: address,
  ...extra,
});

const ipn = (srv, params) =>
  call(srv.base, "/api/payments/payfast/ipn", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });

const signed = (basketId, errCode, extra = {}) => ({
  basket_id: basketId,
  err_code: errCode,
  err_msg: errCode === "000" ? "Processed OK" : "Declined",
  transaction_id: "TX-1",
  transaction_amount: "1350.00",
  validation_hash: payfast.validationHash({ basketId, errCode }),
  ...extra,
});

// ---- utils/payfast.js ---------------------------------------------------------------------------

test("payfast: configured only when merchant id, secret key and backend address are all set", (t) => {
  withPayfast(t);
  assert.equal(payfast.isConfigured(), true);
  withoutPayfast(t);
  assert.equal(payfast.isConfigured(), false);
});

test("payfast: environment picks the sandbox or live address, and the base url can be overridden", (t) => {
  withPayfast(t);
  assert.match(payfast.config().host, /ipguat/);
  withPayfast(t, { PAYFAST_ENV: "live" });
  assert.match(payfast.config().host, /ipg1/);
  withPayfast(t, { PAYFAST_BASE_URL: "https://pay.test/" });
  assert.equal(payfast.config().host, "https://pay.test");
});

test("payfast: basket ids carry the order number and the attempt", () => {
  assert.equal(payfast.basketIdFor({ orderNumber: "K7QM-4TXD" }, 2), "K7QM-4TXD-2");
  assert.equal(payfast.orderNumberFromBasket("K7QM-4TXD-2"), "K7QM-4TXD");
  assert.equal(payfast.orderNumberFromBasket("K7QM-4TXD"), "");
  assert.equal(payfast.orderNumberFromBasket("nonsense"), "");
  assert.equal(payfast.orderNumberFromBasket(undefined), "");
});

test("payfast: getAccessToken posts the merchant details and returns the token", async (t) => {
  withPayfast(t);
  const f = t.mock.method(globalThis, "fetch", async () => ({ ok: true, status: 200, json: async () => ({ ACCESS_TOKEN: "abc" }) }));
  assert.equal(await payfast.getAccessToken({ basketId: "K7QM-4TXD-1", amount: 1350 }), "abc");
  const [url, opts] = f.mock.calls[0].arguments;
  assert.equal(url, "https://ipguat.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken");
  const sent = new URLSearchParams(String(opts.body));
  assert.equal(sent.get("MERCHANT_ID"), "10001");
  assert.equal(sent.get("SECURED_KEY"), "s3cret-key");
  assert.equal(sent.get("BASKET_ID"), "K7QM-4TXD-1");
  assert.equal(sent.get("TXNAMT"), "1350.00");
  assert.equal(sent.get("CURRENCY_CODE"), "PKR");
});

test("payfast: getAccessToken throws when PayFast refuses", async (t) => {
  withPayfast(t);
  t.mock.method(globalThis, "fetch", async () => ({ ok: false, status: 401, json: async () => ({}) }));
  await assert.rejects(() => payfast.getAccessToken({ basketId: "K7QM-4TXD-1", amount: 10 }), /refused/);
});

test("payfast: the payment form has the amount, the webhook address and the return pages, and never the secret key", (t) => {
  withPayfast(t);
  const order = cardOrder({ shippingAddress: { ...address, email: "ana@example.com" } });
  const p = payfast.buildPayment({ order, basketId: "K7QM-4TXD-1", token: "tok" });
  assert.equal(p.gateway, "payfast");
  assert.equal(p.method, "POST");
  assert.equal(p.url, "https://ipguat.apps.net.pk/Ecommerce/api/Transaction/PostTransaction");
  assert.equal(p.fields.TXNAMT, "1350.00");
  assert.equal(p.fields.TOKEN, "tok");
  assert.equal(p.fields.BASKET_ID, "K7QM-4TXD-1");
  assert.equal(p.fields.CHECKOUT_URL, "https://api.example.com/api/payments/payfast/ipn");
  assert.equal(p.fields.SUCCESS_URL, `https://shop.example.com/order-success/${order._id}`);
  assert.equal(p.fields.FAILURE_URL, `https://shop.example.com/order-success/${order._id}?payment=failed`);
  assert.equal(p.fields.CUSTOMER_EMAIL_ADDRESS, "ana@example.com");
  assert.ok(!JSON.stringify(p).includes("s3cret-key"));
});

test("payfast: verifyCallback accepts a correct hash and reads the verdict", (t) => {
  withPayfast(t);
  const ok = payfast.verifyCallback(signed("K7QM-4TXD-1", "000"));
  assert.deepEqual(ok, { ok: true, paid: true, basketId: "K7QM-4TXD-1", transactionId: "TX-1", amount: 1350, message: "Processed OK" });
  const declined = payfast.verifyCallback(signed("K7QM-4TXD-1", "106"));
  assert.equal(declined.ok, true);
  assert.equal(declined.paid, false);
});

test("payfast: verifyCallback rejects a wrong, missing or tampered hash", (t) => {
  withPayfast(t);
  assert.equal(payfast.verifyCallback({ ...signed("K7QM-4TXD-1", "000"), validation_hash: "deadbeef" }).ok, false);
  assert.equal(payfast.verifyCallback({ ...signed("K7QM-4TXD-1", "000"), validation_hash: undefined }).ok, false);
  // a failed payment's hash can't be reused to claim success
  const failedHash = signed("K7QM-4TXD-1", "106").validation_hash;
  assert.equal(payfast.verifyCallback({ ...signed("K7QM-4TXD-1", "000"), validation_hash: failedHash }).ok, false);
  // another order's hash can't be reused either
  assert.equal(payfast.verifyCallback({ ...signed("K7QM-4TXD-1", "000"), basket_id: "AAAA-BBBB-1" }).ok, false);
  assert.equal(payfast.verifyCallback({}).ok, false);
});

// ---- checkout with a card ---------------------------------------------------------------------

const dress = (price) => ({ _id: oid(), name: "Dress", price, image: "/x.jpg", stock: 5, variants: [] });
const place = (srv, cookie, body) => call(srv.base, "/api/orders", { method: "POST", cookie, json: body });

function checkoutMocks(t) {
  const p = dress(1000);
  t.mock.method(Product, "find", async () => [p]);
  const stock = t.mock.method(Product, "updateOne", async () => ({ modifiedCount: 1 }));
  return { p, stock };
}

test("checkout: an unknown payment method is refused (400)", async (t) => {
  const { cookie } = signIn(t.mock);
  const srv = await start();
  t.after(srv.close);
  const r = await place(srv, cookie, { items: [{ product: String(oid()), qty: 1 }], total: 1, shippingAddress: address, paymentMethod: "bitcoin" });
  assert.equal(r.status, 400);
});

test("checkout: card while PayFast is not configured -> 503 and nothing is reserved", async (t) => {
  withoutPayfast(t);
  const { cookie } = signIn(t.mock);
  const { p, stock } = checkoutMocks(t);
  const create = t.mock.method(Order, "create", async (doc) => ({ _id: oid(), ...doc }));
  const srv = await start();
  t.after(srv.close);
  const r = await place(srv, cookie, { items: [{ product: String(p._id), qty: 1 }], total: 1350, shippingAddress: address, paymentMethod: "card" });
  assert.equal(r.status, 503);
  assert.equal(create.mock.callCount(), 0);
  assert.equal(stock.mock.callCount(), 0);
});

test("checkout: card order is saved unpaid and the answer carries the PayFast form", async (t) => {
  withPayfast(t);
  const { user, cookie } = signIn(t.mock);
  const { p } = checkoutMocks(t);
  const create = t.mock.method(Order, "create", async (doc) => ({ _id: oid(), orderNumber: "K7QM-4TXD", ...doc }));
  t.mock.method(Order, "findOneAndUpdate", async () => ({ ...cardOrder({ user: user._id }), payment: { attempts: 1 } }));
  const setBasket = t.mock.method(Order, "updateOne", async () => ({ modifiedCount: 1 }));
  fakeTokenServer(t);
  const srv = await start();
  t.after(srv.close);

  const r = await place(srv, cookie, { items: [{ product: String(p._id), qty: 1 }], total: 1350, shippingAddress: address, paymentMethod: "card" });
  assert.equal(r.status, 201);
  const saved = create.mock.calls[0].arguments[0];
  assert.equal(saved.paymentMethod, "card");
  assert.equal(saved.paymentStatus, "unpaid");
  assert.equal(r.data.payment.gateway, "payfast");
  assert.equal(r.data.payment.fields.BASKET_ID, "K7QM-4TXD-1");
  assert.equal(r.data.payment.fields.TOKEN, "tok-123");
  assert.equal(r.data.payment.fields.TXNAMT, "1350.00");
  assert.deepEqual(setBasket.mock.calls[0].arguments[1], { $set: { "payment.basketId": "K7QM-4TXD-1" } });
});

test("checkout: if PayFast can't be reached the order is still saved, with a message instead of a form", async (t) => {
  quietErrors(t.mock);
  withPayfast(t);
  const { user, cookie } = signIn(t.mock);
  const { p } = checkoutMocks(t);
  t.mock.method(Order, "create", async (doc) => ({ _id: oid(), orderNumber: "K7QM-4TXD", ...doc }));
  t.mock.method(Order, "findOneAndUpdate", async () => ({ ...cardOrder({ user: user._id }), payment: { attempts: 1 } }));
  fakeTokenServer(t, { ok: false });
  const srv = await start();
  t.after(srv.close);

  const r = await place(srv, cookie, { items: [{ product: String(p._id), qty: 1 }], total: 1350, shippingAddress: address, paymentMethod: "card" });
  assert.equal(r.status, 201);
  assert.equal(r.data.payment, undefined);
  assert.match(r.data.paymentError, /pay from your orders page/);
});

test("checkout: cash on delivery is unchanged (no payment form)", async (t) => {
  withPayfast(t);
  const { cookie } = signIn(t.mock);
  const { p } = checkoutMocks(t);
  const create = t.mock.method(Order, "create", async (doc) => ({ _id: oid(), ...doc }));
  const srv = await start();
  t.after(srv.close);
  const r = await place(srv, cookie, { items: [{ product: String(p._id), qty: 1 }], total: 1350, shippingAddress: address });
  assert.equal(r.status, 201);
  assert.equal(create.mock.calls[0].arguments[0].paymentMethod, "cod");
  assert.equal(r.data.payment, undefined);
});

// ---- POST /api/orders/:id/pay -------------------------------------------------------------------

const pay = (srv, id, cookie) => call(srv.base, `/api/orders/${id}/pay`, { method: "POST", cookie });

test("pay: needs a signed-in user", async (t) => {
  const srv = await start();
  t.after(srv.close);
  assert.equal((await pay(srv, oid())).status, 401);
});

test("pay: gives a fresh PayFast form for the owner's unpaid card order", async (t) => {
  withPayfast(t);
  const { user, cookie } = signIn(t.mock);
  const order = cardOrder({ user: user._id });
  const find = t.mock.method(Order, "findOne", async () => order);
  const update = t.mock.method(Order, "findOneAndUpdate", async () => ({ ...order, payment: { attempts: 2 } }));
  t.mock.method(Order, "updateOne", async () => ({ modifiedCount: 1 }));
  fakeTokenServer(t);
  const srv = await start();
  t.after(srv.close);

  const r = await pay(srv, order._id, cookie);
  assert.equal(r.status, 200);
  assert.equal(r.data.payment.fields.BASKET_ID, "K7QM-4TXD-2"); // a new id for the second attempt
  assert.equal(String(find.mock.calls[0].arguments[0].user), String(user._id)); // only the owner's order
  const [filter, change] = update.mock.calls[0].arguments;
  assert.deepEqual(filter.paymentStatus, { $in: ["unpaid", "failed"] });
  assert.deepEqual(filter.status, { $ne: "cancelled" });
  assert.deepEqual(change.$inc, { "payment.attempts": 1 });
});

test("pay: someone else's or unknown order -> 404", async (t) => {
  withPayfast(t);
  const { cookie } = signIn(t.mock);
  t.mock.method(Order, "findOne", async () => null);
  const srv = await start();
  t.after(srv.close);
  assert.equal((await pay(srv, oid(), cookie)).status, 404);
  assert.equal((await pay(srv, "not-an-id", cookie)).status, 404);
});

test("pay: refused for cash on delivery, paid, and cancelled orders (409)", async (t) => {
  withPayfast(t);
  const { user, cookie } = signIn(t.mock);
  let order;
  t.mock.method(Order, "findOne", async () => order);
  const srv = await start();
  t.after(srv.close);

  order = cardOrder({ user: user._id, paymentMethod: "cod" });
  assert.equal((await pay(srv, order._id, cookie)).status, 409);
  order = cardOrder({ user: user._id, paymentStatus: "paid" });
  const paid = await pay(srv, order._id, cookie);
  assert.equal(paid.status, 409);
  assert.match(paid.data.message, /already been paid/);
  order = cardOrder({ user: user._id, status: "cancelled" });
  assert.equal((await pay(srv, order._id, cookie)).status, 409);
});

test("pay: PayFast down -> 502 with a friendly message; not configured -> 503", async (t) => {
  quietErrors(t.mock);
  withPayfast(t);
  const { user, cookie } = signIn(t.mock);
  const order = cardOrder({ user: user._id });
  t.mock.method(Order, "findOne", async () => order);
  t.mock.method(Order, "findOneAndUpdate", async () => ({ ...order, payment: { attempts: 1 } }));
  fakeTokenServer(t, { ok: false });
  const srv = await start();
  t.after(srv.close);
  assert.equal((await pay(srv, order._id, cookie)).status, 502);

  withoutPayfast(t);
  assert.equal((await pay(srv, order._id, cookie)).status, 503);
});

// ---- the webhook ----------------------------------------------------------------------------------

test("webhook: a wrong hash is refused and changes nothing", async (t) => {
  withPayfast(t);
  const find = t.mock.method(Order, "findOne", async () => cardOrder());
  const update = t.mock.method(Order, "findOneAndUpdate", async () => cardOrder());
  const srv = await start();
  t.after(srv.close);
  const r = await ipn(srv, { ...signed("K7QM-4TXD-1", "000"), validation_hash: "forged" });
  assert.equal(r.status, 400);
  assert.equal(find.mock.callCount(), 0);
  assert.equal(update.mock.callCount(), 0);
});

test("webhook: a successful payment marks the order paid, once, and keeps the PayFast reference", async (t) => {
  withPayfast(t);
  const order = cardOrder();
  const find = t.mock.method(Order, "findOne", async () => order);
  const update = t.mock.method(Order, "findOneAndUpdate", async () => ({ ...order, paymentStatus: "paid" }));
  const srv = await start();
  t.after(srv.close);

  const r = await ipn(srv, signed("K7QM-4TXD-1", "000"));
  assert.equal(r.status, 200);
  assert.deepEqual(find.mock.calls[0].arguments[0], { orderNumber: "K7QM-4TXD", paymentMethod: "card" });
  const [filter, change] = update.mock.calls[0].arguments;
  assert.deepEqual(filter.paymentStatus, { $in: ["unpaid", "failed"] }); // an already paid order never matches again
  assert.equal(change.$set.paymentStatus, "paid");
  assert.equal(change.$set["payment.transactionId"], "TX-1");
  assert.ok(change.$set["payment.paidAt"] instanceof Date);
});

test("webhook: also works when PayFast sends the result as query parameters (GET)", async (t) => {
  withPayfast(t);
  const order = cardOrder();
  t.mock.method(Order, "findOne", async () => order);
  const update = t.mock.method(Order, "findOneAndUpdate", async () => ({ ...order, paymentStatus: "paid" }));
  const srv = await start();
  t.after(srv.close);
  const r = await call(srv.base, `/api/payments/payfast/ipn?${new URLSearchParams(signed("K7QM-4TXD-1", "000"))}`);
  assert.equal(r.status, 200);
  assert.equal(update.mock.callCount(), 1);
});

test("webhook: the same notification twice is harmless (200, no second payment recorded)", async (t) => {
  withPayfast(t);
  t.mock.method(Order, "findOne", async () => cardOrder({ paymentStatus: "paid", payment: { transactionId: "TX-1" } }));
  t.mock.method(Order, "findOneAndUpdate", async () => null); // already paid: the atomic update matches nothing
  const srv = await start();
  t.after(srv.close);
  assert.equal((await ipn(srv, signed("K7QM-4TXD-1", "000"))).status, 200);
});

test("webhook: a payment for the wrong amount is refused and the order stays unpaid", async (t) => {
  quietErrors(t.mock);
  withPayfast(t);
  t.mock.method(Order, "findOne", async () => cardOrder({ total: 1350 }));
  const update = t.mock.method(Order, "findOneAndUpdate", async () => cardOrder());
  const srv = await start();
  t.after(srv.close);
  assert.equal((await ipn(srv, signed("K7QM-4TXD-1", "000", { transaction_amount: "10.00" }))).status, 400);
  assert.equal((await ipn(srv, signed("K7QM-4TXD-1", "000", { transaction_amount: "" }))).status, 400);
  assert.equal(update.mock.callCount(), 0);
});

test("webhook: a declined payment marks the order failed, but never undoes a paid one", async (t) => {
  withPayfast(t);
  t.mock.method(Order, "findOne", async () => cardOrder());
  const update = t.mock.method(Order, "updateOne", async () => ({ modifiedCount: 1 }));
  const srv = await start();
  t.after(srv.close);
  const r = await ipn(srv, signed("K7QM-4TXD-1", "106"));
  assert.equal(r.status, 200);
  const [filter, change] = update.mock.calls[0].arguments;
  assert.deepEqual(filter.paymentStatus, { $in: ["unpaid", "failed"] });
  assert.equal(change.$set.paymentStatus, "failed");
  assert.equal(change.$set["payment.failureMessage"], "Declined");
});

test("webhook: unknown order -> 404", async (t) => {
  withPayfast(t);
  t.mock.method(Order, "findOne", async () => null);
  const srv = await start();
  t.after(srv.close);
  assert.equal((await ipn(srv, signed("K7QM-4TXD-1", "000"))).status, 404);
  assert.equal((await ipn(srv, signed("whatever", "000"))).status, 404); // not one of our basket ids
});

test("webhook: a payment that arrives for an already cancelled order is still recorded (the store refunds it)", async (t) => {
  withPayfast(t);
  const order = cardOrder({ status: "cancelled" });
  t.mock.method(Order, "findOne", async () => order);
  const update = t.mock.method(Order, "findOneAndUpdate", async () => ({ ...order, paymentStatus: "paid" }));
  const srv = await start();
  t.after(srv.close);
  assert.equal((await ipn(srv, signed("K7QM-4TXD-1", "000"))).status, 200);
  assert.equal(update.mock.calls[0].arguments[1].$set.paymentStatus, "paid");
});

// ---- admin cannot ship an unpaid card order ----------------------------------------------------

test("admin: an unpaid card order can't be processed or shipped (409), but can be cancelled", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  const id = oid();
  const update = t.mock.method(Order, "findOneAndUpdate", async () => null);
  t.mock.method(Order, "findById", () => ({ select: async () => ({ status: "pending", paymentMethod: "card", paymentStatus: "unpaid" }) }));
  const srv = await start();
  t.after(srv.close);

  const r = await call(srv.base, `/api/orders/${id}/status`, { method: "PATCH", cookie, json: { status: "shipped" } });
  assert.equal(r.status, 409);
  assert.match(r.data.message, /hasn't been paid/);
  assert.deepEqual(update.mock.calls[0].arguments[0].$nor, [{ paymentMethod: { $in: ["card", "jazzcash", "easypaisa"] }, paymentStatus: { $ne: "paid" } }]);
});

// ---- expiring unpaid orders ---------------------------------------------------------------------

test("expire: cancels unpaid card orders older than the hold time and puts their stock back", async (t) => {
  const stockBack = t.mock.method(Product, "updateOne", async () => ({ modifiedCount: 1 }));
  const p = oid();
  const queue = [{ _id: oid(), status: "pending", items: [{ product: p, qty: 2 }] }, { _id: oid(), status: "pending", items: [] }, null];
  const update = t.mock.method(Order, "findOneAndUpdate", async () => queue.shift());
  const now = new Date("2026-10-15T12:00:00Z");

  const n = await expireUnpaidOrders({ now, minutes: 60 });
  assert.equal(n, 2);
  const [filter, change] = update.mock.calls[0].arguments;
  assert.deepEqual(filter.paymentMethod, { $in: ["card", "jazzcash", "easypaisa"] }); // every online method expires
  assert.deepEqual(filter.paymentStatus, { $in: ["unpaid", "failed"] }); // a paid order is never expired
  assert.equal(filter.status, "pending");
  assert.equal(filter.createdAt.$lt.toISOString(), "2026-10-15T11:00:00.000Z");
  assert.deepEqual(change, { $set: { status: "cancelled" } });
  assert.equal(stockBack.mock.callCount(), 1);
  assert.deepEqual(stockBack.mock.calls[0].arguments[1], { $inc: { stock: 2 } });
});

test("expire: nothing to do -> 0", async (t) => {
  t.mock.method(Order, "findOneAndUpdate", async () => null);
  assert.equal(await expireUnpaidOrders({ now: new Date(), minutes: 60 }), 0);
});

test("the Order model knows card payments and defaults to unpaid", () => {
  const o = new Order({ user: oid(), items: [{ name: "x", price: 1, qty: 1 }], total: 1, paymentMethod: "card" });
  assert.equal(o.paymentMethod, "card");
  assert.equal(o.paymentStatus, "unpaid");
  assert.equal(o.validateSync(), undefined);
  assert.ok(new Order({ paymentMethod: "bitcoin" }).validateSync().errors.paymentMethod);
  assert.ok(new Order({ paymentStatus: "maybe" }).validateSync().errors.paymentStatus);
});
