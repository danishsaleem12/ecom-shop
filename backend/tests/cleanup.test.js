const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
require("./helpers");
const { cleanupUploads } = require("../utils/cleanupUploads");
const Product = require("../models/Product");
const Order = require("../models/Order");

const HOUR = 3600 * 1000;

function makeDir(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cleanup-"));
  for (const [name, ageHours] of Object.entries(files)) {
    const file = path.join(dir, name);
    fs.writeFileSync(file, "x");
    const when = new Date(Date.now() - ageHours * HOUR);
    fs.utimesSync(file, when, when);
  }
  return dir;
}

test("removes only old files that no product or order uses", async (t) => {
  const dir = makeDir({
    "old-unused.png": 48,
    "old-product.png": 48,
    "old-order.png": 48,
    "new-unused.png": 1, // still inside the 24h grace period
    ".gitkeep": 48, // dotfiles are never touched
  });
  t.mock.method(Product, "distinct", async () => ["/uploads/old-product.png", "https://images.unsplash.com/photo-1"]);
  t.mock.method(Order, "distinct", async () => ["http://localhost:4000/uploads/old-order.png", undefined]);

  const deleted = await cleanupUploads({ dir });

  assert.deepEqual(deleted, ["old-unused.png"]);
  assert.deepEqual(fs.readdirSync(dir).sort(), [".gitkeep", "new-unused.png", "old-order.png", "old-product.png"]);
});

test("deletes nothing if it can't tell what is in use", async (t) => {
  const dir = makeDir({ "old.png": 48 });
  t.mock.method(Product, "distinct", async () => {
    throw new Error("db down");
  });
  t.mock.method(Order, "distinct", async () => []);

  await assert.rejects(cleanupUploads({ dir }), /db down/);
  assert.deepEqual(fs.readdirSync(dir), ["old.png"]);
});

test("a missing uploads folder is not an error", async (t) => {
  t.mock.method(Product, "distinct", async () => []);
  t.mock.method(Order, "distinct", async () => []);
  assert.deepEqual(await cleanupUploads({ dir: path.join(os.tmpdir(), "does-not-exist-xyz") }), []);
});

test("maxAgeMs controls the grace period", async (t) => {
  const dir = makeDir({ "two-hours-old.png": 2 });
  t.mock.method(Product, "distinct", async () => []);
  t.mock.method(Order, "distinct", async () => []);

  assert.deepEqual(await cleanupUploads({ dir, maxAgeMs: 3 * HOUR }), []);
  assert.deepEqual(await cleanupUploads({ dir, maxAgeMs: 1 * HOUR }), ["two-hours-old.png"]);
});

test("Cloudinary sweep deletes only old, unreferenced images in our folder", async (t) => {
  const { v2: sdk } = require("cloudinary");
  const { cleanupCloudinaryUploads } = require("../utils/cleanupUploads");
  process.env.CLOUDINARY_CLOUD_NAME = "democloud";
  process.env.CLOUDINARY_API_KEY = "k";
  process.env.CLOUDINARY_API_SECRET = "s";
  t.after(() => ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"].forEach((k) => delete process.env[k]));

  const url = (id) => `https://res.cloudinary.com/democloud/image/upload/v1/${id}.jpg`;
  const old = new Date(Date.now() - 48 * HOUR).toISOString();
  t.mock.method(Product, "distinct", async () => [url("aurelia/products/in-product")]);
  t.mock.method(Order, "distinct", async () => [url("aurelia/products/in-order")]);
  t.mock.method(sdk.api, "resources", async () => ({
    resources: [
      { public_id: "aurelia/products/in-product", created_at: old },
      { public_id: "aurelia/products/in-order", created_at: old },
      { public_id: "aurelia/products/orphan", created_at: old },
      { public_id: "aurelia/products/fresh", created_at: new Date().toISOString() },
    ],
  }));
  const destroy = t.mock.method(sdk.uploader, "destroy", async () => ({ result: "ok" }));

  assert.deepEqual(await cleanupCloudinaryUploads(), ["aurelia/products/orphan"]);
  assert.equal(destroy.mock.callCount(), 1);
});
