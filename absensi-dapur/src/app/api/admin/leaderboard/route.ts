import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import { localDate } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Bobot komponen skor kinerja (0–100). Berbasis rasio agar adil untuk pegawai
// dengan jumlah hari kerja berbeda (mis. keamanan yang harinya lebih banyak).
const W_KETEPATAN = 0.55; // ketepatan waktu masuk (tepat / hadir)
const W_KEAKTIFAN = 0.25; // keaktifan hadir (hadir / hari operasional, maks 1)
const W_KELENGKAPAN = 0.2; // kelengkapan presensi (clock-out / hadir)

// Satu baris agregat mentah per pegawai pada rentang tanggal terpilih.
interface RawRow {
  user_id: number;
  nama: string;
  divisi_nama: string | null;
  hidden: boolean;
  hadir: number;
  tepat: number;
  terlambat: number;
  selesai: number;
  menit: string; // total menit kerja (check_in→check_out) sebagai text numeric
  op_days: number;
}

export const GET = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const sp = req.nextUrl.searchParams;
  const today = localDate("Asia/Jakarta");

  const from = DATE_RE.test(sp.get("from") || "") ? sp.get("from")! : today;
  const to = DATE_RE.test(sp.get("to") || "") ? sp.get("to")! : today;

  const rows = await query<RawRow>(
    `WITH op AS (
       SELECT COUNT(DISTINCT COALESCE(a.shift_tanggal, a.tanggal)) AS n
         FROM attendance a
         JOIN users u2 ON u2.id = a.user_id AND u2.sppg_id = $3
        WHERE COALESCE(a.shift_tanggal, a.tanggal) BETWEEN $1 AND $2
          AND a.check_in IS NOT NULL
     )
     SELECT u.id AS user_id, u.nama, d.nama AS divisi_nama,
            u.leaderboard_hidden AS hidden,
            COUNT(a.check_in)::int AS hadir,
            COUNT(*) FILTER (WHERE a.status_masuk = 'Tepat Waktu')::int AS tepat,
            COUNT(*) FILTER (WHERE a.status_masuk = 'Terlambat')::int AS terlambat,
            COUNT(a.check_out)::int AS selesai,
            COALESCE(SUM(EXTRACT(EPOCH FROM (a.check_out - a.check_in)) / 60.0)
                     FILTER (WHERE a.check_in IS NOT NULL AND a.check_out IS NOT NULL), 0)::text AS menit,
            (SELECT n FROM op)::int AS op_days
       FROM users u
       LEFT JOIN attendance a ON a.user_id = u.id
        AND COALESCE(a.shift_tanggal, a.tanggal) BETWEEN $1 AND $2
       LEFT JOIN divisi d ON d.id = u.divisi_id
      WHERE u.sppg_id = $3 AND u.aktif = TRUE
      GROUP BY u.id, u.nama, d.nama, u.leaderboard_hidden`,
    [from, to, admin.sppg_id],
  );

  const board = rows
    .map((r) => {
      const hadir = r.hadir;
      const opDays = r.op_days || 0;
      const menit = Number(r.menit) || 0;
      // Komponen rasio 0..1.
      const ketepatan = hadir > 0 ? r.tepat / hadir : 0;
      const keaktifan = opDays > 0 ? Math.min(hadir / opDays, 1) : 0;
      const kelengkapan = hadir > 0 ? r.selesai / hadir : 0;
      const skor =
        hadir > 0
          ? Math.round(
              100 *
                (W_KETEPATAN * ketepatan +
                  W_KEAKTIFAN * keaktifan +
                  W_KELENGKAPAN * kelengkapan),
            )
          : 0;
      // Rata-rata jam kerja per hari (dari presensi yang lengkap check-out).
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
        ketepatan: Math.round(ketepatan * 100),
        jam_rata: Math.round(jamRata * 10) / 10,
        skor,
      };
    })
    .sort(
      (a, b) =>
        b.skor - a.skor ||
        b.ketepatan - a.ketepatan ||
        b.hadir - a.hadir ||
        a.nama.localeCompare(b.nama, "id"),
    );

  return ok({ from, to, board, op_days: rows[0]?.op_days || 0 });
});

// Sembunyikan / tampilkan pegawai dari papan peringkat (jadwal khusus).
export const PATCH = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const body = await req.json().catch(() => ({}));
  const id = parseInt(String(body.user_id), 10);
  if (!Number.isFinite(id)) return fail(400, "user_id tidak valid.");
  const hidden = Boolean(body.hidden);
  const res = await query<{ id: number }>(
    `UPDATE users SET leaderboard_hidden = $1
      WHERE id = $2 AND sppg_id = $3 RETURNING id`,
    [hidden, id, admin.sppg_id],
  );
  if (!res.length) return fail(404, "Pegawai tidak ditemukan.");
  return ok({ user_id: id, hidden });
});
