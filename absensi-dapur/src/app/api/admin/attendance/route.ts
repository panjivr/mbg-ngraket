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
  await requireAdmin();
  const sp = req.nextUrl.searchParams;
  const today = localDate("Asia/Jakarta");

  const from = DATE_RE.test(sp.get("from") || "") ? sp.get("from")! : today;
  const to = DATE_RE.test(sp.get("to") || "") ? sp.get("to")! : today;
  const userId = parseInt(sp.get("user_id") || "", 10);

  const conds = ["a.tanggal BETWEEN $1 AND $2"];
  const params: unknown[] = [from, to];
  if (Number.isFinite(userId)) {
    params.push(userId);
    conds.push(`a.user_id = $${params.length}`);
  }

  const rows = await query<
    Omit<AttendanceWithUser, "selfie_in" | "selfie_out">
  >(
    `SELECT a.id, a.user_id, a.tanggal, a.check_in, a.check_out, a.status_masuk,
            a.check_in_lat, a.check_in_lng, a.check_in_jarak,
            a.check_out_lat, a.check_out_lng, a.check_out_jarak, a.catatan,
            u.nama, u.jabatan, u.nip
       FROM attendance a
       JOIN users u ON u.id = a.user_id
      WHERE ${conds.join(" AND ")}
      ORDER BY a.tanggal DESC, u.nama ASC`,
    params,
  );

  return ok({ from, to, rekap: rows });
});
