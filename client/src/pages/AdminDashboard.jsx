// src/pages/AdminDashboard.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getAllPelajar,
  getAllMakanan,
  updateMakanan,            // update by 'nama'
  updateSlotMakanPelajar,   // PUT tanpa body
} from "../api";
import "./dashboard.css";

/* === Time utils: Asia/Jakarta & week builder (Mon–Fri) === */
function toJkt(d = new Date()) {
  return new Date(d.toLocaleString("en-US", { timeZone: "Asia/Jakarta" }));
}
function buildWeekJkt() {
  const now = toJkt();
  const dow = now.getDay(); // 0=Sun ... 6=Sat
  // Jumat/Sabtu/Minggu -> start Senin depan, selain itu -> Senin minggu ini
  const useNextMonday = dow === 5 || dow === 6 || dow === 0;
  const monday = toJkt();
  if (useNextMonday) {
    // next Monday
    const offset = (8 - dow) % 7 || 7; // Fri->3, Sat->2, Sun->1
    monday.setDate(now.getDate() + offset);
  } else {
    // this Monday
    const diffToMonday = (dow + 6) % 7;
    monday.setDate(now.getDate() - diffToMonday);
  }

  const labels = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat"];
  return labels.map((label, i) => {
    const d = toJkt(monday);
    d.setDate(monday.getDate() + i);
    return { label, date: d, num: d.getDate() };
  });
}

/* === Gambar dengan fallback === */
function Img({ src, alt }) {
  const [err, setErr] = useState(false);
  const url = (src && String(src)) || "";
  if (err || !url) {
    return (
      <div
        style={{
          width: "100%", height: "100%", display: "grid", placeItems: "center",
          background: "#f1f5f9", color: "#64748b", fontWeight: 600, fontSize: 12,
          textAlign: "center", padding: 8, borderRadius: 12,
        }}
      >
        Gambar tidak tersedia
      </div>
    );
  }
  return (
    <img
      src={url}
      alt={alt || "gambar"}
      loading="lazy"
      decoding="async"
      onError={() => setErr(true)}
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", borderRadius: 12 }}
      referrerPolicy="no-referrer"
    />
  );
}

export default function AdminDashboard() {
  // ===== Data utama
  const [students, setStudents] = useState([]);
  const [foods, setFoods] = useState([]);

  // ===== UI state
  const [loading, setLoading] = useState(false);
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState("all");
  const [search, setSearch] = useState("");

  // ===== Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // ===== Week pills (Mon–Fri dengan tanggal)
  const week = useMemo(() => buildWeekJkt(), []);
  const jktToday = toJkt().getDay();
  const initialDayIndex = jktToday >= 1 && jktToday <= 5 ? jktToday - 1 : 0;
  const [dayIndex, setDayIndex] = useState(initialDayIndex);

  // ===== Restock all
  const [restocking, setRestocking] = useState(false);

  // ===== User dropdown
  const [openUserMenu, setOpenUserMenu] = useState(false);
  const userBtnRef = useRef(null);
  const menuRef = useRef(null);
  useEffect(() => {
    function onDocClick(e) {
      if (
        !userBtnRef.current ||
        !menuRef.current ||
        userBtnRef.current.contains(e.target) ||
        menuRef.current.contains(e.target)
      ) return;
      setOpenUserMenu(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  // ===== Modal edit makanan
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFood, setEditingFood] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // -------- Fetch awal
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [p, m] = await Promise.all([getAllPelajar(), getAllMakanan()]);
        const pel = p.data?.data || [];
        const mk = (m.data?.data || []).sort((a, b) => a.id - b.id).slice(0, 10); // id terendah dulu
        setStudents(pel);
        setFoods(mk);
        const uniqSchools = [...new Set(pel.map((x) => x.sekolah).filter(Boolean))];
        setSchools(uniqSchools);
      } catch (e) {
        console.error("Gagal fetch:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // -------- Filter + search (SISWA)
  const filtered = useMemo(() => {
    let data = [...students];
    if (selectedSchool !== "all") data = data.filter((d) => d.sekolah === selectedSchool);
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter(
        (d) =>
          d.nama?.toLowerCase().includes(q) ||
          d.NISN?.toLowerCase().includes(q) ||
          d.alergi?.toLowerCase().includes(q) ||
          d.sekolah?.toLowerCase().includes(q)
      );
    }
    return data;
  }, [students, selectedSchool, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageData = filtered.slice((page - 1) * pageSize, page * pageSize);

  // ===== Helper alergi
  const allergenList = (s) =>
    (s?.pemicu_alergi || "")
      .split(/[,\|]/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 3);

  // ===== Logout
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/login";
  };

  // ===== Menu harian (2 item/hari dari ID terendah)
  const topTen = foods.slice(0, 10);
  const startIdx = dayIndex * 2;
  const dayPair = topTen.slice(startIdx, startIdx + 2);

  // ===== Restock semua slot makan
  const restockAllSlots = async () => {
    if (!window.confirm("Set semua slot makan pelajar menjadi 5?")) return;
    try {
      setRestocking(true);
      const res = await updateSlotMakanPelajar();
      alert(res?.data?.message || "Restock berhasil!");
      const p = await getAllPelajar();
      setStudents(p.data?.data || []);
    } catch (e) {
      console.error("Restock gagal:", e);
      alert(e?.response?.data?.message || "Gagal restock slot makan");
    } finally {
      setRestocking(false);
    }
  };

  // ===== Map ID makanan → nama
  const foodNameById = useMemo(() => {
    const map = {};
    for (const f of foods) map[f.id] = f.nama;
    return map;
  }, [foods]);

  // ===== Edit makanan
  const openEdit = (food) => {
    setEditingFood({ ...food });
    setShowEditModal(true);
  };
  const handleEditChange = (field, value) => {
    setEditingFood((prev) => ({ ...prev, [field]: value }));
  };
  const submitEdit = async (e) => {
    e.preventDefault();
    if (!editingFood?.nama) {
      alert("Nama makanan wajib diisi");
      return;
    }
    try {
      setSavingEdit(true);
      await updateMakanan({
        nama: editingFood.nama, // identifier
        total_stock: Number(editingFood.total_stock ?? 0),
        total_pilihan: Number(editingFood.total_pilihan ?? 0),
        deskripsi: editingFood.deskripsi ?? "",
        link_gambar: editingFood.link_gambar ?? "",
      });
      const m = await getAllMakanan();
      setFoods((m.data?.data || []).sort((a, b) => a.id - b.id).slice(0, 10));
      setShowEditModal(false);
    } catch (err) {
      console.error("updateMakanan gagal:", err?.response?.data || err.message);
      alert(err?.response?.data?.message || "Gagal update makanan");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="adm-wrap">
      {/* Top bar */}
      <div className="adm-top">
        <div />
        <div className="adm-userbox">
          <button
            ref={userBtnRef}
            className="adm-userbtn"
            onClick={() => setOpenUserMenu((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={openUserMenu}
            title="Akun"
          >
            <span className="adm-username">Admin</span>
            <img className="adm-avatar" src="/avatar.png" alt="avatar" />
          </button>
          {openUserMenu && (
            <div ref={menuRef} className="adm-usermenu" role="menu">
              <div className="menu-header">Signed in as <b>Admin</b></div>
              <button className="menu-item danger" onClick={handleLogout} role="menuitem">
                Keluar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Banner */}
      <div className="adm-banner">
        <img className="banner-bg" src="/banner.png" alt="" />
        <h1>DASHBOARD</h1>
      </div>

      {/* Controls */}
      <div className="adm-controls" style={{ gap: 12, alignItems: "center" }}>
        <div className="pill">
          <select
            className="pill-select"
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
            aria-label="Filter sekolah"
          >
            <option value="all">SEMUA SEKOLAH</option>
            {schools.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="searchbox">
          <input
            placeholder="Cari siswa (nama / NISN / alergi / sekolah)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button className="btn restock-btn" onClick={restockAllSlots} disabled={restocking}>
          {restocking ? "Memproses…" : "Restock Slot Makan"}
        </button>
      </div>

      {/* Week pills (nama + tanggal) */}
      <div className="weekbar fancy">
        {week.map((w, i) => (
          <button
            key={`${w.label}-${w.num}`}
            className={`wb-chip ${dayIndex === i ? "active" : ""}`}
            onClick={() => setDayIndex(i)}
            aria-pressed={dayIndex === i}
          >
            <div className="wb-chip-day">{w.label}</div>
            <div className="wb-chip-num">{w.num}</div>
          </button>
        ))}
      </div>

      {/* Menu harian */}
      <div className="adm-menu-grid">
        {dayPair.length === 2 ? (
          dayPair.map((item) => (
            <div className="menu-card" key={item.id}>
              <div className="menu-img">
                <Img src={item.link_gambar} alt={item.nama} />
              </div>
              <div className="menu-body">
                <h3 className="menu-title">{item.nama}</h3>
                {item.deskripsi && <p className="menu-desc">{item.deskripsi}</p>}
                {!!allergenList(item).length && (
                  <div className="menu-pills">
                    {allergenList(item).map((al) => (
                      <span className="pill-allergen" key={al}>
                        {al}
                      </span>
                    ))}
                  </div>
                )}
                <div className="menu-stats">
                  <div className="stat blue">
                    <div>Total Stock</div>
                    <b>{item.total_stock ?? 0}</b>
                  </div>
                  <div className="stat orange">
                    <div>Total Pemesan</div>
                    <b>{item.total_pilihan ?? 0}</b>
                  </div>
                </div>

                {/* tombol Edit */}
                <button className="btn-outline" style={{ marginTop: 10 }} onClick={() => openEdit(item)}>
                  ✏️ Edit
                </button>
              </div>
            </div>
          ))
        ) : (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: 16 }}>
            Menu belum tersedia.
          </div>
        )}
      </div>

      {/* Tabel siswa */}
      <div className="adm-table">
        <div className="tbl">
          <div className="thead">
            <div className="th th-name">Nama Siswa</div>
            <div className="th th-nisn">NISN</div>
            <div className="th th-school">Sekolah</div>
            <div className="th th-alergi">Alergi</div>
            <div className="th th-slot">Slot Makanan</div>
            <div className="th th-pilihan">Pilihan Makanan</div>
          </div>

          {loading ? (
            <div className="tbody">
              <div className="row"><div className="cell">Memuat data…</div></div>
            </div>
          ) : pageData.length ? (
            <div className="tbody">
              {pageData.map((s, i) => (
                <div className="row" key={i}>
                  <div className="cell th-name">{s.nama}</div>
                  <div className="cell th-nisn">{s.NISN || "-"}</div>
                  <div className="cell th-school">{s.sekolah || "-"}</div>
                  <div className="cell th-alergi">{s.alergi || "-"}</div>
                  <div className="cell th-slot">{s.slot_makan ?? 0}</div>
                  <div className="cell th-pilihan">
                    {s.pilihan_makanan
                      ? foodNameById[s.pilihan_makanan] || `ID ${s.pilihan_makanan}`
                      : "—"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="tbody">
              <div className="row"><div className="cell">Tidak ada data</div></div>
            </div>
          )}
        </div>
      </div>

      {/* Footer pager */}
      <div className="adm-footer">
        <div className="total">Total Siswa <b>{filtered.length}</b></div>
        <div className="pager">
          <button className="navlink" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            ‹ Previous
          </button>
          <div className="pages">
            {Array.from({ length: totalPages }).map((_, idx) => (
              <button
                key={idx}
                className={`pnum ${page === idx + 1 ? "active" : ""}`}
                onClick={() => setPage(idx + 1)}
              >
                {idx + 1}
              </button>
            ))}
          </div>
          <button className="navlink" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            Next ›
          </button>
        </div>
      </div>

      {/* ===== Modal Edit ===== */}
      {showEditModal && editingFood && (
        <div className="modal-backdrop" onClick={() => setShowEditModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Makanan</h3>
            <form className="food-form" onSubmit={submitEdit}>
              <div className="grid2">
                <div className="fg">
                  <label>Nama (identifier)</label>
                  <input value={editingFood.nama} readOnly />
                </div>
                <div className="fg">
                  <label>Total Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={editingFood.total_stock ?? 0}
                    onChange={(e) => handleEditChange("total_stock", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid2">
                <div className="fg">
                  <label>Total Pemesan</label>
                  <input
                    type="number"
                    min="0"
                    value={editingFood.total_pilihan ?? 0}
                    onChange={(e) => handleEditChange("total_pilihan", e.target.value)}
                  />
                </div>
                <div className="fg">
                  <label>Deskripsi</label>
                  <textarea
                    rows={3}
                    value={editingFood.deskripsi ?? ""}
                    onChange={(e) => handleEditChange("deskripsi", e.target.value)}
                  />
                </div>
              </div>

              <div className="fg">
                <label>Link Gambar</label>
                <input
                  value={editingFood.link_gambar ?? ""}
                  onChange={(e) => handleEditChange("link_gambar", e.target.value)}
                  placeholder="https://…/gambar.jpg"
                />
                {editingFood.link_gambar && (
                  <img
                    className="preview"
                    src={editingFood.link_gambar}
                    alt="preview"
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                )}
              </div>

              <div className="modal-actions">
                <button type="button" className="btn ghost" onClick={() => setShowEditModal(false)} disabled={savingEdit}>
                  Batal
                </button>
                <button className="btn" type="submit" disabled={savingEdit}>
                  {savingEdit ? "Menyimpan…" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
