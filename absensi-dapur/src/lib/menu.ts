// Tipe & logika Bank Menu (resep + kalkulasi bahan yang diskalakan).

export type KategoriMenu = "sarapan" | "makan_siang" | "snack" | "lainnya";
export const KATEGORI_MENU_LABEL: Record<KategoriMenu, string> = {
  sarapan: "Sarapan",
  makan_siang: "Makan Siang",
  snack: "Snack",
  lainnya: "Lainnya",
};
export const KATEGORI_MENU_LIST: KategoriMenu[] = ["sarapan", "makan_siang", "snack", "lainnya"];
export function normalizeKategoriMenu(v: unknown): KategoriMenu {
  return v === "sarapan" || v === "snack" || v === "lainnya" ? v : "makan_siang";
}

// Cara membulatkan hasil skala per bahan.
// desimal  = biarkan pecahan (mis. 37,5 L) — untuk kg/liter
// setengah = bulatkan ke atas kelipatan 0,5 — belanja praktis
// bulat    = bulatkan ke atas ke bilangan bulat — untuk butir/pcs
export type Pembulatan = "desimal" | "setengah" | "bulat";
export const PEMBULATAN_LABEL: Record<Pembulatan, string> = {
  desimal: "Desimal",
  setengah: "½ terdekat",
  bulat: "Bulat ↑",
};
export const PEMBULATAN_LIST: Pembulatan[] = ["desimal", "setengah", "bulat"];
export function normalizePembulatan(v: unknown): Pembulatan {
  return v === "setengah" || v === "bulat" ? v : "desimal";
}

// Komponen gizi "Isi Piringku" (pedoman Gizi Seimbang / standar menu MBG).
// Dipakai ahli gizi untuk cek satu menu sudah lengkap komponennya atau belum.
export type KomponenGizi =
  | "karbohidrat"
  | "protein_hewani"
  | "protein_nabati"
  | "sayur"
  | "buah"
  | "susu"
  | "bumbu"
  | "lainnya";

export const KOMPONEN_GIZI: Record<KomponenGizi, { label: string; emoji: string; warna: string }> = {
  karbohidrat: { label: "Karbohidrat", emoji: "🍚", warna: "#f59e0b" },
  protein_hewani: { label: "Protein Hewani", emoji: "🍗", warna: "#ef4444" },
  protein_nabati: { label: "Protein Nabati", emoji: "🫘", warna: "#a3e635" },
  sayur: { label: "Sayur", emoji: "🥬", warna: "#22c55e" },
  buah: { label: "Buah", emoji: "🍉", warna: "#ec4899" },
  susu: { label: "Susu", emoji: "🥛", warna: "#60a5fa" },
  bumbu: { label: "Bumbu", emoji: "🧂", warna: "#94a3b8" },
  lainnya: { label: "Lainnya", emoji: "📦", warna: "#64748b" },
};
export const KOMPONEN_GIZI_LIST: KomponenGizi[] = [
  "karbohidrat",
  "protein_hewani",
  "protein_nabati",
  "sayur",
  "buah",
  "susu",
  "bumbu",
  "lainnya",
];
// Komponen inti "Isi Piringku" yang idealnya ada di menu makan utama.
export const KOMPONEN_INTI: KomponenGizi[] = ["karbohidrat", "protein_hewani", "sayur", "buah"];
export function normalizeKomponen(v: unknown): KomponenGizi {
  return typeof v === "string" && (KOMPONEN_GIZI_LIST as string[]).includes(v)
    ? (v as KomponenGizi)
    : "lainnya";
}

/** Komponen inti yang BELUM ada pada daftar bahan (untuk peringatan ahli gizi). */
export function komponenKurang(bahan: { komponen: KomponenGizi }[]): KomponenGizi[] {
  const ada = new Set(bahan.map((b) => b.komponen));
  return KOMPONEN_INTI.filter((k) => !ada.has(k));
}

export interface Menu {
  id: number;
  sppg_id: number | null;
  nama: string;
  kategori: KategoriMenu;
  porsi_dasar: number;
  keterangan: string;
  aktif: boolean;
  urutan: number;
}

export interface MenuBahan {
  id: number;
  menu_id: number;
  barang_id: number | null; // null = bahan ketik bebas (tak terhubung gudang)
  nama: string;
  satuan: string;
  jumlah_dasar: number; // jumlah untuk porsi_dasar
  pembulatan: Pembulatan;
  komponen: KomponenGizi;
  harga: number; // harga per satuan bahan (Rp) — untuk HPP/food cost
  pasar_ref: string; // nama komoditas SISKAPERBAPO yang jadi acuan harga (opsional)
  urutan: number;
}

/** Biaya bahan per 1 porsi = (jumlah_dasar / porsi_dasar) × harga satuan. */
export function biayaPerPorsi(jumlahDasar: number, porsiDasar: number, harga: number): number {
  if (!(porsiDasar > 0) || !(harga > 0)) return 0;
  return (jumlahDasar / porsiDasar) * harga;
}

/** Total HPP (biaya bahan) per porsi untuk satu menu. */
export function hppPerPorsi(
  bahan: { jumlah_dasar: number; harga: number }[],
  porsiDasar: number,
): number {
  return bahan.reduce((a, b) => a + biayaPerPorsi(b.jumlah_dasar, porsiDasar, b.harga), 0);
}

export interface MenuLengkap extends Menu {
  bahan: MenuBahan[];
}

/**
 * Skalakan jumlah bahan dari porsi dasar ke porsi target (linear).
 * faktor = porsiTarget / porsiDasar ; hasil dibulatkan sesuai mode.
 */
export function skalaBahan(
  jumlahDasar: number,
  porsiDasar: number,
  porsiTarget: number,
  mode: Pembulatan,
): number {
  if (!(porsiDasar > 0) || !(porsiTarget >= 0)) return 0;
  const raw = jumlahDasar * (porsiTarget / porsiDasar);
  if (mode === "bulat") return Math.ceil(raw - 1e-9);
  if (mode === "setengah") return Math.ceil(raw * 2 - 1e-9) / 2;
  return Math.round(raw * 1000) / 1000; // desimal, 3 angka di belakang koma
}

/** Kebutuhan bahan per 1 porsi (jumlah_dasar / porsi_dasar) — cara pandang ahli gizi. */
export function perPorsi(jumlahDasar: number, porsiDasar: number): number {
  if (!(porsiDasar > 0)) return 0;
  return jumlahDasar / porsiDasar;
}

/** Format angka jumlah bahan agar rapi (buang nol berlebih). */
export function fmtJumlah(n: number): string {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 }).format(n);
}

/** Format angka kecil (per porsi) dengan presisi lebih tinggi. */
export function fmtKecil(n: number): string {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 4 }).format(n);
}
