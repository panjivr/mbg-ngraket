import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import { APRESIASI_KATEGORI } from "@/lib/people-culture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET — daftar rekan + apresiasi yang saya terima & saya berikan (terbaru).
export const GET = route(async () => {
  const me = await requireSession();
  const rekan = await query<{ id: number; nama: string; divisi_nama: string | null }>(
    `SELECT u.id, u.nama, d.nama AS divisi_nama FROM users u LEFT JOIN divisi d ON d.id=u.divisi_id
      WHERE u.sppg_id=$1 AND u.aktif=TRUE AND u.id<>$2 ORDER BY u.nama ASC`,
    [me.sppg_id, me.uid],
  );
  const diterima = await query<{ kategori: string; catatan: string; created_at: string }>(
    `SELECT kategori, catatan, created_at FROM pc_recognition WHERE sppg_id=$1 AND ke_id=$2 ORDER BY created_at DESC LIMIT 20`,
    [me.sppg_id, me.uid],
  );
  return ok({ rekan, diterima, kategori: APRESIASI_KATEGORI });
});

// POST — beri apresiasi. body {ke_id, kategori, catatan}
export const POST = route(async (req: NextRequest) => {
  const me = await requireSession();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const ke_id = parseInt(String(b.ke_id), 10);
  const kategori = String(b.kategori ?? "").trim().slice(0, 60);
  if (!Number.isFinite(ke_id) || ke_id === me.uid) return fail(400, "Pilih rekan yang valid.");
  if (!APRESIASI_KATEGORI.includes(kategori)) return fail(400, "Kategori tidak valid.");
  const target = (await query<{ id: number }>(`SELECT id FROM users WHERE id=$1 AND sppg_id=$2 AND aktif=TRUE`, [ke_id, me.sppg_id]))[0];
  if (!target) return fail(404, "Rekan tidak ditemukan.");
  const catatan = String(b.catatan ?? "").trim().slice(0, 300);
  await query(`INSERT INTO pc_recognition (sppg_id, dari_id, ke_id, kategori, catatan) VALUES ($1,$2,$3,$4,$5)`,
    [me.sppg_id, me.uid, ke_id, kategori, catatan]);
  return ok({ saved: true });
});
