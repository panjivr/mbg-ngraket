/**
 * People & Culture — survey penilaian kerja / employee voice untuk SPPG.
 * Prinsip (lihat PROMPT_PEOPLE_CULTURE): nilai perilaku & kondisi kerja, bukan
 * kepribadian; skala Likert; agregat dengan ambang anonimitas; tanpa skor
 * tunggal "baik/buruk" atau ranking. Bank pertanyaan dasar diadaptasi dari
 * modul "Suara Saya" + Safety & Wellbeing (ringkas, ±3 menit).
 */
export type TipePertanyaan = "likert5" | "teks";

export interface Pertanyaan {
  code: string;
  kategori: string;
  teks: string;
  tipe: TipePertanyaan;
  wajib: boolean;
}

/** Skala Likert 1–5 (persetujuan). */
export const LIKERT_LABEL: Record<number, string> = {
  1: "Sangat Tidak Setuju",
  2: "Tidak Setuju",
  3: "Netral",
  4: "Setuju",
  5: "Sangat Setuju",
};

/** Bank pertanyaan dasar (HR dapat memilih/menyesuaikan). */
export const BANK_PERTANYAAN: Pertanyaan[] = [
  { code: "JC1", kategori: "Kejelasan Kerja", teks: "Saya memahami tugas dan tanggung jawab saya.", tipe: "likert5", wajib: true },
  { code: "JC2", kategori: "Kejelasan Kerja", teks: "Instruksi kerja yang saya terima cukup jelas.", tipe: "likert5", wajib: true },
  { code: "WL1", kategori: "Beban Kerja", teks: "Beban kerja saya masih wajar.", tipe: "likert5", wajib: true },
  { code: "WL2", kategori: "Beban Kerja", teks: "Pembagian pekerjaan terasa adil.", tipe: "likert5", wajib: true },
  { code: "WL3", kategori: "Beban Kerja", teks: "Waktu yang tersedia cukup untuk menyelesaikan pekerjaan dengan benar.", tipe: "likert5", wajib: true },
  { code: "EQ1", kategori: "Peralatan & Fasilitas", teks: "Peralatan yang saya butuhkan tersedia.", tipe: "likert5", wajib: true },
  { code: "EQ2", kategori: "Peralatan & Fasilitas", teks: "Peralatan yang digunakan dalam kondisi layak.", tipe: "likert5", wajib: true },
  { code: "EQ3", kategori: "Peralatan & Fasilitas", teks: "Kondisi area kerja mendukung pekerjaan saya.", tipe: "likert5", wajib: true },
  { code: "CM1", kategori: "Komunikasi", teks: "Koordinasi antaranggota berjalan baik.", tipe: "likert5", wajib: true },
  { code: "CM2", kategori: "Komunikasi", teks: "Koordinasi antardivisi berjalan baik.", tipe: "likert5", wajib: true },
  { code: "RS1", kategori: "Rasa Hormat", teks: "Saya diperlakukan dengan hormat.", tipe: "likert5", wajib: true },
  { code: "RS2", kategori: "Rasa Hormat", teks: "Saya tidak merasa direndahkan saat melakukan kesalahan.", tipe: "likert5", wajib: true },
  { code: "PS1", kategori: "Rasa Aman Psikologis", teks: "Saya merasa aman menyampaikan masalah.", tipe: "likert5", wajib: true },
  { code: "PS2", kategori: "Rasa Aman Psikologis", teks: "Saya berani menyampaikan jika melihat kesalahan.", tipe: "likert5", wajib: true },
  { code: "PS3", kategori: "Rasa Aman Psikologis", teks: "Saya berani melaporkan risiko keamanan pangan.", tipe: "likert5", wajib: true },
  { code: "TM1", kategori: "Tim", teks: "Tim saya saling membantu.", tipe: "likert5", wajib: true },
  { code: "TM2", kategori: "Tim", teks: "Saya dapat mengandalkan rekan satu tim.", tipe: "likert5", wajib: true },
  { code: "RC1", kategori: "Apresiasi", teks: "Pekerjaan yang baik mendapatkan apresiasi.", tipe: "likert5", wajib: true },
  { code: "SF1", kategori: "Keselamatan", teks: "Saya merasa area kerja aman.", tipe: "likert5", wajib: true },
  { code: "SF2", kategori: "Keselamatan", teks: "APD (alat pelindung diri) tersedia saat dibutuhkan.", tipe: "likert5", wajib: true },
  { code: "SF3", kategori: "Keselamatan", teks: "Waktu istirahat saya cukup.", tipe: "likert5", wajib: true },
  { code: "EN1", kategori: "Keterikatan", teks: "Saya merasa nyaman bekerja di SPPG ini.", tipe: "likert5", wajib: true },
  { code: "OP1", kategori: "Masukan Terbuka", teks: "Apa satu hal yang paling ingin Anda perbaiki di tempat kerja?", tipe: "teks", wajib: false },
  { code: "OP2", kategori: "Masukan Terbuka", teks: "Peralatan/fasilitas apa yang paling dibutuhkan?", tipe: "teks", wajib: false },
  { code: "OP3", kategori: "Masukan Terbuka", teks: "Adakah sesuatu yang ingin disampaikan kepada manajemen?", tipe: "teks", wajib: false },
];

/** Pilihan default (pulse ±14 Likert + 2 teks) agar ringkas. */
export const DEFAULT_CODES = [
  "JC1", "WL1", "WL2", "WL3", "EQ1", "EQ2", "CM1", "CM2", "RS1", "PS1", "PS2", "TM1", "RC1", "SF1", "SF2",
  "OP1", "OP3",
];

export const MIN_RESPONDEN_DEFAULT = 5;

/** Validasi & bersihkan daftar pertanyaan dari input (API). */
export function sanitizePertanyaan(raw: unknown): Pertanyaan[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: Pertanyaan[] = [];
  for (const r of raw) {
    const o = (r || {}) as Record<string, unknown>;
    const teks = String(o.teks ?? "").trim().slice(0, 300);
    if (!teks) continue;
    const tipe: TipePertanyaan = o.tipe === "teks" ? "teks" : "likert5";
    let code = String(o.code ?? "").trim().slice(0, 20) || `Q${out.length + 1}`;
    while (seen.has(code)) code = code + "_";
    seen.add(code);
    out.push({
      code,
      kategori: String(o.kategori ?? "Lainnya").trim().slice(0, 40) || "Lainnya",
      teks,
      tipe,
      wajib: tipe === "teks" ? o.wajib === true : o.wajib !== false,
    });
    if (out.length >= 60) break;
  }
  return out;
}

export const KATEGORI_URUT = [
  "Kejelasan Kerja", "Beban Kerja", "Peralatan & Fasilitas", "Komunikasi",
  "Rasa Hormat", "Rasa Aman Psikologis", "Tim", "Apresiasi", "Keselamatan",
  "Keterikatan", "Masukan Terbuka", "Lainnya",
];

/* ================= FEEDBACK REKAN (PEER) ================= */
// Skala frekuensi perilaku (bukan kepribadian). N/A = tidak cukup berinteraksi.
export const FREQ_LABEL: Record<number, string> = {
  1: "Tidak Pernah", 2: "Jarang", 3: "Kadang", 4: "Sering", 5: "Konsisten",
};
export const BANK_PEER: Pertanyaan[] = [
  { code: "TW1", kategori: "Kerja Sama", teks: "Membantu anggota lain ketika dibutuhkan.", tipe: "likert5", wajib: true },
  { code: "TW2", kategori: "Kerja Sama", teks: "Tidak melempar tanggung jawab kepada orang lain.", tipe: "likert5", wajib: true },
  { code: "CM1", kategori: "Komunikasi", teks: "Berkomunikasi dengan jelas.", tipe: "likert5", wajib: true },
  { code: "RS1", kategori: "Rasa Hormat", teks: "Menghargai rekan kerja & tidak merendahkan.", tipe: "likert5", wajib: true },
  { code: "RL1", kategori: "Dapat Diandalkan", teks: "Menyelesaikan tugas yang menjadi tanggung jawabnya.", tipe: "likert5", wajib: true },
  { code: "DS1", kategori: "Disiplin", teks: "Mengikuti waktu kerja & jadwal.", tipe: "likert5", wajib: true },
  { code: "SOP1", kategori: "SOP & Kebersihan", teks: "Bekerja sesuai prosedur, menjaga kebersihan, pakai APD.", tipe: "likert5", wajib: true },
  { code: "QL1", kategori: "Kualitas", teks: "Teliti & mau memperbaiki kesalahan.", tipe: "likert5", wajib: true },
  { code: "IN1", kategori: "Inisiatif", teks: "Bergerak saat melihat pekerjaan yang perlu diselesaikan.", tipe: "likert5", wajib: true },
  { code: "AC1", kategori: "Tanggung Jawab", teks: "Mengakui kesalahan & tidak menyalahkan tanpa alasan.", tipe: "likert5", wajib: true },
  { code: "POS", kategori: "Masukan Terbuka", teks: "Perilaku positif yang perlu dipertahankan dari orang ini.", tipe: "teks", wajib: false },
  { code: "IMP", kategori: "Masukan Terbuka", teks: "Perilaku yang perlu diperbaiki (berikan contoh faktual bila ada).", tipe: "teks", wajib: false },
];
export const BANK_LEADERSHIP: Pertanyaan[] = [
  { code: "DR1", kategori: "Arahan", teks: "Memberikan instruksi dengan jelas & prioritas yang tidak bertentangan.", tipe: "likert5", wajib: true },
  { code: "FR1", kategori: "Keadilan", teks: "Membagi pekerjaan dengan adil & tidak pilih kasih.", tipe: "likert5", wajib: true },
  { code: "CM1", kategori: "Komunikasi", teks: "Mau mendengarkan masalah anggota & mudah diajak koordinasi.", tipe: "likert5", wajib: true },
  { code: "CF1", kategori: "Kelola Konflik", teks: "Menangani konflik tanpa memperkeruh, mendengar semua pihak.", tipe: "likert5", wajib: true },
  { code: "RS1", kategori: "Rasa Hormat", teks: "Mengoreksi kesalahan secara profesional, tidak mempermalukan.", tipe: "likert5", wajib: true },
  { code: "EX1", kategori: "Teladan", teks: "Memberi contoh kedisiplinan & mematuhi aturan yang sama.", tipe: "likert5", wajib: true },
  { code: "SP1", kategori: "Dukungan", teks: "Membantu saat tim mengalami hambatan.", tipe: "likert5", wajib: true },
  { code: "PS1", kategori: "Rasa Aman Psikologis", teks: "Saya aman menyampaikan masalah & mengakui kesalahan kepada pimpinan ini.", tipe: "likert5", wajib: true },
  { code: "KEEP", kategori: "Masukan Terbuka", teks: "Apa yang perlu dipertahankan dari cara memimpin orang ini?", tipe: "teks", wajib: false },
  { code: "FIX", kategori: "Masukan Terbuka", teks: "Satu hal yang paling perlu diperbaiki?", tipe: "teks", wajib: false },
];

/* ================= APRESIASI ================= */
export const APRESIASI_KATEGORI = [
  "Membantu tanpa diminta", "Kerja cepat", "Teliti", "Menjaga kebersihan",
  "Menyelesaikan masalah", "Komunikasi baik", "Membimbing anggota lain",
  "Menjaga SOP", "Menjaga semangat tim", "Inisiatif",
];

/* ================= LAPOR MASALAH / INSIDEN ================= */
export const INSIDEN_KATEGORI = [
  "Konflik rekan kerja", "Perundungan / merendahkan", "Intimidasi",
  "Gosip yang mengganggu pekerjaan", "Tidak mau bekerja sama", "Pelanggaran SOP",
  "Masalah kebersihan", "Masalah keamanan pangan", "Masalah APD",
  "Manipulasi absensi", "Kehilangan / dugaan pencurian",
  "Ketidakadilan pembagian kerja", "Masalah atasan / koordinator",
  "Masalah gaji", "Pelecehan", "Ancaman keselamatan",
  "Kerusakan alat/fasilitas", "Lainnya",
];
export const INSIDEN_STATUS = [
  "SUBMITTED", "TRIAGED", "UNDER_REVIEW", "NEED_MORE_INFO",
  "ACTION_REQUIRED", "RESOLVED", "CLOSED", "UNSUBSTANTIATED",
];
export const URGENSI = ["rendah", "sedang", "tinggi", "darurat"];

/* ================= ACTION PLAN ================= */
export const ACTION_STATUS = ["OPEN", "PLANNED", "IN_PROGRESS", "BLOCKED", "DONE", "REVIEWED"];
export const PRIORITAS = ["rendah", "sedang", "tinggi"];
