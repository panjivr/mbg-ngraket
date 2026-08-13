import { query } from "./db";

/**
 * Flag akses per-pengguna + info dapur ringkas. Query ini dijalankan pada
 * SETIAP muat halaman admin & dapur (layout server component), jadi di-cache
 * singkat di memori (per instance) agar navigasi terasa instan tanpa round-trip
 * DB berulang. TTL pendek (15 dtk) menjaga perubahan akses cepat tercermin.
 */
export interface UserAccess {
  is_super: boolean;
  is_driver: boolean;
  is_hr: boolean;
  akses_distribusi: boolean;
  akses_laporan: boolean;
  akses_keuangan: boolean;
  akses_gizi: boolean;
  akses_audit: boolean;
  akses_gudang_keluar: boolean;
  sppg_nama: string | null;
  paket: string | null;
  paket_until: string | null;
}

const TTL_MS = 15_000;
const cache = new Map<number, { at: number; val: UserAccess | null }>();

export async function getUserAccess(uid: number): Promise<UserAccess | null> {
  const hit = cache.get(uid);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.val;
  const val =
    (
      await query<UserAccess>(
        `SELECT u.is_super, u.is_driver, u.is_hr,
                u.akses_distribusi, u.akses_laporan, u.akses_keuangan, u.akses_gizi,
                u.akses_audit, u.akses_gudang_keluar,
                s.nama AS sppg_nama, s.paket, s.paket_until
           FROM users u
           LEFT JOIN sppg s ON s.id = u.sppg_id
          WHERE u.id = $1`,
        [uid],
      )
    )[0] ?? null;
  cache.set(uid, { at: Date.now(), val });
  return val;
}

/** Hapus cache akses (panggil setelah mengubah hak akses / paket pengguna). */
export function invalidateUserAccess(uid?: number): void {
  if (uid === undefined) cache.clear();
  else cache.delete(uid);
}
