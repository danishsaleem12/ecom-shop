// backend/utils/cart.js — the cart saved on a customer's account, so it follows them across devices.
//
// Only the bare minimum is stored per line: { product, variant?, qty }. Name, price, image and stock are
// looked up from the product every time the cart is read (hydrateCart), so a saved cart can never show an old
// price or sell something that was deleted or ran out.
const mongoose = require("mongoose");
const Product = require("../models/Product");

const MAX_LINES = 50;
const MAX_QTY = 99;

const isId = (v) => mongoose.Types.ObjectId.isValid(String(v));
const lineKey = (l) => (l.variant ? `${l.product}:${l.variant}` : String(l.product));

/**
 * Checks what the browser sent. Resolves { lines } (duplicates of the same product + option combined by keeping
 * the larger quantity) or { error }.
 */
function parseCartLines(input) {
  if (!Array.isArray(input)) return { error: "items must be a list" };
  if (input.length > MAX_LINES) return { error: `A cart can hold at most ${MAX_LINES} different items` };

  const byKey = new Map();
  for (const raw of input) {
    const product = raw?.product;
    const variant = raw?.variant;
    if (!isId(product) || (variant !== undefined && variant !== null && variant !== "" && !isId(variant))) {
      return { error: "Each item needs a valid product" };
    }
    if (!Number.isInteger(raw.qty) || raw.qty < 1) return { error: "Each quantity must be a whole number of at least 1" };

    const line = { product: String(product), ...(variant ? { variant: String(variant) } : {}), qty: Math.min(raw.qty, MAX_QTY) };
    const key = lineKey(line);
    const existing = byKey.get(key);
    if (!existing || line.qty > existing.qty) byKey.set(key, line);
  }
  return { lines: [...byKey.values()] };
}

/** Combines the saved cart with the one from this browser: same item in both -> the larger quantity. */
function mergeLines(saved, incoming) {
  const byKey = new Map();
  for (const l of [...saved, ...incoming]) {
    const key = lineKey(l);
    const existing = byKey.get(key);
    if (!existing || l.qty > existing.qty) byKey.set(key, l);
  }
  return [...byKey.values()].slice(0, MAX_LINES);
}

/** What the database stores -> plain { product, variant?, qty } lines. */
const storedLines = (cart) =>
  (cart || []).map((l) => ({ product: String(l.product), ...(l.variant ? { variant: String(l.variant) } : {}), qty: l.qty }));

/**
 * Turns saved lines into the shape the storefront's cart uses:
 * { key, id, variantId?, size?, color?, name, price, image, stock, qty }.
 * Lines whose product was deleted, whose option is gone or that are sold out are dropped; quantities are trimmed to stock.
 */
async function hydrateCart(lines) {
  if (!lines || lines.length === 0) return [];
  const products = await Product.find({ _id: { $in: lines.map((l) => l.product) } });
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const items = [];
  for (const l of lines) {
    const p = byId.get(String(l.product));
    if (!p) continue;

    let stock = p.stock;
    let variant = null;
    if (p.variants && p.variants.length > 0) {
      variant = l.variant ? p.variants.find((v) => String(v._id) === String(l.variant)) : null;
      if (!variant) continue; // option removed, or the line was saved before this product had options
      stock = variant.stock;
    } else if (l.variant) {
      continue; // the product no longer has options
    }
    if (!(stock > 0)) continue;

    items.push({
      key: lineKey(l),
      id: String(p._id),
      ...(variant ? { variantId: String(variant._id), size: variant.size || undefined, color: variant.color || undefined } : {}),
      name: p.name,
      price: p.price,
      image: p.image,
      stock,
      qty: Math.min(l.qty, stock),
    });
  }
  return items;
}

/** hydrated items -> { product, variant?, qty } lines (used to save the cleaned-up cart back). */
const toLines = (items) => items.map((i) => ({ product: i.id, ...(i.variantId ? { variant: i.variantId } : {}), qty: i.qty }));

module.exports = { MAX_LINES, MAX_QTY, parseCartLines, mergeLines, storedLines, hydrateCart, toLines };
