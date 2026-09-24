import { query } from "./db";

/**
 * Logika data untuk game "Blok Gizi".
 *
 * Papan peringkat bersifat GLOBAL (semua akun di semua dapur nyambung), sesuai
 * permintaan: "buat game ini bisa nyambung semua untuk peringkat nya". Turnamen
 * (dengan hadiah juara 1/2/3) dikelola khusus oleh admin pusat (super admin).
 */

// Batas atas skor yang wajar untuk menolak kiriman yang jelas manipulatif.
// Game tanpa batas waktu, tetapi nilai ekstrem (miliaran) hampir pasti curang.
export const MAX_SKOR = 5_000_000;

export interface PapanRow {
  user_id: number;
  nama: string;
  username: string;
  sppg_nama: string | null;
  skor: number;
  total_main: number;
  peringkat: number;
}

export interface StatSaya {
  skor_terbaik: number;
  total_main: number;
  peringkat: number | null;
}

export interface Turnamen {
  id: number;
  nama: string;
  mulai: string;
  selesai: string;
  hadiah1: string;
  hadiah2: string;
  hadiah3: string;
  catatan: string;
  status: "menunggu" | "berlangsung" | "selesai";
}

export interface TurnamenRow {
  user_id: number;
  nama: string;
  username: string;
  sppg_nama: string | null;
  skor: number;
  peringkat: number;
}

/** Bersihkan & validasi skor kiriman klien. */
export function bersihkanSkor(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return null;
  const skor = Math.floor(n);
  if (skor < 0 || skor > MAX_SKOR) return null;
  return skor;
}

/**
 * Simpan skor game.
 *
 * `selesai=true` menandai satu permainan tuntas: dicatat ke riwayat (dipakai
 * peringkat turnamen) dan menaikkan jumlah main. `selesai=false` hanya
 * memperbarui rekor terbaik saat pemain memecahkan rekor di tengah permainan
 * (agar tidak menggelembungkan hitungan "total main" maupun riwayat turnamen).
 */
export async function simpanSkor(
  uid: number,
  skor: number,
  selesai: boolean,
): Promise<StatSaya> {
  if (selesai) {
    await query(`INSERT INTO game_riwayat (user_id, skor) VALUES ($1, $2)`, [uid, skor]);
  }
  await query(
    `INSERT INTO game_skor (user_id, skor_terbaik, total_main, terakhir_main, updated_at)
     VALUES ($1, $2, $3, now(), now())
     ON CONFLICT (user_id) DO UPDATE
       SET skor_terbaik  = GREATEST(game_skor.skor_terbaik, EXCLUDED.skor_terbaik),
           total_main    = game_skor.total_main + $3,
           terakhir_main = now(),
           updated_at    = now()`,
    [uid, skor, selesai ? 1 : 0],
  );
  return statSaya(uid);
}

/** Statistik pemain sendiri + peringkat global (berdasar rekor terbaik). */
export async function statSaya(uid: number): Promise<StatSaya> {
  const rows = await query<{
    skor_terbaik: number;
    total_main: number;
    peringkat: string | null;
  }>(
    `SELECT g.skor_terbaik, g.total_main,
            (SELECT COUNT(*) + 1 FROM game_skor x
              WHERE x.skor_terbaik > g.skor_terbaik) AS peringkat
       FROM game_skor g WHERE g.user_id = $1`,
    [uid],
  );
  const r = rows[0];
  if (!r) return { skor_terbaik: 0, total_main: 0, peringkat: null };
  return {
    skor_terbaik: r.skor_terbaik,
    total_main: r.total_main,
    peringkat: r.peringkat != null ? Number(r.peringkat) : null,
  };
}

/** Papan peringkat global sepanjang masa (rekor terbaik per akun). */
export async function papanGlobal(limit = 100): Promise<PapanRow[]> {
  const rows = await query<{
    user_id: number;
    nama: string;
    username: string;
    sppg_nama: string | null;
    skor: number;
    total_main: number;
  }>(
    `SELECT u.id AS user_id, u.nama, u.username, s.nama AS sppg_nama,
            g.skor_terbaik AS skor, g.total_main
       FROM game_skor g
       JOIN users u ON u.id = g.user_id
       LEFT JOIN sppg s ON s.id = u.sppg_id
      WHERE g.skor_terbaik > 0 AND u.aktif = TRUE
      ORDER BY g.skor_terbaik DESC, g.updated_at ASC
      LIMIT $1`,
    [limit],
  );
  return rows.map((r, i) => ({ ...r, peringkat: i + 1 }));
}

function statusTurnamen(mulai: string, selesai: string): Turnamen["status"] {
  const now = Date.now();
  if (now < new Date(mulai).getTime()) return "menunggu";
  if (now > new Date(selesai).getTime()) return "selesai";
  return "berlangsung";
}

/** Daftar semua turnamen (terbaru dulu). */
export async function daftarTurnamen(): Promise<Turnamen[]> {
  const rows = await query<Omit<Turnamen, "status">>(
    `SELECT id, nama, mulai, selesai, hadiah1, hadiah2, hadiah3, catatan
       FROM game_turnamen ORDER BY mulai DESC`,
  );
  return rows.map((r) => ({ ...r, status: statusTurnamen(r.mulai, r.selesai) }));
}

/** Satu turnamen berdasarkan id. */
export async function ambilTurnamen(id: number): Promise<Turnamen | null> {
  const rows = await query<Omit<Turnamen, "status">>(
    `SELECT id, nama, mulai, selesai, hadiah1, hadiah2, hadiah3, catatan
       FROM game_turnamen WHERE id = $1`,
    [id],
  );
  const r = rows[0];
  return r ? { ...r, status: statusTurnamen(r.mulai, r.selesai) } : null;
}

/**
 * Peringkat sebuah turnamen: skor tertinggi tiap pemain dari permainan yang
 * selesai selama rentang waktu turnamen.
 */
export async function papanTurnamen(
  mulai: string,
  selesai: string,
  limit = 100,
): Promise<TurnamenRow[]> {
  const rows = await query<{
    user_id: number;
    nama: string;
    username: string;
    sppg_nama: string | null;
    skor: number;
  }>(
    `SELECT u.id AS user_id, u.nama, u.username, s.nama AS sppg_nama,
            MAX(r.skor) AS skor
       FROM game_riwayat r
       JOIN users u ON u.id = r.user_id
       LEFT JOIN sppg s ON s.id = u.sppg_id
      WHERE r.created_at >= $1 AND r.created_at <= $2 AND u.aktif = TRUE
      GROUP BY u.id, u.nama, u.username, s.nama
      ORDER BY MAX(r.skor) DESC
      LIMIT $3`,
    [mulai, selesai, limit],
  );
  return rows.map((r, i) => ({ ...r, peringkat: i + 1 }));
}
