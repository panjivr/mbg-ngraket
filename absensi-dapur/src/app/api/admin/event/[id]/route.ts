import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { isOvernight } from "@/lib/time";
import { applyEventToDate, revertEventFromDate } from "@/lib/eventApply";
import { ok, fail, route } from "@/lib/api";
import type { EventAbsensi } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Ubah event (mis. aktif/nonaktif). */
export const PUT = route(async (req: NextRequest, ctx: Ctx) => {
  const admin = await requireAdmin();
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");

  const b = await req.json().catch(() => ({}));
  const existing = (
    await query<EventAbsensi>(`SELECT * FROM event_absensi WHERE id = $1 AND sppg_id = $2`, [
      id,
      admin.sppg_id,
    ])
  )[0];
  if (!existing) return fail(404, "Event tidak ditemukan.");

  // Sinkronkan ulang tanpa mengubah status aktif.
  if (b.reapply === true) {
    const affected = existing.aktif ? await applyEventToDate(id) : 0;
    return ok({
      event: {
        ...existing,
        lintas_hari: isOvernight(existing.jam_masuk, existing.jam_pulang),
      },
      affected,
    });
  }

  const aktif = b.aktif !== undefined ? Boolean(b.aktif) : existing.aktif;

  const rows = await query<EventAbsensi>(
    `UPDATE event_absensi SET aktif = $1 WHERE id = $2 RETURNING *`,
    [aktif, id],
  );
  // Aktif -> terapkan ke absensi tanggal itu; Nonaktif -> kembalikan ke jadwal asli.
  const affected = aktif ? await applyEventToDate(id) : await revertEventFromDate(id);
  return ok({
    event: { ...rows[0], lintas_hari: isOvernight(rows[0].jam_masuk, rows[0].jam_pulang) },
    affected,
  });
});

export const DELETE = route(async (_req: NextRequest, ctx: Ctx) => {
  const admin = await requireAdmin();
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");
  await query(`DELETE FROM event_absensi WHERE id = $1 AND sppg_id = $2`, [id, admin.sppg_id]);
  return ok({ ok: true });
});
