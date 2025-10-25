// src/pages/SignUp.jsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerPelajar } from "../api";
import Select from "react-select";
import { FiEdit2, FiEye, FiEyeOff } from "react-icons/fi";
import "@fontsource/inter";
import "./signup.css";

/* ---------- Data statis ---------- */
const SCHOOLS = [
  "SD Negeri Menteng 01",
  "SD Muhammadiyah 03 Jakarta",
  "SMP Negeri 216 Jakarta",
  "SMP Al Azhar 9 Kemang",
  "SMA Negeri 8 Jakarta",
  "SMA Labschool Rawamangun",
  "SMK Negeri 26 Jakarta",
  "SMK Taruna Bhakti Jakarta",
  "SMA Kristen 1 Jakarta",
  "SMA Islam PB Soedirman",
];

const ALLERGIES = [
  "Kacang tanah",
  "Udang",
  "Kepiting",
  "Kerang",
  "Telur",
  "Susu sapi",
  "Gandum (gluten)",
  "Kedelai",
  "Ikan",
  "Stroberi",
  "Tomat",
  "Cokelat",
  "Nanas",
  "Jeruk",
  "Daging sapi",
];

/* ---------- Opsi & styling react-select ---------- */
const schoolOptions = SCHOOLS.map((s) => ({ value: s, label: s }));
const allergyOptions = ALLERGIES.map((a) => ({ value: a, label: a }));

const rsStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: 45,
    borderRadius: 10,
    borderColor: state.isFocused ? "var(--brand)" : "var(--border)",
    boxShadow: state.isFocused ? "0 0 0 2px rgba(24,73,214,.15)" : "none",
    "&:hover": { borderColor: "var(--brand)" },
    fontSize: ".95rem",
    background: "#fff",
  }),
  valueContainer: (b) => ({ ...b, padding: "0 10px" }),
  placeholder:   (b) => ({ ...b, color: "#9aa6b2" }),
  multiValue:    (b) => ({ ...b, backgroundColor: "#eef1ff", borderRadius: 999 }),
  multiValueLabel: (b) => ({ ...b, color: "var(--brand)", fontWeight: 500 }),
  multiValueRemove: (b) => ({
    ...b,
    color: "var(--brand)",
    ":hover": { backgroundColor: "#e3e8ff", color: "var(--brand)" },
  }),
  menu: (b) => ({
    ...b,
    zIndex: 20,
    borderRadius: 12,
    overflow: "hidden",
    boxShadow: "0 14px 34px rgba(16,24,40,.14)",
  }),
  option: (b, state) => ({
    ...b,
    padding: 10,
    backgroundColor: state.isFocused ? "rgba(24,73,214,.08)" : "#fff",
    color: "#111",
  }),
  indicatorSeparator: () => ({ display: "none" }), // hilangkan garis
  dropdownIndicator: (b, state) => ({
    ...b,
    color: state.isFocused ? "var(--brand)" : "#9aa6b2",
    ":hover": { color: "var(--brand)" },
  }),
  clearIndicator: (b) => ({
    ...b,
    color: "#9aa6b2",
    ":hover": { color: "var(--brand)" },
  }),
};


export default function SignUp() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    RFID_number: "",
    NISN: "",
    nama: "",
    sekolah: "",
    alergi: "", // dikirim sebagai string
    email: "",
    password: "",
  });

  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // react-select states
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [selectedAllergies, setSelectedAllergies] = useState([]);

  // sinkronkan sekolah (react-select) ke form.sekolah
  useEffect(() => {
    setForm((prev) => ({ ...prev, sekolah: selectedSchool?.value || "" }));
  }, [selectedSchool]);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        alergi: selectedAllergies.map((a) => a.value).join(", "),
      };
      await registerPelajar(payload);
      navigate("/");
    } catch {
      alert("Registrasi gagal!");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) setPhoto(URL.createObjectURL(file));
  };

  const alergiChips = useMemo(
    () => selectedAllergies.map((x) => x.value),
    [selectedAllergies]
  );

  return (
    <div className="signup-container">
      {/* kiri: gambar */}
      <div className="signup-image">
        <img src="/food-bg.png" alt="background" />
      </div>

      {/* kanan: form */}
      <div className="signup-form-wrapper">
        <h1>Selamat Datang</h1>
        <p>Pilih makanan sehat favoritmu setiap hari dengan mudah</p>

        {/* avatar */}
        <div className="profile-upload">
          <img
            src={photo || "/default-avatar.png"}
            alt="profile"
            className="profile-img"
          />
          <label htmlFor="photo-upload" className="edit-icon" title="Ubah foto">
            <FiEdit2 size={16} />
          </label>
          <input
            id="photo-upload"
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
          />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>RFID</label>
              <input
                name="RFID_number"
                placeholder="Masukkan nomor RFID"
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>NISN</label>
              <input
                name="NISN"
                placeholder="Masukkan NISN"
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Nama</label>
              <input
                name="nama"
                placeholder="Nama lengkap"
                onChange={handleChange}
              />
            </div>

            {/* Sekolah: single select */}
            <div className="form-group">
              <label>Sekolah</label>
              <Select
                options={schoolOptions}
                value={selectedSchool}
                onChange={setSelectedSchool}
                placeholder="Pilih sekolah"
                styles={rsStyles}
                isSearchable
              />
            </div>
          </div>

          {/* Alergi: multi select */}
          <div className="form-group">
            <label>Alergi</label>
            <Select
              options={allergyOptions}
              value={selectedAllergies}
              onChange={setSelectedAllergies}
              placeholder="Pilih jenis alergi"
              styles={rsStyles}
              isMulti
              isSearchable
              closeMenuOnSelect={false}
              hideSelectedOptions={false}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                placeholder="email@example.com"
                onChange={handleChange}
              />
            </div>

            <div className="form-group password-group">
              <label>Kata Sandi</label>
              <div className="password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Masukkan kata sandi"
                  onChange={handleChange}
                  className="input-password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="eye-icon"
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? "Loading..." : "Daftar →"}
          </button>
        </form>

        <p className="login-text">
          Sudah punya akun?{" "}
          <Link to="/login" className="login-link">
            Masuk sekarang
          </Link>
        </p>
      </div>
    </div>
  );
}
