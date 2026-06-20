import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import { isOvernight } from "@/lib/time";
import type { Divisi, DivisiShift } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function withDerived(d: Divisi): Divisi {
  return { ...d, lintas_hari: isOvernight(d.jam_masuk, d.jam_pulang) };
}

export const GET = route(async () => {
  const admin = await requireAdmin();
  const rows = await query<Divisi>(
    `SELECT d.*, (SELECT COUNT(*)::int FROM users u WHERE u.divisi_id = d.id) AS jumlah_staf
       FROM divisi d WHERE d.sppg_id = $1 ORDER BY d.nama ASC`,
    [admin.sppg_id],
  );
  const shifts = await query<DivisiShift>(
    `SELECT * FROM divisi_shift
      WHERE divisi_id IN (SELECT id FROM divisi WHERE sppg_id = $1)
      ORDER BY divisi_id, urutan, id`,
    [admin.sppg_id],
  );
  const byDiv = new Map<number, DivisiShift[]>();
  for (const s of shifts) {
    const arr = byDiv.get(s.divisi_id) ?? [];
    arr.push({ ...s, lintas_hari: isOvernight(s.jam_masuk, s.jam_pulang) });
    byDiv.set(s.divisi_id, arr);
  }
  return ok({
    divisi: rows.map((d) => withDerived({ ...d, shifts: byDiv.get(d.id) ?? [] })),
  });
});

export const POST = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const b = await req.json().catch(() => ({}));
  const nama = String(b.nama ?? "").trim();
  const jam_masuk = String(b.jam_masuk ?? "").trim();
  const jam_pulang = String(b.jam_pulang ?? "").trim();
  const toleransi_menit = Math.round(Number(b.toleransi_menit ?? 10));
  const aktif = b.aktif === false ? false : true;
  const jobdesk = b.jobdesk != null ? String(b.jobdesk).trim() || null : null;

  if (!nama) return fail(400, "Nama divisi wajib diisi.");
  if (!TIME_RE.test(jam_masuk) || !TIME_RE.test(jam_pulang)) {
    return fail(400, "Format jam harus HH:mm.");
  }
  if (!Number.isFinite(toleransi_menit) || toleransi_menit < 0 || toleransi_menit > 240) {
    return fail(400, "Toleransi tidak valid (0..240 menit).");
  }

  const dup = await query<{ id: number }>(
    `SELECT id FROM divisi WHERE lower(nama) = lower($1) AND sppg_id = $2`,
    [nama, admin.sppg_id],
  );
  if (dup.length) return fail(409, "Nama divisi sudah dipakai.");

  const rows = await query<Divisi>(
    `INSERT INTO divisi (nama, jam_masuk, jam_pulang, toleransi_menit, aktif, jobdesk, sppg_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [nama, jam_masuk, jam_pulang, toleransi_menit, aktif, jobdesk, admin.sppg_id],
  );
  return ok({ divisi: withDerived(rows[0]) }, { status: 201 });
});
