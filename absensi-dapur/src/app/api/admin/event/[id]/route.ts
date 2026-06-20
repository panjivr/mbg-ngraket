import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { isOvernight } from "@/lib/time";
import { ok, fail, route } from "@/lib/api";
import type { EventAbsensi } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Ubah event (mis. aktif/nonaktif). */
export const PUT = route(async (req: NextRequest, ctx: Ctx) => {
  await requireAdmin();
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");

  const b = await req.json().catch(() => ({}));
  const existing = (
    await query<EventAbsensi>(`SELECT * FROM event_absensi WHERE id = $1`, [id])
  )[0];
  if (!existing) return fail(404, "Event tidak ditemukan.");

  const aktif = b.aktif !== undefined ? Boolean(b.aktif) : existing.aktif;

  const rows = await query<EventAbsensi>(
    `UPDATE event_absensi SET aktif = $1 WHERE id = $2 RETURNING *`,
    [aktif, id],
  );
  return ok({
    event: { ...rows[0], lintas_hari: isOvernight(rows[0].jam_masuk, rows[0].jam_pulang) },
  });
});

export const DELETE = route(async (_req: NextRequest, ctx: Ctx) => {
  await requireAdmin();
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");
  await query(`DELETE FROM event_absensi WHERE id = $1`, [id]);
  return ok({ ok: true });
});
