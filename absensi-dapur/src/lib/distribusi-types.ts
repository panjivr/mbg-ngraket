// Tipe untuk modul Distribusi & Generate Dokumen (BAST, Surat Jalan, Organoleptik).

export type JenisPenerima = "serdik" | "b3";

// Menu terstruktur untuk form Uji Organoleptik: grup (mis. "Menu Basah",
// "Menu Jumat (Kering)") berisi daftar nama sampel makanan.
export interface MenuGrup {
  judul: string;
  items: string[];
}

// Master penerima (sekolah/SERDIK atau kelompok B3 posyandu) per dapur.
export interface Penerima {
  id: number;
  sppg_id: number | null;
  jenis: JenisPenerima;
  nama: string;
  jenjang: string; // PAUD, TK/RA, SD/MI, SMP/MTS/MA, POSYANDU
  besar: number; // porsi besar (SERDIK)
  kecil: number; // porsi kecil (SERDIK)
  b3: number; // porsi B3 (posyandu: bumil/busui/balita)
  pj: number; // jumlah PJ/pendamping
  jam_kirim: string; // "07:00" dst
  urutan: number;
  aktif: boolean;
}

export interface PenerimaSeed {
  jenis: JenisPenerima;
  nama: string;
  jenjang: string;
  besar: number;
  kecil: number;
  b3: number;
  pj: number;
  jam_kirim: string;
}

// Satu hari distribusi.
export interface Distribusi {
  id: number;
  sppg_id: number | null;
  tanggal: string; // YYYY-MM-DD
  driver: string;
  menu: string;
  catatan: string;
  created_at: string;
}

// Baris penerima dalam satu distribusi (angka bisa di-adjust harian).
export interface DistribusiItem {
  id: number;
  distribusi_id: number;
  penerima_id: number;
  besar: number;
  kecil: number;
  b3: number;
  ikut: boolean; // MASUK/tidak hari itu
}

// Baris gabungan penerima + angka hari itu (untuk editor & dokumen).
export interface DistribusiBaris {
  penerima_id: number;
  jenis: JenisPenerima;
  nama: string;
  jenjang: string;
  jam_kirim: string;
  besar: number;
  kecil: number;
  b3: number;
  pj: number;
  ikut: boolean;
}
