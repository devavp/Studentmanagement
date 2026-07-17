import { useEffect, useState } from "react";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";

export default function StaffDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ students: 0, documents: 0, submissions: 0 });

  useEffect(() => {
    async function load() {
      const [studentsRes, docsRes, subsRes] = await Promise.all([
        api.get("/staff/students"),
        api.get("/staff/documents"),
        api.get("/staff/submissions"),
      ]);
      setStats({
        students: studentsRes.data.length,
        documents: docsRes.data.length,
        submissions: subsRes.data.length,
      });
    }
    load();
  }, []);

  return (
    <div className="page">
      <h1>Welcome, {user.name}</h1>
      <p className="subtitle">Staff Dashboard</p>
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-number">{stats.students}</div>
          <div className="stat-label">Students in Department</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.documents}</div>
          <div className="stat-label">Documents Uploaded</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.submissions}</div>
          <div className="stat-label">Student Submissions</div>
        </div>
      </div>
    </div>
  );
}
