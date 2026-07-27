import type { PenerimaSeed } from "@/lib/distribusi-types";

// Data awal penerima dari RAB "NGRAKET — JUMLAH PORSI DAN DISTRIBUSI".
// Angka Besar/Kecil/B3 bisa diedit admin kapan saja.
// kategori: "" untuk serdik; B3 → "balita" / "bumil" / "busui".
export const PENERIMA_SEED: PenerimaSeed[] = [
  // ---- PAUD / KB (kirim 07:00) ----
  { jenis: "serdik", nama: "PG WIJAYA NGRAKET", jenjang: "PAUD", kategori: "", besar: 0, kecil: 6, b3: 0, pj: 4, jam_kirim: "07:00" },
  { jenis: "serdik", nama: "KB PERMATA NUSANTARA DADAPAN", jenjang: "PAUD", kategori: "", besar: 0, kecil: 14, b3: 0, pj: 3, jam_kirim: "07:00" },
  { jenis: "serdik", nama: "KB AL FATTAH SINGKIL", jenjang: "PAUD", kategori: "", besar: 0, kecil: 4, b3: 0, pj: 3, jam_kirim: "07:00" },
  { jenis: "serdik", nama: "KB PKK MELATI", jenjang: "PAUD", kategori: "", besar: 0, kecil: 12, b3: 0, pj: 3, jam_kirim: "07:00" },
  { jenis: "serdik", nama: "PG NGAMBAR ARUM", jenjang: "PAUD", kategori: "", besar: 0, kecil: 10, b3: 0, pj: 3, jam_kirim: "07:00" },
  // ---- TK / RA (kirim 07:00) ----
  { jenis: "serdik", nama: "TK DHARMA WANITA NGRAKET", jenjang: "TK/RA", kategori: "", besar: 0, kecil: 19, b3: 0, pj: 4, jam_kirim: "07:00" },
  { jenis: "serdik", nama: "TK DHARMA WANITA SEDARAT", jenjang: "TK/RA", kategori: "", besar: 0, kecil: 31, b3: 0, pj: 3, jam_kirim: "07:00" },
  { jenis: "serdik", nama: "TK DHARMA WANITA DADAPAN", jenjang: "TK/RA", kategori: "", besar: 0, kecil: 23, b3: 0, pj: 3, jam_kirim: "07:00" },
  { jenis: "serdik", nama: "TK DHARMA WANITA SINGKIL", jenjang: "TK/RA", kategori: "", besar: 0, kecil: 20, b3: 0, pj: 3, jam_kirim: "07:00" },
  { jenis: "serdik", nama: "RA MUSLIMAT NU 059 SINGKIL", jenjang: "TK/RA", kategori: "", besar: 0, kecil: 14, b3: 0, pj: 3, jam_kirim: "07:00" },
  { jenis: "serdik", nama: "TK DHARMA WANITA PURWOREJO", jenjang: "TK/RA", kategori: "", besar: 0, kecil: 29, b3: 0, pj: 3, jam_kirim: "07:00" },
  { jenis: "serdik", nama: "RA TERPADU AL MADINAH", jenjang: "TK/RA", kategori: "", besar: 0, kecil: 104, b3: 0, pj: 15, jam_kirim: "07:00" },
  // ---- SD / MI (kirim 07:00) ----
  { jenis: "serdik", nama: "SD NEGERI NGRAKET", jenjang: "SD/MI", kategori: "", besar: 39, kecil: 29, b3: 0, pj: 11, jam_kirim: "07:00" },
  { jenis: "serdik", nama: "SD NEGERI DADAPAN", jenjang: "SD/MI", kategori: "", besar: 33, kecil: 23, b3: 0, pj: 11, jam_kirim: "07:00" },
  { jenis: "serdik", nama: "SD NEGERI SINGKIL", jenjang: "SD/MI", kategori: "", besar: 54, kecil: 46, b3: 0, pj: 12, jam_kirim: "07:00" },
  { jenis: "serdik", nama: "SD NEGERI PURWOREJO", jenjang: "SD/MI", kategori: "", besar: 46, kecil: 38, b3: 0, pj: 9, jam_kirim: "07:00" },
  { jenis: "serdik", nama: "SD NEGERI JALEN", jenjang: "SD/MI", kategori: "", besar: 5, kecil: 12, b3: 0, pj: 8, jam_kirim: "07:00" },
  { jenis: "serdik", nama: "MIS HIDAYATUL MUBTADI-IN", jenjang: "SD/MI", kategori: "", besar: 80, kecil: 80, b3: 0, pj: 17, jam_kirim: "07:00" },
  // ---- SMP / MTS / MA (kirim 10:00) ----
  { jenis: "serdik", nama: "MTS MIFTAHUL ULUM", jenjang: "SMP/MTS/MA", kategori: "", besar: 108, kecil: 0, b3: 0, pj: 17, jam_kirim: "10:00" },
  { jenis: "serdik", nama: "MAS MIFTAHUL ULUM", jenjang: "SMP/MTS/MA", kategori: "", besar: 77, kecil: 0, b3: 0, pj: 18, jam_kirim: "10:00" },
  { jenis: "serdik", nama: "SMP NEGERI 2 BALONG", jenjang: "SMP/MTS/MA", kategori: "", besar: 685, kecil: 0, b3: 0, pj: 51, jam_kirim: "10:00" },
  // ---- B3 (Bumil/Busui/Balita per desa — kirim 08:00) ----
  { jenis: "b3", nama: "IBU HAMIL DESA NGRAKET", jenjang: "POSYANDU", kategori: "bumil", besar: 0, kecil: 0, b3: 6, pj: 0, jam_kirim: "08:00" },
  { jenis: "b3", nama: "IBU MENYUSUI DESA NGRAKET", jenjang: "POSYANDU", kategori: "busui", besar: 0, kecil: 0, b3: 19, pj: 0, jam_kirim: "08:00" },
  { jenis: "b3", nama: "BALITA DESA NGRAKET", jenjang: "POSYANDU", kategori: "balita", besar: 0, kecil: 0, b3: 34, pj: 0, jam_kirim: "08:00" },
  { jenis: "b3", nama: "IBU HAMIL DESA PANDAK", jenjang: "POSYANDU", kategori: "bumil", besar: 0, kecil: 0, b3: 8, pj: 0, jam_kirim: "08:00" },
  { jenis: "b3", nama: "IBU MENYUSUI DESA PANDAK", jenjang: "POSYANDU", kategori: "busui", besar: 0, kecil: 0, b3: 33, pj: 0, jam_kirim: "08:00" },
  { jenis: "b3", nama: "BALITA DESA PANDAK", jenjang: "POSYANDU", kategori: "balita", besar: 0, kecil: 0, b3: 102, pj: 0, jam_kirim: "08:00" },
  { jenis: "b3", nama: "IBU HAMIL DESA BULAK", jenjang: "POSYANDU", kategori: "bumil", besar: 0, kecil: 0, b3: 5, pj: 0, jam_kirim: "08:00" },
  { jenis: "b3", nama: "IBU MENYUSUI DESA BULAK", jenjang: "POSYANDU", kategori: "busui", besar: 0, kecil: 0, b3: 16, pj: 0, jam_kirim: "08:00" },
  { jenis: "b3", nama: "BALITA DESA BULAK", jenjang: "POSYANDU", kategori: "balita", besar: 0, kecil: 0, b3: 33, pj: 0, jam_kirim: "08:00" },
  { jenis: "b3", nama: "IBU HAMIL DESA SEDARAT", jenjang: "POSYANDU", kategori: "bumil", besar: 0, kecil: 0, b3: 12, pj: 0, jam_kirim: "08:00" },
  { jenis: "b3", nama: "IBU MENYUSUI DESA SEDARAT", jenjang: "POSYANDU", kategori: "busui", besar: 0, kecil: 0, b3: 49, pj: 0, jam_kirim: "08:00" },
  { jenis: "b3", nama: "BALITA DESA SEDARAT", jenjang: "POSYANDU", kategori: "balita", besar: 0, kecil: 0, b3: 70, pj: 0, jam_kirim: "08:00" },
  { jenis: "b3", nama: "IBU HAMIL DESA DADAPAN", jenjang: "POSYANDU", kategori: "bumil", besar: 0, kecil: 0, b3: 4, pj: 0, jam_kirim: "08:00" },
  { jenis: "b3", nama: "IBU MENYUSUI DESA DADAPAN", jenjang: "POSYANDU", kategori: "busui", besar: 0, kecil: 0, b3: 18, pj: 0, jam_kirim: "08:00" },
  { jenis: "b3", nama: "BALITA DESA DADAPAN", jenjang: "POSYANDU", kategori: "balita", besar: 0, kecil: 0, b3: 59, pj: 0, jam_kirim: "08:00" },
  { jenis: "b3", nama: "IBU HAMIL DESA SINGKIL", jenjang: "POSYANDU", kategori: "bumil", besar: 0, kecil: 0, b3: 6, pj: 0, jam_kirim: "08:00" },
  { jenis: "b3", nama: "IBU MENYUSUI DESA SINGKIL", jenjang: "POSYANDU", kategori: "busui", besar: 0, kecil: 0, b3: 29, pj: 0, jam_kirim: "08:00" },
  { jenis: "b3", nama: "BALITA DESA SINGKIL", jenjang: "POSYANDU", kategori: "balita", besar: 0, kecil: 0, b3: 53, pj: 0, jam_kirim: "08:00" },
  { jenis: "b3", nama: "IBU HAMIL DESA BULU KIDUL", jenjang: "POSYANDU", kategori: "bumil", besar: 0, kecil: 0, b3: 4, pj: 0, jam_kirim: "08:00" },
  { jenis: "b3", nama: "IBU MENYUSUI DESA BULU KIDUL", jenjang: "POSYANDU", kategori: "busui", besar: 0, kecil: 0, b3: 16, pj: 0, jam_kirim: "08:00" },
  { jenis: "b3", nama: "BALITA DESA BULU KIDUL", jenjang: "POSYANDU", kategori: "balita", besar: 0, kecil: 0, b3: 23, pj: 0, jam_kirim: "08:00" },
];
