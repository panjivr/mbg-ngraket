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
  urutan: number;
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

/** Format angka jumlah bahan agar rapi (buang nol berlebih). */
export function fmtJumlah(n: number): string {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: 3 }).format(n);
}
