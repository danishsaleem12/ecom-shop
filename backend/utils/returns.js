// backend/utils/returns.js — the rules for return requests, in one place
//
// RETURN_WINDOW_DAYS lives in utils/storeConfig.js (one source for the backend and, via GET /api/config, the website).
const { RETURN_WINDOW_DAYS } = require("./storeConfig");

// reason value -> label (the customer's form shows the same list)
const RETURN_REASONS = {
  "wrong-size": "Wrong size or fit",
  "not-as-described": "Not as described",
  damaged: "Arrived damaged or faulty",
  "changed-mind": "Changed my mind",
  other: "Other",
};

const RETURN_STATUSES = ["requested", "approved", "rejected", "received", "refunded"];

// new status -> the statuses it may be reached from (rejected and refunded are final)
const RETURN_MOVES = {
  approved: ["requested"],
  rejected: ["requested"],
  received: ["approved"],
  refunded: ["received"],
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Last moment a return can be requested for an order: RETURN_WINDOW_DAYS after it was delivered.
 * Orders delivered before `deliveredAt` existed fall back to their last-updated date.
 * Returns null when there is no date to count from.
 */
function returnDeadline(order) {
  const from = order?.deliveredAt || order?.updatedAt || order?.createdAt;
  if (!from) return null;
  return new Date(new Date(from).getTime() + RETURN_WINDOW_DAYS * DAY_MS);
}

module.exports = { RETURN_WINDOW_DAYS, RETURN_REASONS, RETURN_STATUSES, RETURN_MOVES, returnDeadline };
