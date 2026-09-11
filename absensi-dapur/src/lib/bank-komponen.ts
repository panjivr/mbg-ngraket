import raw from "@/data/bank-komponen.json";

/**
 * Katalog komponen menu untuk Generator Purchase (komposer). Diturunkan dari
 * rangkuman RAB nyata 6 bulan (src/data/bank-komponen.json), BUKAN resep per
 * hidangan (data sumber tak punya batas resep terverifikasi). Karena itu:
 *
 *  - `bahan`     : katalog bahan mentah unik + kategori + per-porsi & harga
 *                  historis (median). Ini sumber angka kebutuhan sebenarnya.
 *  - `komponen`  : nama hidangan yang pernah muncul di menu (untuk dropdown),
 *                  dengan tebakan bahan utama `u` (per porsi & harga ikut).
 *
 * Semua nilai adalah SARAN perencanaan — dapat dikoreksi admin (override) &
 * diedit inline sebelum generate. `pp` = kuantitas per porsi dalam satuan asli
 * (mis. kg/porsi, pcs/porsi).
 */
export type Kategori = "karbo" | "hewani" | "nabati" | "sayur" | "buah" | "susu" | "pelengkap" | "bumbu" | "lain";

export interface BahanKatalog {
  n: string; // nama bahan
  s: string; // satuan dominan
  kat: Kategori;
  pp: number | null; // per porsi (satuan asli)
  h: number | null; // harga satuan historis (Rp)
  obs: number; // jumlah observasi (basis median)
}
export interface Komponen {
  n: string; // nama hidangan (ternormalisasi)
  kat: Kategori;
  f: number; // frekuensi kemunculan di menu
  u: { n: string; s: string; pp: number | null; h: number | null } | null; // bahan utama (tebakan)
}
interface KatalogData {
  _meta: { generated: string; sumber: string; bahan: number; komponen: number; komponenTerpetakan: number };
  kategori: Kategori[];
  bahan: BahanKatalog[];
  komponen: Komponen[];
}

const DATA = raw as unknown as KatalogData;

export const KATALOG_META = DATA._meta;
export const KATEGORI = DATA.kategori;

export function getBahanKatalog(): BahanKatalog[] {
  return DATA.bahan;
}
export function getKomponen(): Komponen[] {
  return DATA.komponen;
}

const byNorm = new Map(DATA.bahan.map((b) => [b.n.trim().toLowerCase(), b]));
export function findBahan(nama: string): BahanKatalog | undefined {
  return byNorm.get(nama.trim().toLowerCase());
}
