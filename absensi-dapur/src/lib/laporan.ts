// Tipe & nilai default untuk Laporan Kegiatan Harian (SPPG).

export interface Personel {
  label: string;
  jumlah: number;
}

export interface MenuTabel {
  besar: string[];
  kecil: string[];
  busui_bumil: string[];
  balita: string[];
}

/** Bagian teks/terstruktur laporan (tanpa foto). */
export interface LaporanIsi {
  menu_teks: string;
  menu_tabel: MenuTabel;
  personel: Personel[];
  kegiatan: string[];
  kendala: string;
  solusi: string;
}

/** Slot foto dokumentasi (nilai = data URL base64 atau ""). */
export interface LaporanFoto {
  menu: string;
  penerimaan: string;
  persiapan: string;
  pengolahan: string;
  pemorsian: string;
  distribusi: string;
  cuci: string;
}

export const FOTO_SLOTS: { key: keyof LaporanFoto; label: string }[] = [
  { key: "menu", label: "Foto Menu" },
  { key: "penerimaan", label: "Foto Penerimaan Barang" },
  { key: "persiapan", label: "Foto Persiapan" },
  { key: "pengolahan", label: "Foto Pengolahan" },
  { key: "pemorsian", label: "Foto Pemorsian" },
  { key: "distribusi", label: "Foto Distribusi" },
  { key: "cuci", label: "Foto Cuci Ompreng" },
];

const MENU_DEFAULT = ["Nasi Putih", "Ayam Bawang", "Sayur Lodeh", "Susu UHT", "Kerupuk Finna", "Buah Pear"];

export const LAPORAN_ISI_DEFAULT: LaporanIsi = {
  menu_teks: "",
  menu_tabel: {
    besar: [...MENU_DEFAULT],
    kecil: [...MENU_DEFAULT],
    busui_bumil: [...MENU_DEFAULT],
    balita: [...MENU_DEFAULT],
  },
  personel: [
    { label: "Kepala SPPG", jumlah: 1 },
    { label: "Pengawas Gizi", jumlah: 1 },
    { label: "Pengawas Keuangan", jumlah: 1 },
    { label: "Asisten lapangan", jumlah: 1 },
    { label: "Pengemudi", jumlah: 4 },
    { label: "Cuci Ompreng", jumlah: 10 },
    { label: "Keamanan", jumlah: 2 },
    { label: "Tim Persiapan", jumlah: 7 },
    { label: "Tim Pengolahan", jumlah: 12 },
    { label: "Tim Pemorsian", jumlah: 10 },
    { label: "Kebersihan", jumlah: 2 },
  ],
  kegiatan: [
    "Penerimaan bahan baku dari supplier pukul 16.29–17.48",
    "Persiapan bahan baku pukul 18.25–00.30 sampai seluruh bahan siap diolah.",
    "Proses memasak pukul 00.30–08.30 menyesuaikan menu dan jadwal pengolahan.",
    "Pengemasan/pemorsian pukul 03.00–11.00 menyesuaikan jadwal pengiriman.",
    "Distribusi ke sekolah pukul 06.40–11.30.",
    "Pengambilan food tray pukul 11.30–14.30.",
    "Pencucian, pengelapan, dan sterilisasi food tray dimulai pukul 13.00 sampai selesai (±7–8 jam).",
  ],
  kendala:
    "Ditemukan salah satu atau beberapa kondisi berikut secara insidental: keterlambatan bahan dari supplier, kekurangan jumlah bahan, kerusakan bahan segar, buah tidak memenuhi standar mutu, perubahan jadwal distribusi sekolah, cuaca yang memengaruhi distribusi, atau kebutuhan penggantian peralatan operasional.",
  solusi:
    "Melakukan koordinasi dengan supplier, penggantian bahan yang tidak layak, penyesuaian jadwal kerja tim, penggunaan stok cadangan, pemeriksaan mutu berlapis, dan koordinasi dengan pihak sekolah untuk memastikan distribusi tetap berjalan sesuai target.",
};

export const LAPORAN_FOTO_KOSONG: LaporanFoto = {
  menu: "", penerimaan: "", persiapan: "", pengolahan: "", pemorsian: "", distribusi: "", cuci: "",
};

/** Gabungkan isi tersimpan di atas default agar field baru selalu terisi. */
export function mergeIsi(saved: Partial<LaporanIsi> | null | undefined): LaporanIsi {
  const d = LAPORAN_ISI_DEFAULT;
  const s = saved || {};
  return {
    menu_teks: typeof s.menu_teks === "string" ? s.menu_teks : d.menu_teks,
    menu_tabel: {
      besar: Array.isArray(s.menu_tabel?.besar) ? s.menu_tabel!.besar : d.menu_tabel.besar,
      kecil: Array.isArray(s.menu_tabel?.kecil) ? s.menu_tabel!.kecil : d.menu_tabel.kecil,
      busui_bumil: Array.isArray(s.menu_tabel?.busui_bumil) ? s.menu_tabel!.busui_bumil : d.menu_tabel.busui_bumil,
      balita: Array.isArray(s.menu_tabel?.balita) ? s.menu_tabel!.balita : d.menu_tabel.balita,
    },
    personel: Array.isArray(s.personel) && s.personel.length ? s.personel : d.personel,
    kegiatan: Array.isArray(s.kegiatan) && s.kegiatan.length ? s.kegiatan : d.kegiatan,
    kendala: typeof s.kendala === "string" ? s.kendala : d.kendala,
    solusi: typeof s.solusi === "string" ? s.solusi : d.solusi,
  };
}

export function mergeFoto(saved: Partial<LaporanFoto> | null | undefined): LaporanFoto {
  const s = saved || {};
  const pick = (k: keyof LaporanFoto) => (typeof s[k] === "string" ? (s[k] as string) : "");
  return {
    menu: pick("menu"), penerimaan: pick("penerimaan"), persiapan: pick("persiapan"),
    pengolahan: pick("pengolahan"), pemorsian: pick("pemorsian"), distribusi: pick("distribusi"), cuci: pick("cuci"),
  };
}
