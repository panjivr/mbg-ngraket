import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireGudang } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import type { Barang } from "@/lib/gudang";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SELECT = `SELECT id, sppg_id, nama, kategori, satuan,
  stok::float8 AS stok, stok_min::float8 AS stok_min, catatan, aktif, urutan FROM barang`;

export const GET = route(async () => {
  const admin = await requireGudang("read");
  const rows = await query<Barang>(
    `${SELECT} WHERE sppg_id = $1 ORDER BY kategori ASC, nama ASC`,
    [admin.sppg_id],
  );
  return ok({ barang: rows });
});

export const POST = route(async (req: NextRequest) => {
  const admin = await requireGudang("full");
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const nama = String(b.nama ?? "").trim().slice(0, 120);
  if (!nama) return fail(400, "Nama barang wajib diisi.");
  const kategori = b.kategori === "bahan_baku" ? "bahan_baku" : "operasional";
  const satuan = String(b.satuan ?? "pcs").trim().slice(0, 20) || "pcs";
  const stok = Math.max(0, Number(b.stok) || 0);
  const stok_min = Math.max(0, Number(b.stok_min) || 0);
  const catatan = String(b.catatan ?? "").trim().slice(0, 300);
  const maxUrut = (await query<{ m: number }>(`SELECT COALESCE(MAX(urutan),0) AS m FROM barang WHERE sppg_id = $1`, [admin.sppg_id]))[0]?.m ?? 0;
  const rows = await query<Barang>(
    `INSERT INTO barang (sppg_id, nama, kategori, satuan, stok, stok_min, catatan, aktif, urutan)
     VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE,$8)
     RETURNING id, sppg_id, nama, kategori, satuan, stok::float8 AS stok, stok_min::float8 AS stok_min, catatan, aktif, urutan`,
    [admin.sppg_id, nama, kategori, satuan, stok, stok_min, catatan, maxUrut + 1],
  );
  return ok({ barang: rows[0] });
});
