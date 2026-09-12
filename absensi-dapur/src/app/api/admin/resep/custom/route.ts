import { NextRequest } from "next/server";
import { requireAkses, requireAdmin } from "@/lib/session";
import { query } from "@/lib/db";
import { ok, fail, route } from "@/lib/api";
import { RESEP_KATEGORI } from "@/lib/resep";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const num = (x: unknown): number => {
  const n = parseFloat(String(x).replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

interface Item { n: string; s: string; q: number; h: number }
interface Row { id: number; kategori: string; nama: string; porsi_basis: number; items: Item[]; catatan: string; oleh: string }

function cleanItems(raw: unknown): Item[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => {
      const o = (r || {}) as Record<string, unknown>;
      return { n: String(o.n ?? "").trim().slice(0, 120), s: String(o.s ?? "").trim().slice(0, 20) || "kg", q: num(o.q), h: num(o.h) };
    })
    .filter((i) => i.n)
    .slice(0, 100);
}

// GET — daftar resep custom dapur ini.
export const GET = route(async () => {
  const me = await requireAkses(["distribusi", "gizi", "laporan", "keuangan"]);
  const rows = await query<Row>(
    `SELECT id, kategori, nama, porsi_basis::float8 AS porsi_basis, items, catatan, oleh
       FROM resep_custom WHERE sppg_id = $1 ORDER BY kategori, nama`,
    [me.sppg_id],
  );
  return ok({ resep: rows });
});

// POST — buat / ubah resep custom (admin penuh). Sertakan id untuk ubah.
export const POST = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const nama = String(b.nama ?? "").trim().slice(0, 120);
  const kategori = String(b.kategori ?? "").trim();
  if (!nama) return fail(400, "Nama resep wajib.");
  if (!RESEP_KATEGORI.includes(kategori)) return fail(400, "Kategori tidak valid.");
  const porsi_basis = Math.max(1, num(b.porsi_basis) || 1000);
  const items = cleanItems(b.items);
  if (items.length === 0) return fail(400, "Minimal 1 bahan.");
  const catatan = String(b.catatan ?? "").trim().slice(0, 300);
  const id = b.id != null ? parseInt(String(b.id), 10) : null;

  if (id && Number.isFinite(id)) {
    const r = await query<{ id: number }>(
      `UPDATE resep_custom SET kategori=$1, nama=$2, porsi_basis=$3, items=$4::jsonb, catatan=$5, updated_at=now()
         WHERE id=$6 AND sppg_id=$7 RETURNING id`,
      [kategori, nama, porsi_basis, JSON.stringify(items), catatan, id, admin.sppg_id],
    );
    if (!r.length) return fail(404, "Resep tidak ditemukan.");
    return ok({ id: r[0].id, updated: true });
  }
  const r = await query<{ id: number }>(
    `INSERT INTO resep_custom (sppg_id, kategori, nama, porsi_basis, items, catatan, oleh)
     VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7) RETURNING id`,
    [admin.sppg_id, kategori, nama, porsi_basis, JSON.stringify(items), catatan, admin.nama],
  );
  return ok({ id: r[0].id, created: true });
});

// DELETE ?id= — hapus resep custom.
export const DELETE = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const id = parseInt(req.nextUrl.searchParams.get("id") || "", 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");
  await query(`DELETE FROM resep_custom WHERE id=$1 AND sppg_id=$2`, [id, admin.sppg_id]);
  return ok({ deleted: id });
});
