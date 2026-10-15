// backend/utils/addresses.js
// Rules for the delivery addresses a customer can save on their account.
// The phone rule is the same one checkout uses, so a saved address always passes checkout.

const MAX_ADDRESSES = 5;
const PHONE_RE = /^[0-9+\-\s]{7,15}$/;

// [field, label, max length, required]
const FIELDS = [
  ["label", "Label", 30, false],
  ["fullName", "Full name", 80, true],
  ["phone", "Phone", 20, true],
  ["line1", "Address", 200, true],
  ["city", "City", 60, true],
  ["postalCode", "Postal code", 12, false],
];

/**
 * Checks a request body. Returns { value } with trimmed, known fields only (plus isDefault when sent),
 * or { error } with a message the customer can read.
 */
function parseAddress(body = {}) {
  const value = {};
  for (const [key, label, max, required] of FIELDS) {
    const raw = body[key];
    if (raw === undefined || raw === null || raw === "") {
      if (required) return { error: `${label} is required` };
      value[key] = ""; // lets an edit clear an optional field
      continue;
    }
    if (typeof raw !== "string") return { error: `${label} must be text` };
    const text = raw.trim();
    if (!text && required) return { error: `${label} is required` };
    if (text.length > max) return { error: `${label} can be at most ${max} characters` };
    value[key] = text;
  }
  if (!PHONE_RE.test(value.phone)) return { error: "Enter a valid phone number" };
  if (body.isDefault !== undefined) {
    if (typeof body.isDefault !== "boolean") return { error: "isDefault must be true or false" };
    value.isDefault = body.isDefault;
  }
  return { value };
}

/** What the frontend gets: the default address first, then the rest in the order they were added. */
function sortAddresses(list = []) {
  const plain = list.map((a) => (typeof a.toObject === "function" ? a.toObject() : a));
  return [...plain.filter((a) => a.isDefault), ...plain.filter((a) => !a.isDefault)];
}

module.exports = { MAX_ADDRESSES, PHONE_RE, parseAddress, sortAddresses };
