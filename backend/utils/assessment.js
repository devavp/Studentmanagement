// assessment.js - shared due-date helpers.
//
// Timestamps are stored the way SQLite's datetime('now') writes them:
// UTC, formatted 'YYYY-MM-DD HH:MM:SS'. Keeping due_date in that exact format
// means "was this late?" is a plain string comparison — no parsing, no timezone
// drift, and it sorts chronologically.

/** Current time as a UTC 'YYYY-MM-DD HH:MM:SS' string. */
function nowUtc() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

/**
 * Convert a client-supplied date (ISO string from the browser) into the storage
 * format. Returns null for empty input, or undefined if the value is unparseable
 * so callers can tell "no due date" apart from "bad due date".
 */
function toSqlUtc(value) {
  if (value === undefined || value === null || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 19).replace("T", " ");
}

/**
 * Work out where a student stands on one assessment.
 *   submitted → handed in, on time (or there was no deadline)
 *   late      → handed in after the due date
 *   missing   → nothing handed in and the due date has passed
 *   pending   → nothing handed in yet, still within the deadline
 * "Delayed" in the UI means late + missing.
 */
function submissionStatus(submittedAt, dueDate, now = nowUtc()) {
  if (submittedAt) {
    return dueDate && submittedAt > dueDate ? "late" : "submitted";
  }
  return dueDate && now > dueDate ? "missing" : "pending";
}

module.exports = { nowUtc, toSqlUtc, submissionStatus };
