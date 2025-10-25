import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginPelajar, loginPanitia } from "../api";
import { FiEye, FiEyeOff } from "react-icons/fi";
import "@fontsource/inter";
import "./login.css";

export default function Login() {
  const navigate = useNavigate();

  const [role, setRole] = useState("siswa"); // 'siswa' | 'admin'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!email || !password) {
      setErr("Email dan kata sandi wajib diisi.");
      return;
    }
    setLoading(true);
    try {
      const res =
        role === "admin"
          ? await loginPanitia(email, password)
          : await loginPelajar(email, password);

      const user = res?.data?.user;
      if (!user?.email) throw new Error("Data user tidak ditemukan");

      // SIMPAN USER LENGKAP + fallback lama (email/role) biar aman
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("email", user.email);
      localStorage.setItem("role", role);

      // Arahkan berdasarkan role
      if (role === "admin") {
        navigate("/dashboard-panitia", { replace: true });
      } else {
        navigate("/dashboard-siswa", { replace: true });
      }
    } catch (e) {
      setErr(e?.response?.data?.message || "Login gagal. Periksa kredensial kamu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      {/* Kiri: gambar */}
      <div className="signup-image">
        <img src="/food-bg-2.png" alt="background" />
      </div>

      {/* Kanan: form */}
      <div className="signup-form-wrapper">
        <h1>Selamat Datang Kembali</h1>
        <p>Pilih makanan sehat favoritmu setiap hari dengan mudah</p>

        {/* Tabs Siswa / Admin */}
        <div className="auth-tabs" role="tablist" aria-label="Pilih peran">
          <button
            type="button"
            className={`tab ${role === "siswa" ? "active" : ""}`}
            onClick={() => setRole("siswa")}
            role="tab"
            aria-selected={role === "siswa"}
          >
            Siswa
          </button>
          <button
            type="button"
            className={`tab ${role === "admin" ? "active" : ""}`}
            onClick={() => setRole("admin")}
            role="tab"
            aria-selected={role === "admin"}
          >
            Admin
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label>Kata Sandi</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Masukkan kata sandi"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-password"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="eye-icon"
                aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
          </div>

          {err && <div className="form-error">{err}</div>}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Memproses..." : "Submit →"}
          </button>
        </form>

        <p className="login-text">
          Belum punya akun?{" "}
          <Link to="/signup" className="login-link">Daftar sekarang</Link>
        </p>
      </div>
    </div>
  );
}
