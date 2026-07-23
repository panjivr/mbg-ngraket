import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import { isOvernight } from "@/lib/time";
import type { Divisi } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
type Ctx = { params: Promise<{ id: string }> };

export const PUT = route(async (req: NextRequest, ctx: Ctx) => {
  const admin = await requireAdmin();
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");

  const cur = (
    await query<Divisi>(`SELECT * FROM divisi WHERE id = $1 AND sppg_id = $2`, [
      id,
      admin.sppg_id,
    ])
  )[0];
  if (!cur) return fail(404, "Divisi tidak ditemukan.");

  const b = await req.json().catch(() => ({}));
  const nama = b.nama !== undefined ? String(b.nama).trim() : cur.nama;
  const jam_masuk = b.jam_masuk !== undefined ? String(b.jam_masuk).trim() : cur.jam_masuk;
  const jam_pulang = b.jam_pulang !== undefined ? String(b.jam_pulang).trim() : cur.jam_pulang;
  const toleransi_menit =
    b.toleransi_menit !== undefined
      ? Math.round(Number(b.toleransi_menit))
      : cur.toleransi_menit;
  const aktif = b.aktif !== undefined ? Boolean(b.aktif) : cur.aktif;
  const lembur_min_jam =
    b.lembur_min_jam !== undefined
      ? Math.max(1, Math.min(24, Math.round(Number(b.lembur_min_jam)) || 10))
      : (cur.lembur_min_jam ?? 10);
  const jobdesk =
    b.jobdesk !== undefined
      ? String(b.jobdesk ?? "").trim() || null
      : cur.jobdesk;

  if (!nama) return fail(400, "Nama divisi wajib diisi.");
  if (!TIME_RE.test(jam_masuk) || !TIME_RE.test(jam_pulang)) {
    return fail(400, "Format jam harus HH:mm.");
  }
  if (!Number.isFinite(toleransi_menit) || toleransi_menit < 0 || toleransi_menit > 240) {
    return fail(400, "Toleransi tidak valid (0..240 menit).");
  }

  const dup = await query<{ id: number }>(
    `SELECT id FROM divisi WHERE lower(nama) = lower($1) AND id <> $2 AND sppg_id = $3`,
    [nama, id, admin.sppg_id],
  );
  if (dup.length) return fail(409, "Nama divisi sudah dipakai.");

  const rows = await query<Divisi>(
    `UPDATE divisi SET nama=$1, jam_masuk=$2, jam_pulang=$3, toleransi_menit=$4,
            aktif=$5, jobdesk=$6, lembur_min_jam=$7
       WHERE id = $8 AND sppg_id = $9 RETURNING *`,
    [nama, jam_masuk, jam_pulang, toleransi_menit, aktif, jobdesk, lembur_min_jam, id, admin.sppg_id],
  );
  return ok({ divisi: { ...rows[0], lintas_hari: isOvernight(jam_masuk, jam_pulang) } });
});

export const DELETE = route(async (_req: NextRequest, ctx: Ctx) => {
  const admin = await requireAdmin();
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");
  const cur = (
    await query<{ id: number }>(`SELECT id FROM divisi WHERE id = $1 AND sppg_id = $2`, [
      id,
      admin.sppg_id,
    ])
  )[0];
  if (!cur) return fail(404, "Divisi tidak ditemukan.");
  // users.divisi_id otomatis NULL (ON DELETE SET NULL).
  await query(`DELETE FROM divisi WHERE id = $1 AND sppg_id = $2`, [id, admin.sppg_id]);
  return ok({ ok: true });
});
