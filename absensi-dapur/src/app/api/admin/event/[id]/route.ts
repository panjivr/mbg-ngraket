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

  // Ganti daftar peserta lalu sinkron ulang pengaruh event.
  if (Array.isArray(b.peserta)) {
    const ids: number[] = [
      ...new Set(
        b.peserta.map((x: unknown) => parseInt(String(x), 10)).filter(Number.isFinite),
      ),
    ] as number[];
    await query(`DELETE FROM event_peserta WHERE event_id = $1`, [id]);
    if (ids.length) {
      await query(
        `INSERT INTO event_peserta (event_id, user_id)
         SELECT $1, u.id FROM users u WHERE u.id = ANY($2::int[]) AND u.sppg_id = $3
         ON CONFLICT DO NOTHING`,
        [id, ids, admin.sppg_id],
      );
    }
    // Yang terlanjur kena event tapi bukan peserta lagi -> kembali ke jadwal
    // asli; lalu terapkan ulang ke peserta.
    let affected = 0;
    if (existing.aktif) {
      await revertEventFromDate(id);
      affected = await applyEventToDate(id);
    }
    return ok({
      event: {
        ...existing,
        lintas_hari: isOvernight(existing.jam_masuk, existing.jam_pulang),
        peserta_ids: ids,
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
