// Online payment (JazzCash, Easypaisa): the payment forms, signatures, return/IPN handlers, checkout and paying again.
// No database and no network: model methods and fetch are mocked like in the other test files.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { start, call, signIn, quietErrors, oid } = require("./helpers");
const Order = require("../models/Order");
const Product = require("../models/Product");
const jazzcash = require("../utils/jazzcash");
const easypaisa = require("../utils/easypaisa");

const JC = {
  JAZZCASH_MERCHANT_ID: "MC1234",
  JAZZCASH_PASSWORD: "pw-1234",
  JAZZCASH_INTEGRITY_SALT: "salt-5678",
  JAZZCASH_ENV: "sandbox",
};
const EP = {
  EASYPAISA_STORE_ID: "4321",
  EASYPAISA_HASH_KEY: "0123456789abcdef", // 16 characters = AES-128
  EASYPAISA_ACCOUNT_NUM: "03001234567",
  EASYPAISA_USERNAME: "api-user",
  EASYPAISA_PASSWORD: "api-pass",
  EASYPAISA_ENV: "sandbox",
};
const COMMON = { BACKEND_URL: "https://api.example.com", FRONTEND_URL: "https://shop.example.com" };
const ALL_KEYS = [...Object.keys(JC), ...Object.keys(EP), ...Object.keys(COMMON), "JAZZCASH_BASE_URL", "JAZZCASH_TXN_TYPE", "EASYPAISA_BASE_URL", "EASYPAISA_PAYMENT_METHOD", "PAYMENT_HOLD_MINUTES"];
const saved = new WeakMap();

/** Sets the environment for one test (may be called again in the same test) and restores it afterwards. */
function withEnv(t, ...sets) {
  if (!saved.has(t)) {
    const before = Object.fromEntries(ALL_KEYS.map((k) => [k, process.env[k]]));
    saved.set(t, before);
    t.after(() => ALL_KEYS.forEach((k) => (before[k] === undefined ? delete process.env[k] : (process.env[k] = before[k]))));
  }
  for (const k of ALL_KEYS) delete process.env[k];
  Object.assign(process.env, COMMON, ...sets);
}

const address = { fullName: "Ana", line1: "12 Main St", city: "Lahore", phone: "0300-1234567", email: "ana@example.com" };
const online = (method, extra = {}) => ({
  _id: oid(),
  orderNumber: "K7QM-4TXD",
  items: [],
  total: 1350,
  status: "pending",
  paymentMethod: method,
  paymentStatus: "unpaid",
  shippingAddress: address,
  ...extra,
});

const form = (srv, path, params, method = "POST") =>
  fetch(srv.base + path, {
    method,
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    ...(method === "POST" ? { body: new URLSearchParams(params).toString() } : {}),
  });
const get = (srv, path) => fetch(srv.base + path, { redirect: "manual" });

// A signed JazzCash result, built the way JazzCash signs it
const jcResult = (extra = {}) => {
  const p = {
    pp_Amount: "135000",
    pp_BillReference: "K7QM4TXD",
    pp_ResponseCode: "000",
    pp_ResponseMessage: "Thank you for Using JazzCash, your transaction was successful.",
    pp_RetreivalReferenceNo: "RRN-99",
    pp_TxnRefNo: "TK7QM4TXDA1",
    pp_TxnCurrency: "PKR",
    ...extra,
  };
  p.pp_SecureHash = jazzcash.secureHash(p);
  return p;
};

// ---- utils/jazzcash.js ---------------------------------------------------------------------------

test("jazzcash: configured only when merchant id, password, salt and backend address are all set", (t) => {
  withEnv(t, JC);
  assert.equal(jazzcash.isConfigured(), true);
  withEnv(t, { ...JC, JAZZCASH_INTEGRITY_SALT: "" });
  assert.equal(jazzcash.isConfigured(), false);
  withEnv(t, JC, { BACKEND_URL: "" });
  assert.equal(jazzcash.isConfigured(), false);
});

test("jazzcash: amounts are whole paisa, times are Pakistan time, references round-trip to the order number", () => {
  assert.equal(jazzcash.paisa(1350), "135000");
  assert.equal(jazzcash.paisa(99.5), "9950");
  assert.equal(jazzcash.pktStamp(new Date("2026-10-15T12:00:00Z")), "20261015170000");
  const ref = jazzcash.txnRefFor({ orderNumber: "K7QM-4TXD" }, 2);
  assert.equal(ref, "TK7QM4TXDA2");
  assert.ok(ref.length <= 20);
  assert.equal(jazzcash.orderNumberFromTxnRef(ref), "K7QM-4TXD");
  assert.equal(jazzcash.orderNumberFromTxnRef("T123"), "");
});

test("jazzcash: secureHash is HMAC-SHA256 over salt + sorted non-empty pp values, and ignores the hash and other fields", (t) => {
  withEnv(t, JC);
  const params = { pp_Amount: "100", pp_Language: "EN", pp_Empty: "", pp_MerchantID: "MC1234", other: "ignored", pp_SecureHash: "old" };
  const expected = crypto.createHmac("sha256", "salt-5678").update("salt-5678&100&EN&MC1234").digest("hex").toUpperCase();
  assert.equal(jazzcash.secureHash(params), expected);
});

test("jazzcash: the payment form has the amount, the return address, a valid signature, and never the salt", (t) => {
  withEnv(t, JC);
  const p = jazzcash.buildPayment({ order: online("jazzcash"), txnRef: "TK7QM4TXDA1", now: new Date("2026-10-15T12:00:00Z") });
  assert.equal(p.gateway, "jazzcash");
  assert.equal(p.method, "POST");
  assert.match(p.url, /^https:\/\/sandbox\.jazzcash\.com\.pk\//);
  assert.equal(p.fields.pp_Amount, "135000");
  assert.equal(p.fields.pp_TxnCurrency, "PKR");
  assert.equal(p.fields.pp_TxnType, "MWALLET");
  assert.equal(p.fields.pp_TxnRefNo, "TK7QM4TXDA1");
  assert.equal(p.fields.pp_ReturnURL, "https://api.example.com/api/payments/jazzcash/return");
  assert.equal(p.fields.pp_TxnDateTime, "20261015170000");
  assert.equal(p.fields.pp_TxnExpiryDateTime, "20261015180000");
  assert.equal(p.fields.pp_SecureHash, jazzcash.secureHash(p.fields));
  assert.ok(!JSON.stringify(p).includes("salt-5678"));
});

test("jazzcash: live environment, a custom address and 'ALL' transaction types", (t) => {
  withEnv(t, JC, { JAZZCASH_ENV: "live", JAZZCASH_TXN_TYPE: "all" });
  const p = jazzcash.buildPayment({ order: online("jazzcash"), txnRef: "TK7QM4TXDA1" });
  assert.match(p.url, /^https:\/\/payments\.jazzcash\.com\.pk\//);
  assert.equal(p.fields.pp_TxnType, "");
  withEnv(t, JC, { JAZZCASH_BASE_URL: "https://pay.test/form" });
  assert.equal(jazzcash.buildPayment({ order: online("jazzcash"), txnRef: "x" }).url, "https://pay.test/form");
});

test("jazzcash: verifyResponse accepts a correct signature and reads the verdict", (t) => {
  withEnv(t, JC);
  const r = jazzcash.verifyResponse(jcResult());
  assert.deepEqual(
    { ok: r.ok, paid: r.paid, pending: r.pending, orderNumber: r.orderNumber, amount: r.amount, transactionId: r.transactionId },
    { ok: true, paid: true, pending: false, orderNumber: "K7QM-4TXD", amount: 1350, transactionId: "RRN-99" }
  );
  const declined = jazzcash.verifyResponse(jcResult({ pp_ResponseCode: "157" }));
  assert.equal(declined.ok, true);
  assert.equal(declined.paid, false);
  assert.equal(jazzcash.verifyResponse(jcResult({ pp_ResponseCode: "124" })).pending, true);
});

test("jazzcash: verifyResponse rejects a wrong, missing or tampered signature", (t) => {
  withEnv(t, JC);
  const good = jcResult();
  assert.equal(jazzcash.verifyResponse({ ...good, pp_SecureHash: "FORGED" }).ok, false);
  assert.equal(jazzcash.verifyResponse({ ...good, pp_SecureHash: undefined }).ok, false);
  assert.equal(jazzcash.verifyResponse({ ...good, pp_Amount: "100" }).ok, false); // amount changed after signing
  assert.equal(jazzcash.verifyResponse({ ...good, pp_ResponseCode: "000", pp_TxnRefNo: "TK7QM4TXDA9" }).ok, false);
  assert.equal(jazzcash.verifyResponse({}).ok, false);
  withEnv(t, { ...JC, JAZZCASH_INTEGRITY_SALT: "other-salt" });
  assert.equal(jazzcash.verifyResponse(good).ok, false); // signed with a different salt
});

// ---- utils/easypaisa.js --------------------------------------------------------------------------

test("easypaisa: configured only when every credential and the backend address are set", (t) => {
  withEnv(t, EP);
  assert.equal(easypaisa.isConfigured(), true);
  for (const k of Object.keys(EP).filter((k) => k !== "EASYPAISA_ENV")) {
    withEnv(t, { ...EP, [k]: "" });
    assert.equal(easypaisa.isConfigured(), false, k);
  }
});

test("easypaisa: amount, expiry and reference formats", () => {
  assert.equal(easypaisa.amountString(1350), "1350.0");
  assert.equal(easypaisa.amountString(99.5), "99.5");
  assert.equal(easypaisa.expiryStamp(new Date("2026-10-15T12:00:00Z")), "20261015 170000");
  assert.equal(easypaisa.orderRefFor({ orderNumber: "K7QM-4TXD" }, 3), "K7QM-4TXD-3");
  assert.equal(easypaisa.orderNumberFromRef("K7QM-4TXD-3"), "K7QM-4TXD");
  assert.equal(easypaisa.orderNumberFromRef("nope"), "");
});

test("easypaisa: merchantHashedReq is AES-128-ECB of the sorted non-empty fields, and decrypts back", (t) => {
  withEnv(t, EP);
  const hashed = easypaisa.hashedRequest({ storeId: "4321", amount: "1350.0", empty: "", orderRefNum: "K7QM-4TXD-1" });
  const d = crypto.createDecipheriv("aes-128-ecb", Buffer.from(EP.EASYPAISA_HASH_KEY), null);
  const text = Buffer.concat([d.update(Buffer.from(hashed, "base64")), d.final()]).toString();
  assert.equal(text, "amount=1350.0&orderRefNum=K7QM-4TXD-1&storeId=4321");
});

test("easypaisa: the payment form has the amount, return address, signature, and never the hash key or API password", (t) => {
  withEnv(t, EP);
  const p = easypaisa.buildPayment({ order: online("easypaisa"), orderRef: "K7QM-4TXD-1", now: new Date("2026-10-15T12:00:00Z") });
  assert.equal(p.gateway, "easypaisa");
  assert.match(p.url, /^https:\/\/easypaystg\.easypaisa\.com\.pk\/easypay\/Index\.jsf$/);
  assert.equal(p.fields.storeId, "4321");
  assert.equal(p.fields.amount, "1350.0");
  assert.equal(p.fields.orderRefNum, "K7QM-4TXD-1");
  assert.equal(p.fields.postBackURL, "https://api.example.com/api/payments/easypaisa/return");
  assert.equal(p.fields.paymentMethod, "MA_PAYMENT_METHOD");
  assert.equal(p.fields.mobileNum, "03001234567"); // punctuation stripped
  assert.equal(p.fields.expiryDate, "20261015 180000");
  assert.ok(p.fields.merchantHashedReq);
  const text = JSON.stringify(p);
  assert.ok(!text.includes(EP.EASYPAISA_HASH_KEY) && !text.includes("api-pass"));
  withEnv(t, EP, { EASYPAISA_ENV: "live", EASYPAISA_PAYMENT_METHOD: "all" });
  const live = easypaisa.buildPayment({ order: online("easypaisa"), orderRef: "K7QM-4TXD-1" });
  assert.match(live.url, /^https:\/\/easypay\.easypaisa\.com\.pk\//);
  assert.equal(live.fields.paymentMethod, undefined); // customer chooses
});

test("easypaisa: confirmForm needs an auth_token and posts it on with our return address", (t) => {
  withEnv(t, EP);
  assert.equal(easypaisa.confirmForm({}), null);
  const f = easypaisa.confirmForm({ auth_token: "abc123" });
  assert.equal(f.url, "https://easypaystg.easypaisa.com.pk/easypay/Confirm.jsf");
  assert.deepEqual(f.fields, { auth_token: "abc123", postBackURL: "https://api.example.com/api/payments/easypaisa/return" });
});

/** Pretends to be Easypay's inquiry endpoint. */
function fakeInquiry(t, answer, { ok = true } = {}) {
  const realFetch = globalThis.fetch;
  return t.mock.method(globalThis, "fetch", async (url, opts) => {
    if (String(url).includes("inquire-transaction")) return { ok, status: ok ? 200 : 500, json: async () => answer };
    return realFetch(url, opts);
  });
}

test("easypaisa: inquire sends the credentials as a header, asks about our order, and maps the status", async (t) => {
  withEnv(t, EP);
  const f = fakeInquiry(t, { orderId: "K7QM-4TXD-1", transactionStatus: "PAID", transactionAmount: 1350, transactionId: "EP-55" });
  const r = await easypaisa.inquire("K7QM-4TXD-1");
  assert.deepEqual(r, { ok: true, state: "paid", transactionId: "EP-55", amount: 1350, message: "PAID" });
  const [url, opts] = f.mock.calls[0].arguments;
  assert.match(url, /inquire-transaction$/);
  assert.equal(opts.headers.Credentials, Buffer.from("api-user:api-pass").toString("base64"));
  assert.deepEqual(JSON.parse(opts.body), { orderId: "K7QM-4TXD-1", storeId: "4321", accountNum: "03001234567" });
  fakeInquiry(t, { transactionStatus: "FAILED" });
  assert.equal((await easypaisa.inquire("K7QM-4TXD-1")).state, "failed");
  fakeInquiry(t, { transactionStatus: "PENDING" });
  assert.equal((await easypaisa.inquire("K7QM-4TXD-1")).state, "pending");
});

test("easypaisa: inquire throws when Easypay errors or answers about a different order", async (t) => {
  withEnv(t, EP);
  fakeInquiry(t, {}, { ok: false });
  await assert.rejects(() => easypaisa.inquire("K7QM-4TXD-1"), /inquiry failed/);
  fakeInquiry(t, { orderId: "OTHER-ORDER-1", transactionStatus: "PAID", transactionAmount: 1 });
  await assert.rejects(() => easypaisa.inquire("K7QM-4TXD-1"), /different order/);
});

// ---- checkout and paying again -------------------------------------------------------------------

const place = (srv, cookie, json) => call(srv.base, "/api/orders", { method: "POST", cookie, json });
function checkoutMocks(t) {
  const p = { _id: oid(), name: "Dress", price: 1000, image: "/x.jpg", stock: 5, variants: [] };
  t.mock.method(Product, "find", async () => [p]);
  t.mock.method(Product, "updateOne", async () => ({ modifiedCount: 1 }));
  return { p };
}

for (const [method, env, gateway] of [
  ["jazzcash", JC, "jazzcash"],
  ["easypaisa", EP, "easypaisa"],
]) {
  test(`checkout: ${method} while it is not configured -> 503 and nothing is reserved`, async (t) => {
    withEnv(t); // no credentials at all
    const { cookie } = signIn(t.mock);
    const create = t.mock.method(Order, "create", async (doc) => ({ _id: oid(), ...doc }));
    const srv = await start();
    t.after(srv.close);
    const r = await place(srv, cookie, { items: [{ product: String(oid()), qty: 1 }], total: 1350, shippingAddress: address, paymentMethod: method });
    assert.equal(r.status, 503);
    assert.equal(create.mock.callCount(), 0);
  });

  test(`pay: ${method} order gives a fresh payment form for the owner, refuses others`, async (t) => {
    withEnv(t, env);
    const { user, cookie } = signIn(t.mock);
    const order = online(method, { user: user._id, payment: { attempts: 1 } });
    t.mock.method(Order, "findOne", async () => order);
    t.mock.method(Order, "findOneAndUpdate", async () => ({ ...order, payment: { attempts: 2 } }));
    const setRef = t.mock.method(Order, "updateOne", async () => ({ modifiedCount: 1 }));
    const srv = await start();
    t.after(srv.close);

    const r = await call(srv.base, `/api/orders/${order._id}/pay`, { method: "POST", cookie });
    assert.equal(r.status, 200);
    assert.equal(r.data.payment.gateway, gateway);
    assert.match(r.data.payment.url, /^https:\/\//);
    const ref = setRef.mock.calls[0].arguments[1].$set["payment.basketId"];
    assert.match(ref, method === "jazzcash" ? /^TK7QM4TXDA2$/ : /^K7QM-4TXD-2$/);

    // an order that can't be paid any more (cancelled / paid in the meantime) -> 409
    t.mock.method(Order, "findOneAndUpdate", async () => null);
    const gone = await call(srv.base, `/api/orders/${order._id}/pay`, { method: "POST", cookie });
    assert.equal(gone.status, 409);
  });

  test(`pay: ${method} not configured -> 503`, async (t) => {
    withEnv(t);
    const { user, cookie } = signIn(t.mock);
    const order = online(method, { user: user._id });
    t.mock.method(Order, "findOne", async () => order);
    const srv = await start();
    t.after(srv.close);
    const r = await call(srv.base, `/api/orders/${order._id}/pay`, { method: "POST", cookie });
    assert.equal(r.status, 503);
  });
}

test("checkout: a JazzCash order is saved unpaid and the answer carries the JazzCash form", async (t) => {
  withEnv(t, JC);
  const { user, cookie } = signIn(t.mock);
  const { p } = checkoutMocks(t);
  const create = t.mock.method(Order, "create", async (doc) => ({ _id: oid(), orderNumber: "K7QM-4TXD", ...doc }));
  t.mock.method(Order, "findOneAndUpdate", async () => ({ ...online("jazzcash", { user: user._id }), payment: { attempts: 1 } }));
  t.mock.method(Order, "updateOne", async () => ({ modifiedCount: 1 }));
  const srv = await start();
  t.after(srv.close);

  const r = await place(srv, cookie, { items: [{ product: String(p._id), qty: 1 }], total: 1350, shippingAddress: address, paymentMethod: "jazzcash" });
  assert.equal(r.status, 201);
  const saved = create.mock.calls[0].arguments[0];
  assert.equal(saved.paymentMethod, "jazzcash");
  assert.equal(saved.paymentStatus, "unpaid");
  assert.equal(r.data.payment.gateway, "jazzcash");
  assert.equal(r.data.payment.fields.pp_TxnRefNo, "TK7QM4TXDA1");
  assert.equal(r.data.payment.fields.pp_Amount, "135000");
});

test("checkout: an Easypaisa order is saved unpaid and the answer carries the Easypay form", async (t) => {
  withEnv(t, EP);
  const { user, cookie } = signIn(t.mock);
  const { p } = checkoutMocks(t);
  const create = t.mock.method(Order, "create", async (doc) => ({ _id: oid(), orderNumber: "K7QM-4TXD", ...doc }));
  t.mock.method(Order, "findOneAndUpdate", async () => ({ ...online("easypaisa", { user: user._id }), payment: { attempts: 1 } }));
  t.mock.method(Order, "updateOne", async () => ({ modifiedCount: 1 }));
  const srv = await start();
  t.after(srv.close);

  const r = await place(srv, cookie, { items: [{ product: String(p._id), qty: 1 }], total: 1350, shippingAddress: address, paymentMethod: "easypaisa" });
  assert.equal(r.status, 201);
  assert.equal(create.mock.calls[0].arguments[0].paymentMethod, "easypaisa");
  assert.equal(r.data.payment.gateway, "easypaisa");
  assert.equal(r.data.payment.fields.orderRefNum, "K7QM-4TXD-1");
  assert.equal(r.data.payment.fields.amount, "1350.0");
});

test("pay: one gateway's order can't be paid through another (a card order isn't a JazzCash order)", async (t) => {
  withEnv(t, JC);
  const { user, cookie } = signIn(t.mock);
  const order = online("card", { user: user._id });
  t.mock.method(Order, "findOne", async () => order);
  const srv = await start();
  t.after(srv.close);
  // card + JazzCash-only config: card isn't configured -> 503, never a JazzCash form
  const r = await call(srv.base, `/api/orders/${order._id}/pay`, { method: "POST", cookie });
  assert.equal(r.status, 503);
});

// ---- JazzCash return / IPN -----------------------------------------------------------------------

test("jazzcash return: a forged signature is refused and changes nothing", async (t) => {
  withEnv(t, JC);
  const find = t.mock.method(Order, "findOne", async () => online("jazzcash"));
  const update = t.mock.method(Order, "findOneAndUpdate", async () => online("jazzcash"));
  const srv = await start();
  t.after(srv.close);
  const r = await form(srv, "/api/payments/jazzcash/return", { ...jcResult(), pp_SecureHash: "FORGED" });
  assert.equal(r.status, 400);
  assert.equal(find.mock.callCount(), 0);
  assert.equal(update.mock.callCount(), 0);
});

test("jazzcash return: a successful payment marks the order paid and sends the customer to the order page", async (t) => {
  withEnv(t, JC);
  const order = online("jazzcash");
  const find = t.mock.method(Order, "findOne", async () => order);
  const update = t.mock.method(Order, "findOneAndUpdate", async () => ({ ...order, paymentStatus: "paid" }));
  const srv = await start();
  t.after(srv.close);

  const r = await form(srv, "/api/payments/jazzcash/return", jcResult());
  assert.equal(r.status, 303);
  assert.equal(r.headers.get("location"), `https://shop.example.com/order-success/${order._id}`);
  assert.deepEqual(find.mock.calls[0].arguments[0], { orderNumber: "K7QM-4TXD", paymentMethod: "jazzcash" });
  const [filter, change] = update.mock.calls[0].arguments;
  assert.deepEqual(filter.paymentStatus, { $in: ["unpaid", "failed"] }); // an already paid order never matches again
  assert.equal(change.$set.paymentStatus, "paid");
  assert.equal(change.$set["payment.transactionId"], "RRN-99");
});

test("jazzcash return: the same result twice is harmless", async (t) => {
  withEnv(t, JC);
  const order = online("jazzcash", { paymentStatus: "paid", payment: { transactionId: "RRN-99" } });
  t.mock.method(Order, "findOne", async () => order);
  t.mock.method(Order, "findOneAndUpdate", async () => null); // nothing left to flip
  const srv = await start();
  t.after(srv.close);
  const r = await form(srv, "/api/payments/jazzcash/return", jcResult());
  assert.equal(r.status, 303);
});

test("jazzcash return: a wrong amount is refused and the order stays unpaid", async (t) => {
  quietErrors(t.mock);
  withEnv(t, JC);
  t.mock.method(Order, "findOne", async () => online("jazzcash"));
  const update = t.mock.method(Order, "findOneAndUpdate", async () => online("jazzcash"));
  const srv = await start();
  t.after(srv.close);
  const r = await form(srv, "/api/payments/jazzcash/return", jcResult({ pp_Amount: "100" })); // validly signed, but only Rs 1
  assert.equal(r.status, 303);
  assert.equal(r.headers.get("location"), "https://shop.example.com/account/orders");
  assert.equal(update.mock.callCount(), 0);
});

test("jazzcash return: a declined payment marks the order failed and flags it on the order page; pending changes nothing", async (t) => {
  withEnv(t, JC);
  const order = online("jazzcash");
  t.mock.method(Order, "findOne", async () => order);
  const upd = t.mock.method(Order, "updateOne", async () => ({ modifiedCount: 1 }));
  const srv = await start();
  t.after(srv.close);

  const declined = await form(srv, "/api/payments/jazzcash/return", jcResult({ pp_ResponseCode: "157", pp_ResponseMessage: "Declined" }));
  assert.equal(declined.headers.get("location"), `https://shop.example.com/order-success/${order._id}?payment=failed`);
  const [filter, change] = upd.mock.calls[0].arguments;
  assert.deepEqual(filter.paymentStatus, { $in: ["unpaid", "failed"] }); // never undoes a paid order
  assert.equal(change.$set.paymentStatus, "failed");

  upd.mock.resetCalls();
  const pending = await form(srv, "/api/payments/jazzcash/return", jcResult({ pp_ResponseCode: "124" }));
  assert.equal(pending.headers.get("location"), `https://shop.example.com/order-success/${order._id}`);
  assert.equal(upd.mock.callCount(), 0);
});

test("jazzcash ipn: answers 200 for a good notification, 400 for a forged one, 404 for an unknown order", async (t) => {
  withEnv(t, JC);
  let order = online("jazzcash");
  t.mock.method(Order, "findOne", async () => order);
  t.mock.method(Order, "findOneAndUpdate", async () => ({ ...order, paymentStatus: "paid" }));
  const srv = await start();
  t.after(srv.close);
  assert.equal((await form(srv, "/api/payments/jazzcash/ipn", jcResult())).status, 200);
  assert.equal((await form(srv, "/api/payments/jazzcash/ipn", { ...jcResult(), pp_SecureHash: "X" })).status, 400);
  order = null;
  assert.equal((await form(srv, "/api/payments/jazzcash/ipn", jcResult())).status, 404);
});

// ---- Easypaisa return / IPN ----------------------------------------------------------------------

test("easypaisa return: with an auth_token the customer is sent on to Easypay's confirm address (a one-form page)", async (t) => {
  withEnv(t, EP);
  const find = t.mock.method(Order, "findOne", async () => online("easypaisa"));
  const srv = await start();
  t.after(srv.close);
  const r = await get(srv, "/api/payments/easypaisa/return?auth_token=tok%22%3E%3Cscript%3E");
  assert.equal(r.status, 200);
  const html = await r.text();
  assert.match(html, /action="https:\/\/easypaystg\.easypaisa\.com\.pk\/easypay\/Confirm\.jsf"/);
  assert.ok(!html.includes("<script>alert") && !html.includes('tok"><script>')); // token is escaped
  assert.match(r.headers.get("content-security-policy"), /form-action https:\/\/easypaystg\.easypaisa\.com\.pk/);
  assert.equal(find.mock.callCount(), 0); // nothing is decided from the token alone
});

test("easypaisa return: asks Easypay, marks a paid order paid, and redirects to the order page", async (t) => {
  withEnv(t, EP);
  const order = online("easypaisa");
  t.mock.method(Order, "findOne", async () => order);
  const update = t.mock.method(Order, "findOneAndUpdate", async () => ({ ...order, paymentStatus: "paid" }));
  fakeInquiry(t, { orderId: "K7QM-4TXD-1", transactionStatus: "PAID", transactionAmount: 1350, transactionId: "EP-55" });
  const srv = await start();
  t.after(srv.close);

  const r = await get(srv, "/api/payments/easypaisa/return?orderRefNumber=K7QM-4TXD-1&status=0000");
  assert.equal(r.status, 303);
  assert.equal(r.headers.get("location"), `https://shop.example.com/order-success/${order._id}`);
  assert.equal(update.mock.calls[0].arguments[1].$set["payment.transactionId"], "EP-55");
});

test("easypaisa return: a 'success' in the address alone is never believed when Easypay says otherwise", async (t) => {
  withEnv(t, EP);
  const order = online("easypaisa");
  t.mock.method(Order, "findOne", async () => order);
  const update = t.mock.method(Order, "findOneAndUpdate", async () => order);
  const upd = t.mock.method(Order, "updateOne", async () => ({ modifiedCount: 1 }));
  fakeInquiry(t, { transactionStatus: "FAILED" });
  const srv = await start();
  t.after(srv.close);

  const r = await get(srv, "/api/payments/easypaisa/return?orderRefNumber=K7QM-4TXD-1&status=0000&success=true");
  assert.equal(r.headers.get("location"), `https://shop.example.com/order-success/${order._id}?payment=failed`);
  assert.equal(update.mock.callCount(), 0); // not paid
  assert.equal(upd.mock.calls[0].arguments[1].$set.paymentStatus, "failed");
});

test("easypaisa return: still pending or Easypay unreachable -> the order is left exactly as it is", async (t) => {
  quietErrors(t.mock);
  withEnv(t, EP);
  const order = online("easypaisa");
  t.mock.method(Order, "findOne", async () => order);
  const update = t.mock.method(Order, "findOneAndUpdate", async () => order);
  const upd = t.mock.method(Order, "updateOne", async () => ({ modifiedCount: 1 }));
  const srv = await start();
  t.after(srv.close);

  fakeInquiry(t, { transactionStatus: "PENDING" });
  const pending = await get(srv, "/api/payments/easypaisa/return?orderRefNumber=K7QM-4TXD-1");
  assert.equal(pending.headers.get("location"), `https://shop.example.com/order-success/${order._id}`);

  fakeInquiry(t, {}, { ok: false });
  const down = await get(srv, "/api/payments/easypaisa/return?orderRefNumber=K7QM-4TXD-1");
  assert.equal(down.headers.get("location"), `https://shop.example.com/order-success/${order._id}`);

  assert.equal(update.mock.callCount(), 0);
  assert.equal(upd.mock.callCount(), 0);
});

test("easypaisa return: a wrong amount from Easypay is refused; an unknown reference goes to the orders list", async (t) => {
  quietErrors(t.mock);
  withEnv(t, EP);
  const order = online("easypaisa");
  t.mock.method(Order, "findOne", async () => order);
  const update = t.mock.method(Order, "findOneAndUpdate", async () => order);
  fakeInquiry(t, { transactionStatus: "PAID", transactionAmount: 5, transactionId: "EP-1" });
  const srv = await start();
  t.after(srv.close);

  const wrong = await get(srv, "/api/payments/easypaisa/return?orderRefNumber=K7QM-4TXD-1");
  assert.equal(wrong.headers.get("location"), "https://shop.example.com/account/orders");
  assert.equal(update.mock.callCount(), 0);

  const unknown = await get(srv, "/api/payments/easypaisa/return?orderRefNumber=garbage");
  assert.equal(unknown.headers.get("location"), "https://shop.example.com/account/orders");
});

test("easypaisa ipn: asks Easypay (the message itself isn't trusted); 200 when handled, 404 for an unknown reference", async (t) => {
  withEnv(t, EP);
  const order = online("easypaisa");
  t.mock.method(Order, "findOne", async () => order);
  t.mock.method(Order, "findOneAndUpdate", async () => ({ ...order, paymentStatus: "paid" }));
  const inq = fakeInquiry(t, { transactionStatus: "PAID", transactionAmount: 1350, transactionId: "EP-9" });
  const srv = await start();
  t.after(srv.close);

  assert.equal((await get(srv, "/api/payments/easypaisa/ipn?orderRefNumber=K7QM-4TXD-1")).status, 200);
  assert.equal(inq.mock.calls.filter((c) => String(c.arguments[0]).includes("inquire-transaction")).length, 1);
  assert.equal((await get(srv, "/api/payments/easypaisa/ipn?orderRefNumber=nope")).status, 404);
});

// ---- the rest of the shop treats them as online orders -------------------------------------------

test("the Order model accepts JazzCash and Easypaisa and rejects unknown methods", () => {
  for (const method of ["jazzcash", "easypaisa"]) {
    const o = new Order({ user: oid(), items: [{ name: "x", price: 1, qty: 1 }], total: 1, paymentMethod: method });
    assert.equal(o.paymentStatus, "unpaid");
    assert.equal(o.validateSync(), undefined);
  }
  const bad = new Order({ user: oid(), items: [{ name: "x", price: 1, qty: 1 }], total: 1, paymentMethod: "bitcoin" });
  assert.ok(bad.validateSync());
});

test("admin: an unpaid JazzCash / Easypaisa order can't be shipped (409)", async (t) => {
  for (const method of ["jazzcash", "easypaisa"]) {
    const { cookie } = signIn(t.mock, { role: "admin" });
    t.mock.method(Order, "findOneAndUpdate", async () => null);
    t.mock.method(Order, "findById", () => ({ select: async () => ({ status: "pending", paymentMethod: method, paymentStatus: "unpaid" }) }));
    const srv = await start();
    const r = await call(srv.base, `/api/orders/${oid()}/status`, { method: "PATCH", cookie, json: { status: "shipped" } });
    await srv.close();
    assert.equal(r.status, 409, method);
    assert.match(r.data.message, /hasn't been paid/);
  }
});
