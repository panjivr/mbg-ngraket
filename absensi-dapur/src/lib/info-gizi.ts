/**
 * Info Gizi Publik — data satu "poster" harian yang dibuka publik lewat scan QR.
 *
 * Halaman publik (`/info-gizi/<id-dapur>`) menampilkan menu hari ini, kandungan
 * gizi untuk 4 kelompok porsi (Peserta Didik Besar/Kecil, Bumil & Busui, Balita),
 * serta batas akhir waktu konsumsi. Isinya disimpan per (sppg_id, tanggal) sebagai
 * JSONB, jadi tiap hari tampilannya ikut menu.
 */

export type KategoriMenu =
  | "karbohidrat"
  | "hewani"
  | "nabati"
  | "sayur"
  | "buah"
  | "tambahan";

export const KATEGORI_MENU: KategoriMenu[] = [
  "karbohidrat",
  "hewani",
  "nabati",
  "sayur",
  "buah",
  "tambahan",
];

export const KATEGORI_MENU_LABEL: Record<KategoriMenu, string> = {
  karbohidrat: "KARBOHIDRAT",
  hewani: "PROTEIN HEWANI",
  nabati: "PROTEIN NABATI",
  sayur: "SAYUR",
  buah: "BUAH",
  tambahan: "TAMBAHAN",
};

/** Ringkasan gizi satu porsi (satuan: kkal & gram). */
export interface GiziPorsi {
  energi: number;
  protein: number;
  lemak: number;
  karbo: number;
  serat: number;
}

/** Empat kelompok porsi yang dilayani dapur MBG. */
export type PorsiKey = "pd_besar" | "pd_kecil" | "b2" | "balita";

export interface PorsiMeta {
  key: PorsiKey;
  /** Label penuh untuk editor & judul kolom. */
  label: string;
  /** Label ringkas untuk tab di layar sempit. */
  singkat: string;
  emoji: string;
  /** Warna aksen kolom/tab di halaman publik. */
  warna: string;
}

export const PORSI: PorsiMeta[] = [
  { key: "pd_besar", label: "Peserta Didik Besar", singkat: "PD Besar", emoji: "🎓", warna: "#0b6b3a" },
  { key: "pd_kecil", label: "Peserta Didik Kecil", singkat: "PD Kecil", emoji: "🧒", warna: "#0d9488" },
  { key: "b2", label: "Bumil & Busui (B2)", singkat: "Bumil & Busui", emoji: "🤰", warna: "#be185d" },
  { key: "balita", label: "Balita", singkat: "Balita", emoji: "🍼", warna: "#d97706" },
];

export const PORSI_KEYS: PorsiKey[] = PORSI.map((p) => p.key);

/** Gizi untuk semua kelompok porsi sekaligus. */
export type GiziSemua = Record<PorsiKey, GiziPorsi>;

export interface MenuPublik {
  kategori: KategoriMenu;
  nama: string;
}

export interface InfoGiziIsi {
  /** Bila false, halaman publik menampilkan "belum tersedia". */
  aktif: boolean;
  instansi: string;
  judul: string;
  subjudul: string;
  porsi_total: number;
  /** Kandungan gizi per kelompok porsi. */
  gizi: GiziSemua;
  menu: MenuPublik[];
  /** "HH.MM" batas akhir konsumsi + zona waktu tampilan ("WIB"). */
  batas_konsumsi: string;
  zona: string;
  peringatan_judul: string;
  peringatan_teks: string;
  sosmed: string;
  catatan: string;
  /**
   * Gambar desain poster rasio 4:5 (potrait) yang diunggah admin.
   * Disimpan sebagai data URL `data:image/...` hasil kompresi di browser,
   * atau URL https:// bila gambar di-host di tempat lain. "" = tidak ada.
   */
  desain: string;
  /** Cara menampilkan desain di halaman publik. */
  desain_mode: DesainMode;
}

/**
 * - `atas`  : desain tampil di atas, kartu rincian tetap ada (default)
 * - `saja`  : hanya desain, kartu rincian disembunyikan
 * - `bawah` : kartu rincian dulu, desain di bawah sebagai penutup
 */
export type DesainMode = "atas" | "saja" | "bawah";

export const DESAIN_MODE: { value: DesainMode; label: string; hint: string }[] = [
  { value: "atas", label: "Desain di atas", hint: "Gambar dulu, lalu rincian menu & gizi." },
  { value: "saja", label: "Hanya desain", hint: "Rincian menu & gizi disembunyikan." },
  { value: "bawah", label: "Desain di bawah", hint: "Rincian dulu, gambar sebagai penutup." },
];

/** Batas panjang data URL desain (~2,4 MB base64) supaya request tetap aman. */
export const DESAIN_MAX_CHARS = 2_400_000;

/** Rasio & ukuran baku desain potrait (dipakai editor + halaman publik). */
export const DESAIN_RASIO = "4 / 5";
export const DESAIN_LEBAR = 1080;
export const DESAIN_TINGGI = 1350;

export const GIZI_LABEL: { key: keyof GiziPorsi; label: string; sat: string }[] = [
  { key: "energi", label: "Energi", sat: "kkal" },
  { key: "protein", label: "Protein", sat: "g" },
  { key: "lemak", label: "Lemak", sat: "g" },
  { key: "karbo", label: "Karbohidrat", sat: "g" },
  { key: "serat", label: "Serat", sat: "g" },
];

const GIZI_KOSONG: GiziPorsi = { energi: 0, protein: 0, lemak: 0, karbo: 0, serat: 0 };

function giziSemuaKosong(): GiziSemua {
  return {
    pd_besar: { ...GIZI_KOSONG },
    pd_kecil: { ...GIZI_KOSONG },
    b2: { ...GIZI_KOSONG },
    balita: { ...GIZI_KOSONG },
  };
}

export const INFO_GIZI_KOSONG: InfoGiziIsi = {
  aktif: true,
  instansi: "BADAN GIZI NASIONAL",
  judul: "INFORMASI GIZI",
  subjudul: "",
  porsi_total: 0,
  gizi: giziSemuaKosong(),
  menu: [],
  batas_konsumsi: "11.00",
  zona: "WIB",
  peringatan_judul: "DILARANG MEMBAWA PULANG MAKANAN MBG",
  peringatan_teks:
    "Makanan ini disiapkan khusus untuk dikonsumsi di waktu yang telah ditentukan.",
  sosmed: "",
  catatan: "",
  desain: "",
  desain_mode: "atas",
};

const MENU_MAX = 20;

const teks = (v: unknown, max: number): string => String(v ?? "").slice(0, max).trim();
const angka = (v: unknown, max: number): number => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(Math.round(n * 10) / 10, max);
};

function bacaGizi(v: unknown): GiziPorsi {
  const o = (v ?? {}) as Record<string, unknown>;
  return {
    energi: angka(o.energi, 9999),
    protein: angka(o.protein, 999),
    lemak: angka(o.lemak, 999),
    karbo: angka(o.karbo, 999),
    serat: angka(o.serat, 999),
  };
}

/**
 * Migrasi kompatibel mundur: poster lama hanya punya `gizi_kecil` & `gizi_besar`.
 * Dua porsi lama itu dipetakan ke Peserta Didik Kecil & Besar supaya poster yang
 * sudah tayang tetap tampil benar. Porsi baru (B2, balita) mulai dari kosong.
 */
function bacaGiziSemua(o: Record<string, unknown>): GiziSemua {
  const g = (o.gizi ?? {}) as Record<string, unknown>;
  return {
    pd_besar: bacaGizi(g.pd_besar ?? o.gizi_besar),
    pd_kecil: bacaGizi(g.pd_kecil ?? o.gizi_kecil),
    b2: bacaGizi(g.b2),
    balita: bacaGizi(g.balita),
  };
}

function bacaMenu(v: unknown): MenuPublik[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, MENU_MAX).map((raw) => {
    const o = (raw ?? {}) as Record<string, unknown>;
    const k = String(o.kategori ?? "");
    return {
      kategori: (KATEGORI_MENU as string[]).includes(k)
        ? (k as KategoriMenu)
        : "tambahan",
      nama: teks(o.nama, 120),
    };
  });
}

/**
 * Gambar desain divalidasi terpisah (bukan lewat `teks()`) karena data URL
 * panjangnya ratusan ribu karakter — dipotong sedikit saja gambarnya rusak.
 * Hanya skema aman yang diterima: data URL gambar atau URL https.
 */
const DESAIN_DATA_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=\s]+$/;

function bacaDesain(v: unknown): string {
  const s = String(v ?? "").trim();
  if (!s) return "";
  if (s.length > DESAIN_MAX_CHARS) return "";
  if (DESAIN_DATA_RE.test(s)) return s;
  if (/^https:\/\/[^\s]+$/i.test(s) && s.length <= 500) return s;
  return "";
}

function bacaDesainMode(v: unknown): DesainMode {
  const s = String(v ?? "");
  return DESAIN_MODE.some((m) => m.value === s) ? (s as DesainMode) : "atas";
}

/**
 * Normalisasi isi dari DB atau dari body request admin ke bentuk lengkap &
 * aman (dipakai untuk kedua arah supaya tidak ada validasi ganda yang beda).
 */
export function mergeInfoGizi(v: unknown): InfoGiziIsi {
  const o = (v ?? {}) as Record<string, unknown>;
  const d = INFO_GIZI_KOSONG;
  return {
    aktif: o.aktif === undefined ? d.aktif : !!o.aktif,
    instansi: teks(o.instansi, 80) || d.instansi,
    judul: teks(o.judul, 80) || d.judul,
    subjudul: teks(o.subjudul, 120),
    porsi_total: Math.round(angka(o.porsi_total, 1_000_000)),
    gizi: bacaGiziSemua(o),
    menu: bacaMenu(o.menu),
    batas_konsumsi: teks(o.batas_konsumsi, 10) || d.batas_konsumsi,
    zona: teks(o.zona, 10) || d.zona,
    peringatan_judul: teks(o.peringatan_judul, 160) || d.peringatan_judul,
    peringatan_teks: teks(o.peringatan_teks, 400) || d.peringatan_teks,
    sosmed: teks(o.sosmed, 120),
    catatan: teks(o.catatan, 400),
    desain: bacaDesain(o.desain),
    desain_mode: bacaDesainMode(o.desain_mode),
  };
}

/** Angka gaya Indonesia: 3100 -> "3.100", 629.4 -> "629,4". */
export function angkaId(n: number): string {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(n || 0);
}

export function tanggalPanjang(tgl: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${tgl}T00:00:00`));
}
