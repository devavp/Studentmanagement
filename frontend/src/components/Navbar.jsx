// Navbar.jsx - top nav, differs by role

import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const base = `/${user.role}`;

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">LMS-APP · {user.role === "staff" ? "Staff" : "Student"}</div>
      <div className="navbar-links">
        <Link to={`${base}/dashboard`}>Dashboard</Link>
        {user.role === "staff" ? (
          <>
            <Link to={`${base}/upload`}>Upload Document</Link>
            <Link to={`${base}/documents`}>My Documents</Link>
            <Link to={`${base}/students`}>Students</Link>
            <Link to={`${base}/submissions`}>All Submissions</Link>
          </>
        ) : (
          <>
            <Link to={`${base}/documents`}>View Documents</Link>
            <Link to={`${base}/upload`}>Upload Submission</Link>
            <Link to={`${base}/submissions`}>My Submissions</Link>
          </>
        )}
      </div>
      <div className="navbar-user">
        <span>{user.name}</span>
        <button onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}
