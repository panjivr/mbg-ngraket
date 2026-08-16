/**
 * Metadata template Berita Acara Akuntan SPPG.
 * Dipakai hub `/admin/akuntan` dan judul halaman cetak `/cetak/akuntan/<slug>`.
 * Halaman cetak bersifat isi-lalu-cetak (contentEditable) — tanpa perubahan DB.
 */
export interface TemplateAkuntan {
  slug: string;
  judul: string;
  /** Judul dokumen (heading di kop cetak). */
  heading: string;
  nomor: string;
  deskripsi: string;
  ikon: string;
  /** Opsional: nominal rupiah acuan BA — tampil di kartu & dijumlahkan di hub. */
  nominal?: number;
}

export const TEMPLATE_AKUNTAN: TemplateAkuntan[] = [
  {
    slug: "lembur-karyawan",
    judul: "BA Lembur Karyawan",
    heading: "BERITA ACARA LEMBUR KARYAWAN",
    nomor: "017/BALK-SPPG/VII/2026",
    deskripsi: "Daftar karyawan yang melaksanakan lembur di luar jam kerja.",
    ikon: "🌙",
  },
  {
    slug: "servis-peralatan",
    judul: "BA Servis & Perbaikan Peralatan",
    heading: "BERITA ACARA SERVIS DAN PERBAIKAN PERALATAN",
    nomor: "018/BALK-SPPG/VII/2026",
    deskripsi: "Rincian pekerjaan servis/perbaikan peralatan beserta biaya.",
    ikon: "🔧",
    nominal: 180000,
  },
  {
    slug: "tambahan-bahan-baku",
    judul: "BA Penambahan Pembelian Bahan Baku (di luar PO)",
    heading:
      "BERITA ACARA PENAMBAHAN PEMBELIAN BAHAN BAKU DI LUAR PURCHASE ORDER (PO)",
    nomor: "002/BAPPBB-SPPG/VII/2026",
    deskripsi: "Pembelian bahan baku mendesak di luar PO memakai petty cash.",
    ikon: "🛒",
    nominal: 70000,
  },
  {
    slug: "penggantian-operasional",
    judul: "BA Penggantian Dana Operasional",
    heading:
      "BERITA ACARA PENGGUNAAN DAN PENGAJUAN PENGGANTIAN DANA OPERASIONAL",
    nomor: "003/BAPDPPDO-SPPG/VII/2026",
    deskripsi: "Pengajuan penggantian dana operasional (petty cash) ke mitra.",
    ikon: "💵",
    nominal: 301800,
  },
  {
    slug: "kelebihan-insentif-pic",
    judul: "BA Kelebihan Transfer Insentif PIC",
    heading: "BERITA ACARA KELEBIHAN TRANSFER INSENTIF PIC",
    nomor: "020/BAKTF-SPPG/VII/2026",
    deskripsi: "Pernyataan kelebihan transfer insentif PIC & penarikan kembali.",
    ikon: "↩️",
    nominal: 160000,
  },
  {
    slug: "insentif-pm",
    judul: "BA Insentif Penerima Manfaat",
    heading: "BERITA ACARA SERAH TERIMA INSENTIF",
    nomor: "",
    deskripsi:
      "Rekap insentif PIC + serah terima per lembaga — sekali cetak untuk semua lembaga.",
    ikon: "🤝",
  },
  {
    slug: "gagal-approval",
    judul: "BA Gagal Approval VA",
    heading: "BERITA ACARA GAGAL APPROVAL VA",
    nomor: "",
    deskripsi: "Rincian pembayaran yang gagal approval untuk proses ulang.",
    ikon: "⚠️",
  },
  {
    slug: "kelebihan-transfer",
    judul: "BA Kelebihan Transfer Dana",
    heading: "BERITA ACARA KELEBIHAN TRANSFER DANA",
    nomor: "",
    deskripsi: "Pernyataan kelebihan transfer dana ke supplier & pengembalian.",
    ikon: "📈",
    nominal: 11000,
  },
  {
    slug: "kekurangan-transfer",
    judul: "BA Kekurangan Transfer Dana",
    heading: "BERITA ACARA KEKURANGAN TRANSFER DANA",
    nomor: "",
    deskripsi: "Pernyataan kekurangan transfer dana ke supplier & pelunasan.",
    ikon: "📉",
    nominal: 1000000,
  },
  {
    slug: "buku-kas-harian",
    judul: "Buku Kas Umum Harian",
    heading: "BUKU KAS UMUM HARIAN (PETTY CASH)",
    nomor: "",
    deskripsi:
      "Catatan penerimaan & pengeluaran kas kecil harian dengan saldo berjalan.",
    ikon: "📒",
  },
  {
    slug: "rekap-pengeluaran",
    judul: "Rekap Pengeluaran Bulanan",
    heading: "REKAPITULASI PENGELUARAN OPERASIONAL BULANAN",
    nomor: "",
    deskripsi:
      "Rangkuman pengeluaran per kategori dalam satu bulan untuk pelaporan.",
    ikon: "📊",
  },
];

export function getTemplate(slug: string): TemplateAkuntan | undefined {
  return TEMPLATE_AKUNTAN.find((t) => t.slug === slug);
}

/**
 * Urutan divisi/jabatan resmi SPPG (mengikuti dokumen "Urutan Nama Karyawan").
 * Dipakai untuk mengurutkan daftar pegawai (mis. BA Lembur) — nama pegawai
 * menyesuaikan data, tetapi urutan divisinya mengikuti daftar ini.
 */
export const URUTAN_DIVISI: string[] = [
  "Asisten Lapangan",
  "Koordinator",
  "Admin",
  "Persiapan",
  "Chef",
  "Pengolahan",
  "Pemorsian",
  "Pencucian",
  "Driver",
  "Kebersihan",
  "Keamanan",
];

// Kata kunci pencocokan (huruf besar) sejajar dengan URUTAN_DIVISI di atas.
const KUNCI_DIVISI = [
  "LAPANGAN",
  "KOORDINATOR",
  "ADMIN",
  "PERSIAPAN",
  "CHEF",
  "PENGOLAHAN",
  "PEMORSIAN",
  "PENCUCIAN",
  "DRIVER",
  "KEBERSIHAN",
  "KEAMANAN",
];

/** Peringkat urutan sebuah divisi/jabatan; tak dikenal → paling akhir. */
export function urutanDivisi(nama?: string | null): number {
  const s = (nama || "").toUpperCase();
  for (let i = 0; i < KUNCI_DIVISI.length; i++) {
    if (s.includes(KUNCI_DIVISI[i])) return i;
  }
  return KUNCI_DIVISI.length;
}
