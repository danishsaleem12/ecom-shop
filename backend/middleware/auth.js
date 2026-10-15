const jwt = require("jsonwebtoken");
const User = require("../models/User");

const COOKIE_NAME = "aurelia_token";

/** Reads the JWT cookie, loads the user, and attaches it to req.user. */
async function protect(req, res, next) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return res.status(401).json({ message: "Not signed in" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id);
    if (!user) return res.status(401).json({ message: "Not signed in" });

    // Token was issued before the last logout / password change -> no longer valid.
    // (Tokens issued before this feature have no "tv" and count as version 0, so nobody is signed out by the upgrade.)
    if ((payload.tv ?? 0) !== (user.tokenVersion ?? 0)) {
      return res.status(401).json({ message: "Session expired — please sign in again" });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Session expired — please sign in again" });
  }
}

/** Use after protect() to restrict a route to admins. */
function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}

module.exports = { protect, adminOnly, COOKIE_NAME };