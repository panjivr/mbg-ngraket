// Jadwal menu per periode + generator daftar belanja.
// Sasaran memisahkan penerima Reguler (Besar+Kecil) dari B3 (Balita/Bumil/Busui),
// persis alur dapur: menu ditempel ke tanggal, belanja = agregasi bahan × porsi.

import type { MenuBahan } from "@/lib/menu";

export type Sasaran = "reguler" | "b3";
export const SASARAN_LIST: Sasaran[] = ["reguler", "b3"];
export const SASARAN_LABEL: Record<Sasaran, string> = {
  reguler: "Reguler",
  b3: "B3 (Balita/Bumil/Busui)",
};
export function normalizeSasaran(v: unknown): Sasaran {
  return v === "b3" ? "b3" : "reguler";
}

export interface Porsi {
  besar: number;
  kecil: number;
  b3: number;
}

/** Jumlah porsi yang dilayani sebuah sasaran pada satu hari. */
export function porsiSasaran(p: Porsi, s: Sasaran): number {
  return s === "b3" ? p.b3 : p.besar + p.kecil;
}

/** Satu menu terjadwal pada satu tanggal (untuk sasaran tertentu). */
export interface JadwalItem {
  id: number;
  tanggal: string; // YYYY-MM-DD
  sasaran: Sasaran;
  menu_id: number;
  nama: string; // nama menu (snapshot untuk tampilan)
  urutan: number;
}

/** Satu baris belanja hasil agregasi (kebutuhan sebuah bahan). */
export interface BelanjaBaris {
  key: string;
  barang_id: number | null;
  nama: string;
  satuan: string;
  jumlah: number; // total kebutuhan periode/hari
  harga: number; // harga satuan patokan (SP) — dari menu_bahan.harga
  subtotal: number; // jumlah × harga
}

/** Kontribusi satu menu terhadap belanja: bahannya + porsi yang harus dimasak. */
export interface KontribusiMenu {
  porsiDasar: number;
  porsi: number; // porsi target untuk menu ini
  bahan: Pick<MenuBahan, "barang_id" | "nama" | "satuan" | "jumlah_dasar" | "harga">[];
}

function bahanKey(barangId: number | null, nama: string, satuan: string): string {
  return barangId != null
    ? `id:${barangId}`
    : `nm:${nama.trim().toLowerCase()}|${satuan.trim().toLowerCase()}`;
}

/**
 * Gabungkan kebutuhan bahan lintas menu jadi satu daftar belanja.
 * Kuantitas = Σ (jumlah_dasar / porsi_dasar × porsi). Bahan sama (barang_id, atau
 * nama+satuan) dijumlahkan. Harga satuan diambil dari nilai > 0 pertama yang ada.
 */
export function agregasiBelanja(kontribusi: KontribusiMenu[]): {
  baris: BelanjaBaris[];
  total: number;
} {
  const map = new Map<string, BelanjaBaris>();
  for (const k of kontribusi) {
    if (!(k.porsiDasar > 0) || !(k.porsi > 0)) continue;
    const faktor = k.porsi / k.porsiDasar;
    for (const b of k.bahan) {
      const nama = (b.nama ?? "").trim();
      if (!nama) continue;
      const satuan = (b.satuan ?? "").trim() || "-";
      const key = bahanKey(b.barang_id ?? null, nama, satuan);
      const tambah = (Number(b.jumlah_dasar) || 0) * faktor;
      const harga = Math.max(0, Number(b.harga) || 0);
      const ada = map.get(key);
      if (ada) {
        ada.jumlah += tambah;
        if (!(ada.harga > 0) && harga > 0) ada.harga = harga;
      } else {
        map.set(key, {
          key,
          barang_id: b.barang_id ?? null,
          nama,
          satuan,
          jumlah: tambah,
          harga,
          subtotal: 0,
        });
      }
    }
  }
  const baris = [...map.values()].map((r) => ({
    ...r,
    jumlah: Math.round(r.jumlah * 1000) / 1000,
  }));
  for (const r of baris) r.subtotal = Math.round(r.jumlah * r.harga);
  baris.sort((a, b) => a.nama.localeCompare(b.nama, "id"));
  const total = baris.reduce((a, r) => a + r.subtotal, 0);
  return { baris, total };
}
