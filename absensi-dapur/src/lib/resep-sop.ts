import raw from "@/data/resep-sop.json";

/**
 * SOP langkah masak per resep (gaya chef) + default alat & jumlah tim per divisi.
 * Dipakai fitur Pembagian Kerja (jobdesk): pilih resep + isi orang/alat →
 * langkah persiapan/pengolahan/pemorsian + estimasi batch.
 */
export interface Langkah { t: string; l: string; a: string; k: string; p: string }
export interface Alat { n: string; jumlah: number; slot: number; kap: number; sat: string; menit: number; ket: string }
export interface Divisi { persiapan: number; pengolahan: number; pemorsian: number; komporAktif: number; omprengMenit: number }
interface Data { _meta: { sumber: string; resep: number }; alat: Alat[]; divisi: Divisi; steps: Record<string, Langkah[]> }

const DATA = raw as unknown as Data;

export const ALAT_DEFAULT = DATA.alat;
export const DIVISI_DEFAULT = DATA.divisi;
export const SOP_META = DATA._meta;

/** Langkah untuk sekumpulan id resep (hanya yang diminta, agar respons ringan). */
export function getSteps(ids: string[]): Record<string, Langkah[]> {
  const out: Record<string, Langkah[]> = {};
  for (const id of ids) if (DATA.steps[id]) out[id] = DATA.steps[id];
  return out;
}
