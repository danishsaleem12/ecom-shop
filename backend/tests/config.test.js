const { test } = require("node:test");
const assert = require("node:assert/strict");
const { start, call } = require("./helpers");
const Product = require("../models/Product");

test("GET /api/config: public, returns the shipping and return numbers", async (t) => {
  const srv = await start();
  t.after(srv.close);
  const r = await call(srv.base, "/api/config");
  assert.equal(r.status, 200);
  assert.deepEqual(r.data, { currency: "PKR", freeShippingThreshold: 15000, shippingFee: 350, returnWindowDays: 14 });
  assert.match(r.headers.get("cache-control"), /max-age=60/);
});

test("storeConfig: env values override the defaults; junk values are ignored", (t) => {
  const keys = ["FREE_SHIPPING_THRESHOLD", "SHIPPING_FEE", "RETURN_WINDOW_DAYS"];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  const file = require.resolve("../utils/storeConfig");
  const load = () => {
    delete require.cache[file];
    return require(file);
  };
  t.after(() => {
    keys.forEach((k) => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k])));
    delete require.cache[file];
  });

  Object.assign(process.env, { FREE_SHIPPING_THRESHOLD: "20000", SHIPPING_FEE: "250", RETURN_WINDOW_DAYS: "7" });
  assert.deepEqual(load().publicConfig(), { currency: "PKR", freeShippingThreshold: 20000, shippingFee: 250, returnWindowDays: 7 });

  Object.assign(process.env, { FREE_SHIPPING_THRESHOLD: "abc", SHIPPING_FEE: "-5", RETURN_WINDOW_DAYS: "0" });
  assert.deepEqual(load().publicConfig(), { currency: "PKR", freeShippingThreshold: 15000, shippingFee: 350, returnWindowDays: 14 });
});

// Captures the filter the products route builds
function captureFilter(t) {
  const seen = {};
  t.mock.method(Product, "countDocuments", async (f) => ((seen.filter = f), 0));
  t.mock.method(Product, "find", () => {
    const q = { sort: () => q, skip: () => q, limit: () => q, then: (res) => res([]) };
    return q;
  });
  return seen;
}

test("products: ?collection=a single slug keeps the exact-match filter", async (t) => {
  const seen = captureFilter(t);
  const srv = await start();
  t.after(srv.close);
  assert.equal((await call(srv.base, "/api/products?collection=Resort")).status, 200);
  assert.equal(seen.filter.collections, "resort");
});

test("products: ?collection=a,b matches products in ANY of the collections", async (t) => {
  const seen = captureFilter(t);
  const srv = await start();
  t.after(srv.close);
  assert.equal((await call(srv.base, "/api/products?collection=evening, wedding-guest,,travel")).status, 200);
  assert.deepEqual(seen.filter.collections, { $in: ["evening", "wedding-guest", "travel"] });
});
