import { useEffect, useState } from "react";
import api from "../../api";
import StatusBadge from "../../components/StatusBadge";
import { formatDateTime } from "../../utils/date";

export default function MySubmissions() {
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    api.get("/student/submissions").then((res) => setSubmissions(res.data));
  }, []);

  return (
    <div className="page">
      <h1>My Submissions</h1>
      {submissions.length === 0 ? (
        <p className="empty-state">You haven't uploaded anything yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>For</th>
              <th>Type</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((s) => (
              <tr key={s.id}>
                <td>
                  <strong>{s.title}</strong>
                </td>
                <td>
                  {s.document_title ? (
                    <>
                      {s.document_title}
                      {s.is_late && <StatusBadge status="late" />}
                    </>
                  ) : (
                    <span className="muted-cell">General submission</span>
                  )}
                </td>
                <td className="uppercase">{s.file_type}</td>
                <td>{formatDateTime(s.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
