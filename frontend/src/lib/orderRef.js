// src/lib/orderRef.js
// The order number to show customers and admins, e.g. "K7QM-4TXD".
// Orders placed before order numbers existed don't have one yet, so they fall back to the old
// 8-character code (last 8 characters of the database id). Run `npm run orders:backfill` in the
// backend to give old orders a real number; this fallback then never triggers.
export const orderRef = (order) =>
  order?.orderNumber || String(order?._id || '').slice(-8).toUpperCase();
