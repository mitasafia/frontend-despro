// server.js
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const multer = require("multer");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================================================
   In-memory "DB" (reset saat server restart)
   ========================================================= */
let pelajar = [];  // { id, RFID_number, nama, NISN, email, password_hash, sekolah, alergi, photo_url, slot_makan?, pilihan_makanan? }
let panitia = [];  // { id, nama, email, password_hash, sekolah, photo_url }
let makanan = [];  // { id, nama, pemicu_alergi, total_stock, total_pilihan, deskripsi, link_gambar }
let riwayat = [];  // { id, id_pelajar, id_makanan, timestamp }

let seq = { pelajar: 1, panitia: 1, makanan: 1, riwayat: 1 };

/* =========================================================
   Helpers
   ========================================================= */
function ok(res, message, data, code = 200) {
  const payload = { message };
  if (data !== undefined) payload.data = data;
  return res.status(code).json(payload);
}
function err(res, message, code = 400) {
  return res.status(code).json({ message });
}
function required(body, fields) {
  const miss = fields.filter((f) => body[f] === undefined || body[f] === null || body[f] === "");
  return miss;
}
function findPelajarByEmail(email) {
  return pelajar.find((p) => p.email.toLowerCase() === String(email).toLowerCase());
}
function findPanitiaByEmail(email) {
  return panitia.find((p) => p.email.toLowerCase() === String(email).toLowerCase());
}

/* =========================================================
   1. Register Pelajar  (POST /registerPelajar)
   ========================================================= */
app.post("/registerPelajar", async (req, res) => {
  const need = ["RFID_number", "nama", "NISN", "email", "password", "sekolah", "alergi", "photo_url"];
  const miss = required(req.body, need);
  if (miss.length) return err(res, `Field wajib: ${miss.join(", ")}`);

  const { RFID_number, nama, NISN, email, password, sekolah, alergi, photo_url } = req.body;

  if (pelajar.some((p) => p.RFID_number === RFID_number)) return err(res, "RFID sudah terdaftar!", 400);
  if (findPelajarByEmail(email)) return err(res, "Email sudah terdaftar!", 400);

  const password_hash = await bcrypt.hash(password, 10);
  const row = {
    id: seq.pelajar++,
    RFID_number,
    nama,
    NISN,
    email,
    password_hash,
    sekolah,
    alergi,
    photo_url,
    slot_makan: 0,
    pilihan_makanan: null,
  };
  pelajar.push(row);

  // Per contoh: id pada response = RFID_number (string)
  return ok(
    res,
    "Registrasi berhasil!",
    {
      id: RFID_number,
      nama: row.nama,
      email: row.email,
      NISN: row.NISN,
      sekolah: row.sekolah,
      alergi: row.alergi,
      photo_url: row.photo_url,
    },
    201
  );
});

/* =========================================================
   2. Login Pelajar  (POST /loginPelajar)
   ========================================================= */
app.post("/loginPelajar", async (req, res) => {
  const miss = required(req.body, ["email", "password"]);
  if (miss.length) return err(res, `Field wajib: ${miss.join(", ")}`);

  const { email, password } = req.body;
  const user = findPelajarByEmail(email);
  if (!user) return err(res, "Email tidak terdaftar!", 401);

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return err(res, "Password salah!", 401);

  return res.json({
    message: "Login berhasil!",
    user: {
      email: user.email,
      nama: user.nama,
      NISN: user.NISN,
      sekolah: user.sekolah,
      alergi: user.alergi,
      photo_url: user.photo_url,
    },
  });
});

/* =========================================================
   3. Register Panitia  (POST /registerPanitia)
   ========================================================= */
app.post("/registerPanitia", async (req, res) => {
  const need = ["nama", "email", "password", "sekolah", "photo_url"];
  const miss = required(req.body, need);
  if (miss.length) return err(res, `Field wajib: ${miss.join(", ")}`);

  const { nama, email, password, sekolah, photo_url } = req.body;
  if (findPanitiaByEmail(email)) return err(res, "Email sudah terdaftar!", 400);

  const password_hash = await bcrypt.hash(password, 10);
  const row = { id: seq.panitia++, nama, email, password_hash, sekolah, photo_url };
  panitia.push(row);

  return ok(
    res,
    "Registrasi panitia berhasil!",
    { id: row.id, nama: row.nama, email: row.email, sekolah: row.sekolah, photo_url: row.photo_url },
    201
  );
});

/* =========================================================
   4. Login Panitia  (POST /loginPanitia)
   ========================================================= */
app.post("/loginPanitia", async (req, res) => {
  const miss = required(req.body, ["email", "password"]);
  if (miss.length) return err(res, `Field wajib: ${miss.join(", ")}`);

  const { email, password } = req.body;
  const admin = findPanitiaByEmail(email);
  if (!admin) return err(res, "Email tidak terdaftar!", 401);

  const valid = await bcrypt.compare(password, admin.password_hash);
  if (!valid) return err(res, "Password salah!", 401);

  return res.json({ message: "Login berhasil!", user: { email: admin.email, nama: admin.nama } });
});

/* =========================================================
   5. Tambah Makanan  (POST /addMakanan)
   ========================================================= */
app.post("/addMakanan", (req, res) => {
  const need = ["nama", "pemicu_alergi", "total_stock", "total_pilihan", "deskripsi", "link_gambar"];
  const miss = required(req.body, need);
  if (miss.length) return err(res, `Field wajib: ${miss.join(", ")}`);

  const { nama, pemicu_alergi, total_stock, total_pilihan, deskripsi, link_gambar } = req.body;

  const row = {
    id: seq.makanan++,
    nama,
    pemicu_alergi,
    total_stock: Number(total_stock),
    total_pilihan: Number(total_pilihan),
    deskripsi,
    link_gambar,
  };
  makanan.push(row);

  return ok(res, "Penambahan Makanan Berhasil!", row, 201);
});

/* =========================================================
   6. Delete Makanan  (DELETE /deleteMakanan) body: { id }
   ========================================================= */
app.delete("/deleteMakanan", (req, res) => {
  const miss = required(req.body, ["id"]);
  if (miss.length) return err(res, `Field wajib: ${miss.join(", ")}`);

  const id = Number(req.body.id);
  const idx = makanan.findIndex((m) => m.id === id);
  if (idx === -1) return err(res, "Makanan tidak ditemukan", 404);

  makanan.splice(idx, 1);
  return res.json({ message: `Makanan dengan id : '${id}' berhasil dihapus!` });
});

/* =========================================================
   7. Update Makanan  (PUT /updateMakanan) berdasarkan nama
   ========================================================= */
app.put("/updateMakanan", (req, res) => {
  const miss = required(req.body, ["nama"]);
  if (miss.length) return err(res, `Field wajib: ${miss.join(", ")}`);

  const { nama, total_stock, total_pilihan, deskripsi, link_gambar } = req.body;
  const item = makanan.find((m) => m.nama === nama);
  if (!item) return err(res, "Makanan tidak ditemukan", 404);

  if (total_stock !== undefined) item.total_stock = Number(total_stock);
  if (total_pilihan !== undefined) item.total_pilihan = Number(total_pilihan);
  if (deskripsi !== undefined) item.deskripsi = deskripsi;
  if (link_gambar !== undefined) item.link_gambar = link_gambar;

  return ok(res, "Data makanan berhasil diperbarui!", {
    id: item.id,
    nama: item.nama,
    total_stock: item.total_stock,
    total_pilihan: item.total_pilihan,
    deskripsi: item.deskripsi,
    link_gambar: item.link_gambar,
  });
});

/* =========================================================
   8. Pilih Makan Pelajar  (PUT /pilihMakan)
   ========================================================= */
app.put("/pilihMakan", (req, res) => {
  const miss = required(req.body, ["email", "pilihan_makanan"]);
  if (miss.length) return err(res, `Field wajib: ${miss.join(", ")}`);

  const { email, pilihan_makanan } = req.body;
  const user = findPelajarByEmail(email);
  if (!user) return err(res, "Pelajar tidak ditemukan", 404);

  const food = makanan.find((m) => m.id === Number(pilihan_makanan));
  if (!food) return err(res, "Makanan tidak ditemukan", 404);

  user.pilihan_makanan = food.id;

  return ok(res, "Pilihan makanan berhasil diperbarui!", {
    email: user.email,
    nama: user.nama,
    pilihan_makanan: user.pilihan_makanan,
  });
});

/* =========================================================
   9. Update Slot Makan Semua Pelajar  (PUT /updateSlotMakanPelajar)
   ========================================================= */
// TANPA body: set semua slot_makan = 5, kembalikan updatedCount
app.put("/updateSlotMakanPelajar", (req, res) => {
  let count = 0;
  pelajar.forEach((p) => {
    p.slot_makan = 5;
    count++;
  });
  return res.json({
    message: "Slot makan seluruh pelajar berhasil diperbarui menjadi 5!",
    updatedCount: count,
  });
});

/* =========================================================
   10. Ambil Makanan Pelajar  (PUT /ambilMakan)
   ========================================================= */
app.put("/ambilMakan", (req, res) => {
  const miss = required(req.body, ["email"]);
  if (miss.length) return err(res, `Field wajib: ${miss.join(", ")}`);

  const { email } = req.body;
  const user = findPelajarByEmail(email);
  if (!user) return err(res, "Pelajar tidak ditemukan", 404);

  if (!user.slot_makan || user.slot_makan <= 0) {
    return err(res, "Slot makan tidak mencukupi", 400);
  }

  const food = makanan.find((m) => m.id === Number(user.pilihan_makanan));
  if (!food) return err(res, "Makanan pilihan tidak ditemukan", 404);

  if (!food.total_stock || food.total_stock <= 0) {
    return err(res, "Stok makanan habis", 400);
  }

  // Update angka
  user.slot_makan = Number(user.slot_makan) - 1;
  food.total_stock = Number(food.total_stock) - 1;
  food.total_pilihan = Number(food.total_pilihan || 0) + 1;

  // Catat riwayat
  riwayat.push({
    id: seq.riwayat++,
    id_pelajar: user.id,
    id_makanan: food.id,
    timestamp: new Date().toISOString(),
  });

  return res.json({
    message: "Makanan berhasil diambil!",
    data: {
      pelajar: {
        nama: user.nama,
        email: user.email,
        slot_makan: user.slot_makan,
      },
      makanan: {
        nama: food.nama,
        total_stock: food.total_stock,
        total_pilihan: food.total_pilihan,
      },
    },
  });
});

/* =========================================================
   11. Get Semua Pelajar  (GET /getAllPelajar)
   ========================================================= */
app.get("/getAllPelajar", (req, res) => {
  const data = pelajar.map((p) => ({
    id: p.id,
    RFID_number: p.RFID_number,
    nama: p.nama,
    NISN: p.NISN,
    email: p.email,
    sekolah: p.sekolah,
    alergi: p.alergi,
    slot_makan: p.slot_makan ?? 0,
    pilihan_makanan: p.pilihan_makanan ?? null,
    photo_url: p.photo_url,
  }));
  return ok(res, "Data pelajar berhasil diambil!", data);
});

/* =========================================================
   12. Get Pelajar by RFID  (GET /getAllPelajarbyRFID)
   ========================================================= */
app.get("/getAllPelajarbyRFID", (req, res) => {
  const RFID_number = req.query.RFID_number || req.body?.RFID_number;
  if (!RFID_number) return err(res, "RFID_number wajib diisi");

  const p = pelajar.find((x) => x.RFID_number === RFID_number);
  if (!p) return err(res, "Pelajar tidak ditemukan", 404);

  return ok(res, "Data pelajar berhasil diambil!", {
    id: p.id,
    RFID_number: p.RFID_number,
    nama: p.nama,
  });
});

/* =========================================================
   13. Get Pelajar by Sekolah  (GET /getAllPelajarbySekolah)
   ========================================================= */
app.get("/getAllPelajarbySekolah", (req, res) => {
  const sekolah = req.query.sekolah || req.body?.sekolah;
  if (!sekolah) return err(res, "sekolah wajib diisi");

  const list = pelajar
    .filter((p) => p.sekolah.toLowerCase() === String(sekolah).toLowerCase())
    .map((p) => ({ id: p.id, nama: p.nama, sekolah: p.sekolah }));

  return ok(res, "Data pelajar berhasil diambil!", list);
});

/* =========================================================
   14. Get Semua Makanan  (GET /getAllMakanan)
   ========================================================= */
app.get("/getAllMakanan", (req, res) => {
  // sertakan semua field agar frontend bisa pakai link_gambar/deskripsi
  return ok(res, "Data makanan berhasil diambil!", makanan);
});

/* =========================================================
   15. Get Makanan by ID  (GET /getAllMakananbyID)
   ========================================================= */
app.get("/getAllMakananbyID", (req, res) => {
  const id = Number(req.query.id || req.body?.id);
  if (!id) return err(res, "id wajib diisi");

  const item = makanan.find((m) => m.id === id);
  if (!item) return err(res, "Makanan tidak ditemukan", 404);

  // sesuai contoh response
  return ok(res, "Data Makanan berhasil diambil!", {
    id: item.id,
    nama: item.nama,
    total_stock: item.total_stock,
    total_pilihan: item.total_pilihan,
  });
});

/* =========================================================
   16. Get Semua Riwayat Pengambilan  (GET /getAllRiwayat)
   ========================================================= */
app.get("/getAllRiwayat", (req, res) => {
  return ok(res, "Data riwayat berhasil diambil!", riwayat);
});

/* =========================================================
   17. Upload File ke Cloudinary (mock passthrough)  (POST /cloudinary)
   ========================================================= */
const upload = multer({ storage: multer.memoryStorage() });
app.post("/cloudinary", upload.single("file"), async (req, res) => {
  // Di produksi, kamu forward ke Cloudinary dan return URL aslinya.
  // Di mock ini kita balikin URL dummy agar sesuai contoh.
  // Misal generate nama file pakai timestamp:
  const url = `https://res.cloudinary.com/demo/image/upload/v${Date.now()}/image.jpg`;
  return res.json({ url });
});

/* Health check */
app.get("/", (_, res) => res.json({ ok: true }));

/* Start */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});