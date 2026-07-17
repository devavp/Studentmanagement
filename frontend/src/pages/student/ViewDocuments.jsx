import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import StatusBadge from "../../components/StatusBadge";
import { formatDateTime, formatDueDate, dueRelative } from "../../utils/date";

export default function ViewDocuments() {
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    api.get("/student/documents").then((res) => setDocs(res.data));
  }, []);

  function download(id, fileName) {
    api.get(`/student/documents/${id}/download`, { responseType: "blob" }).then((res) => {
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
      <h1>Documents from Your Department</h1>
      <p className="subtitle">
        Assessments show a due date — submit your completed work before it passes.
      </p>
      {docs.length === 0 ? (
        <p className="empty-state">No documents have been shared yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Due</th>
              <th>Your status</th>
              <th>Uploaded By</th>
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
                  {d.requires_submission && d.due_date ? (
                    <>
                      {formatDueDate(d.due_date)}
                      {d.my_status !== "submitted" && d.my_status !== "late" && (
                        <div className={`row-subtext ${d.my_status === "missing" ? "text-danger" : ""}`}>
                          {dueRelative(d.due_date)}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="muted-cell">{d.requires_submission ? "No due date" : "—"}</span>
                  )}
                </td>
                <td>
                  {d.requires_submission ? (
                    <StatusBadge status={d.my_status} />
                  ) : (
                    <span className="muted-cell">—</span>
                  )}
                </td>
                <td>{d.uploaded_by_name}</td>
                <td>
                  <button onClick={() => download(d.id, d.file_name)}>Download</button>
                  {/* requires_submission is SQLite's 0/1, so coerce — React renders a bare 0. */}
                  {Boolean(d.requires_submission) && (
                    <Link className="table-link" to={`/student/upload?document=${d.id}`}>
                      {d.my_submitted_at ? "Resubmit" : "Submit"}
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
