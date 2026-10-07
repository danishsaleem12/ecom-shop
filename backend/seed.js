//backend/seed.js

require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("./models/Product");

const sampleProducts = [
  {
    name: "Everyday Sneakers",
    description: "A clean, minimal sneaker that goes with everything — durable enough for daily wear.",
    price: 59.99,
    image: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?q=80&w=800&auto=format&fit=crop",
    category: "footwear",
    stock: 24,
  },
  {
    name: "Wireless Headphones",
    description: "Over-ear headphones with 30-hour battery life and a comfortable, lightweight fit.",
    price: 89.0,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=800&auto=format&fit=crop",
    category: "electronics",
    stock: 15,
  },
  {
    name: "Canvas Backpack",
    description: "A durable canvas backpack with a padded laptop sleeve and plenty of pockets.",
    price: 45.5,
    image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?q=80&w=800&auto=format&fit=crop",
    category: "bags",
    stock: 30,
  },
  {
    name: "Minimalist Watch",
    description: "A slim, understated watch face with a genuine leather strap.",
    price: 120.0,
    image: "https://images.unsplash.com/photo-1524805444758-089113d48a6d?q=80&w=800&auto=format&fit=crop",
    category: "accessories",
    stock: 10,
  },
  {
    name: "Ceramic Mug",
    description: "A simple, sturdy ceramic mug — dishwasher and microwave safe.",
    price: 14.0,
    image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?q=80&w=800&auto=format&fit=crop",
    category: "home",
    stock: 50,
  },
  {
    name: "Potted Plant",
    description: "A low-maintenance indoor plant that brings a bit of life to any desk or shelf.",
    price: 22.0,
    image: "https://images.unsplash.com/photo-1485955900006-10f4d324d411?q=80&w=800&auto=format&fit=crop",
    category: "home",
    stock: 18,
  },
];

async function seed() {
  if (!process.env.MONGODB_URI) {
    console.error("No MONGODB_URI found in .env — add your connection string first.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    await Product.deleteMany({});
    console.log("Cleared existing products");

    await Product.insertMany(sampleProducts);
    console.log(`Inserted ${sampleProducts.length} sample products`);

    process.exit(0);
  } catch (err) {
    console.error("Seeding failed:", err.message);
    process.exit(1);
  }
}

seed();
