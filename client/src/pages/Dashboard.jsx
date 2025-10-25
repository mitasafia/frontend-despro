// src/pages/Dashboard.jsx
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();
  const email = localStorage.getItem("email");
  const role = localStorage.getItem("role");

  const logout = () => {
    localStorage.removeItem("email");
    localStorage.removeItem("role");
    navigate("/login");
  };

  return (
    <div className="card">
      <h2>Dashboard</h2>
      <p>Login sebagai: <b>{email}</b> ({role})</p>
      <button className="btn" onClick={logout}>Logout</button>
    </div>
  );
}
