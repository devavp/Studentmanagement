// middleware/auth.js - JWT verification + role-based access guards

const jwt = require("jsonwebtoken");

// The dev fallback is public knowledge (it's in the repo), so anyone could forge
// a staff token with it. Refuse to boot in production without a real secret
// rather than deploy a lock whose key is printed on the box.
if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET must be set in production. Generate one with:\n" +
      "  node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
  );
}

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = header.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, role, department_id, name }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: `Access restricted to ${role} accounts` });
    }
    next();
  };
}

module.exports = { authenticate, requireRole, JWT_SECRET };
