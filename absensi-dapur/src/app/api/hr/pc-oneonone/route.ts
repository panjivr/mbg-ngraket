import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireHr } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// GET ?user=ID — catatan 1-on-1 seorang karyawan (akses khusus HR).
// Tanpa ?user → daftar pegawai + ringkas jumlah catatan.
export const GET = route(async (req: NextRequest) => {
  const hr = await requireHr();
  const uid = parseInt(req.nextUrl.searchParams.get("user") || "", 10);
  if (Number.isFinite(uid)) {
    const catatan = await query<{ id: number; tanggal: string; catatan: string; tindak_lanjut: string; oleh: string }>(
      `SELECT id, tanggal::text AS tanggal, catatan, tindak_lanjut, oleh FROM pc_oneonone WHERE sppg_id=$1 AND user_id=$2 ORDER BY tanggal DESC`,
      [hr.sppg_id, uid],
    );
    return ok({ catatan });
  }
  const pegawai = await query<{ id: number; nama: string; divisi_nama: string | null; jml: number }>(
    `SELECT u.id, u.nama, d.nama AS divisi_nama,
            (SELECT count(*) FROM pc_oneonone o WHERE o.user_id=u.id AND o.sppg_id=$1)::int AS jml
       FROM users u LEFT JOIN divisi d ON d.id=u.divisi_id
      WHERE u.sppg_id=$1 AND u.aktif=TRUE ORDER BY d.nama ASC NULLS LAST, u.nama ASC`,
    [hr.sppg_id],
  );
  return ok({ pegawai });
});

// POST — tambah catatan 1-on-1. body {user_id, tanggal, catatan, tindak_lanjut}
export const POST = route(async (req: NextRequest) => {
  const hr = await requireHr();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const user_id = parseInt(String(b.user_id), 10);
  if (!Number.isFinite(user_id)) return fail(400, "Karyawan tidak valid.");
  const own = (await query<{ id: number }>(`SELECT id FROM users WHERE id=$1 AND sppg_id=$2`, [user_id, hr.sppg_id]))[0];
  if (!own) return fail(404, "Karyawan tidak ditemukan.");
  const tanggal = DATE_RE.test(String(b.tanggal)) ? String(b.tanggal) : new Date().toISOString().slice(0, 10);
  const catatan = String(b.catatan ?? "").trim().slice(0, 3000);
  if (!catatan) return fail(400, "Catatan wajib diisi.");
  await query(`INSERT INTO pc_oneonone (sppg_id, user_id, tanggal, catatan, tindak_lanjut, oleh) VALUES ($1,$2,$3,$4,$5,$6)`,
    [hr.sppg_id, user_id, tanggal, catatan, String(b.tindak_lanjut ?? "").trim().slice(0, 1000), hr.nama]);
  return ok({ saved: true });
});

export const DELETE = route(async (req: NextRequest) => {
  const hr = await requireHr();
  const id = parseInt(req.nextUrl.searchParams.get("id") || "", 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");
  await query(`DELETE FROM pc_oneonone WHERE id=$1 AND sppg_id=$2`, [id, hr.sppg_id]);
  return ok({ deleted: id });
});
