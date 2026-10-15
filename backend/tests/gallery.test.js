const { test } = require("node:test");
const assert = require("node:assert/strict");
const { start, call, signIn, oid } = require("./helpers");
const Product = require("../models/Product");

test("model: at most 8 extra images", async () => {
  const base = { name: "S", description: "d", price: 1, image: "/c.png" };
  await new Product({ ...base, images: Array.from({ length: 8 }, (_, i) => `/g${i}.png`) }).validate();
  await assert.rejects(() => new Product({ ...base, images: Array.from({ length: 9 }, (_, i) => `/g${i}.png`) }).validate(), /at most 8/);
});

// A stand-in for a Mongoose document: set() copies fields, save() resolves
function fakeProduct(fields) {
  const p = { ...fields };
  p.set = (data) => Object.assign(p, data);
  p.save = async () => p;
  return p;
}

test("PUT: the gallery is cleaned (blanks, repeats, and the cover are dropped)", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  const p = fakeProduct({ _id: oid(), image: "/c.png", images: ["/old.png"] });
  t.mock.method(Product, "findById", async () => p);
  const srv = await start();
  t.after(srv.close);

  const r = await call(srv.base, `/api/products/${p._id}`, {
    method: "PUT",
    cookie,
    json: { images: ["/a.png", " ", "/a.png", "/c.png", "/b.png"] },
  });
  assert.equal(r.status, 200);
  assert.deepEqual(p.images, ["/a.png", "/b.png"]);
});

test("PUT: more than 8 gallery images -> 400", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  const p = fakeProduct({ _id: oid(), image: "/c.png", images: [] });
  t.mock.method(Product, "findById", async () => p);
  const srv = await start();
  t.after(srv.close);

  const r = await call(srv.base, `/api/products/${p._id}`, {
    method: "PUT",
    cookie,
    json: { images: Array.from({ length: 9 }, (_, i) => `/g${i}.png`) },
  });
  assert.equal(r.status, 400);
});
