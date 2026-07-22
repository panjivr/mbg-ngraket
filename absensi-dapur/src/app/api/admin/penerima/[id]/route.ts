import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import type { Penerima } from "@/lib/distribusi-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route(async (req: NextRequest, ctx: Ctx) => {
  const admin = await requireAdmin();
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");

  const cur = (
    await query<Penerima>(`SELECT * FROM penerima WHERE id = $1 AND sppg_id = $2`, [
      id,
      admin.sppg_id,
    ])
  )[0];
  if (!cur) return fail(404, "Penerima tidak ditemukan.");

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const num = (v: unknown, d: number) =>
    v === undefined ? d : Math.max(0, Math.round(Number(v)) || 0);

  const nama = b.nama !== undefined ? String(b.nama).trim() || cur.nama : cur.nama;
  const jenis = b.jenis !== undefined ? (b.jenis === "b3" ? "b3" : "serdik") : cur.jenis;
  const jenjang = b.jenjang !== undefined ? String(b.jenjang).trim() : cur.jenjang;
  const besar = num(b.besar, cur.besar);
  const kecil = num(b.kecil, cur.kecil);
  const b3 = num(b.b3, cur.b3);
  const pj = num(b.pj, cur.pj);
  const jam_kirim = b.jam_kirim !== undefined ? String(b.jam_kirim) : cur.jam_kirim;
  const aktif = b.aktif !== undefined ? Boolean(b.aktif) : cur.aktif;

  const rows = await query<Penerima>(
    `UPDATE penerima SET nama=$1, jenis=$2, jenjang=$3, besar=$4, kecil=$5, b3=$6, pj=$7, jam_kirim=$8, aktif=$9
      WHERE id=$10 AND sppg_id=$11 RETURNING *`,
    [nama, jenis, jenjang, besar, kecil, b3, pj, jam_kirim, aktif, id, admin.sppg_id],
  );
  return ok({ penerima: rows[0] });
});

export const DELETE = route(async (_req: NextRequest, ctx: Ctx) => {
  const admin = await requireAdmin();
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");
  const rows = await query<{ id: number }>(
    `DELETE FROM penerima WHERE id = $1 AND sppg_id = $2 RETURNING id`,
    [id, admin.sppg_id],
  );
  if (!rows.length) return fail(404, "Penerima tidak ditemukan.");
  return ok({ ok: true });
});
