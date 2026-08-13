// Helper risk score & tingkat temuan audit.
// risk_score = kemungkinan (1–5) × dampak (1–5) → rentang 1–25.
// Tingkat di-derive dari risk_score supaya konsisten antara UI & API.

export type Tingkat = "minor" | "mayor" | "kritis";

/** Turunkan tingkat dari risk score sesuai spec (1–4 minor, 5–14 mayor, 15–25 kritis). */
export function hitungTingkat(risk: number): Tingkat {
  if (risk >= 15) return "kritis";
  if (risk >= 5) return "mayor";
  return "minor";
}

/** risk score dari sepasang kemungkinan × dampak, di-clamp ke 1–25. */
export function hitungRisk(kemungkinan: number, dampak: number): number {
  const k = Math.min(5, Math.max(1, Math.round(kemungkinan || 1)));
  const d = Math.min(5, Math.max(1, Math.round(dampak || 1)));
  return k * d;
}

/** Naikkan tingkat 1 level (dipakai auto-eskalasi follow-up "masih_terjadi"). */
export function eskalasiTingkat(tingkat: Tingkat): Tingkat {
  if (tingkat === "minor") return "mayor";
  if (tingkat === "mayor") return "kritis";
  return "kritis";
}

export interface TingkatMeta {
  label: string;
  emoji: string;
  /** Kelas Tailwind untuk badge (background + text + ring). */
  badge: string;
}

const META: Record<Tingkat, TingkatMeta> = {
  minor: {
    label: "Minor",
    emoji: "🟡",
    badge: "bg-amber-500/15 text-amber-300 ring-amber-500/30",
  },
  mayor: {
    label: "Mayor",
    emoji: "🟠",
    badge: "bg-orange-500/15 text-orange-300 ring-orange-500/30",
  },
  kritis: {
    label: "Kritis",
    emoji: "🔴",
    badge: "bg-red-500/15 text-red-300 ring-red-500/30",
  },
};

export function tingkatMeta(tingkat: Tingkat): TingkatMeta {
  return META[tingkat] ?? META.minor;
}

/** Kategori temuan (sinkron dengan audit_temuan.kategori). */
export const KATEGORI_TEMUAN = [
  "food_safety",
  "hygiene",
  "sop",
  "manpower",
  "produksi",
  "waste",
  "administrasi",
] as const;
export type KategoriTemuan = (typeof KATEGORI_TEMUAN)[number];

export const KATEGORI_LABEL: Record<KategoriTemuan, string> = {
  food_safety: "Food Safety",
  hygiene: "Higiene",
  sop: "SOP",
  manpower: "SDM",
  produksi: "Produksi",
  waste: "Waste",
  administrasi: "Administrasi",
};

/** Penyebab food waste (sinkron dengan audit_food_waste.penyebab). */
export const PENYEBAB_WASTE = [
  "bahan",
  "proses",
  "manusia",
  "perencanaan",
  "kualitas",
  "distribusi",
] as const;
export type PenyebabWaste = (typeof PENYEBAB_WASTE)[number];

export const PENYEBAB_LABEL: Record<PenyebabWaste, string> = {
  bahan: "Bahan",
  proses: "Proses",
  manusia: "Manusia",
  perencanaan: "Perencanaan",
  kualitas: "Kualitas",
  distribusi: "Distribusi",
};

/**
 * Kata subjektif yang memicu peringatan halus di form temuan
 * ("audit proses, bukan orang"). Dicek sebagai substring lowercase.
 */
export const KATA_SUBJEKTIF = [
  "malas",
  "bodoh",
  "tidak becus",
  "gak becus",
  "profesional",
  "lambat",
  "lelet",
  "males",
] as const;

/** Kembalikan daftar kata subjektif yang muncul di teks (untuk warning UI). */
export function deteksiKataSubjektif(teks: string): string[] {
  const low = (teks || "").toLowerCase();
  return KATA_SUBJEKTIF.filter((k) => low.includes(k));
}
