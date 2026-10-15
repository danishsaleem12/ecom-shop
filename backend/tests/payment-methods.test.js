// Which online payment methods are switched on (GET /api/payments/methods).
// No database and no network. A method is on only when its gateway has all its keys in the environment.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { start, call } = require("./helpers");
const { availableMethods } = require("../utils/paymentMethods");

const KEYS = [
  "BACKEND_URL",
  "PAYFAST_MERCHANT_ID",
  "PAYFAST_SECURED_KEY",
  "JAZZCASH_MERCHANT_ID",
  "JAZZCASH_PASSWORD",
  "JAZZCASH_INTEGRITY_SALT",
  "EASYPAISA_STORE_ID",
  "EASYPAISA_HASH_KEY",
  "EASYPAISA_ACCOUNT_NUM",
  "EASYPAISA_USERNAME",
  "EASYPAISA_PASSWORD",
];

/** Sets the environment for one test (every payment key cleared first) and restores it afterwards. */
function withEnv(t, set = {}) {
  const before = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  t.after(() => KEYS.forEach((k) => (before[k] === undefined ? delete process.env[k] : (process.env[k] = before[k]))));
  for (const k of KEYS) delete process.env[k];
  Object.assign(process.env, set);
}

test("payment methods: with no keys every online method is off (demo mode: cash on delivery only)", (t) => {
  withEnv(t);
  assert.deepEqual(availableMethods(), { card: false, jazzcash: false, easypaisa: false });
});

test("payment methods: Easypaisa turns on once all its keys and the backend address are set, the others stay off", (t) => {
  withEnv(t, {
    BACKEND_URL: "https://api.example.com",
    EASYPAISA_STORE_ID: "4321",
    EASYPAISA_HASH_KEY: "0123456789abcdef",
    EASYPAISA_ACCOUNT_NUM: "03001234567",
    EASYPAISA_USERNAME: "api-user",
    EASYPAISA_PASSWORD: "api-pass",
  });
  assert.deepEqual(availableMethods(), { card: false, jazzcash: false, easypaisa: true });
});

test("GET /api/payments/methods: public, booleans only, never a key", async (t) => {
  withEnv(t, { EASYPAISA_HASH_KEY: "0123456789abcdef" }); // a lone key is not enough to switch a method on
  const srv = await start();
  t.after(srv.close);
  const r = await call(srv.base, "/api/payments/methods");
  assert.equal(r.status, 200);
  assert.deepEqual(r.data, { methods: { card: false, jazzcash: false, easypaisa: false } });
  assert.ok(!r.text.includes("0123456789abcdef"));
});
