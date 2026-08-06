import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { computeBoard } from "@/lib/leaderboard";
import { ok, route } from "@/lib/api";
import { localDate } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface DailyRow {
  d: string;
  tepat: number;
  terlambat: number;
  hadir: number;
}
interface MoodRow {
  mood: string;
  n: number;
}
interface DivisiRow {
  divisi: string;
  hadir: number;
  tepat: number;
  terlambat: number;
}

/**
 * Data agregat untuk halaman Statistik / Grafik absensi (per dapur).
 * Semua query dibatasi ke sppg admin. Sumber tunggal: tabel `attendance`.
 * - daily     : tren harian hadir + tepat/terlambat
 * - mood      : sebaran suasana hati (dari kolom attendance.mood)
 * - divisi    : hadir + ketepatan per divisi
 * - ranking   : 10 besar skor kinerja (pakai computeBoard yang ter-cache)
 */
export const GET = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const sppgId = admin.sppg_id as number;
  const sp = req.nextUrl.searchParams;
  const today = localDate("Asia/Jakarta");
  const from = DATE_RE.test(sp.get("from") || "") ? sp.get("from")! : today;
  const to = DATE_RE.test(sp.get("to") || "") ? sp.get("to")! : today;

  const [daily, mood, divisi, board] = await Promise.all([
    query<DailyRow>(
      `SELECT COALESCE(a.shift_tanggal, a.tanggal)::text AS d,
              COUNT(*) FILTER (WHERE a.status_masuk = 'Tepat Waktu')::int AS tepat,
              COUNT(*) FILTER (WHERE a.status_masuk = 'Terlambat')::int AS terlambat,
              COUNT(a.check_in)::int AS hadir
         FROM attendance a
         JOIN users u ON u.id = a.user_id AND u.sppg_id = $3
        WHERE COALESCE(a.shift_tanggal, a.tanggal) BETWEEN $1 AND $2
          AND a.check_in IS NOT NULL
        GROUP BY d
        ORDER BY d`,
      [from, to, sppgId],
    ),
    query<MoodRow>(
      `SELECT a.mood AS mood, COUNT(*)::int AS n
         FROM attendance a
         JOIN users u ON u.id = a.user_id AND u.sppg_id = $3
        WHERE COALESCE(a.shift_tanggal, a.tanggal) BETWEEN $1 AND $2
          AND a.mood IS NOT NULL
        GROUP BY a.mood`,
      [from, to, sppgId],
    ),
    query<DivisiRow>(
      `SELECT COALESCE(d.nama, 'Tanpa divisi') AS divisi,
              COUNT(a.check_in)::int AS hadir,
              COUNT(*) FILTER (WHERE a.status_masuk = 'Tepat Waktu')::int AS tepat,
              COUNT(*) FILTER (WHERE a.status_masuk = 'Terlambat')::int AS terlambat
         FROM attendance a
         JOIN users u ON u.id = a.user_id AND u.sppg_id = $3
         LEFT JOIN divisi d ON d.id = COALESCE(a.divisi_id, u.divisi_id)
        WHERE COALESCE(a.shift_tanggal, a.tanggal) BETWEEN $1 AND $2
          AND a.check_in IS NOT NULL
        GROUP BY COALESCE(d.nama, 'Tanpa divisi')
        ORDER BY hadir DESC`,
      [from, to, sppgId],
    ),
    computeBoard(sppgId, from, to).then((r) => r.board),
  ]);

  const ranking = board
    .filter((r) => !r.hidden && r.hadir > 0)
    .slice(0, 10)
    .map((r) => ({
      nama: r.nama,
      divisi: r.divisi_nama,
      skor: r.skor,
      tepat: r.tepat,
      terlambat: r.terlambat,
      hadir: r.hadir,
      ketepatan: r.ketepatan.pct,
    }));

  return ok({ from, to, daily, mood, divisi, ranking });
});
