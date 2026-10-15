const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const User = require("../models/User");
const { protect, COOKIE_NAME } = require("../middleware/auth");
const { handleRouteError } = require("../utils/errors");
const { sendPasswordReset, sendEmailVerification, notifyPasswordChanged, notifyAccountDeleted } = require("../utils/notify");
const { buildExport, deletionBlocker, eraseAccount } = require("../utils/accountData");
const { VERIFY_TTL_HOURS, VERIFY_TTL_MS, RESEND_GAP_MS: VERIFY_RESEND_GAP_MS, hashToken: hashVerifyToken, isTokenShape: isVerifyTokenShape, verifyUrl, issueVerification } = require("../utils/emailVerification");
const { RESET_TTL_MINUTES, RESET_TTL_MS, RESEND_GAP_MS, newToken, hashToken, isTokenShape, resetUrl } = require("../utils/passwordReset");

const isProd = process.env.NODE_ENV === "production";

const cookieOptions = {
    httpOnly: true,
    secure: isProd, // requires HTTPS in production
    sameSite: isProd ? "none" : "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

// "tv" = the user's tokenVersion at the moment of signing (see models/User.js and middleware/auth.js)
const signToken = (user) =>
    jwt.sign({ id: user._id, tv: user.tokenVersion || 0 }, process.env.JWT_SECRET, { expiresIn: "30d" });

const publicUser = (user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    // false = the customer has not yet clicked the link in the sign-up email (accounts from before this feature count as verified)
    emailVerified: user.emailVerified !== false,
});

// POST /api/auth/register
router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body || {};
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email and password are all required" });
        }
        if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string") {
            return res.status(400).json({ message: "Name, email and password must be text" });
        }
        if (password.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters" });
        }

        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) return res.status(409).json({ message: "An account with this email already exists" });

        // The account starts unverified; the emailed link (or a password reset, which proves the same thing) verifies it
        const verification = issueVerification();
        const user = await User.create({ name, email, password, emailVerified: false, ...verification.fields });
        const token = signToken(user);
        sendEmailVerification(user, verifyUrl(verification.token), VERIFY_TTL_HOURS);

        res.cookie(COOKIE_NAME, token, cookieOptions);
        res.status(201).json({ user: publicUser(user) });
    } catch (err) {
        handleRouteError(res, err, "Failed to create account");
    }
});

// Customers and admins sign in through two separate endpoints. Each one only accepts accounts
// of its own kind, and a wrong-kind account gets the SAME "Incorrect email or password" answer
// as a wrong password, so the response never reveals whether an email belongs to an admin.
const makeLoginHandler = (requiredRole) => async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) return res.status(400).json({ message: "Email and password are required" });
        if (typeof email !== "string" || typeof password !== "string") {
            return res.status(400).json({ message: "Email and password must be text" });
        }

        const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
        const passwordOk = user ? await user.comparePassword(password) : false;
        if (!user || !passwordOk || user.role !== requiredRole) {
            return res.status(401).json({ message: "Incorrect email or password" });
        }

        const token = signToken(user);
        res.cookie(COOKIE_NAME, token, cookieOptions);
        res.json({ user: publicUser(user) });
    } catch (err) {
        handleRouteError(res, err, "Failed to sign in");
    }
};

// POST /api/auth/login — customer accounts only
router.post("/login", makeLoginHandler("user"));

// POST /api/auth/admin/login — admin accounts only
router.post("/admin/login", makeLoginHandler("admin"));

// POST /api/auth/logout
// Clears the cookie AND bumps the user's tokenVersion, so a copy of the old token (stolen cookie,
// another device) stops working too. Side effect: signing out signs the account out everywhere.
router.post("/logout", async (req, res) => {
    try {
        const token = req.cookies?.[COOKIE_NAME];
        if (token) {
            const payload = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(payload.id);
            // Only bump for a token that is still current, so replaying an old token can't sign anyone out
            if (user && (payload.tv ?? 0) === (user.tokenVersion ?? 0)) {
                await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } });
            }
        }
    } catch (err) {
        // Expired / invalid token: nothing to invalidate. Anything else (database) is worth a server log.
        if (err?.name !== "JsonWebTokenError" && err?.name !== "TokenExpiredError") {
            console.error("logout: could not invalidate token:", err?.message);
        }
    }
    // Always sign this browser out, whatever happened above
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: 0 });
    res.json({ message: "Signed out" });
});

// GET /api/auth/me — returns the signed-in user, or 401
router.get("/me", protect, (req, res) => {
    res.json({ user: publicUser(req.user) });
});

// PUT /api/auth/me — update the current user's name and/or password
// Changing the password requires the CURRENT password (a stolen session alone can't take over the account).
// A successful change signs out every other device and keeps this one signed in with a fresh token.
router.put("/me", protect, async (req, res) => {
    try {
        const { name, password, currentPassword } = req.body || {};
        if (name !== undefined && typeof name !== "string") {
            return res.status(400).json({ message: "Name must be text" });
        }
        if (password !== undefined && typeof password !== "string") {
            return res.status(400).json({ message: "Password must be text" });
        }
        if (currentPassword !== undefined && typeof currentPassword !== "string") {
            return res.status(400).json({ message: "Current password must be text" });
        }

        let passwordChanged = false;
        if (password) {
            if (!currentPassword) {
                return res.status(400).json({ message: "Enter your current password to set a new one" });
            }
            if (password.length < 8) {
                return res.status(400).json({ message: "Password must be at least 8 characters" });
            }
            // protect() doesn't load the password hash, so fetch it just for this check
            const withPassword = await User.findById(req.user._id).select("+password");
            if (!withPassword || !(await withPassword.comparePassword(currentPassword))) {
                return res.status(400).json({ message: "Current password is incorrect" });
            }
            if (password === currentPassword) {
                return res.status(400).json({ message: "New password must be different from the current one" });
            }
            req.user.password = password; // pre-save hook hashes it
            req.user.tokenVersion = (req.user.tokenVersion || 0) + 1; // signs out all other devices
            passwordChanged = true;
        }
        if (name) req.user.name = name;
        await req.user.save();

        // This device keeps working: give it a token for the new version
        if (passwordChanged) {
            res.cookie(COOKIE_NAME, signToken(req.user), cookieOptions);
            notifyPasswordChanged(req.user); // "was this you?" email, so a hijacked account gets noticed
        }
        res.json({ user: publicUser(req.user) });
    } catch (err) {
        handleRouteError(res, err, "Failed to update account");
    }
});

// GET /api/auth/me/export — "download my data": everything we hold about the signed-in customer, as a JSON file.
router.get("/me/export", protect, async (req, res) => {
    try {
        const data = await buildExport(req.user);
        res.set("Content-Disposition", `attachment; filename="aurelia-my-data-${new Date().toISOString().slice(0, 10)}.json"`);
        res.set("Cache-Control", "no-store"); // personal data: never kept by a cache
        res.type("application/json").send(JSON.stringify(data, null, 2));
    } catch (err) {
        handleRouteError(res, err, "Failed to prepare your data");
    }
});

// DELETE /api/auth/me — body: { password }. Deletes the signed-in customer's account and personal data (see utils/accountData.js).
// The password is required so a stolen session alone can't wipe an account. Refused while an order is still on its way.
router.delete("/me", protect, async (req, res) => {
    try {
        const { password } = req.body || {};
        if (typeof password !== "string" || !password) {
            return res.status(400).json({ message: "Enter your password to delete your account" });
        }
        const withPassword = await User.findById(req.user._id).select("+password");
        if (!withPassword || !(await withPassword.comparePassword(password))) {
            return res.status(400).json({ message: "Password is incorrect" });
        }
        const blocker = await deletionBlocker(req.user);
        if (blocker) return res.status(409).json({ message: blocker });

        const { name, email } = req.user;
        await eraseAccount(req.user);
        res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: 0 });
        notifyAccountDeleted({ name, email });
        res.json({ message: "Your account has been deleted." });
    } catch (err) {
        handleRouteError(res, err, "Failed to delete account");
    }
});

// ---- forgot / reset password ---------------------------------------------------------------------------

const FORGOT_ANSWER = "If an account exists for that email, we have sent a link to reset the password.";
const BAD_LINK = "This reset link is invalid or has expired. Please request a new one.";
const BAD_VERIFY_LINK = "This confirmation link is invalid or has expired. Sign in and ask for a new one.";

// POST /api/auth/forgot-password — body: { email }
// Always answers the same thing whether or not the email has an account, so it can't be used to find out
// who is registered. Customer accounts only: admins reset with `npm run admin:set-password`, so a hacked
// mailbox can never become admin access.
router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body || {};
        if (typeof email !== "string" || !email.trim() || email.length > 120) {
            return res.status(400).json({ message: "Please enter your email" });
        }

        const user = await User.findOne({ email: email.trim().toLowerCase(), role: "user" }).select("+passwordResetExpires");
        if (user) {
            // The expiry minus the lifetime is when the last link was made: skip if that was under a minute ago
            const lastIssued = user.passwordResetExpires ? user.passwordResetExpires.getTime() - RESET_TTL_MS : 0;
            if (Date.now() - lastIssued > RESEND_GAP_MS) {
                const token = newToken();
                await User.updateOne(
                    { _id: user._id },
                    { $set: { passwordResetToken: hashToken(token), passwordResetExpires: new Date(Date.now() + RESET_TTL_MS) } }
                );
                sendPasswordReset(user, resetUrl(token), RESET_TTL_MINUTES);
            }
        }
        res.json({ message: FORGOT_ANSWER });
    } catch (err) {
        handleRouteError(res, err, "Failed to send reset email");
    }
});

// POST /api/auth/reset-password — body: { token, password }
// The token is consumed by ONE atomic update, so a link can never be used twice. A successful reset signs
// out every device (tokenVersion) and does not sign this one in: the person signs in with the new password.
router.post("/reset-password", async (req, res) => {
    try {
        const { token, password } = req.body || {};
        if (typeof token !== "string" || typeof password !== "string") {
            return res.status(400).json({ message: "Reset link and new password are required" });
        }
        if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });
        if (!isTokenShape(token)) return res.status(400).json({ message: BAD_LINK });

        const user = await User.findOneAndUpdate(
            { passwordResetToken: hashToken(token), passwordResetExpires: { $gt: new Date() } },
            { $unset: { passwordResetToken: 1, passwordResetExpires: 1 } }
        );
        if (!user) return res.status(400).json({ message: BAD_LINK });

        user.password = password; // the pre-save hook hashes it
        user.tokenVersion = (user.tokenVersion || 0) + 1;
        user.emailVerified = true; // they just proved they control this mailbox
        await user.save();
        notifyPasswordChanged(user);

        res.json({ message: "Your password has been updated. You can now sign in." });
    } catch (err) {
        handleRouteError(res, err, "Failed to reset password");
    }
});

// ---- email verification ---------------------------------------------------------------------------------

// POST /api/auth/verify-email — body: { token }   (from the link in the sign-up email)
// Needs no sign-in, because people often open the email on another device. The token is consumed by ONE atomic
// update, so a link works once.
router.post("/verify-email", async (req, res) => {
    try {
        const { token } = req.body || {};
        if (typeof token !== "string" || !isVerifyTokenShape(token)) {
            return res.status(400).json({ message: BAD_VERIFY_LINK });
        }
        const user = await User.findOneAndUpdate(
            { emailVerificationToken: hashVerifyToken(token), emailVerificationExpires: { $gt: new Date() } },
            { $set: { emailVerified: true }, $unset: { emailVerificationToken: 1, emailVerificationExpires: 1 } }
        );
        if (!user) return res.status(400).json({ message: BAD_VERIFY_LINK });
        res.json({ message: "Your email is confirmed. Thank you!" });
    } catch (err) {
        handleRouteError(res, err, "Failed to confirm email");
    }
});

// POST /api/auth/resend-verification — the signed-in customer asks for a new link.
// A new link replaces the old one. At most one email per minute per account.
router.post("/resend-verification", protect, async (req, res) => {
    try {
        if (req.user.emailVerified !== false) {
            return res.json({ message: "Your email is already confirmed.", alreadyVerified: true });
        }
        const withExpiry = await User.findById(req.user._id).select("+emailVerificationExpires");
        // The expiry minus the lifetime is when the last link was made
        const lastIssued = withExpiry?.emailVerificationExpires ? withExpiry.emailVerificationExpires.getTime() - VERIFY_TTL_MS : 0;
        if (Date.now() - lastIssued < VERIFY_RESEND_GAP_MS) {
            return res.status(429).json({ message: "We just sent you an email. Please wait a minute before asking for another one." });
        }
        const verification = issueVerification();
        await User.updateOne({ _id: req.user._id }, { $set: verification.fields });
        sendEmailVerification(req.user, verifyUrl(verification.token), VERIFY_TTL_HOURS);
        res.json({ message: "We have sent you a new confirmation email." });
    } catch (err) {
        handleRouteError(res, err, "Failed to send confirmation email");
    }
});

module.exports = router;