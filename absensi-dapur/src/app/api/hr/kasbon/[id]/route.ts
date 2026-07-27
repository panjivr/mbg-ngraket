import { NextRequest } from "next/server";
import { requireHr } from "@/lib/session";
import { query } from "@/lib/db";
import { ok, fail, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// Ubah status lunas kasbon: { lunas: boolean }
export const PUT = route(async (req: NextRequest, ctx: Ctx) => {
  const hr = await requireHr();
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const lunas = b.lunas === true;
  const rows = await query<{ id: number }>(
    `UPDATE kasbon SET lunas = $1 WHERE id = $2 AND sppg_id = $3 RETURNING id`,
    [lunas, id, hr.sppg_id],
  );
  if (!rows.length) return fail(404, "Kasbon tidak ditemukan.");
  return ok({ ok: true });
});

export const DELETE = route(async (_req: NextRequest, ctx: Ctx) => {
  const hr = await requireHr();
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");
  const rows = await query<{ id: number }>(
    `DELETE FROM kasbon WHERE id = $1 AND sppg_id = $2 RETURNING id`,
    [id, hr.sppg_id],
  );
  if (!rows.length) return fail(404, "Kasbon tidak ditemukan.");
  return ok({ ok: true });
});
