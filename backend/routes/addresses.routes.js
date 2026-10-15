// backend/routes/addresses.routes.js
// The signed-in customer's saved delivery addresses (at most MAX_ADDRESSES).
//   GET    /api/addresses              list (default first)
//   POST   /api/addresses              add one          body: { label?, fullName, phone, line1, city, postalCode?, isDefault? }
//   PUT    /api/addresses/:id          edit one         same body
//   PATCH  /api/addresses/:id/default  make it the default
//   DELETE /api/addresses/:id          remove one
// Every route only ever touches the caller's own user document, so nobody can read or change another
// customer's addresses.
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const { protect } = require("../middleware/auth");
const { handleRouteError } = require("../utils/errors");
const { MAX_ADDRESSES, parseAddress, sortAddresses } = require("../utils/addresses");

router.use(protect);

const NOT_FOUND = "Address not found";

// The subdocument with this id on the current user, or null (also for a malformed id)
const find = (user, id) => (mongoose.Types.ObjectId.isValid(id) ? user.addresses.id(id) : null);

// Only one address can be the default
const clearDefaults = (user) => user.addresses.forEach((a) => (a.isDefault = false));

const reply = (user, extra = {}) => ({ ...extra, addresses: sortAddresses(user.addresses) });

router.get("/", (req, res) => {
  res.json(reply(req.user));
});

router.post("/", async (req, res) => {
  try {
    const { value, error } = parseAddress(req.body);
    if (error) return res.status(400).json({ message: error });
    if (req.user.addresses.length >= MAX_ADDRESSES) {
      return res.status(409).json({ message: `You can save up to ${MAX_ADDRESSES} addresses. Delete one to add another.` });
    }

    // The first address is always the default
    const makeDefault = value.isDefault === true || req.user.addresses.length === 0;
    if (makeDefault) clearDefaults(req.user);
    req.user.addresses.push({ ...value, isDefault: makeDefault });
    await req.user.save();

    const saved = req.user.addresses[req.user.addresses.length - 1];
    res.status(201).json(reply(req.user, { address: saved }));
  } catch (err) {
    handleRouteError(res, err, "Failed to save address");
  }
});

router.put("/:id", async (req, res) => {
  try {
    const address = find(req.user, req.params.id);
    if (!address) return res.status(404).json({ message: NOT_FOUND });

    const { value, error } = parseAddress(req.body);
    if (error) return res.status(400).json({ message: error });

    const { isDefault, ...fields } = value;
    address.set(fields);
    // Making it the default moves the flag. Un-ticking the default is ignored: one address always stays default.
    if (isDefault === true && !address.isDefault) {
      clearDefaults(req.user);
      address.isDefault = true;
    }
    await req.user.save();

    res.json(reply(req.user, { address }));
  } catch (err) {
    handleRouteError(res, err, "Failed to update address");
  }
});

router.patch("/:id/default", async (req, res) => {
  try {
    const address = find(req.user, req.params.id);
    if (!address) return res.status(404).json({ message: NOT_FOUND });

    clearDefaults(req.user);
    address.isDefault = true;
    await req.user.save();

    res.json(reply(req.user, { address }));
  } catch (err) {
    handleRouteError(res, err, "Failed to update address");
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const address = find(req.user, req.params.id);
    if (!address) return res.status(404).json({ message: NOT_FOUND });

    const wasDefault = address.isDefault;
    req.user.addresses.pull(address._id);
    // Deleting the default hands the role to the oldest remaining address
    if (wasDefault && req.user.addresses.length > 0) req.user.addresses[0].isDefault = true;
    await req.user.save();

    res.json(reply(req.user));
  } catch (err) {
    handleRouteError(res, err, "Failed to delete address");
  }
});

module.exports = router;
