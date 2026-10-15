const { test } = require("node:test");
const assert = require("node:assert/strict");
const Order = require("../models/Order");
const { generateOrderNumber, normalizeCode, isOrderCode } = require("../utils/orderNumber");

test("order number: looks like XXXX-XXXX and never uses I, O, 0 or 1", () => {
  for (let i = 0; i < 500; i++) {
    const n = generateOrderNumber();
    assert.match(n, /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
  }
});

test("order number: 500 draws are all different", () => {
  const seen = new Set(Array.from({ length: 500 }, generateOrderNumber));
  assert.equal(seen.size, 500);
});

test("order number: typed variations normalize to the same code", () => {
  for (const typed of ["K7QM-4TXD", "k7qm-4txd", "#K7QM 4TXD", " k7qm4txd "]) {
    assert.equal(normalizeCode(typed), "K7QM4TXD");
  }
  assert.equal(isOrderCode("K7QM4TXD"), true);
  assert.equal(isOrderCode("K7QM4TX"), false); // too short
  assert.equal(isOrderCode("K7QM0TXD"), false); // 0 is not allowed
  assert.equal(isOrderCode("NOTACODE"), false); // O is not allowed
});

test("order model: a new order gets an order number automatically", () => {
  assert.match(new Order({}).orderNumber, /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
});

test("order model: orderNumber has a unique, sparse index (old orders without one can coexist)", () => {
  const [, options] = Order.schema.indexes().find(([keys]) => keys.orderNumber === 1);
  assert.equal(options.unique, true);
  assert.equal(options.sparse, true);
});
