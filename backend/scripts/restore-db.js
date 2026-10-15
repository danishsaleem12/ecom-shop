// backend/scripts/restore-db.js — loads a backup made by `npm run backup` back into MongoDB.
//
//   npm run restore -- backups/2026-10-15T09-00-00-000Z --yes             restore into EMPTY collections only
//   npm run restore -- backups/2026-10-15T09-00-00-000Z --yes --drop      first DELETE what is there, then restore
//
// It runs against the database in MONGODB_URI, so practise on a spare Atlas database first (see docs/OPERATIONS.md).
// Without --yes it only shows what it would do.
require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");
const readline = require("node:readline");
const mongoose = require("mongoose");
const { loadEJSON } = require("./ejson");

const args = process.argv.slice(2);
const folder = args.find((a) => !a.startsWith("--"));
const yes = args.includes("--yes");
const drop = args.includes("--drop");

async function main() {
  if (!folder) throw new Error("usage: npm run restore -- <backup folder> [--yes] [--drop]");
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is missing from .env — nothing done");
  const dir = path.resolve(folder);
  if (!fs.existsSync(path.join(dir, "manifest.json"))) throw new Error(`${dir} is not a backup folder (no manifest.json)`);
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".ndjson"));
  const EJSON = loadEJSON();

  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  console.log(`Database: ${db.databaseName}${yes ? "" : "   (dry run — add --yes to apply)"}`);

  for (const file of files) {
    const name = file.replace(/\.ndjson$/, "");
    const col = db.collection(name);
    const existing = await col.countDocuments({});
    if (existing > 0 && !drop) {
      console.log(`  ${name}: SKIPPED — already has ${existing} documents (use --drop to replace them)`);
      continue;
    }
    if (!yes) {
      console.log(`  ${name}: would ${existing ? `delete ${existing} and ` : ""}restore from ${file}`);
      continue;
    }
    if (existing > 0) await col.deleteMany({});
    let batch = [];
    let n = 0;
    const flush = async () => {
      if (batch.length) await col.insertMany(batch, { ordered: false });
      n += batch.length;
      batch = [];
    };
    const lines = readline.createInterface({ input: fs.createReadStream(path.join(dir, file)), crlfDelay: Infinity });
    for await (const line of lines) {
      if (!line.trim()) continue;
      batch.push(EJSON.parse(line, { relaxed: false }));
      if (batch.length >= 500) await flush();
    }
    await flush();
    console.log(`  ${name}: restored ${n} documents`);
  }
  if (yes) console.log("Done. Indexes are rebuilt by the app on its next start.");
}

main()
  .catch((err) => {
    console.error("Restore failed:", err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
