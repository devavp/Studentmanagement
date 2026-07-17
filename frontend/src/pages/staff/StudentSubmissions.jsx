import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../api";
import StatusBadge from "../../components/StatusBadge";
import { formatDateTime } from "../../utils/date";

export default function StudentSubmissions() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/staff/students/${id}/submissions`).then((res) => setData(res.data));
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

  if (!data) return <div className="page">Loading...</div>;

  return (
    <div className="page">
      <Link to="/staff/students" className="back-link">← Back to Student List</Link>
      <h1>{data.student.name}'s Submissions</h1>
      <p className="subtitle">
        {data.student.email} {data.student.code ? `· Roll No: ${data.student.code}` : ""}
      </p>

      {data.submissions.length === 0 ? (
        <p className="empty-state">This student hasn't submitted any documents yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>For</th>
              <th>Type</th>
              <th>Submitted</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.submissions.map((s) => (
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
