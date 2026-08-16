import type { CetakGrup, CetakTemplate } from "./cetak-forms";

/**
 * Katalog formulir cetak untuk Asisten Lapangan (Aslap) — penanggung jawab
 * distribusi makanan ke titik/sekolah. Formulir serah terima & monitoring
 * lapangan yang memang dibutuhkan. Cetak-saja (noSave).
 */
export const TEMPLATE_ASLAP: readonly CetakTemplate[] = [
  {
    slug: "bast-sekolah",
    judul: "BAST Makanan ke Sekolah",
    heading: "BERITA ACARA SERAH TERIMA MAKANAN",
    deskripsi:
      "Bukti serah terima makanan ke pihak sekolah/titik: jumlah porsi, menu, jam, dan tanda tangan penerima.",
    ikon: "🤝",
    warna: "emerald",
  },
  {
    slug: "ceklist-kesiapan-distribusi",
    judul: "Ceklist Kesiapan Distribusi",
    heading: "CEKLIST KESIAPAN ARMADA & PENGIRIMAN",
    deskripsi:
      "Pemeriksaan sebelum berangkat: kondisi kendaraan, kebersihan box, suhu, kelengkapan, dan dokumen.",
    ikon: "🚚",
    warna: "sky",
  },
  {
    slug: "rekap-penerima",
    judul: "Rekap Penerima per Titik",
    heading: "REKAP JUMLAH PENERIMA PER TITIK DISTRIBUSI",
    deskripsi:
      "Daftar titik/sekolah dengan jumlah porsi rencana vs realisasi dan jam pengiriman.",
    ikon: "🧾",
    warna: "amber",
    landscape: true,
  },
  {
    slug: "retur-sisa",
    judul: "Retur & Sisa Makanan",
    heading: "LAPORAN RETUR & SISA MAKANAN",
    deskripsi:
      "Pencatatan makanan yang dikembalikan/tersisa per titik beserta alasan dan tindakan penanganan.",
    ikon: "♻️",
    warna: "rose",
    landscape: true,
  },
  {
    slug: "monitoring-sekolah",
    judul: "Monitoring Lapangan",
    heading: "LAPORAN MONITORING DISTRIBUSI LAPANGAN",
    deskripsi:
      "Catatan pemantauan penerimaan siswa, respons rasa/porsi, dan temuan di lapangan untuk umpan balik.",
    ikon: "🔎",
    warna: "violet",
  },
];

export const KELOMPOK_ASLAP: readonly CetakGrup[] = [
  {
    label: "Serah Terima",
    ket: "Bukti pengiriman",
    slugs: ["bast-sekolah", "rekap-penerima"],
  },
  {
    label: "Kesiapan & Pemantauan",
    ket: "Sebelum & sesudah distribusi",
    slugs: ["ceklist-kesiapan-distribusi", "monitoring-sekolah", "retur-sisa"],
  },
];
