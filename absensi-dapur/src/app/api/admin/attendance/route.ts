import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ok, route } from "@/lib/api";
import { localDate } from "@/lib/time";
import type { AttendanceWithUser } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const GET = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const sp = req.nextUrl.searchParams;
  const today = localDate("Asia/Jakarta");

  const from = DATE_RE.test(sp.get("from") || "") ? sp.get("from")! : today;
  const to = DATE_RE.test(sp.get("to") || "") ? sp.get("to")! : today;
  const userId = parseInt(sp.get("user_id") || "", 10);
  const divisiId = parseInt(sp.get("divisi_id") || "", 10);

  const conds = ["COALESCE(a.shift_tanggal, a.tanggal) BETWEEN $1 AND $2", "u.sppg_id = $3"];
  const params: unknown[] = [from, to, admin.sppg_id];
  if (Number.isFinite(userId)) {
    params.push(userId);
    conds.push(`a.user_id = $${params.length}`);
  }
  if (Number.isFinite(divisiId)) {
    params.push(divisiId);
    conds.push(`a.divisi_id = $${params.length}`);
  }

  const rows = await query<
    Omit<AttendanceWithUser, "selfie_in" | "selfie_out">
  >(
    `SELECT a.id, a.user_id,
            COALESCE(a.shift_tanggal, a.tanggal) AS tanggal,
            a.shift_tanggal, a.divisi_id, a.shift_masuk, a.shift_pulang,
            a.check_in, a.check_out, a.status_masuk,
            a.check_in_lat, a.check_in_lng, a.check_in_jarak,
            a.check_out_lat, a.check_out_lng, a.check_out_jarak, a.catatan,
            u.nama, u.jabatan, u.nip, d.nama AS divisi_nama
       FROM attendance a
       JOIN users u ON u.id = a.user_id
       LEFT JOIN divisi d ON d.id = a.divisi_id
      WHERE ${conds.join(" AND ")}
      ORDER BY COALESCE(a.shift_tanggal, a.tanggal) DESC, a.check_in DESC NULLS LAST, u.nama ASC`,
    params,
  );

  return ok({ from, to, rekap: rows });
});
