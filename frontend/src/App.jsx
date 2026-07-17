import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";

import Login from "./pages/Login";
import Signup from "./pages/Signup";

import StaffDashboard from "./pages/staff/StaffDashboard";
import UploadDocument from "./pages/staff/UploadDocument";
import MyDocuments from "./pages/staff/MyDocuments";
import StudentList from "./pages/staff/StudentList";
import StudentSubmissions from "./pages/staff/StudentSubmissions";
import AllSubmissions from "./pages/staff/AllSubmissions";
import AssessmentStatus from "./pages/staff/AssessmentStatus";

import StudentDashboard from "./pages/student/StudentDashboard";
import ViewDocuments from "./pages/student/ViewDocuments";
import UploadSubmission from "./pages/student/UploadSubmission";
import MySubmissions from "./pages/student/MySubmissions";

function Layout({ children }) {
  return (
    <div className="app-shell">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}

function RootRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}/dashboard`} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Staff routes */}
          <Route
            path="/staff/dashboard"
            element={
              <ProtectedRoute role="staff">
                <Layout><StaffDashboard /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/upload"
            element={
              <ProtectedRoute role="staff">
                <Layout><UploadDocument /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/documents"
            element={
              <ProtectedRoute role="staff">
                <Layout><MyDocuments /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/documents/:id/status"
            element={
              <ProtectedRoute role="staff">
                <Layout><AssessmentStatus /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/students"
            element={
              <ProtectedRoute role="staff">
                <Layout><StudentList /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/students/:id"
            element={
              <ProtectedRoute role="staff">
                <Layout><StudentSubmissions /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/staff/submissions"
            element={
              <ProtectedRoute role="staff">
                <Layout><AllSubmissions /></Layout>
              </ProtectedRoute>
            }
          />

          {/* Student routes */}
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute role="student">
                <Layout><StudentDashboard /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/documents"
            element={
              <ProtectedRoute role="student">
                <Layout><ViewDocuments /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/upload"
            element={
              <ProtectedRoute role="student">
                <Layout><UploadSubmission /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/submissions"
            element={
              <ProtectedRoute role="student">
                <Layout><MySubmissions /></Layout>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
