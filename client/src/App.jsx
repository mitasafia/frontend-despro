// src/App.jsx
import { Routes, Route, Navigate, Link } from "react-router-dom";
import Login from "./pages/Login.jsx";
import SignUp from "./pages/SignUp.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard"; 
import StudentDashboard from "./pages/StudentDashboard.jsx";

function ProtectedRoute({ children }) {
  const email = localStorage.getItem("email");
  return email ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <>
      

      <Routes>
        <Route path="/" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="*" element={<Navigate to="/" />} />
        <Route path="/dashboard-siswa" element={<StudentDashboard />} />
        <Route path="/dashboard-panitia" element={<AdminDashboard />} />
      </Routes>
    </>
  );
}
