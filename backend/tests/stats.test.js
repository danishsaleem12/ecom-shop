const { test } = require("node:test");
const assert = require("node:assert/strict");
const { start, call, signIn, oid } = require("./helpers");
const Order = require("../models/Order");
const Product = require("../models/Product");

const dayKey = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);

test("stats: customers and signed-out visitors can't read the dashboard", async (t) => {
  const srv = await start();
  t.after(srv.close);
  assert.equal((await call(srv.base, "/api/admin/stats")).status, 401);
  const { cookie } = signIn(t.mock, { role: "user" });
  assert.equal((await call(srv.base, "/api/admin/stats", { cookie })).status, 403);
});

test("stats: builds today/week/month, zero-fills days, and lists low stock with the low variants", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  const today = dayKey(new Date());
  t.mock.method(Order, "aggregate", async () => [
    {
      daily: [{ _id: today, orders: 2, revenue: 3000 }],
      allTime: [{ _id: null, orders: 10, revenue: 50000.456 }],
      byStatus: [{ _id: "pending", n: 3 }, { _id: "delivered", n: 7 }],
      openReturns: [{ n: 1 }],
      top: [{ _id: oid(), name: "Dress", image: "/d.png", units: 4, revenue: 4000 }],
      recent: [],
    },
  ]);
  const find = t.mock.method(Product, "find", () => {
    const rows = [
      { _id: oid(), name: "Hat", image: "/h.png", stock: 2, variants: [] },
      { _id: oid(), name: "Shirt", image: "/s.png", stock: 9, variants: [{ size: "M", color: "", stock: 1 }, { size: "L", color: "", stock: 8 }] },
    ];
    const q = { select: () => q, sort: () => q, limit: async () => rows };
    return q;
  });
  const srv = await start();
  t.after(srv.close);

  const r = await call(srv.base, "/api/admin/stats", { cookie });
  assert.equal(r.status, 200);
  assert.equal(r.data.days.length, 30);
  assert.equal(r.data.today.date, today);
  assert.equal(r.data.today.revenue, 3000);
  assert.equal(r.data.week.orders, 2);
  assert.equal(r.data.month.revenue, 3000);
  assert.equal(r.data.allTime.revenue, 50000.46);
  assert.equal(r.data.attention.pendingOrders, 3);
  assert.equal(r.data.attention.openReturns, 1);
  assert.equal(r.data.attention.lowStock, 2);
  assert.deepEqual(r.data.lowStock[1].variants, [{ size: "M", color: "", stock: 1 }]); // only the low one
  assert.equal(r.data.lowStock[0].variants, undefined); // product without variants
  assert.equal(find.mock.callCount(), 1);
});
