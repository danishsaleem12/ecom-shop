const { test } = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const { start, call } = require("./helpers");
const monitoring = require("../utils/monitoring");
const { loadEJSON } = require("../scripts/ejson");

test("/api/health stays a plain liveness check (200 even with no database)", async (t) => {
  const srv = await start();
  t.after(srv.close);
  const r = await call(srv.base, "/api/health");
  assert.equal(r.status, 200);
  assert.equal(r.data.status, "ok");
});

test("/api/health/ready -> 503 when MongoDB is not connected, with no error details", async (t) => {
  const srv = await start();
  t.after(srv.close);
  const r = await call(srv.base, "/api/health/ready");
  assert.equal(r.status, 503);
  assert.deepEqual(r.data, { status: "error", database: "down" });
  assert.equal(r.headers.get("cache-control"), "no-store");
});

test("monitoring does nothing without SENTRY_DSN", () => {
  delete process.env.SENTRY_DSN;
  assert.equal(monitoring.initMonitoring(), false);
  assert.equal(monitoring.isEnabled(), false);
  assert.doesNotThrow(() => monitoring.captureException(new Error("x"), { method: "GET", originalUrl: "/api/x?token=secret" }));
});

test("backup format: ids, dates and numbers survive an Extended JSON round trip", () => {
  const EJSON = loadEJSON();
  const doc = { _id: new mongoose.Types.ObjectId(), at: new Date("2026-10-15T09:00:00Z"), total: 15350, items: [{ product: new mongoose.Types.ObjectId(), qty: 2 }] };
  const back = EJSON.parse(EJSON.stringify(doc, { relaxed: false }), { relaxed: false });
  assert.ok(back._id instanceof mongoose.Types.ObjectId);
  assert.equal(String(back._id), String(doc._id));
  assert.equal(back.at.getTime(), doc.at.getTime());
  assert.equal(Number(back.total), 15350);
  assert.equal(String(back.items[0].product), String(doc.items[0].product));
});
