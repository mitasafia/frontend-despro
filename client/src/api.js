// src/api.js
import axios from "axios";

export const api = axios.create({
  baseURL: "https://group4-backend-despro.vercel.app",
});

// ===== Auth
export const registerPelajar = (payload) => api.post("/registerPelajar", payload);
export const loginPelajar     = (email, password) => api.post("/loginPelajar", { email, password });

export const registerPanitia  = (payload) => api.post("/registerPanitia", payload);
export const loginPanitia     = (email, password) => api.post("/loginPanitia", { email, password });

// ===== Pelajar
export const getAllPelajar            = () => api.get("/getAllPelajar");
export const getPelajarBySekolah      = (sekolah) => api.get("/getAllPelajarbySekolah", { params: { sekolah } });
export const getPelajarByRFID         = (RFID_number) => api.get("/getAllPelajarbyRFID", { params: { RFID_number } });
export const updateSlotMakanPelajar   = (email, slot_makan) => api.put("/updateSlotMakanPelajar", { email, slot_makan });
export const pilihMakan               = (email, pilihan_makanan) => api.put("/pilihMakan", { email, pilihan_makanan });

// ===== Makanan
export const addMakanan        = (payload) => api.post("/addMakanan", payload);
export const deleteMakanan     = (id)      => api.delete("/deleteMakanan", { data: { id } });
export const updateMakanan     = (payload) => api.put("/updateMakanan", payload); // based on nama
export const getAllMakanan     = () => api.get("/getAllMakanan");
export const getMakananByID    = (id) => api.get("/getAllMakananbyID", { params: { id } });

// ===== Riwayat
export const getAllRiwayat     = () => api.get("/getAllRiwayat");
