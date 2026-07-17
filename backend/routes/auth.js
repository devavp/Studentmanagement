// routes/auth.js - signup, login, department list

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

// GET /api/auth/departments - list of departments for signup dropdown
router.get("/departments", (req, res) => {
  const departments = db.prepare("SELECT id, name FROM departments ORDER BY name").all();
  res.json(departments);
});

// POST /api/auth/signup
router.post("/signup", (req, res) => {
  const { name, email, password, role, department_id, code } = req.body;

  if (!name || !email || !password || !role || !department_id) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!["staff", "student"].includes(role)) {
    return res.status(400).json({ error: "Role must be 'staff' or 'student'" });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const dept = db.prepare("SELECT id FROM departments WHERE id = ?").get(department_id);
  if (!dept) {
    return res.status(400).json({ error: "Invalid department selected" });
  }

  const hashed = bcrypt.hashSync(password, 10);

  const result = db
    .prepare(
      "INSERT INTO users (name, email, password, role, department_id, code) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(name, email, hashed, role, department_id, code || null);

  const user = {
    id: result.lastInsertRowid,
    name,
    role,
    department_id,
  };

  const token = jwt.sign(user, JWT_SECRET, { expiresIn: "8h" });
  res.status(201).json({ token, user });
});

// POST /api/auth/login
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!row) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const valid = bcrypt.compareSync(password, row.password);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const user = {
    id: row.id,
    name: row.name,
    role: row.role,
    department_id: row.department_id,
  };

  const token = jwt.sign(user, JWT_SECRET, { expiresIn: "8h" });
  res.json({ token, user });
});

module.exports = router;
