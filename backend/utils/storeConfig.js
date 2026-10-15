// backend/utils/storeConfig.js
//
// THE one place for the store's shipping and return numbers. Everything reads from here:
//   - orders.routes.js        (what an order is actually charged)
//   - utils/returns.js        (how long a customer can request a return)
//   - GET /api/config         (the frontend: cart, checkout, announcement bar, Help/Terms/Shipping pages)
//
// To change a value, set it in the environment (no code change, then restart the server):
//   FREE_SHIPPING_THRESHOLD=15000   SHIPPING_FEE=350   RETURN_WINDOW_DAYS=14
// A missing, non-numeric or negative value falls back to the default below.

const num = (value, fallback, { integer = false, min = 0 } = {}) => {
  if (value === undefined || String(value).trim() === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) && n >= min && (!integer || Number.isInteger(n)) ? n : fallback;
};

const DEFAULTS = { FREE_SHIPPING_THRESHOLD: 15000, SHIPPING_FEE: 350, RETURN_WINDOW_DAYS: 14 };

const FREE_SHIPPING_THRESHOLD = num(process.env.FREE_SHIPPING_THRESHOLD, DEFAULTS.FREE_SHIPPING_THRESHOLD);
const SHIPPING_FEE = num(process.env.SHIPPING_FEE, DEFAULTS.SHIPPING_FEE);
const RETURN_WINDOW_DAYS = num(process.env.RETURN_WINDOW_DAYS, DEFAULTS.RETURN_WINDOW_DAYS, { integer: true, min: 1 });

/** What GET /api/config sends to the browser. Public values only. */
const publicConfig = () => ({
  currency: "PKR",
  freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
  shippingFee: SHIPPING_FEE,
  returnWindowDays: RETURN_WINDOW_DAYS,
});

module.exports = { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE, RETURN_WINDOW_DAYS, publicConfig };
