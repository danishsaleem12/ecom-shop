// backend/seed.js
//
// Usage (from /backend):
//   npm run seed              add the sample products that don't exist yet, and create/promote the admin
//   npm run make-admin        only the admin step
//   npm run seed:reset        DELETE ALL products first, then add the samples (asks you to confirm)
//
// Flags:  --admin-only   skip products
//         --reset        delete every product before seeding (refused when NODE_ENV=production)
//         --set-password  also overwrite the existing admin account's password with ADMIN_PASSWORD
//         --yes          skip the confirmation prompt for --reset (needed in non-interactive shells)
//
// Admin account comes from .env (no password is ever hard-coded here):
//   ADMIN_EMAIL=you@example.com      (ADMIN_USERNAME works too)
//   ADMIN_PASSWORD=at-least-8-characters
//   ADMIN_NAME=Aurelia Admin          (optional)
// If the email already has an account, that account is promoted to admin and its
// password is left unchanged.

require("dotenv").config();
const readline = require("readline");
const mongoose = require("mongoose");
const Product = require("./models/Product");
const Review = require("./models/Review");
const User = require("./models/User");

const args = new Set(process.argv.slice(2));
const ADMIN_ONLY = args.has("--admin-only");
const RESET = args.has("--reset");
const ASSUME_YES = args.has("--yes");
const SET_PASSWORD = args.has("--set-password");

// Same photos the storefront already uses for its category tiles.
const img = (id) => `https://images.unsplash.com/${id}?q=80&w=800&auto=format&fit=crop`;

// Categories must match CATEGORY_OPTIONS in ShopCollection.js and collection slugs must
// match frontend/src/lib/collections.js. Prices are PKR (the shop's price slider tops out at 10,000).
const sampleProducts = [
  {
    name: "Linen Wrap Dress",
    description: "A breezy wrap dress in washed linen with a self-tie waist and a relaxed, mid-calf fall.",
    price: 8900,
    image: img("photo-1595777457583-95e059d581b8"),
    category: "dresses",
    collections: ["linen", "spring-summer", "resort"],
    stock: 12, // replaced by the sum of the variants below
    variants: [
      { size: "S", color: "Sand", stock: 3 },
      { size: "M", color: "Sand", stock: 4 },
      { size: "L", color: "Sand", stock: 2 },
      { size: "M", color: "Olive", stock: 3 },
    ],
  },
  {
    name: "Bias-Cut Evening Slip Dress",
    description: "A fluid bias-cut slip dress with slim straps and a floor-skimming hem, made for long evenings.",
    price: 9500,
    image: img("photo-1595777457583-95e059d581b8"),
    category: "dresses",
    collections: ["evening", "evening-collection"],
    stock: 8,
  },
  {
    name: "Relaxed Linen Shirt",
    description: "An easy, slightly oversized shirt in soft linen. Wear it buttoned up or open over a tank.",
    price: 4200,
    image: img("photo-1578747522731-9e5a179b02f7"),
    category: "tops",
    collections: ["linen", "spring-summer", "everyday-essentials"],
    stock: 25,
  },
  {
    name: "Ribbed Cotton Tank",
    description: "A close-fitting ribbed tank in soft cotton jersey. The layering piece you reach for every day.",
    price: 2400,
    image: img("photo-1578747522731-9e5a179b02f7"),
    category: "tops",
    collections: ["everyday-essentials", "sun-washed-neutrals"],
    stock: 40,
  },
  {
    name: "Wide-Leg Linen Trousers",
    description: "High-waisted, wide-leg trousers in lightweight linen with side pockets and a drawstring-free waist.",
    price: 5600,
    image: img("photo-1622445275576-721325763afe"),
    category: "trousers",
    collections: ["linen", "resort", "sun-washed-neutrals"],
    stock: 18,
  },
  {
    name: "Tailored Pleated Trousers",
    description: "Sharp, front-pleated trousers with a straight leg. Smart enough for the office, easy enough for travel.",
    price: 6800,
    image: img("photo-1622445275576-721325763afe"),
    category: "trousers",
    collections: ["everyday-essentials", "autumn-winter"],
    stock: 15,
  },
  {
    name: "Merino Crew Sweater",
    description: "A fine-gauge merino crew neck that's warm without bulk. Soft against the skin and easy to layer.",
    price: 7400,
    image: img("photo-1638247025967-b4e38f787b76"),
    category: "knitwear",
    collections: ["autumn-winter", "everyday-essentials"],
    stock: 14,
  },
  {
    name: "Cable-Knit Cardigan",
    description: "A chunky cable-knit cardigan with horn-effect buttons and a roomy, comfortable fit.",
    price: 8200,
    image: img("photo-1638247025967-b4e38f787b76"),
    category: "knitwear",
    collections: ["autumn-winter"],
    stock: 10,
  },
  {
    name: "Wool-Blend Overcoat",
    description: "A long, single-breasted overcoat in a heavy wool blend, fully lined, with deep pockets.",
    price: 9800,
    image: img("photo-1591047139829-d91aecb6caea"),
    category: "outerwear",
    collections: ["autumn-winter", "travel"],
    stock: 6,
  },
  {
    name: "Leather Everyday Tote",
    description: "A structured leather tote with an interior zip pocket, roomy enough for a laptop and a change of shoes.",
    price: 9200,
    image: img("photo-1584917865442-de89df76afd3"),
    category: "bags",
    collections: ["travel", "everyday-essentials"],
    stock: 9,
  },
  {
    name: "Leather Slingback Flats",
    description: "Pointed-toe leather slingbacks with a cushioned insole. Comfortable enough to dance in.",
    price: 6400,
    image: img("photo-1560769629-975ec94e6a86"),
    category: "shoes",
    collections: ["wedding-guest", "evening"],
    stock: 16,
  },
  {
    name: "Gold-Plated Hoop Earrings",
    description: "Lightweight, hollow gold-plated hoops with a polished finish. Simple and easy to wear all day.",
    price: 3200,
    image: img("photo-1611591437281-460bfbe1220a"),
    category: "jewellery",
    collections: ["wedding-guest", "evening-collection"],
    stock: 30,
  },
  {
    name: "Printed Silk-Blend Scarf",
    description: "A generous square scarf in a soft silk blend with a hand-drawn print. Wear it as a wrap, a head scarf or a bag tie.",
    price: 3800,
    image: img("photo-1601924994987-69e26d50dc26"),
    category: "scarves",
    collections: ["travel", "spring-summer"],
    stock: 22,
  },
];

const confirmByTyping = (expected) =>
  new Promise((resolve) => {
    if (!process.stdin.isTTY) return resolve(false); // never delete data from a non-interactive shell without --yes
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`Type the database name (${expected}) to confirm: `, (answer) => {
      rl.close();
      resolve(answer.trim() === expected);
    });
  });

async function seedProducts() {
  if (RESET) {
    const dbName = mongoose.connection.name;
    const existing = await Product.countDocuments();
    console.log(`⚠️  --reset will delete ALL ${existing} products in database "${dbName}".`);
    if (!ASSUME_YES && !(await confirmByTyping(dbName))) {
      console.log("Cancelled — nothing was deleted.");
      return false;
    }
    await Product.deleteMany({});
    await Review.deleteMany({}); // reviews of deleted products would be orphans
    console.log("Cleared existing products");
  }

  // $setOnInsert: a product that already exists (same name) is left exactly as it is,
  // so re-running the seed never overwrites prices, stock or edits made in the admin panel.
  let added = 0;
  for (const p of sampleProducts) {
    const r = await Product.updateOne({ name: p.name }, { $setOnInsert: p }, { upsert: true });
    if (r.upsertedCount) added += 1;
  }
  console.log(`Products: ${added} added, ${sampleProducts.length - added} already existed`);
  return true;
}

async function seedAdmin() {
  // ADMIN_USERNAME is accepted as another name for ADMIN_EMAIL (the email IS the username on the admin login)
  const email = (process.env.ADMIN_EMAIL || process.env.ADMIN_USERNAME || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  const name = (process.env.ADMIN_NAME || "Aurelia Admin").trim();

  if (!email || !password) {
    console.log("Admin: skipped — set ADMIN_EMAIL (or ADMIN_USERNAME) and ADMIN_PASSWORD in .env to create one");
    return;
  }

  const existing = await User.findOne({ email });
  if (existing) {
    if (SET_PASSWORD && password.length < 8) {
      console.error("Admin: ADMIN_PASSWORD must be at least 8 characters — nothing changed");
      process.exitCode = 1;
      return;
    }
    const wasAdmin = existing.role === "admin";
    existing.role = "admin";
    if (SET_PASSWORD) existing.password = password; // the pre-save hook hashes it
    await existing.save();
    console.log(
      wasAdmin
        ? `Admin: ${email} is already an admin${SET_PASSWORD ? " — password updated from .env" : ""}`
        : `Admin: existing account ${email} promoted to admin${SET_PASSWORD ? " — password updated from .env" : " (password unchanged)"}`
    );
    return;
  }

  if (password.length < 8) {
    console.error("Admin: ADMIN_PASSWORD must be at least 8 characters — admin not created");
    process.exitCode = 1;
    return;
  }
  // The User model's pre-save hook hashes the password
  await User.create({ name, email, password, role: "admin" });
  console.log(`Admin: created ${email}`);
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("No MONGODB_URI found in .env — add your connection string first.");
    process.exit(1);
  }
  if (RESET && process.env.NODE_ENV === "production") {
    console.error("Refusing to run --reset with NODE_ENV=production.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`Connected to MongoDB (database "${mongoose.connection.name}")`);

    if (!ADMIN_ONLY) {
      const proceed = await seedProducts();
      if (!proceed) return; // cancelled reset: do nothing else
    }
    await seedAdmin();
  } catch (err) {
    console.error("Seeding failed:", err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

main();
