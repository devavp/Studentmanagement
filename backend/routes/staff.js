// routes/staff.js - staff-only actions, all scoped to req.user.department_id

const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const db = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");
const { nowUtc, toSqlUtc, submissionStatus } = require("../utils/assessment");

const router = express.Router();

// All staff routes require a valid token AND role === 'staff'
router.use(authenticate, requireRole("staff"));

// ---------- Multer setup for staff document uploads (PDF/DOCX only) ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads", "staff"));
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

function fileFilter(req, file, cb) {
  const allowed = [".pdf", ".docx"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF and DOCX files are allowed"));
  }
}

const upload = multer({ storage, fileFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// Tag a submission row with whether it beat its assessment's due date.
// General submissions (no document_id) and assessments with no due date are never late.
function withLateFlag(submission) {
  return {
    ...submission,
    is_late: Boolean(
      submission.due_date && submission.created_at > submission.due_date
    ),
  };
}

// POST /api/staff/documents - upload a document for own department.
// Optionally an assessment/test that students must submit work against, with an
// optional due date on top of that (an assessment with no due date is never late).
router.post("/documents", upload.single("file"), (req, res) => {
  const { title, description, requires_submission, due_date } = req.body;
  if (!req.file) return res.status(400).json({ error: "File is required (PDF or DOCX)" });
  if (!title) return res.status(400).json({ error: "Title is required" });

  // Multipart values arrive as strings.
  const needsSubmission = requires_submission === "true" || requires_submission === "1";

  let dueDate = needsSubmission ? toSqlUtc(due_date) : null;
  if (dueDate === undefined) {
    return res.status(400).json({ error: "Due date is not a valid date" });
  }
  if (dueDate && dueDate < nowUtc()) {
    return res.status(400).json({ error: "Due date must be in the future" });
  }

  const ext = path.extname(req.file.originalname).toLowerCase().replace(".", "");

  const result = db
    .prepare(
      `INSERT INTO staff_documents
         (title, description, file_name, file_path, file_type, department_id, uploaded_by, requires_submission, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      title,
      description || "",
      req.file.originalname,
      req.file.filename,
      ext,
      req.user.department_id,
      req.user.id,
      needsSubmission ? 1 : 0,
      dueDate
    );

  res.status(201).json({ id: result.lastInsertRowid, message: "Document uploaded" });
});

// GET /api/staff/documents - list documents uploaded by staff in own department.
// Assessments also carry how many students have handed in, for an at-a-glance count.
router.get("/documents", (req, res) => {
  const docs = db
    .prepare(
      `SELECT sd.*, u.name as uploaded_by_name,
              (SELECT COUNT(DISTINCT ss.student_id)
                 FROM student_submissions ss
                WHERE ss.document_id = sd.id) AS submitted_count,
              (SELECT COUNT(*)
                 FROM users stu
                WHERE stu.role = 'student'
                  AND stu.department_id = sd.department_id) AS student_count
       FROM staff_documents sd
       JOIN users u ON u.id = sd.uploaded_by
       WHERE sd.department_id = ?
       ORDER BY sd.created_at DESC`
    )
    .all(req.user.department_id);
  res.json(docs);
});

// GET /api/staff/documents/:id/status - per-student progress on one assessment:
// who submitted, who was late, and who is missing entirely.
router.get("/documents/:id/status", (req, res) => {
  const document = db
    .prepare("SELECT * FROM staff_documents WHERE id = ? AND department_id = ?")
    .get(req.params.id, req.user.department_id);

  if (!document) return res.status(404).json({ error: "Document not found" });
  if (!document.requires_submission) {
    return res.status(400).json({ error: "This document does not expect student submissions" });
  }

  const students = db
    .prepare(
      `SELECT id, name, email, code
         FROM users
        WHERE role = 'student' AND department_id = ?
        ORDER BY name`
    )
    .all(req.user.department_id);

  // Most recent submission per student for this assessment.
  const latest = new Map();
  db.prepare(
    `SELECT * FROM student_submissions
      WHERE document_id = ?
      ORDER BY created_at ASC`
  )
    .all(document.id)
    .forEach((sub) => latest.set(sub.student_id, sub));

  const now = nowUtc();
  const rows = students.map((student) => {
    const submission = latest.get(student.id) || null;
    return {
      student,
      status: submissionStatus(submission?.created_at, document.due_date, now),
      submission: submission && {
        id: submission.id,
        title: submission.title,
        file_name: submission.file_name,
        file_type: submission.file_type,
        created_at: submission.created_at,
      },
    };
  });

  const summary = rows.reduce(
    (acc, row) => ({ ...acc, [row.status]: acc[row.status] + 1 }),
    { submitted: 0, late: 0, missing: 0, pending: 0 }
  );
  summary.total = rows.length;
  summary.delayed = summary.late + summary.missing;

  res.json({ document, rows, summary });
});

// DELETE /api/staff/documents/:id - remove a document (only own department's docs)
router.delete("/documents/:id", (req, res) => {
  const doc = db
    .prepare("SELECT * FROM staff_documents WHERE id = ? AND department_id = ?")
    .get(req.params.id, req.user.department_id);

  if (!doc) return res.status(404).json({ error: "Document not found" });

  const filePath = path.join(__dirname, "..", "uploads", "staff", doc.file_path);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare("DELETE FROM staff_documents WHERE id = ?").run(doc.id);
  res.json({ message: "Document deleted" });
});

// GET /api/staff/students - list all students in own department
router.get("/students", (req, res) => {
  const students = db
    .prepare(
      `SELECT id, name, email, code, created_at
       FROM users
       WHERE role = 'student' AND department_id = ?
       ORDER BY name`
    )
    .all(req.user.department_id);
  res.json(students);
});

// GET /api/staff/students/:id/submissions - view one student's submissions (own dept only)
router.get("/students/:id/submissions", (req, res) => {
  const student = db
    .prepare("SELECT id, name, email, code FROM users WHERE id = ? AND department_id = ? AND role = 'student'")
    .get(req.params.id, req.user.department_id);

  if (!student) return res.status(404).json({ error: "Student not found in your department" });

  const submissions = db
    .prepare(
      `SELECT ss.*, sd.title AS document_title, sd.due_date
         FROM student_submissions ss
         LEFT JOIN staff_documents sd ON sd.id = ss.document_id
        WHERE ss.student_id = ? AND ss.department_id = ?
        ORDER BY ss.created_at DESC`
    )
    .all(student.id, req.user.department_id)
    .map(withLateFlag);

  res.json({ student, submissions });
});

// GET /api/staff/submissions - all submissions from all students in own department
router.get("/submissions", (req, res) => {
  const submissions = db
    .prepare(
      `SELECT ss.*, u.name as student_name, u.code as student_code,
              sd.title AS document_title, sd.due_date
       FROM student_submissions ss
       JOIN users u ON u.id = ss.student_id
       LEFT JOIN staff_documents sd ON sd.id = ss.document_id
       WHERE ss.department_id = ?
       ORDER BY ss.created_at DESC`
    )
    .all(req.user.department_id)
    .map(withLateFlag);
  res.json(submissions);
});

// GET /api/staff/submissions/:id/download - download a specific student's file
router.get("/submissions/:id/download", (req, res) => {
  const sub = db
    .prepare("SELECT * FROM student_submissions WHERE id = ? AND department_id = ?")
    .get(req.params.id, req.user.department_id);

  if (!sub) return res.status(404).json({ error: "Submission not found" });

  const filePath = path.join(__dirname, "..", "uploads", "student", sub.file_path);
  res.download(filePath, sub.file_name);
});

// GET /api/staff/documents/:id/download - download own uploaded document (for verification)
router.get("/documents/:id/download", (req, res) => {
  const doc = db
    .prepare("SELECT * FROM staff_documents WHERE id = ? AND department_id = ?")
    .get(req.params.id, req.user.department_id);

  if (!doc) return res.status(404).json({ error: "Document not found" });

  const filePath = path.join(__dirname, "..", "uploads", "staff", doc.file_path);
  res.download(filePath, doc.file_name);
});

module.exports = router;
