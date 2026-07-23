import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import type { Kendaraan } from "@/lib/kilometer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route(async (req: NextRequest, ctx: Ctx) => {
  const admin = await requireAdmin();
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");
  const cur = (await query<Kendaraan>(`SELECT * FROM kendaraan WHERE id = $1 AND sppg_id = $2`, [id, admin.sppg_id]))[0];
  if (!cur) return fail(404, "Kendaraan tidak ditemukan.");
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const nopol = b.nopol !== undefined ? String(b.nopol).trim().slice(0, 40) : cur.nopol;
  const nama = b.nama !== undefined ? String(b.nama).trim().slice(0, 60) : cur.nama;
  const konsumsi = b.konsumsi !== undefined ? Math.max(0, Number(b.konsumsi) || 0) : cur.konsumsi;
  const aktif = b.aktif !== undefined ? b.aktif !== false : cur.aktif;
  const rows = await query<Kendaraan>(
    `UPDATE kendaraan SET nopol=$1, nama=$2, konsumsi=$3, aktif=$4 WHERE id=$5 RETURNING *`,
    [nopol, nama, konsumsi, aktif, id],
  );
  return ok({ kendaraan: rows[0] });
});

export const DELETE = route(async (_req: NextRequest, ctx: Ctx) => {
  const admin = await requireAdmin();
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");
  const rows = await query<{ id: number }>(
    `DELETE FROM kendaraan WHERE id = $1 AND sppg_id = $2 RETURNING id`,
    [id, admin.sppg_id],
  );
  if (!rows.length) return fail(404, "Kendaraan tidak ditemukan.");
  return ok({ deleted: id });
});
