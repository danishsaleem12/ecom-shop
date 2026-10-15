// backend/scripts/ejson.js — finds MongoDB's Extended JSON helper (shared by backup-db.js and restore-db.js).
function loadEJSON() {
  const mongoose = require("mongoose");
  const fromDriver = mongoose.mongo && mongoose.mongo.BSON && mongoose.mongo.BSON.EJSON;
  if (fromDriver) return fromDriver;
  return require("bson").EJSON; // bson is installed alongside the MongoDB driver
}
module.exports = { loadEJSON };
