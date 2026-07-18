// Tipe bersama untuk modul SOP (Standar Operasional Prosedur) SPPG.

export interface Sop {
  id: number;
  sppg_id: number | null;
  kode: string;
  judul: string;
  kategori: string;
  tujuan: string;
  ruang_lingkup: string;
  penanggung_jawab: string;
  // Prosedur langkah demi langkah, disimpan sebagai teks multi-baris
  // (satu langkah per baris; boleh diberi nomor). Fleksibel untuk diedit.
  prosedur: string;
  referensi: string;
  urutan: number;
  aktif: boolean;
  created_at: string;
  updated_at: string;
}

// Bentuk data untuk seeding awal (tanpa kolom yang dibangkitkan sistem).
export interface SopSeed {
  kode: string;
  judul: string;
  kategori: string;
  tujuan: string;
  ruang_lingkup: string;
  penanggung_jawab: string;
  prosedur: string;
  referensi: string;
}

// Hasil analisa kelengkapan satu SOP.
export interface SopAnalisisItem {
  id: number;
  kode: string;
  judul: string;
  lengkap: boolean;
  kurang: string[]; // daftar bagian yang belum lengkap
}

// Rekomendasi SOP standar yang sebaiknya ada namun belum ditemukan.
export interface SopRekomendasi {
  judul: string;
  alasan: string;
}
