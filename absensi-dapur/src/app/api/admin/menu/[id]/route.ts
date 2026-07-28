import { NextRequest } from "next/server";
import { withClient } from "@/lib/db";
import { requireAkses } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import { normalizeKategoriMenu, normalizePembulatan, normalizeKomponen } from "@/lib/menu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface BahanIn {
  barang_id?: number | null;
  nama?: string;
  satuan?: string;
  jumlah_dasar?: number;
  pembulatan?: string;
  komponen?: string;
  harga?: number;
  pasar_ref?: string;
}

// Update data menu + ganti seluruh daftar bahan dalam satu transaksi.
export const PUT = route(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const admin = await requireAkses("distribusi");
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return fail(400, "ID menu tidak valid.");
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const nama = String(b.nama ?? "").trim().slice(0, 120);
  if (!nama) return fail(400, "Nama menu wajib diisi.");
  const kategori = normalizeKategoriMenu(b.kategori);
  const porsi_dasar = Math.max(1, Math.round(Number(b.porsi_dasar)) || 1000);
  const keterangan = String(b.keterangan ?? "").trim().slice(0, 500);
  const aktif = b.aktif === false ? false : true;
  const bahanIn = Array.isArray(b.bahan) ? (b.bahan as BahanIn[]) : [];

  const result = await withClient(async (client) => {
    // Pastikan menu milik dapur ini.
    const own = await client.query<{ id: number }>(
      `SELECT id FROM menu WHERE id = $1 AND sppg_id = $2`,
      [id, admin.sppg_id],
    );
    if (!own.rows[0]) return null;

    await client.query(
      `UPDATE menu SET nama=$1, kategori=$2, porsi_dasar=$3, keterangan=$4, aktif=$5 WHERE id=$6`,
      [nama, kategori, porsi_dasar, keterangan, aktif, id],
    );
    await client.query(`DELETE FROM menu_bahan WHERE menu_id = $1`, [id]);
    let urut = 0;
    for (const row of bahanIn) {
      const namaB = String(row.nama ?? "").trim().slice(0, 120);
      if (!namaB) continue;
      const barangId =
        row.barang_id === null || row.barang_id === undefined ? null : Number(row.barang_id) || null;
      const satuan = String(row.satuan ?? "kg").trim().slice(0, 20) || "kg";
      const jumlah = Math.max(0, Number(row.jumlah_dasar) || 0);
      const pembulatan = normalizePembulatan(row.pembulatan);
      const komponen = normalizeKomponen(row.komponen);
      const harga = Math.max(0, Number(row.harga) || 0);
      const pasarRef = String(row.pasar_ref ?? "").trim().slice(0, 120);
      urut += 1;
      await client.query(
        `INSERT INTO menu_bahan (menu_id, barang_id, nama, satuan, jumlah_dasar, pembulatan, komponen, harga, pasar_ref, urutan)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [id, barangId, namaB, satuan, jumlah, pembulatan, komponen, harga, pasarRef, urut],
      );
    }
    return true;
  });

  if (!result) return fail(404, "Menu tidak ditemukan.");
  return ok({ ok: true });
});

export const DELETE = route(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const admin = await requireAkses("distribusi");
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return fail(400, "ID menu tidak valid.");
  const done = await withClient(async (client) => {
    const r = await client.query(`DELETE FROM menu WHERE id = $1 AND sppg_id = $2`, [id, admin.sppg_id]);
    return (r.rowCount ?? 0) > 0;
  });
  if (!done) return fail(404, "Menu tidak ditemukan.");
  return ok({ ok: true });
});
