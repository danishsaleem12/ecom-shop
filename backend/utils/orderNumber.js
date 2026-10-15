// backend/utils/orderNumber.js — short, random, easy-to-read order numbers like "K7QM-4TXD"
const crypto = require("crypto");

// 32 characters. I, O, 0 and 1 are left out because people mix them up when reading a number
// aloud or typing it from a phone screen. 32^8 is about 1.1 trillion combinations, so numbers
// are hard to guess and collisions are extremely rare (the unique index catches the rare one).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_RE = /^[A-HJ-NP-Z2-9]{8}$/;

/** A fresh order number, e.g. "K7QM-4TXD". */
function generateOrderNumber() {
  let code = "";
  for (let i = 0; i < 8; i++) code += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/** Whatever a customer typed ("#k7qm 4txd", "K7QM-4TXD") -> "K7QM4TXD" (letters and digits only, upper case). */
const normalizeCode = (input) => String(input).replace(/[^a-z0-9]/gi, "").toUpperCase();

/** True if a normalized code could be a real order number (right length, only allowed characters). */
const isOrderCode = (code) => CODE_RE.test(code);

module.exports = { generateOrderNumber, normalizeCode, isOrderCode };
