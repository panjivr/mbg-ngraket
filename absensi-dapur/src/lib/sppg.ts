import { query } from "./db";

/** Konfigurasi satu dapur/SPPG (lokasi, geofence, jam kerja, zona waktu). */
export interface Sppg {
  id: number;
  nama: string;
  alamat: string;
  lat: number;
  lng: number;
  radius_m: number;
  geofence_aktif: boolean;
  selfie_wajib: boolean;
  jam_masuk: string;
  jam_pulang: string;
  tz: string;
  aktif: boolean;
  created_at: string;
  // Distribusi & dokumen
  kepala_sppg: string;
  harga_besar: number;
  harga_kecil: number;
  harga_b3: number;
}

/** Ambil konfigurasi dapur tertentu (null bila tak ada). */
export async function getSppg(id: number): Promise<Sppg | null> {
  const r = await query<Sppg>(`SELECT * FROM sppg WHERE id = $1`, [id]);
  return r[0] ?? null;
}

/**
 * Bentuk objek "settings" (kompatibel dengan kode lama) dari konfigurasi dapur,
 * sehingga rute absensi tetap menerima field yang sama (nama_dapur, dst).
 */
export function sppgAsSettings(s: Sppg) {
  return {
    nama_dapur: s.nama,
    alamat: s.alamat,
    lat: s.lat,
    lng: s.lng,
    radius_m: s.radius_m,
    geofence_aktif: s.geofence_aktif,
    selfie_wajib: s.selfie_wajib,
    jam_masuk: s.jam_masuk,
    jam_pulang: s.jam_pulang,
    tz: s.tz,
  };
}
