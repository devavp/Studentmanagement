// date.js - the API returns UTC timestamps in SQLite's "YYYY-MM-DD HH:MM:SS" shape.
//
// new Date("2026-07-17 07:26:18") is parsed as *local* time by browsers, which
// silently shifts every timestamp by the viewer's UTC offset. Marking the value
// as UTC before formatting is what keeps due dates and "late" badges honest.

/** Parse a UTC "YYYY-MM-DD HH:MM:SS" (or ISO) string into a Date. */
export function parseUtc(value) {
  if (!value) return null;
  let iso = value.replace(" ", "T");
  if (!/(Z|[+-]\d{2}:\d{2})$/.test(iso)) iso += "Z"; // no zone given means UTC
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Format a UTC timestamp in the viewer's local timezone. */
export function formatDateTime(value) {
  const date = parseUtc(value);
  return date ? date.toLocaleString() : "—";
}

/** Shorter form for due dates: "17 Jul 2026, 17:00". */
export function formatDueDate(value) {
  const date = parseUtc(value);
  if (!date) return "No due date";
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** A <input type="datetime-local"> value is local wall-clock; send UTC to the API. */
export function localInputToIso(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

/** "in 3 days" / "2 days ago", for nudging students about deadlines. */
export function dueRelative(value) {
  const date = parseUtc(value);
  if (!date) return null;

  const diffMs = date.getTime() - Date.now();
  const overdue = diffMs < 0;
  const minutes = Math.round(Math.abs(diffMs) / 60000);

  let text;
  if (minutes < 60) text = `${minutes} min`;
  else if (minutes < 60 * 24) text = `${Math.round(minutes / 60)} hr`;
  else text = `${Math.round(minutes / (60 * 24))} day${Math.round(minutes / (60 * 24)) === 1 ? "" : "s"}`;

  return overdue ? `${text} overdue` : `in ${text}`;
}
