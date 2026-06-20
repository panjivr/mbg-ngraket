import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { isOvernight } from "@/lib/time";
import { ok, fail, route } from "@/lib/api";
import type { DivisiShift } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Tambah sub-shift ke sebuah divisi. */
export const POST = route(async (req: NextRequest, ctx: Ctx) => {
  const admin = await requireAdmin();
  const divisiId = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(divisiId)) return fail(400, "ID divisi tidak valid.");

  const b = await req.json().catch(() => ({}));
  const nama = String(b.nama ?? "").trim();
  const jam_masuk = String(b.jam_masuk ?? "").trim();
  const jam_pulang = String(b.jam_pulang ?? "").trim();
  const toleransi_menit = Math.round(Number(b.toleransi_menit ?? 10));
  const urutan = Math.round(Number(b.urutan ?? 0)) || 0;

  if (!nama) return fail(400, "Nama shift wajib diisi.");
  if (!TIME_RE.test(jam_masuk) || !TIME_RE.test(jam_pulang)) {
    return fail(400, "Format jam harus HH:mm.");
  }
  if (!Number.isFinite(toleransi_menit) || toleransi_menit < 0 || toleransi_menit > 240) {
    return fail(400, "Toleransi tidak valid (0..240 menit).");
  }

  const div = await query<{ id: number }>(
    `SELECT id FROM divisi WHERE id = $1 AND sppg_id = $2`,
    [divisiId, admin.sppg_id],
  );
  if (!div.length) return fail(404, "Divisi tidak ditemukan.");

  const rows = await query<DivisiShift>(
    `INSERT INTO divisi_shift (divisi_id, nama, jam_masuk, jam_pulang, toleransi_menit, urutan)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [divisiId, nama, jam_masuk, jam_pulang, toleransi_menit, urutan],
  );
  return ok(
    { shift: { ...rows[0], lintas_hari: isOvernight(jam_masuk, jam_pulang) } },
    { status: 201 },
  );
});

/** Hapus sebuah sub-shift: DELETE ?shiftId=123 */
export const DELETE = route(async (req: NextRequest, ctx: Ctx) => {
  const admin = await requireAdmin();
  const divisiId = parseInt((await ctx.params).id, 10);
  const shiftId = parseInt(new URL(req.url).searchParams.get("shiftId") || "", 10);
  if (!Number.isFinite(divisiId) || !Number.isFinite(shiftId)) {
    return fail(400, "ID tidak valid.");
  }
  await query(
    `DELETE FROM divisi_shift
      WHERE id = $1 AND divisi_id = $2
        AND divisi_id IN (SELECT id FROM divisi WHERE sppg_id = $3)`,
    [shiftId, divisiId, admin.sppg_id],
  );
  return ok({ ok: true });
});
