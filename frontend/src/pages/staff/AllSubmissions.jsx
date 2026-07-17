import { useEffect, useState } from "react";
import api from "../../api";
import StatusBadge from "../../components/StatusBadge";
import { formatDateTime } from "../../utils/date";

export default function AllSubmissions() {
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    api.get("/staff/submissions").then((res) => setSubmissions(res.data));
  }, []);

  function download(id, fileName) {
    api.get(`/staff/submissions/${id}/download`, { responseType: "blob" }).then((res) => {
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
      <h1>All Student Submissions</h1>
      <p className="subtitle">Every file submitted by students in your department.</p>
      {submissions.length === 0 ? (
        <p className="empty-state">No submissions yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Title</th>
              <th>For</th>
              <th>Type</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((s) => (
              <tr key={s.id}>
                <td>
                  {s.student_name} {s.student_code ? `(${s.student_code})` : ""}
                </td>
                <td>{s.title}</td>
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
                <td>
                  <button onClick={() => download(s.id, s.file_name)}>Download</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
