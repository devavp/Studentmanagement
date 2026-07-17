// db.js - SQLite database setup and seeding
// Uses better-sqlite3 so the demo runs with zero external database setup.

const Database = require("better-sqlite3");
const path = require("path");
const bcrypt = require("bcryptjs");

const db = new Database(path.join(__dirname, "school.db"));

db.pragma("foreign_keys = ON");

// ---------- Schema ----------
db.exec(`
CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('staff', 'student')),
  department_id INTEGER NOT NULL,
  code TEXT, -- staff ID or roll number, optional
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (department_id) REFERENCES departments (id)
);

CREATE TABLE IF NOT EXISTS staff_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  department_id INTEGER NOT NULL,
  uploaded_by INTEGER NOT NULL,
  -- 1 = students are expected to submit work back (assessment / test questions)
  requires_submission INTEGER NOT NULL DEFAULT 0,
  -- UTC 'YYYY-MM-DD HH:MM:SS', matching created_at's format so the two compare
  -- directly as strings. NULL means no deadline, so nobody is ever late.
  due_date TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (department_id) REFERENCES departments (id),
  FOREIGN KEY (uploaded_by) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS student_submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  student_id INTEGER NOT NULL,
  department_id INTEGER NOT NULL,
  -- Which assessment this answers. NULL = a general submission.
  document_id INTEGER,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (student_id) REFERENCES users (id),
  FOREIGN KEY (department_id) REFERENCES departments (id),
  FOREIGN KEY (document_id) REFERENCES staff_documents (id) ON DELETE SET NULL
);
`);

// ---------- Migrations ----------
// Existing school.db files predate the assessment columns, so add them in place
// rather than making anyone delete their database.
function addColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((c) => c.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

addColumn("staff_documents", "requires_submission", "INTEGER NOT NULL DEFAULT 0");
addColumn("staff_documents", "due_date", "TEXT");
// ON DELETE SET NULL keeps a student's file when staff delete the assessment.
addColumn(
  "student_submissions",
  "document_id",
  "INTEGER REFERENCES staff_documents (id) ON DELETE SET NULL"
);

// ---------- Seed departments (fixed list, no free-text creation) ----------
const seedDepartments = ["Computer Science", "Mechanical", "Commerce", "Electronics"];
const insertDept = db.prepare("INSERT OR IGNORE INTO departments (name) VALUES (?)");
seedDepartments.forEach((d) => insertDept.run(d));

// ---------- Seed one demo staff + student per department (only if users table empty) ----------
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;

if (userCount === 0) {
  const departments = db.prepare("SELECT * FROM departments").all();
  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password, role, department_id, code)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const demoPasswordHash = bcrypt.hashSync("password123", 10);

  departments.forEach((dept, idx) => {
    const deptSlug = dept.name.toLowerCase().replace(/\s+/g, "");
    insertUser.run(
      `${dept.name} Staff`,
      `staff.${deptSlug}@school.com`,
      demoPasswordHash,
      "staff",
      dept.id,
      `STF00${idx + 1}`
    );
    insertUser.run(
      `${dept.name} Student`,
      `student.${deptSlug}@school.com`,
      demoPasswordHash,
      "student",
      dept.id,
      `ROLL00${idx + 1}`
    );
  });

  console.log("Seeded demo departments and demo staff/student accounts (password: password123)");
}

module.exports = db;
