import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { catatAudit } from "@/lib/audit";
import { ok, fail, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

interface GiziFull {
  id: number;
  slug: string;
  judul: string;
  nomor: string;
  tanggal: string;
  konten_html: string;
  dibuat_oleh: string;
  created_at: string;
  updated_at: string;
}

const parseId = (raw: string): number | null => {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
};

// GET: ambil satu dokumen gizi lengkap (termasuk konten_html) untuk dibuka/cetak ulang.
export const GET = route(async (_req: NextRequest, ctx: Ctx) => {
  const admin = await requireAdmin();
  const id = parseId((await ctx.params).id);
  if (id === null) return fail(400, "ID tidak valid.");

  const rows = await query<GiziFull>(
    `SELECT id, slug, judul, nomor, tanggal, konten_html, dibuat_oleh, created_at, updated_at
       FROM laporan_gizi
      WHERE id = $1 AND sppg_id = $2`,
    [id, admin.sppg_id],
  );
  if (!rows.length) return fail(404, "Data tidak ditemukan.");
  return ok({ item: rows[0] });
});

// DELETE: hapus satu dokumen gizi tersimpan.
export const DELETE = route(async (_req: NextRequest, ctx: Ctx) => {
  const admin = await requireAdmin();
  const id = parseId((await ctx.params).id);
  if (id === null) return fail(400, "ID tidak valid.");

  const rows = await query<{ judul: string; tanggal: string }>(
    `DELETE FROM laporan_gizi
      WHERE id = $1 AND sppg_id = $2
      RETURNING judul, tanggal`,
    [id, admin.sppg_id],
  );
  if (!rows.length) return fail(404, "Data tidak ditemukan.");
  await catatAudit(admin, "hapus", "Laporan Gizi", `${rows[0].judul} (${rows[0].tanggal})`);
  return ok({ deleted: true });
});
