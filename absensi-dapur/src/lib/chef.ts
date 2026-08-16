import type { CetakGrup, CetakTemplate } from "./cetak-forms";

/**
 * Katalog formulir cetak untuk Chef / Kepala Produksi (juru masak utama).
 * Formulir perencanaan & pengendalian produksi masakan yang memang dibutuhkan
 * di dapur produksi. Cetak-saja (noSave).
 */
export const TEMPLATE_CHEF: readonly CetakTemplate[] = [
  {
    slug: "rencana-produksi",
    judul: "Rencana Produksi Harian",
    heading: "RENCANA PRODUKSI MASAKAN HARIAN",
    deskripsi:
      "Rincian menu hari ini: jumlah porsi, urutan masak, alokasi tim, dan target waktu selesai per item.",
    ikon: "📝",
    warna: "emerald",
    landscape: true,
  },
  {
    slug: "ceklist-persiapan",
    judul: "Ceklist Persiapan (Mise en Place)",
    heading: "CEKLIST PERSIAPAN BAHAN (MISE EN PLACE)",
    deskripsi:
      "Daftar bahan yang harus disiapkan sebelum memasak: potong, bumbu, takaran, dan status kesiapan.",
    ikon: "🔪",
    warna: "sky",
  },
  {
    slug: "kartu-porsi",
    judul: "Kartu Standar Porsi & Yield",
    heading: "KARTU STANDAR PORSI & HASIL (YIELD)",
    deskripsi:
      "Standar berat/porsi per menu dan perhitungan yield agar jumlah hasil masakan sesuai target penerima.",
    ikon: "⚖️",
    warna: "amber",
    landscape: true,
  },
  {
    slug: "serah-terima-pemorsian",
    judul: "Serah Terima ke Pemorsian",
    heading: "BERITA ACARA SERAH TERIMA MASAKAN MATANG",
    deskripsi:
      "Serah terima masakan matang dari produksi ke tim pemorsian: jenis, jumlah, suhu, dan jam serah.",
    ikon: "🍲",
    warna: "rose",
  },
  {
    slug: "uji-rasa",
    judul: "Uji Rasa (Taste Test)",
    heading: "LEMBAR UJI RASA & KELAYAKAN MASAKAN",
    deskripsi:
      "Penilaian rasa, tekstur, kematangan, dan kelayakan tiap menu sebelum dilepas ke pemorsian.",
    ikon: "👅",
    warna: "violet",
  },
];

export const KELOMPOK_CHEF: readonly CetakGrup[] = [
  {
    label: "Persiapan & Produksi",
    ket: "Sebelum dan saat memasak",
    slugs: ["rencana-produksi", "ceklist-persiapan", "kartu-porsi"],
  },
  {
    label: "Kendali Mutu & Serah Terima",
    ket: "Sebelum ke pemorsian",
    slugs: ["uji-rasa", "serah-terima-pemorsian"],
  },
];
