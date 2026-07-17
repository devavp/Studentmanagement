import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";

export default function StudentList() {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    api.get("/staff/students").then((res) => setStudents(res.data));
  }, []);

  return (
    <div className="page">
      <h1>Students in Your Department</h1>
      {students.length === 0 ? (
        <p className="empty-state">No students have signed up for your department yet.</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Roll No.</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id}>
                <td>{s.name}</td>
                <td>{s.email}</td>
                <td>{s.code || "—"}</td>
                <td>
                  <Link to={`/staff/students/${s.id}`}>View Submissions</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
