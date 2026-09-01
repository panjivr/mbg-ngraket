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
  // — Analisis Gizi —
  {
    slug: "generator-gizi",
    judul: "Generator Kandungan Gizi",
    heading: "ANALISIS KANDUNGAN GIZI MENU",
    nomor: "",
    deskripsi:
      "Kalkulator interaktif komposisi menu: pilih bahan + berat per porsi, otomatis hitung energi, protein, lemak, KH, serat, serta % pemenuhan AKG per kelompok sasaran (pengganti mandiri Nutri Survey).",
    ikon: "🧮",
  },
  {
    slug: "gambaran-ompreng",
    judul: "Gambaran Ompreng (Visual Menu)",
    heading: "GAMBARAN OMPRENG — RENCANA MENU HARIAN",
    nomor: "",
    deskripsi:
      "Visualisasi nampan ompreng 5 sekat dengan label menu per sekat & ilustrasi makanan otomatis. Menu bisa diganti bebas dan hasilnya diunduh sebagai PNG/JPG — cocok untuk menyodorkan rencana menu ke kepala dapur.",
    ikon: "🍱",
  },
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
  {
    slug: "kebersihan-ruang",
    judul: "Monitoring Kebersihan per Area",
    heading: "FORM MONITORING KEBERSIHAN",
    nomor: "",
    deskripsi:
      "Checklist kebersihan detail per area (Persiapan, Pengolahan, Pemorsian, Pencucian, Gudang, Loker, Toilet) — tanggal 1–31 × Sebelum/Sesudah.",
    ikon: "🧴",
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
  {
    slug: "organoleptik",
    judul: "Uji Organoleptik Makanan",
    heading: "FORM UJI ORGANOLEPTIK MAKANAN (KELAYAKAN EDAR)",
    nomor: "",
    deskripsi:
      "Uji sensori setiap menu sebelum didistribusikan: warna, aroma, rasa, tekstur & tingkat kematangan — untuk menyatakan makanan LAYAK / TIDAK LAYAK edar.",
    ikon: "👃",
  },
  {
    slug: "retensi-sampel",
    judul: "Kartu Retensi Sampel Makanan",
    heading: "KARTU RETENSI (PENYIMPANAN) SAMPEL MAKANAN",
    nomor: "",
    deskripsi:
      "Pencatatan penyimpanan sampel makanan wajib 2×24 jam per menu: waktu produksi, jumlah sampel, suhu simpan, dan jadwal pemusnahan — untuk penelusuran bila terjadi keluhan/keracunan.",
    ikon: "🧫",
  },
  {
    slug: "penerimaan-bahan",
    judul: "Ceklist Penerimaan Bahan Baku",
    heading: "CEKLIST PENERIMAAN & PEMERIKSAAN MUTU BAHAN BAKU",
    nomor: "",
    deskripsi:
      "Inspeksi bahan baku saat diterima dari supplier: jumlah, suhu, kondisi/mutu, tanggal kadaluarsa, dan keputusan DITERIMA / DITOLAK — sebagai kendali mutu di titik penerimaan.",
    ikon: "📥",
    landscape: true,
  },
  // — Higiene Penjamah —
  {
    slug: "higiene-penjamah",
    judul: "Higiene Penjamah Makanan",
    heading: "FORM PEMERIKSAAN HIGIENE PENJAMAH MAKANAN",
    nomor: "",
    deskripsi:
      "Pemeriksaan harian kondisi penjamah makanan: kesehatan, kuku, celemek/pakaian, penutup kepala, masker, luka terbuka, dan cuci tangan — untuk mencegah kontaminasi.",
    ikon: "🧑‍🍳",
    landscape: true,
  },
];

export function getTemplateGizi(slug: string): TemplateGizi | undefined {
  return TEMPLATE_GIZI.find((t) => t.slug === slug);
}

/**
 * Daftar kegiatan kebersihan per area (mengikuti Form Monitoring Kebersihan
 * SPPG). Dipakai form "Monitoring Kebersihan per Area" — pilih area lalu
 * checklist per tanggal (Sebelum/Sesudah).
 */
export interface AreaKebersihan {
  key: string;
  nama: string;
  kegiatan: string[];
}

export const AREA_KEBERSIHAN: AreaKebersihan[] = [
  {
    key: "persiapan",
    nama: "Persiapan",
    kegiatan: [
      "Pastikan tidak ada sisa bahan tercecer",
      "Bersihkan meja",
      "Bersihkan wadah penyajian",
      "Cuci peralatan seperti pisau, talenan, wadah setelah digunakan lalu simpan sesuai tempatnya",
      "Pastikan bahan disimpan sesuai tempatnya menurut karakteristik bahan",
      "Bersihkan rak penyimpanan",
      "Kosongkan tempat sampah dan ganti plastik",
      "Sapu dan pel lantai",
      "Pastikan wastafel bersih dan tidak tersumbat",
    ],
  },
  {
    key: "pengolahan",
    nama: "Pengolahan",
    kegiatan: [
      "Pastikan tidak ada sisa bahan tercecer",
      "Bersihkan meja",
      "Bersihkan kompor, steamer, cooking hook, exhaust",
      "Cuci peralatan masak setelah digunakan lalu simpan sesuai tempatnya",
      "Pastikan bahan disimpan sesuai tempatnya menurut karakteristik bahan",
      "Pastikan tidak ada genangan dan saluran air tidak tersumbat",
      "Kosongkan tempat sampah dan ganti plastik",
      "Sapu dan pel lantai",
      "Kembalikan bahan sisa pakai ke gudang dengan rapih (tertutup, terorganisir dan sesuai tempatnya)",
    ],
  },
  {
    key: "pemorsian",
    nama: "Pemorsian",
    kegiatan: [
      "Pastikan tidak ada sisa bahan tercecer",
      "Bersihkan meja",
      "Bersihkan kompor, steamer, cooking hook, exhaust",
      "Cuci peralatan masak setelah digunakan lalu simpan sesuai tempatnya",
      "Pastikan bahan disimpan sesuai tempatnya menurut karakteristik bahan",
      "Pastikan tidak ada genangan dan saluran air tidak tersumbat",
      "Kosongkan tempat sampah dan ganti plastik",
      "Sapu dan pel lantai",
      "Kembalikan bahan sisa pakai ke gudang dengan rapih (tertutup, terorganisir dan sesuai tempatnya)",
    ],
  },
  {
    key: "pencucian",
    nama: "Pencucian Ompreng",
    kegiatan: [
      "Bersihkan ompreng dari sisa makanan",
      "Bersihkan sink pencucian dan rak",
      "Cuci lap yang telah digunakan lalu keringkan, simpan di tempat yang bersih",
      "Periksa peralatan untuk memastikan tidak ada kerusakan atau kontaminasi",
      "Lap dinding dan permukaan logam",
      "Kosongkan tempat sampah dan ganti plastik",
      "Bersihkan lantai, pastikan tidak ada genangan air",
      "Membersihkan keset",
      "Mengecek ketersediaan sabun pada wastafel",
    ],
  },
  {
    key: "gudang_kering",
    nama: "Gudang Kering",
    kegiatan: [
      "Sapu dan pel lantai",
      "Membersihkan dan merapihkan rak penyimpanan",
      "Periksa masa simpan bahan secara berkala, buang bahan kadaluarsa",
      "Pastikan tidak ada tanda-tanda hama seperti serangga/tikus",
    ],
  },
  {
    key: "gudang_basah",
    nama: "Gudang Basah",
    kegiatan: [
      "Bebas dari sisa bahan yang jatuh, lantai dan dinding bebas dari noda bahan",
      "Periksa masa simpan bahan secara berkala, buang bahan kadaluarsa",
      "Bersihkan rak dan wadah penyimpanan",
      "Bersihkan pintu lemari pendingin, pastikan seal karet menutup rapat",
      "Pastikan tidak ada tanda-tanda hama seperti serangga/tikus",
      "Sapu dan pel lantai",
      "Freezer cleaning",
    ],
  },
  {
    key: "loker",
    nama: "Loker",
    kegiatan: [
      "Menyapu lantai",
      "Mengepel lantai",
      "Membersihkan rak sepatu",
      "Membersihkan dinding",
      "Membersihkan langit-langit",
      "Mengecek fungsi sakelar dan lampu loker",
    ],
  },
  {
    key: "toilet",
    nama: "Toilet",
    kegiatan: [
      "Menyikat lantai",
      "Membersihkan lantai dengan cairan pembersih",
      "Membersihkan saringan air",
      "Membersihkan dinding",
      "Mengecek kelayakan fungsi keran air",
      "Mengecek kelengkapan toilet",
      "Mengecek fungsi saklar dan lampu toilet",
      "Membersihkan keset",
      "Mengecek ketersediaan sabun pada wastafel",
    ],
  },
];

/**
 * Baris identitas SPPG untuk kop dokumen: uppercase & dijamin berawalan "SPPG"
 * (tanpa menggandakan bila nama dapur sudah memuat "SPPG"). Nama diambil dari
 * konfigurasi dapur yang sedang login sehingga tiap dapur tampil otomatis.
 */
export function sppgKopLine(nama: string | null | undefined): string {
  const n = (nama || "").trim();
  if (!n) return "SPPG";
  const up = n.toUpperCase();
  return up.startsWith("SPPG") ? up : `SPPG ${up}`;
}

/** Pengelompokan template supaya hub lebih terstruktur/profesional. */
export const KELOMPOK_GIZI: { label: string; ket: string; slugs: string[] }[] = [
  {
    label: "Analisis Gizi",
    ket: "Generator kandungan gizi menu & pemenuhan AKG.",
    slugs: ["generator-gizi"],
  },
  {
    label: "Visualisasi Menu",
    ket: "Gambaran ompreng 5 sekat untuk presentasi menu (ekspor PNG/JPG).",
    slugs: ["gambaran-ompreng"],
  },
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
    ket: "Checklist kebersihan area dapur, fasilitas & higiene penjamah.",
    slugs: ["kebersihan-area", "kebersihan-ruang", "higiene-penjamah"],
  },
  {
    label: "Limbah & Kebutuhan Bahan",
    ket: "Food waste dan rekap kebutuhan bahan untuk PO.",
    slugs: ["foodwaste", "rekap-po"],
  },
  {
    label: "Keamanan Pangan",
    ket: "Penerimaan bahan, HACCP, uji organoleptik & retensi sampel.",
    slugs: ["penerimaan-bahan", "haccp", "organoleptik", "retensi-sampel"],
  },
];
