// tests/adminorder.test.js — GET /api/orders/admin/:id (feeds the printable invoice and packing slip)
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { start, call, signIn, oid } = require("./helpers");
const Order = require("../models/Order");

test("an admin gets one order with the customer's name and email", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  const id = oid();
  let populated;
  t.mock.method(Order, "findById", () => ({
    populate: async (...args) => {
      populated = args;
      return { _id: id, orderNumber: "K7QM-4TXD", status: "shipped", items: [], total: 500 };
    },
  }));
  const srv = await start();
  t.after(srv.close);

  const r = await call(srv.base, `/api/orders/admin/${id}`, { cookie });
  assert.equal(r.status, 200);
  assert.equal(r.data.order.orderNumber, "K7QM-4TXD");
  assert.deepEqual(populated, ["user", "name email"]);
});

test("unknown or malformed order ids are 404", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  t.mock.method(Order, "findById", () => ({ populate: async () => null }));
  const srv = await start();
  t.after(srv.close);

  assert.equal((await call(srv.base, `/api/orders/admin/${oid()}`, { cookie })).status, 404);
  assert.equal((await call(srv.base, "/api/orders/admin/not-an-id", { cookie })).status, 404);
});

test("customers and signed-out visitors cannot use it", async (t) => {
  const srv = await start();
  t.after(srv.close);
  assert.equal((await call(srv.base, `/api/orders/admin/${oid()}`)).status, 401);

  const { cookie } = signIn(t.mock, { role: "user" });
  assert.equal((await call(srv.base, `/api/orders/admin/${oid()}`, { cookie })).status, 403);
});
