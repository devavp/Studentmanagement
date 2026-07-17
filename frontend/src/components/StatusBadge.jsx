// StatusBadge.jsx - one visual language for assessment progress, used by both portals.

const LABELS = {
  submitted: "On time",
  late: "Late",
  missing: "Missing",
  pending: "Pending",
};

export default function StatusBadge({ status, children }) {
  if (!status) return null;
  return (
    <span className={`badge badge-${status}`}>{children || LABELS[status] || status}</span>
  );
}
