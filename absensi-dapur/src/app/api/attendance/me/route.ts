import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { ok, route } from "@/lib/api";
import type { Attendance } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async (req: NextRequest) => {
  const session = await requireSession();
  const limit = Math.min(
    Math.max(parseInt(req.nextUrl.searchParams.get("limit") || "30", 10), 1),
    180,
  );

  const rows = await query<
    Pick<
      Attendance,
      | "id"
      | "tanggal"
      | "check_in"
      | "check_out"
      | "status_masuk"
      | "check_in_jarak"
      | "check_out_jarak"
    >
  >(
    `SELECT id, tanggal, check_in, check_out, status_masuk,
            check_in_jarak, check_out_jarak
       FROM attendance
      WHERE user_id = $1
      ORDER BY tanggal DESC
      LIMIT $2`,
    [session.uid, limit],
  );

  return ok({ riwayat: rows });
});
