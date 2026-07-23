import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import type { Barang } from "@/lib/gudang";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route(async (req: NextRequest, ctx: Ctx) => {
  const admin = await requireAdmin();
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");
  const cur = (await query<Barang>(
    `SELECT id, nama, kategori, satuan, stok::float8 AS stok, stok_min::float8 AS stok_min, catatan, aktif FROM barang WHERE id = $1 AND sppg_id = $2`,
    [id, admin.sppg_id],
  ))[0];
  if (!cur) return fail(404, "Barang tidak ditemukan.");
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const nama = b.nama !== undefined ? String(b.nama).trim().slice(0, 120) : cur.nama;
  const kategori = b.kategori !== undefined ? (b.kategori === "bahan_baku" ? "bahan_baku" : "operasional") : cur.kategori;
  const satuan = b.satuan !== undefined ? (String(b.satuan).trim().slice(0, 20) || "pcs") : cur.satuan;
  const stok_min = b.stok_min !== undefined ? Math.max(0, Number(b.stok_min) || 0) : cur.stok_min;
  const catatan = b.catatan !== undefined ? String(b.catatan).trim().slice(0, 300) : cur.catatan;
  const aktif = b.aktif !== undefined ? b.aktif !== false : cur.aktif;
  // Stok tidak diubah lewat sini (harus lewat mutasi), kecuali edit stok_min/identitas.
  const rows = await query<Barang>(
    `UPDATE barang SET nama=$1, kategori=$2, satuan=$3, stok_min=$4, catatan=$5, aktif=$6 WHERE id=$7
     RETURNING id, sppg_id, nama, kategori, satuan, stok::float8 AS stok, stok_min::float8 AS stok_min, catatan, aktif, urutan`,
    [nama, kategori, satuan, stok_min, catatan, aktif, id],
  );
  return ok({ barang: rows[0] });
});

export const DELETE = route(async (_req: NextRequest, ctx: Ctx) => {
  const admin = await requireAdmin();
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");
  const rows = await query<{ id: number }>(
    `DELETE FROM barang WHERE id = $1 AND sppg_id = $2 RETURNING id`,
    [id, admin.sppg_id],
  );
  if (!rows.length) return fail(404, "Barang tidak ditemukan.");
  return ok({ deleted: id });
});
