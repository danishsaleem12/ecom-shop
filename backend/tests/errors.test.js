const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const multer = require("multer");
const { start, call, signIn, quietErrors } = require("./helpers");
const errorHandler = require("../middleware/errorHandler");
const Product = require("../models/Product");

const fakeRes = () => {
  const r = { headersSent: false };
  r.status = (code) => ((r.code = code), r);
  r.json = (body) => ((r.body = body), r);
  return r;
};
const run = (t, err) => {
  quietErrors(t.mock);
  const res = fakeRes();
  errorHandler(err, {}, res, () => assert.fail("next() should not be called"));
  return res;
};

// ---- global error handler (unit) -------------------------------------------------------------

test("errorHandler: unknown errors become a generic 500 and never expose err.message", (t) => {
  const res = run(t, new Error("password=hunter2 host=10.0.0.5"));
  assert.equal(res.code, 500);
  assert.deepEqual(res.body, { message: "Something went wrong" });
});

test("errorHandler: oversize upload -> 413", (t) => {
  const res = run(t, new multer.MulterError("LIMIT_FILE_SIZE"));
  assert.equal(res.code, 413);
});

test("errorHandler: other multer errors -> 400", (t) => {
  const res = run(t, new multer.MulterError("LIMIT_UNEXPECTED_FILE"));
  assert.equal(res.code, 400);
});

test("errorHandler: wrong file type -> 400 with our own message", (t) => {
  const res = run(t, Object.assign(new Error("Only JPG, PNG, WebP or AVIF images are allowed"), { code: "INVALID_FILE_TYPE" }));
  assert.equal(res.code, 400);
  assert.match(res.body.message, /Only JPG/);
});

test("errorHandler: hands off to Express if the response already started", (t) => {
  const res = fakeRes();
  res.headersSent = true;
  let passed;
  errorHandler(new Error("x"), {}, res, (e) => (passed = e));
  assert.ok(passed instanceof Error);
  assert.equal(res.code, undefined);
});

// ---- through the real app --------------------------------------------------------------------

test("malformed JSON -> 400 with a fixed message (not the parser's text)", async (t) => {
  const srv = await start();
  t.after(srv.close);
  const r = await call(srv.base, "/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{not json",
  });
  assert.equal(r.status, 400);
  assert.equal(r.data.message, "Request body is not valid JSON");
});

test("upload: wrong file type -> 400 (and other errors are no longer all 400)", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  const srv = await start();
  t.after(srv.close);

  const form = new FormData();
  form.append("image", new Blob(["hello"], { type: "text/plain" }), "notes.txt");
  const r = await call(srv.base, "/api/upload", { method: "POST", body: form, cookie });
  assert.equal(r.status, 400);
  assert.match(r.data.message, /Only JPG/);
});

test("upload: admin can upload a PNG; it is stored and served cross-origin-readable", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  const srv = await start();
  t.after(srv.close);

  const form = new FormData();
  form.append("image", new Blob([Buffer.from("89504e470d0a1a0a", "hex")], { type: "image/png" }), "pic.png");
  const up = await call(srv.base, "/api/upload", { method: "POST", body: form, cookie });
  assert.equal(up.status, 201);
  assert.match(up.data.url, /^\/uploads\/.+\.png$/);
  assert.ok(fs.existsSync(path.join(process.env.UPLOAD_DIR, path.basename(up.data.url))));

  const img = await call(srv.base, up.data.url);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get("cross-origin-resource-policy"), "cross-origin");
});

test("upload: a non-admin gets 403 and nothing is written to disk", async (t) => {
  const { cookie } = signIn(t.mock, { role: "user" });
  const srv = await start();
  t.after(srv.close);

  const before = fs.readdirSync(process.env.UPLOAD_DIR).length;
  const form = new FormData();
  form.append("image", new Blob(["x"], { type: "image/png" }), "pic.png");
  const r = await call(srv.base, "/api/upload", { method: "POST", body: form, cookie });
  assert.equal(r.status, 403);
  assert.equal(fs.readdirSync(process.env.UPLOAD_DIR).length, before);
});

test("products: creating without signing in -> 401", async (t) => {
  const srv = await start();
  t.after(srv.close);
  const r = await call(srv.base, "/api/products", { method: "POST", json: { name: "x" } });
  assert.equal(r.status, 401);
});

test("products: schema validation failure -> 400 listing the fields, no raw error object", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  t.mock.method(Product, "create", async () => {
    throw new Product({}).validateSync(); // a real Mongoose ValidationError, no database needed
  });
  const srv = await start();
  t.after(srv.close);

  const r = await call(srv.base, "/api/products", { method: "POST", json: {}, cookie });
  assert.equal(r.status, 400);
  assert.match(r.data.message, /Failed to create product/);
  assert.ok(r.data.errors.name && r.data.errors.image);
  assert.equal(r.data.error, undefined);
});

test("products: unexpected failure while creating -> 500 with a generic message", async (t) => {
  quietErrors(t.mock);
  const { cookie } = signIn(t.mock, { role: "admin" });
  t.mock.method(Product, "create", async () => {
    throw new Error("disk exploded at 10.0.0.5");
  });
  const srv = await start();
  t.after(srv.close);

  const r = await call(srv.base, "/api/products", { method: "POST", json: { name: "x" }, cookie });
  assert.equal(r.status, 500);
  assert.equal(r.data.message, "Failed to create product");
  assert.ok(!r.text.includes("10.0.0.5"));
});

test("products: listing failure -> 500 without leaking the error", async (t) => {
  quietErrors(t.mock);
  t.mock.method(Product, "countDocuments", async () => {
    throw new Error("secret query detail");
  });
  const srv = await start();
  t.after(srv.close);

  const r = await call(srv.base, "/api/products");
  assert.equal(r.status, 500);
  assert.ok(!r.text.includes("secret query detail"));
});

test("products: a malformed id -> 400, not a 500", async (t) => {
  const srv = await start();
  t.after(srv.close);
  const r = await call(srv.base, "/api/products/not-an-id");
  assert.equal(r.status, 400);
});

// ---- Cloudinary storage (the SDK is mocked: no network, no account needed) ----
const { PassThrough } = require("node:stream");
const { v2: cloudinarySdk } = require("cloudinary");
const imageStorage = require("../utils/imageStorage");

function withCloudinaryEnv(t) {
  const keys = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"];
  const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]]));
  process.env.CLOUDINARY_CLOUD_NAME = "democloud";
  process.env.CLOUDINARY_API_KEY = "key";
  process.env.CLOUDINARY_API_SECRET = "secret";
  t.after(() => keys.forEach((k) => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k]))));
}

test("upload: with Cloudinary configured the image goes to Cloudinary, not the disk", async (t) => {
  withCloudinaryEnv(t);
  const { cookie } = signIn(t.mock, { role: "admin" });
  let options;
  t.mock.method(cloudinarySdk.uploader, "upload_stream", (opts, cb) => {
    options = opts;
    const s = new PassThrough();
    s.on("finish", () => cb(null, { secure_url: "https://res.cloudinary.com/democloud/image/upload/v1/aurelia/products/abc.png" }));
    s.resume();
    return s;
  });
  const srv = await start();
  t.after(srv.close);

  const before = fs.readdirSync(process.env.UPLOAD_DIR).length;
  const form = new FormData();
  form.append("image", new Blob([Buffer.from("89504e470d0a1a0a", "hex")], { type: "image/png" }), "pic.png");
  const r = await call(srv.base, "/api/upload", { method: "POST", body: form, cookie });
  assert.equal(r.status, 201);
  assert.equal(r.data.url, "https://res.cloudinary.com/democloud/image/upload/v1/aurelia/products/abc.png");
  assert.equal(options.folder, "aurelia/products");
  assert.equal(fs.readdirSync(process.env.UPLOAD_DIR).length, before);
});

test("upload: a Cloudinary failure -> 500 with a safe message", async (t) => {
  withCloudinaryEnv(t);
  quietErrors(t.mock);
  const { cookie } = signIn(t.mock, { role: "admin" });
  t.mock.method(cloudinarySdk.uploader, "upload_stream", (opts, cb) => {
    const s = new PassThrough();
    s.on("finish", () => cb(new Error("secret internal detail")));
    s.resume();
    return s;
  });
  const srv = await start();
  t.after(srv.close);

  const form = new FormData();
  form.append("image", new Blob(["x"], { type: "image/png" }), "pic.png");
  const r = await call(srv.base, "/api/upload", { method: "POST", body: form, cookie });
  assert.equal(r.status, 500);
  assert.equal(r.data.message, "Image upload failed");
});

test("imageStorage: only our own Cloudinary images are recognised and deleted", async (t) => {
  withCloudinaryEnv(t);
  const ours = "https://res.cloudinary.com/democloud/image/upload/v123/aurelia/products/abc.jpg";
  assert.equal(imageStorage.cloudinaryPublicId(ours), "aurelia/products/abc");
  assert.equal(imageStorage.cloudinaryPublicId("https://res.cloudinary.com/othercloud/image/upload/v1/aurelia/products/abc.jpg"), null);
  assert.equal(imageStorage.cloudinaryPublicId("https://res.cloudinary.com/democloud/image/upload/v1/other-folder/abc.jpg"), null);
  assert.equal(imageStorage.cloudinaryPublicId("https://images.unsplash.com/photo-1"), null);
  assert.equal(imageStorage.cloudinaryPublicId("/uploads/a.png"), null);

  const destroy = t.mock.method(cloudinarySdk.uploader, "destroy", async () => ({ result: "ok" }));
  await imageStorage.removeImage(ours);
  await imageStorage.removeImage("https://images.unsplash.com/photo-1");
  assert.equal(destroy.mock.callCount(), 1);
  assert.equal(destroy.mock.calls[0].arguments[0], "aurelia/products/abc");
});
