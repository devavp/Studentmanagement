import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api";
import StatusBadge from "../../components/StatusBadge";
import { formatDateTime, formatDueDate, dueRelative } from "../../utils/date";

// Delayed students first — that is the whole point of this page — then the rest.
const ORDER = { missing: 0, late: 1, pending: 2, submitted: 3 };

export default function AssessmentStatus() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [onlyDelayed, setOnlyDelayed] = useState(false);

  useEffect(() => {
    api
      .get(`/staff/documents/${id}/status`)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.error || "Could not load this assessment"));
  }, [id]);

  function download(subId, fileName) {
    api.get(`/staff/submissions/${subId}/download`, { responseType: "blob" }).then((res) => {
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
  }

  if (error) {
    return (
      <div className="page">
        <Link to="/staff/documents" className="back-link">← Back to My Documents</Link>
        <div className="error-box">{error}</div>
      </div>
    );
  }

  if (!data) return <div className="page">Loading...</div>;

  const { document: doc, summary } = data;
  const rows = [...data.rows].sort(
    (a, b) => ORDER[a.status] - ORDER[b.status] || a.student.name.localeCompare(b.student.name)
  );
  const visible = onlyDelayed
    ? rows.filter((r) => r.status === "late" || r.status === "missing")
    : rows;

  return (
    <div className="page">
      <Link to="/staff/documents" className="back-link">← Back to My Documents</Link>
      <h1>{doc.title}</h1>
      <p className="subtitle">
        {doc.due_date ? (
          <>
            Due {formatDueDate(doc.due_date)} · <span className="due-relative">{dueRelative(doc.due_date)}</span>
          </>
        ) : (
          "No due date — students can submit at any time."
        )}
      </p>

      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-number">{summary.submitted}</div>
          <div className="stat-label">On time</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{summary.late}</div>
          <div className="stat-label">Late</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{summary.missing}</div>
          <div className="stat-label">Missing</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{summary.pending}</div>
          <div className="stat-label">Pending</div>
        </div>
      </div>

      <div className="table-toolbar">
        <h2>Students ({summary.total})</h2>
        {summary.delayed > 0 && (
          <label className="checkbox-row inline">
            <input
              type="checkbox"
              checked={onlyDelayed}
              onChange={(e) => setOnlyDelayed(e.target.checked)}
            />
            <span>Show only delayed ({summary.delayed})</span>
          </label>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="empty-state">
          {onlyDelayed
            ? "Nobody is delayed on this assessment."
            : "No students have signed up for your department yet."}
        </p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Status</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map(({ student, status, submission }) => (
              <tr key={student.id}>
                <td>
                  <strong>{student.name}</strong>
                  <div className="row-subtext">
                    {student.code ? `${student.code} · ` : ""}
                    {student.email}
                  </div>
                </td>
                <td>
                  <StatusBadge status={status} />
                </td>
                <td>
                  {submission ? (
                    formatDateTime(submission.created_at)
                  ) : (
                    <span className="muted-cell">—</span>
                  )}
                </td>
                <td>
                  {submission ? (
                    <button onClick={() => download(submission.id, submission.file_name)}>
                      Download
                    </button>
                  ) : (
                    <Link className="table-link" to={`/staff/students/${student.id}`}>
                      View student
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
