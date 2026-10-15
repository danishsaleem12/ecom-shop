// backend/scripts/backup-db.js — copies every MongoDB collection to files you can keep.   npm run backup
//
// Writes backups/<date-time>/<collection>.ndjson (one document per line, MongoDB Extended JSON so ids,
// dates and numbers survive exactly) plus a manifest.json with the counts. Needs no extra tools
// (no mongodump), so it also works on Atlas's free tier, which has no automatic backups.
//
//   BACKUP_DIR   where backups go (default: backend/backups)
//   BACKUP_KEEP  how many recent backups to keep, older ones are deleted (default 14; 0 = keep all)
//
// The files contain customer details and password hashes: keep them private, never commit them.
require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");
const { loadEJSON } = require("./ejson");

const BACKUP_DIR = path.resolve(process.env.BACKUP_DIR || path.join(__dirname, "..", "backups"));
const KEEP = process.env.BACKUP_KEEP === undefined ? 14 : Number(process.env.BACKUP_KEEP);
const stamp = () => new Date().toISOString().replace(/[:.]/g, "-").replace("Z", "Z");

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is missing from .env — nothing done");
    process.exit(1);
  }
  const EJSON = loadEJSON();
  await mongoose.connect(process.env.MONGODB_URI);
  const dir = path.join(BACKUP_DIR, stamp());
  fs.mkdirSync(dir, { recursive: true });

  const collections = (await mongoose.connection.db.listCollections({}, { nameOnly: true }).toArray())
    .map((c) => c.name)
    .filter((n) => !n.startsWith("system."))
    .sort();

  const counts = {};
  for (const name of collections) {
    const out = fs.createWriteStream(path.join(dir, `${name}.ndjson`));
    let n = 0;
    for await (const doc of mongoose.connection.db.collection(name).find({})) {
      if (!out.write(EJSON.stringify(doc, { relaxed: false }) + "\n")) await new Promise((r) => out.once("drain", r));
      n++;
    }
    await new Promise((resolve, reject) => out.end((err) => (err ? reject(err) : resolve())));
    counts[name] = n;
    console.log(`  ${name}: ${n} document${n === 1 ? "" : "s"}`);
  }
  fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({ createdAt: new Date().toISOString(), counts }, null, 2));
  console.log(`Backup saved to ${dir}`);

  if (KEEP > 0) {
    const old = fs
      .readdirSync(BACKUP_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory() && fs.existsSync(path.join(BACKUP_DIR, d.name, "manifest.json"))) // only folders this script made
      .map((d) => d.name)
      .sort()
      .slice(0, -KEEP);
    for (const name of old) {
      fs.rmSync(path.join(BACKUP_DIR, name), { recursive: true, force: true });
      console.log(`  removed old backup ${name}`);
    }
  }
}

main()
  .catch((err) => {
    console.error("Backup failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
