const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const User = require("../models/User");
const { protect, COOKIE_NAME } = require("../middleware/auth");

const isProd = process.env.NODE_ENV === "production";

const cookieOptions = {
    httpOnly: true,
    secure: isProd, // requires HTTPS in production
    sameSite: isProd ? "none" : "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

const signToken = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "30d" });

const publicUser = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
});

// POST /api/auth/register
router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email and password are all required" });
        }
        if (password.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters" });
        }

        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) return res.status(409).json({ message: "An account with this email already exists" });

        const user = await User.create({ name, email, password });
        const token = signToken(user);

        res.cookie(COOKIE_NAME, token, cookieOptions);
        res.status(201).json({ user: publicUser(user) });
    } catch (err) {
        console.error('Register error:', err);
        res.status(400).json({ message: "Failed to create account", error: err.message });
    }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: "Email and password are required" });

        const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ message: "Incorrect email or password" });
        }

        const token = signToken(user);
        res.cookie(COOKIE_NAME, token, cookieOptions);
        res.json({ user: publicUser(user) });
    } catch (err) {
        res.status(500).json({ message: "Failed to sign in", error: err.message });
    }
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: 0 });
    res.json({ message: "Signed out" });
});

// GET /api/auth/me — returns the signed-in user, or 401
router.get("/me", protect, (req, res) => {
    res.json({ user: publicUser(req.user) });
});

// PUT /api/auth/me — update the current user's name and/or password
router.put("/me", protect, async (req, res) => {
    try {
        const { name, password } = req.body;
        if (name) req.user.name = name;
        if (password) {
            if (password.length < 8) {
                return res.status(400).json({ message: "Password must be at least 8 characters" });
            }
            req.user.password = password; // pre-save hook hashes it
        }
        await req.user.save();
        res.json({ user: publicUser(req.user) });
    } catch (err) {
        console.error('Update account error:', err);
        res.status(500).json({ message: "Failed to update account", error: err.message });
    }
});

module.exports = router;