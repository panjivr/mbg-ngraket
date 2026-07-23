import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

interface Pegawai {
  id: number;
  nama: string;
  divisi_nama: string | null;
}
export interface JadwalRow {
  user_id: number;
  tanggal: string;
  jam_masuk: string | null;
  jam_pulang: string | null;
  keterangan: string | null;
  libur: boolean;
}

// Daftar pegawai + jadwal pada rentang tanggal.
export const GET = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const sp = req.nextUrl.searchParams;
  const from = sp.get("from") || "";
  const to = sp.get("to") || "";
  if (!DATE_RE.test(from) || !DATE_RE.test(to))
    return fail(400, "Rentang tanggal tidak valid.");

  const [pegawai, jadwal] = await Promise.all([
    query<Pegawai>(
      `SELECT u.id, u.nama, d.nama AS divisi_nama
         FROM users u LEFT JOIN divisi d ON d.id = u.divisi_id
        WHERE u.sppg_id = $1 AND u.aktif = TRUE
        ORDER BY d.nama ASC NULLS LAST, u.nama ASC`,
      [admin.sppg_id],
    ),
    query<JadwalRow>(
      `SELECT user_id, tanggal, jam_masuk, jam_pulang, keterangan, libur
         FROM jadwal_kerja WHERE sppg_id = $1 AND tanggal BETWEEN $2 AND $3`,
      [admin.sppg_id, from, to],
    ),
  ]);
  return ok({ pegawai, jadwal });
});

// Upsert satu sel jadwal. Bila kosong & tidak libur → hapus.
export const POST = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const b = await req.json().catch(() => ({}));
  const user_id = parseInt(String(b.user_id), 10);
  const tanggal = String(b.tanggal ?? "");
  if (!Number.isFinite(user_id) || !DATE_RE.test(tanggal))
    return fail(400, "Data tidak valid.");

  const libur = Boolean(b.libur);
  const jam_masuk = b.jam_masuk && TIME_RE.test(b.jam_masuk) ? b.jam_masuk : null;
  const jam_pulang = b.jam_pulang && TIME_RE.test(b.jam_pulang) ? b.jam_pulang : null;
  const keterangan = b.keterangan ? String(b.keterangan).trim() : null;

  // Pastikan pegawai milik dapur ini.
  const milik = await query<{ id: number }>(
    `SELECT id FROM users WHERE id = $1 AND sppg_id = $2`,
    [user_id, admin.sppg_id],
  );
  if (!milik.length) return fail(404, "Pegawai tidak ditemukan.");

  if (!libur && !jam_masuk && !jam_pulang && !keterangan) {
    await query(`DELETE FROM jadwal_kerja WHERE user_id = $1 AND tanggal = $2`, [user_id, tanggal]);
    return ok({ deleted: true });
  }

  await query(
    `INSERT INTO jadwal_kerja (sppg_id, user_id, tanggal, jam_masuk, jam_pulang, keterangan, libur)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (user_id, tanggal) DO UPDATE
       SET jam_masuk = EXCLUDED.jam_masuk, jam_pulang = EXCLUDED.jam_pulang,
           keterangan = EXCLUDED.keterangan, libur = EXCLUDED.libur, sppg_id = EXCLUDED.sppg_id`,
    [admin.sppg_id, user_id, tanggal, jam_masuk, jam_pulang, keterangan, libur],
  );
  return ok({ user_id, tanggal });
});
