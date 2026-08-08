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
