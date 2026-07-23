// Tipe untuk fitur Gudang / Stok Opname.

export type Kategori = "operasional" | "bahan_baku" | "packaging";
export type TipeMutasi = "masuk" | "keluar" | "opname";

export interface Barang {
  id: number;
  sppg_id: number | null;
  nama: string;
  kategori: Kategori;
  satuan: string;
  stok: number;
  stok_min: number;
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
  operasional: "Operasional",
  bahan_baku: "Bahan Baku",
  packaging: "Packaging",
};
export const KATEGORI_LIST: Kategori[] = ["operasional", "bahan_baku", "packaging"];
/** Normalkan input kategori ke nilai valid (default operasional). */
export function normalizeKategori(v: unknown): Kategori {
  return v === "bahan_baku" || v === "packaging" ? v : "operasional";
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
