// tests/reviews.test.js — product reviews and ratings
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { start, call, signIn, oid } = require("./helpers");
const Review = require("../models/Review");
const Product = require("../models/Product");
const Order = require("../models/Order");
const { displayName } = require("../utils/reviews");

const PID = String(oid());

// A query-like object whose last step resolves to `rows`; records what it was asked
function chain(rows, seen = {}) {
  const q = {
    sort: (s) => ((seen.sort = s), q),
    skip: (n) => ((seen.skip = n), q),
    limit: (n) => ((seen.limit = n), q),
    populate: () => q,
    lean: async () => rows,
  };
  return q;
}

// Mocks what saving a review touches after the write: recomputing the product's stored rating
function mockRatingRefresh(t, grouped = []) {
  t.mock.method(Review, "aggregate", async () => grouped);
  return t.mock.method(Product, "updateOne", async () => ({ acknowledged: true }));
}

// ---- rules (no server) ------------------------------------------------------------------------------------

test("displayName: first name and last initial, never the full name", () => {
  assert.equal(displayName("Ayesha Khan"), "Ayesha K.");
  assert.equal(displayName("  ali   raza  khan "), "ali K.");
  assert.equal(displayName("Madonna"), "Madonna");
  assert.equal(displayName(""), "Customer");
  assert.equal(displayName(undefined), "Customer");
});

test("model: rating must be a whole number from 1 to 5", async () => {
  const base = { product: oid(), user: oid(), authorName: "A B." };
  await new Review({ ...base, rating: 5 }).validate();
  for (const rating of [0, 6, 2.5]) {
    await assert.rejects(() => new Review({ ...base, rating }).validate(), /Rating/);
  }
  await assert.rejects(() => new Review({ ...base }).validate(), /rating/i);
});

// ---- GET /api/reviews/product/:id -------------------------------------------------------------------------

test("list: public, answers reviews without private fields, plus the rating summary", async (t) => {
  const seen = {};
  const row = { _id: oid(), user: oid(), product: oid(), authorName: "Sara M.", rating: 5, title: "Lovely", comment: "Great", verifiedPurchase: true, status: "published", createdAt: new Date() };
  t.mock.method(Review, "find", (f) => ((seen.filter = f), chain([row], seen)));
  t.mock.method(Review, "aggregate", async () => [{ _id: 5, n: 3 }, { _id: 4, n: 1 }]);
  const srv = await start();
  t.after(srv.close);

  const r = await call(srv.base, `/api/reviews/product/${PID}`);
  assert.equal(r.status, 200);
  assert.equal(r.data.reviews.length, 1);
  assert.equal(r.data.reviews[0].authorName, "Sara M.");
  assert.equal(r.data.reviews[0].user, undefined); // who wrote it is never exposed
  assert.equal(r.data.reviews[0].status, undefined);
  assert.deepEqual(r.data.summary, { average: 4.8, count: 4, distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 3 } });
  assert.equal(r.data.total, 4);
  assert.equal(r.data.limit, 10);
  assert.equal(r.data.pages, 1);
  assert.equal(String(seen.filter.product), PID);
  assert.equal(seen.filter.status, "published"); // hidden reviews never show
});

test("list: sort and paging are read from the query and bounded", async (t) => {
  const seen = {};
  t.mock.method(Review, "find", () => chain([], seen));
  t.mock.method(Review, "aggregate", async () => []);
  const srv = await start();
  t.after(srv.close);

  const r = await call(srv.base, `/api/reviews/product/${PID}?sort=highest&page=3&limit=500`);
  assert.equal(r.status, 200);
  assert.equal(seen.sort.rating, -1);
  assert.equal(seen.limit, 50); // capped
  assert.equal(seen.skip, 100);
  assert.deepEqual(r.data.summary, { average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
});

test("list: a malformed product id is a 404, not a server error", async (t) => {
  const srv = await start();
  t.after(srv.close);
  assert.equal((await call(srv.base, "/api/reviews/product/not-an-id")).status, 404);
});

// ---- POST /api/reviews/product/:id ------------------------------------------------------------------------

const post = (srv, cookie, json, id = PID) => call(srv.base, `/api/reviews/product/${id}`, { method: "POST", json, cookie });

test("post: needs a signed-in user", async (t) => {
  const srv = await start();
  t.after(srv.close);
  assert.equal((await post(srv, undefined, { rating: 5 })).status, 401);
});

test("post: a customer who received the product can review it; rating is stored on the product", async (t) => {
  const { user, cookie } = signIn(t.mock);
  t.mock.method(Product, "exists", async () => ({ _id: PID }));
  const orderCheck = t.mock.method(Order, "exists", async () => ({ _id: oid() }));
  const created = t.mock.method(Review, "create", async (doc) => ({ ...doc, _id: oid(), status: "published", createdAt: new Date() }));
  const refresh = mockRatingRefresh(t, [{ _id: 4, n: 1 }]);
  const srv = await start();
  t.after(srv.close);

  const r = await post(srv, cookie, { rating: "4", title: "  Nice  ", comment: " Fits well " });
  assert.equal(r.status, 201);
  const saved = created.mock.calls[0].arguments[0];
  assert.equal(saved.rating, 4);
  assert.equal(saved.title, "Nice");
  assert.equal(saved.comment, "Fits well");
  assert.equal(saved.verifiedPurchase, true);
  assert.equal(saved.authorName, "Test U."); // "Test User" -> first name + initial
  assert.equal(String(saved.user), String(user._id));
  assert.deepEqual(orderCheck.mock.calls[0].arguments[0].status, "delivered");
  assert.deepEqual(refresh.mock.calls[0].arguments[1], { $set: { ratingAverage: 4, ratingCount: 1 } });
  assert.deepEqual(r.data.summary, { average: 4, count: 1 });
  assert.equal(r.data.review.user, undefined);
});

test("post: without a delivered order the review is refused (unless REVIEWS_REQUIRE_PURCHASE=false)", async (t) => {
  const { cookie } = signIn(t.mock);
  t.mock.method(Product, "exists", async () => ({ _id: PID }));
  t.mock.method(Order, "exists", async () => null);
  const created = t.mock.method(Review, "create", async (doc) => ({ ...doc, _id: oid(), status: "published" }));
  mockRatingRefresh(t);
  const srv = await start();
  t.after(srv.close);

  const refused = await post(srv, cookie, { rating: 5 });
  assert.equal(refused.status, 403);
  assert.equal(refused.data.code, "PURCHASE_REQUIRED");
  assert.equal(created.mock.callCount(), 0);

  process.env.REVIEWS_REQUIRE_PURCHASE = "false";
  t.after(() => delete process.env.REVIEWS_REQUIRE_PURCHASE);
  const open = await post(srv, cookie, { rating: 5 });
  assert.equal(open.status, 201);
  assert.equal(created.mock.calls[0].arguments[0].verifiedPurchase, false); // no "Verified purchase" label
});

test("post: bad ratings and over-long text are 400", async (t) => {
  const { cookie } = signIn(t.mock);
  t.mock.method(Product, "exists", async () => ({ _id: PID }));
  t.mock.method(Order, "exists", async () => ({ _id: oid() }));
  const created = t.mock.method(Review, "create", async () => ({}));
  const srv = await start();
  t.after(srv.close);

  for (const body of [{}, { rating: 0 }, { rating: 6 }, { rating: 3.5 }, { rating: "abc" }, { rating: 5, comment: "x".repeat(2001) }, { rating: 5, title: "x".repeat(101) }, { rating: 5, comment: 42 }]) {
    assert.equal((await post(srv, cookie, body)).status, 400, JSON.stringify(body).slice(0, 60));
  }
  assert.equal(created.mock.callCount(), 0);
});

test("post: a second review of the same product is a 409", async (t) => {
  const { cookie } = signIn(t.mock);
  t.mock.method(Product, "exists", async () => ({ _id: PID }));
  t.mock.method(Order, "exists", async () => ({ _id: oid() }));
  t.mock.method(Review, "create", async () => {
    throw Object.assign(new Error("dup"), { code: 11000 });
  });
  const srv = await start();
  t.after(srv.close);

  const r = await post(srv, cookie, { rating: 5 });
  assert.equal(r.status, 409);
  assert.match(r.data.message, /already reviewed/);
});

test("post: unknown product -> 404; unverified email -> 403", async (t) => {
  const { user, cookie } = signIn(t.mock);
  const exists = t.mock.method(Product, "exists", async () => null);
  const srv = await start();
  t.after(srv.close);

  assert.equal((await post(srv, cookie, { rating: 5 })).status, 404);
  exists.mock.mockImplementation(async () => ({ _id: PID }));
  user.emailVerified = false;
  const r = await post(srv, cookie, { rating: 5 });
  assert.equal(r.status, 403);
  assert.equal(r.data.code, "EMAIL_NOT_VERIFIED");
});

// ---- GET /api/reviews/product/:id/mine --------------------------------------------------------------------

test("mine: tells the product page whether to show the form, the edit view, or a note", async (t) => {
  const { cookie } = signIn(t.mock);
  let mine = null;
  let bought = false;
  t.mock.method(Review, "findOne", () => ({ lean: async () => mine }));
  t.mock.method(Order, "exists", async () => (bought ? { _id: oid() } : null));
  const srv = await start();
  t.after(srv.close);
  const ask = async () => (await call(srv.base, `/api/reviews/product/${PID}/mine`, { cookie })).data;

  let d = await ask();
  assert.deepEqual([d.review, d.canReview, d.needsPurchase], [null, false, true]);

  bought = true;
  d = await ask();
  assert.deepEqual([d.review, d.canReview, d.needsPurchase], [null, true, false]);

  mine = { _id: oid(), user: oid(), authorName: "T U.", rating: 4, status: "hidden", createdAt: new Date() };
  d = await ask();
  assert.equal(d.review.rating, 4);
  assert.equal(d.review.status, "hidden"); // the author is told their review is hidden
  assert.equal(d.canReview, false);

  assert.equal((await call(srv.base, `/api/reviews/product/${PID}/mine`)).status, 401);
});

// ---- PUT / DELETE -----------------------------------------------------------------------------------------

// A stand-in for a Mongoose document
function fakeReview(fields) {
  const r = { _id: oid(), product: oid(), status: "published", ...fields };
  r.set = (data) => Object.assign(r, data);
  r.save = async () => r;
  return r;
}

test("put: the author can edit; the product rating is recomputed", async (t) => {
  const { user, cookie } = signIn(t.mock);
  const review = fakeReview({ user: user._id, rating: 2, comment: "meh" });
  t.mock.method(Review, "findById", async () => review);
  const refresh = mockRatingRefresh(t, [{ _id: 5, n: 1 }]);
  const srv = await start();
  t.after(srv.close);

  const r = await call(srv.base, `/api/reviews/${review._id}`, { method: "PUT", cookie, json: { rating: 5, comment: "grew on me" } });
  assert.equal(r.status, 200);
  assert.equal(review.rating, 5);
  assert.equal(review.comment, "grew on me");
  assert.equal(refresh.mock.callCount(), 1);

  assert.equal((await call(srv.base, `/api/reviews/${review._id}`, { method: "PUT", cookie, json: { rating: 9 } })).status, 400);
  assert.equal((await call(srv.base, `/api/reviews/${review._id}`, { method: "PUT", cookie, json: {} })).status, 400);
});

test("put / delete: someone else's review looks like a missing one", async (t) => {
  const { cookie } = signIn(t.mock);
  const review = fakeReview({ user: oid(), rating: 2 }); // written by another customer
  t.mock.method(Review, "findById", async () => review);
  const del = t.mock.method(Review, "deleteOne", async () => ({ deletedCount: 1 }));
  const srv = await start();
  t.after(srv.close);

  assert.equal((await call(srv.base, `/api/reviews/${review._id}`, { method: "PUT", cookie, json: { rating: 5 } })).status, 404);
  assert.equal((await call(srv.base, `/api/reviews/${review._id}`, { method: "DELETE", cookie })).status, 404);
  assert.equal(del.mock.callCount(), 0);
  assert.equal(review.rating, 2);
});

test("delete: the author or an admin can delete, and the rating is recomputed", async (t) => {
  const mine = signIn(t.mock);
  const review = fakeReview({ user: mine.user._id, rating: 1 });
  t.mock.method(Review, "findById", async () => review);
  const del = t.mock.method(Review, "deleteOne", async () => ({ deletedCount: 1 }));
  const refresh = mockRatingRefresh(t);
  const srv = await start();
  t.after(srv.close);

  assert.equal((await call(srv.base, `/api/reviews/${review._id}`, { method: "DELETE", cookie: mine.cookie })).status, 200);
  assert.equal(del.mock.callCount(), 1);
  assert.deepEqual(refresh.mock.calls[0].arguments[1], { $set: { ratingAverage: 0, ratingCount: 0 } });
});

test("delete: an admin can delete anyone's review", async (t) => {
  const admin = signIn(t.mock, { role: "admin" });
  const review = fakeReview({ user: oid(), rating: 1 });
  t.mock.method(Review, "findById", async () => review);
  const del = t.mock.method(Review, "deleteOne", async () => ({ deletedCount: 1 }));
  mockRatingRefresh(t);
  const srv = await start();
  t.after(srv.close);

  assert.equal((await call(srv.base, `/api/reviews/${review._id}`, { method: "DELETE", cookie: admin.cookie })).status, 200);
  assert.equal(del.mock.callCount(), 1);
});

// ---- admin ------------------------------------------------------------------------------------------------

test("admin list: admins only", async (t) => {
  t.mock.method(Review, "countDocuments", async () => 0);
  t.mock.method(Review, "find", () => chain([]));
  const { user, cookie } = signIn(t.mock);
  const srv = await start();
  t.after(srv.close);

  assert.equal((await call(srv.base, "/api/reviews/admin/all")).status, 401);
  assert.equal((await call(srv.base, "/api/reviews/admin/all", { cookie })).status, 403);
  user.role = "admin";
  assert.equal((await call(srv.base, "/api/reviews/admin/all", { cookie })).status, 200);
});

test("admin list: returns the page, the total and how many are hidden", async (t) => {
  const seen = {};
  t.mock.method(Review, "countDocuments", async (f) => (f.status === "hidden" && !f.$or ? 2 : 7));
  t.mock.method(Review, "find", (f) => ((seen.filter = f), chain([{ _id: oid(), authorName: "A B.", rating: 3 }], seen)));
  const { cookie } = signIn(t.mock, { role: "admin" });
  const srv = await start();
  t.after(srv.close);

  const r = await call(srv.base, "/api/reviews/admin/all?status=hidden&search=a.b", { cookie });
  assert.equal(r.status, 200);
  assert.equal(r.data.reviews.length, 1);
  assert.equal(r.data.total, 7);
  assert.equal(r.data.hidden, 2);
  assert.equal(seen.filter.status, "hidden");
  assert.equal(seen.filter.$or[0].authorName.$regex, "a\\.b"); // the search text is escaped
});

test("admin status: hide / show a review; the product rating follows", async (t) => {
  const admin = signIn(t.mock, { role: "admin" });
  const { cookie } = admin;
  const review = fakeReview({ user: oid(), rating: 1 });
  t.mock.method(Review, "findById", async () => review);
  const refresh = mockRatingRefresh(t);
  const srv = await start();
  t.after(srv.close);

  const r = await call(srv.base, `/api/reviews/${review._id}/status`, { method: "PATCH", cookie, json: { status: "hidden" } });
  assert.equal(r.status, 200);
  assert.equal(review.status, "hidden");
  assert.equal(refresh.mock.callCount(), 1);

  assert.equal((await call(srv.base, `/api/reviews/${review._id}/status`, { method: "PATCH", cookie, json: { status: "deleted" } })).status, 400);

  admin.user.role = "user"; // the same session, now a plain customer
  assert.equal((await call(srv.base, `/api/reviews/${review._id}/status`, { method: "PATCH", cookie, json: { status: "published" } })).status, 403);
});

// ---- products ---------------------------------------------------------------------------------------------

test("products: ?sort=rating puts the best rated first", async (t) => {
  let sort;
  t.mock.method(Product, "countDocuments", async () => 0);
  t.mock.method(Product, "find", () => ({ sort: async (s) => ((sort = s), []) }));
  const srv = await start();
  t.after(srv.close);

  assert.equal((await call(srv.base, "/api/products?sort=rating")).status, 200);
  assert.equal(sort.ratingAverage, -1);
});

test("products: deleting a product also deletes its reviews", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  const id = oid();
  t.mock.method(Product, "findByIdAndDelete", async () => ({ _id: id, image: "https://example.com/p.jpg", images: [] }));
  const gone = t.mock.method(Review, "deleteMany", async () => ({ deletedCount: 3 }));
  const srv = await start();
  t.after(srv.close);

  assert.equal((await call(srv.base, `/api/products/${id}`, { method: "DELETE", cookie })).status, 200);
  assert.deepEqual(gone.mock.calls[0].arguments[0], { product: id });
});

test("products: an admin edit cannot overwrite the stored rating", async (t) => {
  const { cookie } = signIn(t.mock, { role: "admin" });
  const p = { _id: oid(), image: "/c.png", images: [], ratingAverage: 4.5, ratingCount: 10 };
  p.set = (data) => Object.assign(p, data);
  p.save = async () => p;
  t.mock.method(Product, "findById", async () => p);
  const srv = await start();
  t.after(srv.close);

  const r = await call(srv.base, `/api/products/${p._id}`, { method: "PUT", cookie, json: { ratingAverage: 5, ratingCount: 999 } });
  assert.equal(r.status, 200);
  assert.equal(p.ratingAverage, 4.5);
  assert.equal(p.ratingCount, 10);
});
