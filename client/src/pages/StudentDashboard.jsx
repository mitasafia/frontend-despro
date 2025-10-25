// src/pages/StudentDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { getAllMakanan, pilihMakan } from "../api";
import "./student.css";

/* ============ Util waktu Asia/Jakarta ============ */
function toJakartaDate(d = new Date()) {
  return new Date(d.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
}
function startOfDayJkt(d) {
  const j = toJakartaDate(d);
  j.setHours(0, 0, 0, 0);
  return j;
}
function daysBetween(a, b) {
  const A = startOfDayJkt(a).getTime();
  const B = startOfDayJkt(b).getTime();
  return Math.round((B - A) / 86400000);
}
function formatYYYYMMDD(d) {
  const j = toJakartaDate(d);
  const y = j.getFullYear();
  const m = String(j.getMonth() + 1).padStart(2, "0");
  const dd = String(j.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/* ============ Bangun minggu yang ditampilkan ============ */
function buildTargetWeek() {
  const now = toJakartaDate();
  const day = now.getDay(); // 0=Min ... 6=Sab

  let monday;
  if (day === 5 || day === 6 || day === 0) {
    // Jumat/Sabtu/Minggu → next Monday
    const offset = (8 - day) % 7;
    monday = toJakartaDate();
    monday.setDate(now.getDate() + offset);
  } else {
    const diffToMonday = (day + 6) % 7;
    monday = toJakartaDate();
    monday.setDate(now.getDate() - diffToMonday);
  }

  const labels = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];
  return labels.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      label,
      date: d,
      iso: formatYYYYMMDD(d),
      weekday: i + 1,
      dayNum: d.getDate(),
    };
  });
}

/* ============ Gambar fallback ============ */
function Img({ src, alt }) {
  const [err, setErr] = useState(false);
  if (err || !src)
    return <div className="img-fallback">Gambar tidak tersedia</div>;
  return (
    <img
      src={src}
      alt={alt || ""}
      loading="lazy"
      decoding="async"
      onError={() => setErr(true)}
      referrerPolicy="no-referrer"
      style={{
        width: "100%",
        height: "100%",
        objectFit: "cover",
        borderRadius: "10px",
      }}
    />
  );
}

/* ============ Normalisasi alergen ============ */
function splitAllergen(str) {
  return (str || "")
    .split(/[,\|]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

export default function StudentDashboard() {
  /* ---------- USER dari localStorage ---------- */
  const [user, setUser] = useState(null);
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "null");
      if (u?.email) return setUser(u);

      const legacy = localStorage.getItem("email");
      if (legacy)
        return setUser({
          email: legacy,
          nama: "Pelajar",
          alergi: "",
          photo_url: "",
        });

      window.location.replace("/login");
    } catch {
      window.location.replace("/login");
    }
  }, []);

  const studentEmail = user?.email || "";
  const studentAllergies = splitAllergen(user?.alergi || "");

  /* ---------- DATA MAKANAN ---------- */
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await getAllMakanan();
        const sorted = (res.data?.data || [])
          .sort((a, b) => a.id - b.id) // urut ID paling kecil dulu
          .slice(0, 10); // ambil 10 menu pertama
        setFoods(sorted);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ---------- HARI & MENU ---------- */
  const week = useMemo(() => buildTargetWeek(), []);
  const [dayIndex, setDayIndex] = useState(0);

  const pairs = useMemo(() => {
    const topTen = foods.slice(0, 10);
    return [
      topTen.slice(0, 2),
      topTen.slice(2, 4),
      topTen.slice(4, 6),
      topTen.slice(6, 8),
      topTen.slice(8, 10),
    ];
  }, [foods]);

  const todayMenus = pairs[dayIndex] || [];
  const currentDay = week[dayIndex];

  /* ---------- LOGIKA H-1 ---------- */
  function isHMinus1Allowed(menuDate, weekday) {
    const now = toJakartaDate();
    const diff = daysBetween(now, menuDate);
    if (weekday === 1) return diff === 3 || diff === 2 || diff === 1; // Senin
    return diff === 1; // Selasa–Jumat
  }

  const canChooseToday = currentDay
    ? isHMinus1Allowed(currentDay.date, currentDay.weekday)
    : false;

  /* ---------- STATUS PILIHAN ---------- */
  const [alreadyPicked, setAlreadyPicked] = useState(false);
  useEffect(() => {
    if (!studentEmail || !currentDay) return;
    const key = `choice_${studentEmail}_${currentDay.iso}`;
    setAlreadyPicked(!!localStorage.getItem(key));
  }, [studentEmail, currentDay]);

  /* ---------- PILIH & SIMPAN ---------- */
  const [selectedFoodId, setSelectedFoodId] = useState(null);
  const [saving, setSaving] = useState(false);

  const isBlocked = (food) =>
    splitAllergen(food?.pemicu_alergi).some((a) =>
      studentAllergies.includes(a)
    );

  const handleSelect = (food) => {
    if (!canChooseToday || alreadyPicked || isBlocked(food)) return;
    setSelectedFoodId(food.id);
  };

  const handleSave = async () => {
    if (!studentEmail) return window.location.replace("/login");
    if (!canChooseToday)
      return alert("Kamu hanya bisa memilih H-1 untuk hari ini.");
    if (alreadyPicked)
      return alert(`Kamu sudah memilih menu untuk ${currentDay.label}.`);
    if (!selectedFoodId) return alert("Pilih salah satu menu dulu.");

    try {
      setSaving(true);
      await pilihMakan(studentEmail, selectedFoodId);

      localStorage.setItem(
        `choice_${studentEmail}_${currentDay.iso}`,
        selectedFoodId
      );
      setAlreadyPicked(true);

      alert("Pilihan menu berhasil disimpan!");
    } catch (e) {
      console.error(e);
      alert(e?.response?.data?.message || "Gagal menyimpan pilihan menu");
    } finally {
      setSaving(false);
    }
  };

  /* ---------- LOGOUT ---------- */
  const logout = () => {
    localStorage.clear();
    window.location.replace("/login");
  };

  /* ---------- UI ---------- */
  return (
    <div className="stu-wrap">
      {/* HEADER */}
      <header className="stu-top">
        <div />
        <div className="stu-user">
          <span className="stu-username">{user?.nama || "Pelajar"}</span>
          <img
            className="stu-avatar"
            src={user?.photo_url || "/avatar.png"}
            alt="avatar"
          />
          <button className="btn-logout" onClick={logout}>
            Keluar
          </button>
        </div>
      </header>

      {/* BANNER */}
      <div className="stu-banner">
        <img className="banner-bg" src="/banner.png" alt="" />
        <h1>DAFTAR MENU</h1>
      </div>

      {/* HERO */}
      <section className="stu-hero">
        <h2>Pilih menu sesuai preferensimu 🍱</h2>
        <p>
          Kamu hanya dapat memilih <b>H-1</b> sebelum hari makan.
          <br />
          <small>
            (Untuk <b>Senin</b> bisa dipilih pada Jumat–Minggu.)
          </small>
        </p>
      </section>

      {/* NAVIGASI HARI */}
      <div className="weekbar">
        {week.map((w, i) => (
          <button
            key={w.iso}
            className={`wb-day ${dayIndex === i ? "active" : ""}`}
            onClick={() => {
              setDayIndex(i);
              setSelectedFoodId(null);
            }}
          >
            <div className="wb-label">{w.label}</div>
            <div className="wb-num">{w.dayNum}</div>
          </button>
        ))}
      </div>

      {/* GRID MENU */}
      <div className="stu-grid">
        {loading ? (
          <div className="loading">Memuat menu…</div>
        ) : todayMenus.length ? (
          todayMenus.map((f) => {
            const blocked = isBlocked(f);
            const selected = selectedFoodId === f.id;
            const locked = alreadyPicked || !canChooseToday;
            return (
              <div
                key={f.id}
                className={`stu-card ${selected ? "selected" : ""} ${
                  blocked ? "blocked" : ""
                } ${locked ? "locked" : ""}`}
                onClick={() => handleSelect(f)}
              >
                <div className="card-img">
                  <Img src={f.link_gambar} alt={f.nama} />
                </div>
                <div className="card-body">
                  <h3>{f.nama}</h3>
                  {f.deskripsi && <p>{f.deskripsi}</p>}
                  {!!splitAllergen(f.pemicu_alergi).length && (
                    <div className="allergen-row">
                      {splitAllergen(f.pemicu_alergi).map((a) => (
                        <span key={a} className="allergen-pill">
                          {a.charAt(0).toUpperCase() + a.slice(1)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {blocked && (
                  <div className="blocked-overlay">Mengandung alergenmu</div>
                )}
                {locked && (
                  <div className="locked-overlay">
                    {alreadyPicked ? "Sudah dipilih" : "Hanya H-1"}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="loading">Menu belum tersedia.</div>
        )}
      </div>

      {/* TOMBOL SIMPAN */}
      <div className="save-wrap">
        <button
          className="save-btn"
          onClick={handleSave}
          disabled={!selectedFoodId || saving || !canChooseToday || alreadyPicked}
        >
          {alreadyPicked
            ? "Sudah Dipilih"
            : saving
            ? "Menyimpan…"
            : "Simpan Menu"}
        </button>
      </div>
    </div>
  );
}
