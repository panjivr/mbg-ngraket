import raw from "@/data/resep-master.json";

/**
 * Sistem Resep 4 Kategori — 135 resep DRAF ESTIMASI (untuk simulasi & uji dapur).
 * Tiap resep punya bahan UTAMA + BUMBU (koefisien per kg utama siap-olah), jadi
 * saat generate, bumbu ikut terhitung otomatis. Harga: dari file resep +
 * dilengkapi histori RAB (hanya bila satuannya cocok); sisanya ditandai kosong.
 *
 * Rumus (lihat LOGIKA_SISTEM sumber):
 *  - MASS : utama netto (kg) = porsi × gram target / 1000 / yield masak
 *  - COUNT: pcs utama = porsi × pcs/porsi ; massa acuan (kg) = pcs × gram acuan /1000
 *  - UTAMA: bila satuan pcs → pcs; selain itu → utama netto / yield persiapan (beli)
 *  - BUMBU: kebutuhan = utama netto × koefisien
 */
export type Peran = "UTAMA" | "BUMBU";
export interface Bahan { id: string; n: string; s: string; h: number | null; hsrc: string | null; kemasan: number }
export interface BomLine { id: string; n: string; s: string; peran: Peran | string; koef: number }
export interface Resep {
  id: string; kat: string; n: string; metode: "MASS" | "COUNT" | string; satuan: string;
  gramTarget: number | null; yieldMasak: number; yieldPersiapan: number;
  pcsUtama: number | null; gramAcuan: number | null; status: string; bom: BomLine[];
}
interface Data {
  _meta: { generated: string; sumber: string; resep: number; bahan: number; hargaTerisi: number; hargaKosong: number; status: string };
  kategori: string[]; bahan: Bahan[]; resep: Resep[];
}

const DATA = raw as unknown as Data;

export const RESEP_META = DATA._meta;
export const RESEP_KATEGORI = DATA.kategori;
export function getBahanMaster(): Bahan[] { return DATA.bahan; }
export function getResepAll(): Resep[] { return DATA.resep; }
export function getResep(id: string): Resep | undefined { return DATA.resep.find((r) => r.id === id); }

export interface GenOpt { besar: number; kecil: number; kecilPct: number; cad: number }
export interface GenLine { id: string; nama: string; satuan: string; qty: number; peran: string; koef: number }

/** Hitung kebutuhan bahan satu resep (belum dikali harga). */
export function hitungResep(r: Resep, o: GenOpt): GenLine[] {
  const countPorsi = o.besar + o.kecil;
  const massPorsi = o.besar + o.kecil * o.kecilPct;
  const f = 1 + o.cad;
  // utama netto kg (siap olah)
  let netto: number;
  if (r.metode === "COUNT") {
    const pcs = (r.pcsUtama || 0) * countPorsi;
    netto = pcs * (r.gramAcuan || 0) / 1000;
  } else {
    netto = massPorsi * (r.gramTarget || 0) / 1000 / (r.yieldMasak || 1);
  }
  return r.bom.map((l) => {
    let qty: number;
    if (l.peran === "UTAMA") {
      qty = l.s === "pcs" ? (r.pcsUtama || 0) * countPorsi : netto / (r.yieldPersiapan || 1);
    } else {
      qty = netto * l.koef;
    }
    return { id: l.id, nama: l.n, satuan: l.s, qty: qty * f, peran: l.peran, koef: l.koef };
  });
}
