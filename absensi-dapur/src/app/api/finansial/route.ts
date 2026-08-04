import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Penyimpanan laporan keuangan pribadi karyawan (privat per akun).
 * Data disimpan di kolom JSONB `finansial_pribadi.data`, satu baris per user.
 * Sinkron lintas perangkat saat login. TIDAK ditampilkan di panel admin.
 */

// Batas ukuran payload agar tidak ada penyalahgunaan (angka keuangan kecil).
const MAX_BYTES = 20_000;

// Ambil data keuangan milik sendiri.
export const GET = route(async () => {
  const s = await requireSession();
  const rows = await query<{ data: Record<string, unknown> }>(
    `SELECT data FROM finansial_pribadi WHERE user_id = $1`,
    [s.uid],
  );
  return ok({ data: rows[0]?.data ?? null });
});

// Simpan / perbarui data keuangan milik sendiri (upsert).
export const PUT = route(async (req: NextRequest) => {
  const s = await requireSession();
  const body = await req.json().catch(() => null);
  const data = body?.data;

  if (data == null || typeof data !== "object" || Array.isArray(data))
    return fail(400, "Data tidak valid.");
  if (JSON.stringify(data).length > MAX_BYTES)
    return fail(400, "Data terlalu besar.");

  await query(
    `INSERT INTO finansial_pribadi (user_id, data, updated_at)
     VALUES ($1, $2::jsonb, now())
     ON CONFLICT (user_id)
       DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
    [s.uid, JSON.stringify(data)],
  );
  return ok({ saved: true });
});
