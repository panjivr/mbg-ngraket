import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import type { AttendanceWithUser } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_req: NextRequest, ctx: Ctx) => {
  await requireAdmin();
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");

  const rows = await query<AttendanceWithUser>(
    `SELECT a.*, u.nama, u.jabatan, u.nip
       FROM attendance a JOIN users u ON u.id = a.user_id
      WHERE a.id = $1`,
    [id],
  );
  if (!rows.length) return fail(404, "Data absensi tidak ditemukan.");
  return ok({ detail: rows[0] });
});
