import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/session";
import { query } from "@/lib/db";
import { ok, fail, route } from "@/lib/api";
import { getKartuPegawai } from "@/lib/kartu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_req: NextRequest, ctx: Ctx) => {
  const admin = await requireAdmin();
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");
  // Cegah IDOR lintas dapur: pastikan pegawai milik dapur admin ini.
  const owned = await query<{ id: number }>(
    `SELECT id FROM users WHERE id = $1 AND sppg_id = $2`,
    [id, admin.sppg_id],
  );
  if (!owned.length) return fail(404, "Pegawai tidak ditemukan.");
  const kartu = await getKartuPegawai(id);
  if (!kartu) return fail(404, "Pegawai tidak ditemukan.");
  return ok({ kartu });
});
