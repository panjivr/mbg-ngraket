// Tipe untuk fitur Gudang / Stok Opname.

export type Kategori =
  | "bahan_kering"
  | "bumbu_rempah"
  | "olahan_dasar"
  | "fermentasi"
  | "protein_hewani"
  | "sayur"
  | "susu_olahan"
  | "bahan_baku"
  | "operasional"
  | "packaging";
export type TipeMutasi = "masuk" | "keluar" | "opname";

export interface Barang {
  id: number;
  sppg_id: number | null;
  nama: string;
  kategori: Kategori;
  satuan: string;
  stok: number;
  stok_min: number;
  harga: number;
  kode_akun: string;
  catatan: string;
  aktif: boolean;
  urutan: number;
  tanggal_kadaluarsa: string | null;
}

const TANGGAL_RE = /^\d{4}-\d{2}-\d{2}$/;
/** Normalkan input tanggal → 'YYYY-MM-DD' valid atau null (kosong/salah). */
export function normalizeTanggal(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return TANGGAL_RE.test(s) ? s : null;
}

export type StatusKadaluarsa = "kadaluarsa" | "segera" | "aman";
/**
 * Status kadaluarsa relatif hari ini (Asia/Jakarta, format YYYY-MM-DD).
 * null bila tanggal tidak diisi. "segera" = ≤ `ambang` hari lagi (default 7).
 */
export function statusKadaluarsa(iso: string | null, today: string, ambang = 7): StatusKadaluarsa | null {
  if (!iso) return null;
  const exp = Date.parse(iso + "T00:00:00");
  const now = Date.parse(today + "T00:00:00");
  if (Number.isNaN(exp) || Number.isNaN(now)) return null;
  const hari = Math.round((exp - now) / 86_400_000);
  if (hari < 0) return "kadaluarsa";
  if (hari <= ambang) return "segera";
  return "aman";
}

export interface Mutasi {
  id: number;
  barang_id: number;
  tanggal: string;
  tipe: TipeMutasi;
  jumlah: number;
  stok_sesudah: number;
  keterangan: string;
  oleh: string;
  created_at: string;
}

export const KATEGORI_LABEL: Record<Kategori, string> = {
  bahan_kering: "Bahan Kering",
  bumbu_rempah: "Bumbu & Rempah",
  olahan_dasar: "Produk Olahan Dasar",
  fermentasi: "Bahan Fermentasi/Pelengkap",
  protein_hewani: "Protein Hewani",
  sayur: "Sayur & Buah Segar",
  susu_olahan: "Susu & Olahannya",
  bahan_baku: "Bahan Baku Lainnya",
  operasional: "Operasional",
  packaging: "Packaging",
};
/** Contoh isi tiap kategori — ditampilkan saat diklik (info), bukan di label. */
export const KATEGORI_INFO: Record<Kategori, string> = {
  bahan_kering: "minyak, tepung, gula",
  bumbu_rempah: "garam, kunyit bubuk, bawang, kecap, saus",
  olahan_dasar: "perisa, pasta, agar-agar, essence, pewarna",
  fermentasi: "baking powder, terasi, SP",
  protein_hewani: "telur",
  sayur: "wortel, kentang, bayam, kol, cabai, tomat, buah",
  susu_olahan: "SKM, keju, margarin",
  bahan_baku: "kategori umum untuk data lama",
  operasional: "plastik, hair net, sarung tangan, dll",
  packaging: "ompreng, kotak nasi, sendok plastik, dll",
};
export const KATEGORI_LIST: Kategori[] = [
  "bahan_kering",
  "bumbu_rempah",
  "olahan_dasar",
  "fermentasi",
  "protein_hewani",
  "sayur",
  "susu_olahan",
  "bahan_baku",
  "operasional",
  "packaging",
];
const KATEGORI_SET = new Set<string>(KATEGORI_LIST);
/** Normalkan input kategori ke nilai valid (default bahan_baku). */
export function normalizeKategori(v: unknown): Kategori {
  return typeof v === "string" && KATEGORI_SET.has(v) ? (v as Kategori) : "bahan_baku";
}
export const TIPE_LABEL: Record<TipeMutasi, string> = {
  masuk: "Masuk (pembelian)",
  keluar: "Keluar (pemakaian)",
  opname: "Stok Opname",
};

export type StatusStok = "habis" | "menipis" | "aman";
export function statusStok(b: { stok: number; stok_min: number }): StatusStok {
  if (b.stok <= 0) return "habis";
  if (b.stok <= b.stok_min) return "menipis";
  return "aman";
}
