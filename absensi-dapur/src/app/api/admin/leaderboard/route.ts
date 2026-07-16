import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ok, route } from "@/lib/api";
import { localDate } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Satu baris agregat per pegawai pada rentang tanggal terpilih.
interface LeaderboardRow {
  user_id: number;
  nama: string;
  divisi_nama: string | null;
  hadir: number;
  tepat: number;
  terlambat: number;
}

export const GET = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const sp = req.nextUrl.searchParams;
  const today = localDate("Asia/Jakarta");

  const from = DATE_RE.test(sp.get("from") || "") ? sp.get("from")! : today;
  const to = DATE_RE.test(sp.get("to") || "") ? sp.get("to")! : today;

  const rows = await query<LeaderboardRow>(
    `SELECT u.id AS user_id, u.nama, d.nama AS divisi_nama,
            COUNT(a.id) FILTER (WHERE a.check_in IS NOT NULL)::int AS hadir,
            COUNT(a.id) FILTER (WHERE a.status_masuk = 'Tepat Waktu')::int AS tepat,
            COUNT(a.id) FILTER (WHERE a.status_masuk = 'Terlambat')::int AS terlambat
       FROM users u
       LEFT JOIN attendance a ON a.user_id = u.id
        AND COALESCE(a.shift_tanggal, a.tanggal) BETWEEN $1 AND $2
       LEFT JOIN divisi d ON d.id = u.divisi_id
      WHERE u.sppg_id = $3 AND u.aktif = TRUE
      GROUP BY u.id, u.nama, d.nama`,
    [from, to, admin.sppg_id],
  );

  // Skor kedisiplinan: tepat waktu bernilai dobel, hadir menambah, terlambat mengurangi.
  const board = rows
    .map((r) => ({
      user_id: r.user_id,
      nama: r.nama,
      divisi_nama: r.divisi_nama,
      hadir: r.hadir,
      tepat: r.tepat,
      terlambat: r.terlambat,
      skor: r.tepat * 2 + r.hadir - r.terlambat,
    }))
    .sort(
      (a, b) =>
        b.skor - a.skor ||
        b.tepat - a.tepat ||
        b.hadir - a.hadir ||
        a.nama.localeCompare(b.nama, "id"),
    );

  return ok({ from, to, board });
});
