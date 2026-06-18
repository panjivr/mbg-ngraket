import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import { isOvernight } from "@/lib/time";
import type { Divisi } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function withDerived(d: Divisi): Divisi {
  return { ...d, lintas_hari: isOvernight(d.jam_masuk, d.jam_pulang) };
}

export const GET = route(async () => {
  await requireAdmin();
  const rows = await query<Divisi>(
    `SELECT d.*, (SELECT COUNT(*)::int FROM users u WHERE u.divisi_id = d.id) AS jumlah_staf
       FROM divisi d ORDER BY d.nama ASC`,
  );
  return ok({ divisi: rows.map(withDerived) });
});

export const POST = route(async (req: NextRequest) => {
  await requireAdmin();
  const b = await req.json().catch(() => ({}));
  const nama = String(b.nama ?? "").trim();
  const jam_masuk = String(b.jam_masuk ?? "").trim();
  const jam_pulang = String(b.jam_pulang ?? "").trim();
  const toleransi_menit = Math.round(Number(b.toleransi_menit ?? 10));
  const aktif = b.aktif === false ? false : true;

  if (!nama) return fail(400, "Nama divisi wajib diisi.");
  if (!TIME_RE.test(jam_masuk) || !TIME_RE.test(jam_pulang)) {
    return fail(400, "Format jam harus HH:mm.");
  }
  if (!Number.isFinite(toleransi_menit) || toleransi_menit < 0 || toleransi_menit > 240) {
    return fail(400, "Toleransi tidak valid (0..240 menit).");
  }

  const dup = await query<{ id: number }>(
    `SELECT id FROM divisi WHERE lower(nama) = lower($1)`,
    [nama],
  );
  if (dup.length) return fail(409, "Nama divisi sudah dipakai.");

  const rows = await query<Divisi>(
    `INSERT INTO divisi (nama, jam_masuk, jam_pulang, toleransi_menit, aktif)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [nama, jam_masuk, jam_pulang, toleransi_menit, aktif],
  );
  return ok({ divisi: withDerived(rows[0]) }, { status: 201 });
});
