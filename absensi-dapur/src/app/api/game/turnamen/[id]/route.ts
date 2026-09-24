import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireSuper } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import { ambilTurnamen, papanTurnamen } from "@/lib/game";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

// Detail turnamen + peringkat penuhnya (untuk hasil juara 1/2/3).
export const GET = route(async (_req: NextRequest, ctx: Ctx) => {
  await requireSuper();
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return fail(400, "ID tidak valid.");
  const t = await ambilTurnamen(id);
  if (!t) return fail(404, "Turnamen tidak ditemukan.");
  const papan = await papanTurnamen(t.mulai, t.selesai, 100);
  return ok({ turnamen: t, papan });
});

// Hapus turnamen — hanya admin pusat.
export const DELETE = route(async (_req: NextRequest, ctx: Ctx) => {
  await requireSuper();
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return fail(400, "ID tidak valid.");
  await query(`DELETE FROM game_turnamen WHERE id = $1`, [id]);
  return ok({ deleted: true });
});
