// backend/tests/helpers.js
// Test setup shared by every test file. Require this BEFORE anything from the app: it sets the
// environment the app reads at load time (secret, temp upload folder).
//
// No database is used. Tests replace the few Mongoose model methods a route calls
// (t.mock.method(Product, "find", ...)) and restore them automatically when the test ends.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

process.env.JWT_SECRET = "test-secret";
process.env.NODE_ENV = "test";
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "aurelia-uploads-"));
delete process.env.TRUST_PROXY;
for (const k of ["CLOUDINARY_URL", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) delete process.env[k]; // tests never touch a real Cloudinary account

const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { COOKIE_NAME } = require("../middleware/auth");
const User = require("../models/User");
const createApp = require("../app");

const oid = () => new mongoose.Types.ObjectId();

/** Starts a fresh app (fresh rate-limit counters) on a random port. */
async function start() {
  const server = createApp().listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  return {
    base: `http://127.0.0.1:${server.address().port}`,
    close: () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections?.();
      }),
  };
}

/** fetch wrapper: pass `json` for a JSON body, or `body` for anything else (FormData, raw text). */
async function call(base, urlPath, { method = "GET", json, body, cookie, headers = {} } = {}) {
  const res = await fetch(base + urlPath, {
    method,
    headers: {
      ...(json !== undefined ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : body,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data, text, headers: res.headers };
}

/** Makes the auth middleware accept a request as `role`; returns the cookie to send. */
function signIn(mock, { role = "user" } = {}) {
  const user = { _id: oid(), name: "Test User", email: "test@example.com", role };
  mock.method(User, "findById", async () => user);
  const token = jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET);
  return { user, cookie: `${COOKIE_NAME}=${token}` };
}

/** Silences the server-side console.error that handled errors produce. */
const quietErrors = (mock) => mock.method(console, "error", () => {});

module.exports = { start, call, signIn, quietErrors, oid };
