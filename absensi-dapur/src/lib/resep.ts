import raw from "@/data/resep-master.json";

/**
 * Sistem Resep MBG — model gramasi MATANG per porsi (kecil/besar) per kategori.
 * Tiap resep punya target gram matang/porsi (K/B) + yield gabungan (kg komponen
 * matang per kg bahan utama mentah siap-olah). Bumbu ikut dalam BOM (koefisien
 * per kg utama). Semua DRAF ESTIMASI — dikalibrasi dari uji dapur.
 *
 * Rumus (lihat LOGIKA_SISTEM/MULAI sumber):
 *   target matang (kg) = (K × gramK + B × gramB) × (1+cadangan) / 1000
 *   utama mentah siap olah (kg) = target matang / yieldGab
 *   beli per bahan = utama mentah × koef ÷ yield persiapan   (satuan beli bahan)
 */
export interface Bahan { id: string; n: string; s: string; h: number | null; hsrc: string | null; kemasan: number }
export interface BomLine {
  id: string; n: string; s: string;
  k: number;  // koefisien satuan netto / kg utama
  yp: number; // yield persiapan (netto/beli)
  ed: number; // fraksi edible
  ym: number; // yield masak (matang/mentah)
  mk: number; // 1 = komponen kategori (dihitung ke gramasi), 0 = bumbu/kuah
  g: number;  // gram bruto per pcs (untuk bahan satuan pcs)
}
export interface Resep {
  id: string; kat: string; n: string;
  gramK: number; gramB: number; yieldGab: number; status: string; bom: BomLine[];
}
export interface PorsiKB { kat: string; gramK: number; gramB: number }
interface Data {
  _meta: { generated: string; sumber: string; resep: number; bahan: number; hargaTerisi: number; hargaKosong: number; status: string; model: string };
  kategori: string[]; porsiKB: PorsiKB[]; bahan: Bahan[]; resep: Resep[];
}

const DATA = raw as unknown as Data;

export const RESEP_META = DATA._meta;
export const RESEP_KATEGORI = DATA.kategori;
export const PORSI_KB = DATA.porsiKB;
export function getBahanMaster(): Bahan[] { return DATA.bahan; }
export function getResepAll(): Resep[] { return DATA.resep; }
