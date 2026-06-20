import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { getSppg } from "@/lib/sppg";
import { ok, route } from "@/lib/api";
import { localDate } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface StatRow {
  total_staff: string;
  hadir: string;
  terlambat: string;
  pulang: string;
}

export const GET = route(async () => {
  const admin = await requireAdmin();
  const sppg = await getSppg(admin.sppg_id as number);
  const tanggal = localDate(sppg?.tz || "Asia/Jakarta");

  const rows = await query<StatRow>(
    `SELECT
       (SELECT COUNT(*) FROM users WHERE aktif = TRUE AND sppg_id = $2)::text AS total_staff,
       (SELECT COUNT(DISTINCT a.user_id) FROM attendance a JOIN users u ON u.id = a.user_id
          WHERE COALESCE(a.shift_tanggal, a.tanggal) = $1 AND a.check_in IS NOT NULL
            AND u.sppg_id = $2)::text AS hadir,
       (SELECT COUNT(*) FROM attendance a JOIN users u ON u.id = a.user_id
          WHERE COALESCE(a.shift_tanggal, a.tanggal) = $1 AND a.status_masuk = 'Terlambat'
            AND u.sppg_id = $2)::text AS terlambat,
       (SELECT COUNT(*) FROM attendance a JOIN users u ON u.id = a.user_id
          WHERE COALESCE(a.shift_tanggal, a.tanggal) = $1 AND a.check_out IS NOT NULL
            AND u.sppg_id = $2)::text AS pulang`,
    [tanggal, admin.sppg_id],
  );

  const r = rows[0];
  const total = Number(r.total_staff);
  const hadir = Number(r.hadir);

  return ok({
    tanggal,
    stats: {
      total_staff: total,
      hadir,
      terlambat: Number(r.terlambat),
      pulang: Number(r.pulang),
      belum: Math.max(total - hadir, 0),
    },
  });
});
