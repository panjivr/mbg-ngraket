// Tipe untuk fitur Data Kilometer Kendaraan.

export interface Kendaraan {
  id: number;
  sppg_id: number | null;
  nopol: string;
  nama: string;
  konsumsi: number; // km per liter (0 = tidak dihitung liter)
  aktif: boolean;
  urutan: number;
}

export interface KilometerEntri {
  id: number;
  kendaraan_id: number;
  tanggal: string; // YYYY-MM-DD
  km_berangkat: number;
  km_pulang: number;
  foto_berangkat: string; // data URL
  foto_pulang: string;
}

/** KM terpakai = pulang - berangkat (0 bila tidak masuk akal). */
export function kmTerpakai(e: { km_berangkat: number; km_pulang: number }): number {
  const d = (e.km_pulang || 0) - (e.km_berangkat || 0);
  return d > 0 ? d : 0;
}

/** Estimasi liter dari KM terpakai & konsumsi (km/L). 0 bila konsumsi tak diset. */
export function literTerpakai(kmUsed: number, konsumsi: number): number {
  if (!konsumsi || konsumsi <= 0) return 0;
  return Math.round((kmUsed / konsumsi) * 100) / 100;
}
