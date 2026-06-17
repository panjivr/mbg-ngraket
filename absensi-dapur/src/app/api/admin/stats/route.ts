import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ok, route } from "@/lib/api";
import { localDate } from "@/lib/time";
import type { Settings } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface StatRow {
  total_staff: string;
  hadir: string;
  terlambat: string;
  pulang: string;
}

export const GET = route(async () => {
  await requireAdmin();
  const settings = (
    await query<Settings>(`SELECT tz FROM settings WHERE id = 1`)
  )[0];
  const tanggal = localDate(settings?.tz || "Asia/Jakarta");

  const rows = await query<StatRow>(
    `SELECT
       (SELECT COUNT(*) FROM users WHERE aktif = TRUE)::text AS total_staff,
       (SELECT COUNT(*) FROM attendance WHERE tanggal = $1 AND check_in IS NOT NULL)::text AS hadir,
       (SELECT COUNT(*) FROM attendance WHERE tanggal = $1 AND status_masuk = 'Terlambat')::text AS terlambat,
       (SELECT COUNT(*) FROM attendance WHERE tanggal = $1 AND check_out IS NOT NULL)::text AS pulang`,
    [tanggal],
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
