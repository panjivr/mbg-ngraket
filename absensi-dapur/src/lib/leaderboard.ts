import { query } from "./db";

// Bobot komponen skor kinerja (poin dari total 100). Berbasis rasio agar adil
// untuk pegawai dengan jumlah hari kerja berbeda (mis. keamanan yang harinya
// lebih banyak). Jumlah bobot = 100.
export const BOBOT = {
  ketepatan: 55, // ketepatan waktu masuk (tepat / hadir)
  keaktifan: 25, // keaktifan hadir (hadir / hari operasional, maks 1)
  kelengkapan: 20, // kelengkapan presensi (clock-out / hadir)
} as const;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Rincian satu komponen penilaian: persentase capaian & poin ke skor akhir. */
export interface Komponen {
  pct: number; // 0..100 (1 desimal) — capaian rasio komponen
  poin: number; // kontribusi ke skor akhir (0..bobot, 1 desimal)
  a: number; // pembilang (mis. jumlah tepat waktu)
  b: number; // penyebut (mis. jumlah hadir / hari operasional)
}

export interface BoardRow {
  user_id: number;
  nama: string;
  divisi_nama: string | null;
  hidden: boolean;
  hadir: number;
  tepat: number;
  terlambat: number;
  selesai: number;
  op_days: number;
  izin_days: number; // hari operasional dengan izin disetujui (tak menghukum keaktifan)
  jam_rata: number; // jam/hari (1 desimal)
  ketepatan: Komponen;
  keaktifan: Komponen;
  kelengkapan: Komponen;
  skor: number; // 0..100 (1 desimal) = jumlah poin ketiga komponen
}

interface RawRow {
  user_id: number;
  nama: string;
  divisi_nama: string | null;
  hidden: boolean;
  hadir: number;
  tepat: number;
  terlambat: number;
  selesai: number;
  menit: string;
  op_days: number;
  izin_days: number;
}

function komponen(a: number, b: number, bobot: number): Komponen {
  const ratio = b > 0 ? Math.min(a / b, 1) : 0;
  return {
    pct: round1(ratio * 100),
    poin: round1(ratio * bobot),
    a,
    b,
  };
}

// Cache singkat hasil papan per (dapur, rentang). Papan ini kini dibuka oleh
// setiap karyawan di layar absen, jadi cache 30 detik memangkas beban DB.
const BOARD_TTL_MS = 30_000;
const boardCache = new Map<
  string,
  { at: number; val: { board: BoardRow[]; op_days: number } }
>();

/** Hapus cache papan sebuah dapur (panggil setelah data peringkat berubah). */
export function invalidateBoard(sppgId: number): void {
  const prefix = `${sppgId}|`;
  for (const k of boardCache.keys()) if (k.startsWith(prefix)) boardCache.delete(k);
}

/**
 * Hitung papan peringkat kinerja satu dapur pada rentang tanggal.
 * Skor berbasis rasio (adil untuk jumlah hari kerja berbeda), dengan rincian
 * poin per komponen yang dijumlahkan persis = skor akhir (transparan). Terurut
 * dari skor tertinggi. Baris berjadwal-khusus tetap disertakan (`hidden`=true).
 */
export async function computeBoard(
  sppgId: number,
  from: string,
  to: string,
): Promise<{ board: BoardRow[]; op_days: number }> {
  const key = `${sppgId}|${from}|${to}`;
  const hit = boardCache.get(key);
  if (hit && Date.now() - hit.at < BOARD_TTL_MS) return hit.val;

  const rows = await query<RawRow>(
    `WITH opdates AS (
       SELECT DISTINCT COALESCE(a.shift_tanggal, a.tanggal) AS d
         FROM attendance a
         JOIN users u2 ON u2.id = a.user_id AND u2.sppg_id = $3
        WHERE COALESCE(a.shift_tanggal, a.tanggal) BETWEEN $1 AND $2
          AND a.check_in IS NOT NULL
     ),
     izin_days AS (
       SELECT i.user_id, COUNT(DISTINCT od.d) AS n
         FROM izin i
         JOIN opdates od ON od.d BETWEEN i.tanggal_mulai AND i.tanggal_selesai
        WHERE i.sppg_id = $3 AND i.status = 'disetujui'
        GROUP BY i.user_id
     )
     SELECT u.id AS user_id, u.nama, d.nama AS divisi_nama,
            u.leaderboard_hidden AS hidden,
            COUNT(a.check_in)::int AS hadir,
            COUNT(*) FILTER (WHERE a.status_masuk = 'Tepat Waktu')::int AS tepat,
            COUNT(*) FILTER (WHERE a.status_masuk = 'Terlambat')::int AS terlambat,
            COUNT(a.check_out)::int AS selesai,
            COALESCE(SUM(EXTRACT(EPOCH FROM (a.check_out - a.check_in)) / 60.0)
                     FILTER (WHERE a.check_in IS NOT NULL AND a.check_out IS NOT NULL), 0)::text AS menit,
            (SELECT COUNT(*) FROM opdates)::int AS op_days,
            COALESCE(idz.n, 0)::int AS izin_days
       FROM users u
       LEFT JOIN attendance a ON a.user_id = u.id
        AND COALESCE(a.shift_tanggal, a.tanggal) BETWEEN $1 AND $2
       LEFT JOIN divisi d ON d.id = u.divisi_id
       LEFT JOIN izin_days idz ON idz.user_id = u.id
      WHERE u.sppg_id = $3 AND u.aktif = TRUE
      GROUP BY u.id, u.nama, d.nama, u.leaderboard_hidden, idz.n`,
    [from, to, sppgId],
  );

  const board = rows
    .map((r) => {
      const hadir = r.hadir;
      const opDays = r.op_days || 0;
      const izinDays = r.izin_days || 0;
      const menit = Number(r.menit) || 0;
      const ketepatan = komponen(r.tepat, hadir, BOBOT.ketepatan);
      // Keaktifan: hari operasional dikurangi hari izin yang disetujui, agar
      // izin resmi tidak menurunkan skor. Penyebut minimal = jumlah kehadiran.
      const effDen = Math.max(opDays - izinDays, 0);
      const aktifRatio =
        hadir <= 0 ? 0 : effDen <= 0 ? 1 : Math.min(hadir / effDen, 1);
      const keaktifan: Komponen = {
        pct: round1(aktifRatio * 100),
        poin: round1(aktifRatio * BOBOT.keaktifan),
        a: hadir,
        b: effDen,
      };
      const kelengkapan = komponen(r.selesai, hadir, BOBOT.kelengkapan);
      // Skor = jumlah poin yang ditampilkan → rincian selalu klop (anti-iri).
      const skor =
        hadir > 0
          ? round1(ketepatan.poin + keaktifan.poin + kelengkapan.poin)
          : 0;
      const jamRata = r.selesai > 0 ? menit / r.selesai / 60 : 0;
      return {
        user_id: r.user_id,
        nama: r.nama,
        divisi_nama: r.divisi_nama,
        hidden: r.hidden,
        hadir,
        tepat: r.tepat,
        terlambat: r.terlambat,
        selesai: r.selesai,
        op_days: opDays,
        izin_days: izinDays,
        jam_rata: round1(jamRata),
        ketepatan,
        keaktifan,
        kelengkapan,
        skor,
      };
    })
    .sort(
      (a, b) =>
        b.skor - a.skor ||
        b.ketepatan.pct - a.ketepatan.pct ||
        b.hadir - a.hadir ||
        a.nama.localeCompare(b.nama, "id"),
    );

  const val = { board, op_days: rows[0]?.op_days || 0 };
  boardCache.set(key, { at: Date.now(), val });
  return val;
}
