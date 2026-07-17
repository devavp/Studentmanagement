import { useEffect, useState } from "react";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ documents: 0, submissions: 0 });

  useEffect(() => {
    async function load() {
      const [docsRes, subsRes] = await Promise.all([
        api.get("/student/documents"),
        api.get("/student/submissions"),
      ]);
      setStats({ documents: docsRes.data.length, submissions: subsRes.data.length });
    }
    load();
  }, []);

  return (
    <div className="page">
      <h1>Welcome, {user.name}</h1>
      <p className="subtitle">Student Dashboard</p>
      <div className="stat-cards">
        <div className="stat-card">
          <div className="stat-number">{stats.documents}</div>
          <div className="stat-label">Documents Available</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{stats.submissions}</div>
          <div className="stat-label">My Submissions</div>
        </div>
      </div>
    </div>
  );
}
