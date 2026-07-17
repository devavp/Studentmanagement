import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import { formatDateTime, formatDueDate } from "../../utils/date";

export default function MyDocuments() {
  const [docs, setDocs] = useState([]);
  const [error, setError] = useState("");

  async function load() {
    const res = await api.get("/staff/documents");
    setDocs(res.data);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id, requiresSubmission) {
    const warning = requiresSubmission
      ? "Delete this assessment? Students will no longer see it, and their submitted files will be kept but no longer linked to it."
      : "Delete this document? Students will no longer be able to view it.";
    if (!confirm(warning)) return;
    try {
      await api.delete(`/staff/documents/${id}`);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Delete failed");
    }
  }

  function download(id, fileName) {
    api.get(`/staff/documents/${id}/download`, { responseType: "blob" }).then((res) => {
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
    });
  }

  return (
    <div className="page">
      <h1>My Uploaded Documents</h1>
      <p className="subtitle">Assessments track who has submitted and who is delayed.</p>
      {error && <div className="error-box">{error}</div>}
      {docs.length === 0 ? (
        <p className="empty-state">You haven't uploaded any documents yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Due</th>
              <th>Submitted</th>
              <th>Uploaded</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id}>
                <td>
                  <strong>{d.title}</strong>
                  {d.requires_submission ? <span className="badge badge-assessment">Assessment</span> : null}
                  {d.description && <div className="row-subtext">{d.description}</div>}
                </td>
                <td className="uppercase">{d.file_type}</td>
                <td>
                  {d.requires_submission ? (
                    d.due_date ? (
                      formatDueDate(d.due_date)
                    ) : (
                      <span className="muted-cell">No due date</span>
                    )
                  ) : (
                    <span className="muted-cell">—</span>
                  )}
                </td>
                <td>
                  {d.requires_submission ? (
                    <span className="count-cell">
                      {d.submitted_count} / {d.student_count}
                    </span>
                  ) : (
                    <span className="muted-cell">—</span>
                  )}
                </td>
                <td>{formatDateTime(d.created_at)}</td>
                <td>
                  {/* requires_submission is SQLite's 0/1, so coerce — React renders a bare 0. */}
                  {Boolean(d.requires_submission) && (
                    <Link className="table-link" to={`/staff/documents/${d.id}/status`}>
                      Status
                    </Link>
                  )}
                  <button onClick={() => download(d.id, d.file_name)}>Download</button>
                  <button className="danger" onClick={() => handleDelete(d.id, d.requires_submission)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
