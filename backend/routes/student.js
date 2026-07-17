// routes/student.js - student-only actions, all scoped to req.user.department_id

const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const db = require("../db");
const { authenticate, requireRole } = require("../middleware/auth");
const { nowUtc, submissionStatus } = require("../utils/assessment");

const router = express.Router();

router.use(authenticate, requireRole("student"));

// ---------- Multer setup for student submission uploads (PDF/DOCX only) ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads", "student"));
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

// GET /api/student/documents - view documents staff uploaded for own department.
// Each assessment also reports this student's own standing on it.
router.get("/documents", (req, res) => {
  const now = nowUtc();
  const docs = db
    .prepare(
      `SELECT sd.*, u.name as uploaded_by_name,
              (SELECT ss.created_at
                 FROM student_submissions ss
                WHERE ss.document_id = sd.id AND ss.student_id = ?
                ORDER BY ss.created_at DESC
                LIMIT 1) AS my_submitted_at
       FROM staff_documents sd
       JOIN users u ON u.id = sd.uploaded_by
       WHERE sd.department_id = ?
       ORDER BY sd.created_at DESC`
    )
    .all(req.user.id, req.user.department_id)
    .map((doc) => ({
      ...doc,
      my_status: doc.requires_submission
        ? submissionStatus(doc.my_submitted_at, doc.due_date, now)
        : null,
    }));
  res.json(docs);
});

// GET /api/student/documents/:id/download - download a staff document
router.get("/documents/:id/download", (req, res) => {
  const doc = db
    .prepare("SELECT * FROM staff_documents WHERE id = ? AND department_id = ?")
    .get(req.params.id, req.user.department_id);

  if (!doc) return res.status(404).json({ error: "Document not found" });

  const filePath = path.join(__dirname, "..", "uploads", "staff", doc.file_path);
  res.download(filePath, doc.file_name);
});

// POST /api/student/submissions - upload own submission, optionally answering an
// assessment. Late submissions are accepted; they are simply flagged as late.
router.post("/submissions", upload.single("file"), (req, res) => {
  // Multer has already written the file, so discard it on any rejection below.
  function reject(status, error) {
    if (req.file) {
      const stored = path.join(__dirname, "..", "uploads", "student", req.file.filename);
      fs.existsSync(stored) && fs.unlinkSync(stored);
    }
    return res.status(status).json({ error });
  }

  const { title, document_id } = req.body;
  if (!req.file) return res.status(400).json({ error: "File is required (PDF or DOCX)" });

  let document = null;
  if (document_id) {
    document = db
      .prepare(
        `SELECT * FROM staff_documents
          WHERE id = ? AND department_id = ? AND requires_submission = 1`
      )
      .get(document_id, req.user.department_id);

    if (!document) return reject(404, "That assessment was not found in your department");
  }

  // An assessment submission can borrow the assessment's title.
  const finalTitle = title || document?.title;
  if (!finalTitle) return reject(400, "Title is required");

  const ext = path.extname(req.file.originalname).toLowerCase().replace(".", "");

  const result = db
    .prepare(
      `INSERT INTO student_submissions
         (title, file_name, file_path, file_type, student_id, department_id, document_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      finalTitle,
      req.file.originalname,
      req.file.filename,
      ext,
      req.user.id,
      req.user.department_id,
      document ? document.id : null
    );

  const submittedAt = db
    .prepare("SELECT created_at FROM student_submissions WHERE id = ?")
    .get(result.lastInsertRowid).created_at;

  const isLate = Boolean(document?.due_date && submittedAt > document.due_date);

  res.status(201).json({
    id: result.lastInsertRowid,
    is_late: isLate,
    message: isLate ? "Submission uploaded after the due date" : "Submission uploaded",
  });
});

// GET /api/student/submissions - own submission history only
router.get("/submissions", (req, res) => {
  const submissions = db
    .prepare(
      `SELECT ss.*, sd.title AS document_title, sd.due_date
         FROM student_submissions ss
         LEFT JOIN staff_documents sd ON sd.id = ss.document_id
        WHERE ss.student_id = ?
        ORDER BY ss.created_at DESC`
    )
    .all(req.user.id)
    .map((sub) => ({
      ...sub,
      is_late: Boolean(sub.due_date && sub.created_at > sub.due_date),
    }));
  res.json(submissions);
});

module.exports = router;
