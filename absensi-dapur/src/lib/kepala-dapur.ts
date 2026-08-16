import type { CetakGrup, CetakTemplate } from "./cetak-forms";

/**
 * Katalog formulir cetak untuk Kepala Dapur / Kepala SPPG.
 * Formulir operasional & pengendalian harian yang memang dibutuhkan untuk
 * memimpin dapur SPPG (bukan berita acara keuangan). Cetak-saja (noSave).
 */
export const TEMPLATE_KEPALA_DAPUR: readonly CetakTemplate[] = [
  {
    slug: "laporan-harian-operasional",
    judul: "Laporan Harian Operasional",
    heading: "LAPORAN HARIAN OPERASIONAL DAPUR",
    deskripsi:
      "Ringkasan operasi satu hari: jumlah porsi, menu, kehadiran staf, kendala, dan tindak lanjut.",
    ikon: "📋",
    warna: "emerald",
    landscape: true,
  },
  {
    slug: "serah-terima-shift",
    judul: "Serah Terima Shift",
    heading: "BERITA ACARA SERAH TERIMA SHIFT",
    deskripsi:
      "Catatan penyerahan tugas antar penanggung jawab shift: status pekerjaan, stok, dan hal penting.",
    ikon: "🔄",
    warna: "sky",
  },
  {
    slug: "notulen-briefing",
    judul: "Notulen Briefing Harian",
    heading: "NOTULEN BRIEFING / APEL DAPUR",
    deskripsi:
      "Poin arahan briefing pagi, pembagian tugas per divisi, dan pengumuman untuk seluruh tim.",
    ikon: "📣",
    warna: "amber",
  },
  {
    slug: "laporan-insiden",
    judul: "Laporan Insiden / Kejadian",
    heading: "LAPORAN INSIDEN & TINDAKAN KOREKSI",
    deskripsi:
      "Pencatatan kejadian tak terduga (kecelakaan kerja, kerusakan, komplain) beserta tindakan koreksi.",
    ikon: "⚠️",
    warna: "rose",
  },
  {
    slug: "evaluasi-mingguan",
    judul: "Evaluasi Mingguan",
    heading: "EVALUASI KINERJA MINGGUAN DAPUR",
    deskripsi:
      "Rekap capaian sepekan: total porsi, ketepatan waktu, kendala berulang, dan rencana perbaikan.",
    ikon: "📈",
    warna: "violet",
    landscape: true,
  },
  {
    slug: "inspeksi-kebersihan",
    judul: "Inspeksi Kebersihan Harian",
    heading: "CEKLIST INSPEKSI KEBERSIHAN & SANITASI",
    deskripsi:
      "Pemeriksaan menyeluruh kebersihan area, peralatan, dan sanitasi sebelum & sesudah operasional.",
    ikon: "🧽",
    warna: "teal",
    landscape: true,
  },
];

export const KELOMPOK_KEPALA_DAPUR: readonly CetakGrup[] = [
  {
    label: "Operasional Harian",
    ket: "Rutin setiap hari",
    slugs: [
      "laporan-harian-operasional",
      "notulen-briefing",
      "serah-terima-shift",
    ],
  },
  {
    label: "Pengendalian & Evaluasi",
    ket: "Mutu & tindak lanjut",
    slugs: ["inspeksi-kebersihan", "laporan-insiden", "evaluasi-mingguan"],
  },
];
