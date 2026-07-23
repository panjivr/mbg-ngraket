import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { invalidateBoard } from "@/lib/leaderboard";
import { ok, fail, route } from "@/lib/api";
import type { IzinRow } from "@/app/api/izin/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Daftar semua pengajuan izin di dapur (default: pending dulu, lalu terbaru).
export const GET = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const status = req.nextUrl.searchParams.get("status");
  const filter = status === "pending" || status === "disetujui" || status === "ditolak";
  const rows = await query<IzinRow>(
    `SELECT i.id, i.user_id, u.nama, i.jenis, i.tanggal_mulai, i.tanggal_selesai,
            i.alasan, i.lampiran, i.status, i.catatan_admin, i.reviewed_at, i.created_at
       FROM izin i JOIN users u ON u.id = i.user_id
      WHERE i.sppg_id = $1 ${filter ? "AND i.status = $2" : ""}
      ORDER BY (i.status = 'pending') DESC, i.created_at DESC
      LIMIT 300`,
    filter ? [admin.sppg_id, status] : [admin.sppg_id],
  );
  const pending = (
    await query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM izin WHERE sppg_id = $1 AND status = 'pending'`,
      [admin.sppg_id],
    )
  )[0]?.n;
  return ok({ izin: rows, pending: Number(pending || 0) });
});

// Setujui / tolak pengajuan.
export const PATCH = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const b = await req.json().catch(() => ({}));
  const id = parseInt(String(b.id), 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");
  const status =
    b.status === "disetujui" || b.status === "ditolak" ? b.status : null;
  if (!status) return fail(400, "Status tidak valid.");
  const catatan = b.catatan_admin ? String(b.catatan_admin).trim() : null;

  const r = await query<{ id: number }>(
    `UPDATE izin SET status = $1, catatan_admin = $2, reviewed_by = $3, reviewed_at = now()
      WHERE id = $4 AND sppg_id = $5 RETURNING id`,
    [status, catatan, admin.uid, id, admin.sppg_id],
  );
  if (!r.length) return fail(404, "Pengajuan tidak ditemukan.");
  // Izin disetujui memengaruhi skor keaktifan → segarkan cache papan.
  invalidateBoard(admin.sppg_id as number);
  return ok({ id, status });
});
