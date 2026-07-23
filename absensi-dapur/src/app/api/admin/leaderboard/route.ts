import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { getSppg, invalidateSppg } from "@/lib/sppg";
import { computeBoard, invalidateBoard } from "@/lib/leaderboard";
import { ok, fail, route } from "@/lib/api";
import { localDate } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const GET = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const sp = req.nextUrl.searchParams;
  const today = localDate("Asia/Jakarta");

  const from = DATE_RE.test(sp.get("from") || "") ? sp.get("from")! : today;
  const to = DATE_RE.test(sp.get("to") || "") ? sp.get("to")! : today;

  const [{ board, op_days }, sppg] = await Promise.all([
    computeBoard(admin.sppg_id as number, from, to),
    getSppg(admin.sppg_id as number),
  ]);

  return ok({
    from,
    to,
    board,
    op_days,
    // Periode yang sedang dipublikasikan ke karyawan (agar form prefill).
    periode: {
      from: sppg?.leaderboard_from || null,
      to: sppg?.leaderboard_to || null,
    },
  });
});

// Sembunyikan / tampilkan pegawai dari papan peringkat (jadwal khusus).
export const PATCH = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const body = await req.json().catch(() => ({}));
  const id = parseInt(String(body.user_id), 10);
  if (!Number.isFinite(id)) return fail(400, "user_id tidak valid.");
  const hidden = Boolean(body.hidden);
  const res = await query<{ id: number }>(
    `UPDATE users SET leaderboard_hidden = $1
      WHERE id = $2 AND sppg_id = $3 RETURNING id`,
    [hidden, id, admin.sppg_id],
  );
  if (!res.length) return fail(404, "Pegawai tidak ditemukan.");
  invalidateBoard(admin.sppg_id as number);
  return ok({ user_id: id, hidden });
});

// Tetapkan periode papan peringkat yang ditampilkan ke karyawan.
// Kirim { from, to } (kosongkan keduanya untuk menyembunyikan papan).
export const POST = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const body = await req.json().catch(() => ({}));
  const from = body.from ? String(body.from) : "";
  const to = body.to ? String(body.to) : "";
  const clearing = !from && !to;
  if (!clearing) {
    if (!DATE_RE.test(from) || !DATE_RE.test(to))
      return fail(400, "Tanggal periode tidak valid.");
    if (from > to) return fail(400, "Tanggal mulai melewati tanggal selesai.");
  }
  await query(
    `UPDATE sppg SET leaderboard_from = $1, leaderboard_to = $2 WHERE id = $3`,
    [clearing ? null : from, clearing ? null : to, admin.sppg_id],
  );
  invalidateSppg(admin.sppg_id as number);
  return ok({ from: clearing ? null : from, to: clearing ? null : to });
});
