import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
    department_id: "",
    code: "",
  });
  const [error, setError] = useState("");
  const { signup } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/auth/departments").then((res) => {
      setDepartments(res.data);
      if (res.data.length) {
        setForm((f) => ({ ...f, department_id: res.data[0].id }));
      }
    });
  }, []);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const user = await signup(form);
      navigate(`/${user.role}/dashboard`);
    } catch (err) {
      setError(err.response?.data?.error || "Signup failed");
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h2>Sign Up</h2>
        {error && <div className="error-box">{error}</div>}

        <label>I am a</label>
        <div className="role-toggle">
          <button
            type="button"
            className={form.role === "student" ? "active" : ""}
            onClick={() => update("role", "student")}
          >
            Student
          </button>
          <button
            type="button"
            className={form.role === "staff" ? "active" : ""}
            onClick={() => update("role", "staff")}
          >
            Staff
          </button>
        </div>

        <label>Full Name</label>
        <input value={form.name} onChange={(e) => update("name", e.target.value)} required />

        <label>Email</label>
        <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />

        <label>Password</label>
        <input
          type="password"
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
          required
          minLength={6}
        />

        <label>Department</label>
        <select value={form.department_id} onChange={(e) => update("department_id", e.target.value)} required>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <label>{form.role === "staff" ? "Staff ID (optional)" : "Roll Number (optional)"}</label>
        <input value={form.code} onChange={(e) => update("code", e.target.value)} />

        <button type="submit">Create Account</button>
        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  );
}
