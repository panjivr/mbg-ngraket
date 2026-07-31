/**
 * Metadata template Laporan & Checklist Ahli Gizi SPPG.
 * Dipakai hub `/admin/ahli-gizi` dan halaman cetak `/cetak/ahli-gizi/<slug>`.
 * Halaman cetak bersifat isi-lalu-cetak (contentEditable) dan bisa diarsipkan
 * per tanggal ke tabel `laporan_gizi` (lihat lib/db.ts).
 */
export interface TemplateGizi {
  slug: string;
  /** Judul kartu di hub. */
  judul: string;
  /** Judul dokumen (heading di kop cetak). */
  heading: string;
  nomor: string;
  deskripsi: string;
  ikon: string;
  /** Formulir lebar (grid tanggal 1–31) dicetak mendatar (landscape). */
  landscape?: boolean;
}

export const TEMPLATE_GIZI: TemplateGizi[] = [
  // — Laporan —
  {
    slug: "laporan-harian",
    judul: "Laporan Harian Ahli Gizi",
    heading: "RENCANA STANDAR PORSI MENU",
    nomor: "",
    deskripsi:
      "Rencana standar porsi menu harian per kelompok sasaran (B3, SD 1–3, SD 4–6, SMP & SMA) beserta rekap zat gizi & % pemenuhan.",
    ikon: "📋",
  },
  {
    slug: "laporan-mingguan",
    judul: "Laporan Mingguan Ahli Gizi",
    heading: "LAPORAN MINGGUAN AHLI GIZI",
    nomor: "",
    deskripsi:
      "Laporan naratif mingguan (pendahuluan, pelaksanaan, evaluasi menu & higiene, penutup) sebagai rekap kegiatan gizi.",
    ikon: "🗒️",
  },
  // — Monitoring Suhu —
  {
    slug: "suhu-makanan",
    judul: "Pengecekan Suhu Makanan Matang & Diporsi",
    heading: "FORM PENGECEKAN SUHU MAKANAN MATANG DAN DIPORSI",
    nomor: "",
    deskripsi:
      "Catatan suhu makanan matang dan saat diporsi per tanggal beserta paraf petugas.",
    ikon: "🌡️",
  },
  {
    slug: "suhu-pemorsian",
    judul: "Monitoring Suhu Ruang Pemorsian",
    heading: "PEMANTAUAN SUHU RUANGAN PEMORSIAN",
    nomor: "",
    deskripsi:
      "Grafik/tabel pemantauan suhu ruang pemorsian (15–35℃) untuk tanggal 1–31 dalam satu bulan.",
    ikon: "🏠",
    landscape: true,
  },
  {
    slug: "suhu-showcase",
    judul: "Monitoring Suhu Showcase / Chiller / Freezer",
    heading: "FORM MONITORING SUHU SHOWCASE / CHILLER / FREEZER",
    nomor: "",
    deskripsi:
      "Pemeriksaan suhu penyimpanan dingin pagi & malam untuk tanggal 1–31 dalam satu bulan.",
    ikon: "❄️",
    landscape: true,
  },
  // — Kebersihan (Checklist) —
  {
    slug: "kebersihan-area",
    judul: "Monitoring Kebersihan Area",
    heading: "FORM MONITORING KEBERSIHAN AREA",
    nomor: "",
    deskripsi:
      "Checklist kebersihan harian per area (gudang, loker, pengolahan, pemorsian, pencucian, toilet, dll.) untuk tanggal 1–31.",
    ikon: "🧽",
    landscape: true,
  },
  // — Limbah & Bahan —
  {
    slug: "foodwaste",
    judul: "Form Food Waste (Data Limbah)",
    heading: "FORM PENCATATAN FOOD WASTE / DATA LIMBAH",
    nomor: "",
    deskripsi:
      "Pencatatan sisa/limbah makanan per komponen menu (makanan pokok, lauk, sayur, buah) dalam kilogram.",
    ikon: "♻️",
  },
  {
    slug: "rekap-po",
    judul: "Rekap Kebutuhan Bahan (PO)",
    heading: "REKAP KEBUTUHAN BAHAN UNTUK PURCHASE ORDER (PO)",
    nomor: "",
    deskripsi:
      "Rekap kebutuhan bahan baku hasil perhitungan porsi menu untuk dasar pembuatan Purchase Order.",
    ikon: "📦",
  },
  // — Keamanan Pangan —
  {
    slug: "haccp",
    judul: "Monitoring HACCP",
    heading: "FORM MONITORING HACCP (TITIK KENDALI KRITIS)",
    nomor: "",
    deskripsi:
      "Pemantauan titik kendali kritis (CCP) mutu & keamanan pangan: penerimaan, penyimpanan, pengolahan, pemorsian, dan distribusi.",
    ikon: "🧪",
  },
];

export function getTemplateGizi(slug: string): TemplateGizi | undefined {
  return TEMPLATE_GIZI.find((t) => t.slug === slug);
}

/** Pengelompokan template supaya hub lebih terstruktur/profesional. */
export const KELOMPOK_GIZI: { label: string; ket: string; slugs: string[] }[] = [
  {
    label: "Laporan Gizi",
    ket: "Laporan harian & mingguan ahli gizi.",
    slugs: ["laporan-harian", "laporan-mingguan"],
  },
  {
    label: "Monitoring Suhu",
    ket: "Suhu makanan, ruang pemorsian, dan penyimpanan dingin.",
    slugs: ["suhu-makanan", "suhu-pemorsian", "suhu-showcase"],
  },
  {
    label: "Kebersihan & Sanitasi",
    ket: "Checklist kebersihan area dapur & fasilitas.",
    slugs: ["kebersihan-area"],
  },
  {
    label: "Limbah & Kebutuhan Bahan",
    ket: "Food waste dan rekap kebutuhan bahan untuk PO.",
    slugs: ["foodwaste", "rekap-po"],
  },
  {
    label: "Keamanan Pangan",
    ket: "Pemantauan HACCP / titik kendali kritis.",
    slugs: ["haccp"],
  },
];
