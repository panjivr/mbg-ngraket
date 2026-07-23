import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface PengumumanRow {
  id: number;
  judul: string;
  isi: string;
  pinned: boolean;
  aktif: boolean;
  created_at: string;
  dibaca?: number;
}

export const GET = route(async () => {
  const admin = await requireAdmin();
  const rows = await query<PengumumanRow>(
    `SELECT p.id, p.judul, p.isi, p.pinned, p.aktif, p.created_at,
            (SELECT COUNT(*) FROM pengumuman_baca b WHERE b.pengumuman_id = p.id)::int AS dibaca
       FROM pengumuman p
      WHERE p.sppg_id = $1
      ORDER BY p.pinned DESC, p.created_at DESC`,
    [admin.sppg_id],
  );
  return ok({ pengumuman: rows });
});

export const POST = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const b = await req.json().catch(() => ({}));
  const judul = String(b.judul ?? "").trim();
  const isi = String(b.isi ?? "").trim();
  const pinned = Boolean(b.pinned);
  if (!judul) return fail(400, "Judul wajib diisi.");
  const r = await query<{ id: number }>(
    `INSERT INTO pengumuman (sppg_id, judul, isi, pinned, created_by)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [admin.sppg_id, judul, isi, pinned, admin.uid],
  );
  return ok({ id: r[0].id });
});

export const PATCH = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const b = await req.json().catch(() => ({}));
  const id = parseInt(String(b.id), 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");
  const sets: string[] = [];
  const params: unknown[] = [];
  let n = 1;
  if (b.judul !== undefined) {
    const j = String(b.judul).trim();
    if (!j) return fail(400, "Judul tidak boleh kosong.");
    sets.push(`judul = $${n++}`);
    params.push(j);
  }
  if (b.isi !== undefined) {
    sets.push(`isi = $${n++}`);
    params.push(String(b.isi).trim());
  }
  if (b.pinned !== undefined) {
    sets.push(`pinned = $${n++}`);
    params.push(Boolean(b.pinned));
  }
  if (b.aktif !== undefined) {
    sets.push(`aktif = $${n++}`);
    params.push(Boolean(b.aktif));
  }
  if (!sets.length) return fail(400, "Tidak ada perubahan.");
  params.push(id, admin.sppg_id);
  const r = await query<{ id: number }>(
    `UPDATE pengumuman SET ${sets.join(", ")} WHERE id = $${n++} AND sppg_id = $${n} RETURNING id`,
    params,
  );
  if (!r.length) return fail(404, "Pengumuman tidak ditemukan.");
  return ok({ id });
});

export const DELETE = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const id = parseInt(req.nextUrl.searchParams.get("id") || "", 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");
  const r = await query<{ id: number }>(
    `DELETE FROM pengumuman WHERE id = $1 AND sppg_id = $2 RETURNING id`,
    [id, admin.sppg_id],
  );
  if (!r.length) return fail(404, "Pengumuman tidak ditemukan.");
  return ok({ id });
});
