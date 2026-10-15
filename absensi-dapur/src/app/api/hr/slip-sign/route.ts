import { NextRequest } from "next/server";
import { requireHr } from "@/lib/session";
import { query } from "@/lib/db";
import { ok, fail, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Admin HR menandatangani (mengesahkan) slip seorang karyawan untuk periode
 * tertentu. Menyimpan nama & waktu HR sebagai tanda tangan elektronik di sisi
 * penyetuju — terpisah dari konfirmasi "diterima" oleh karyawan.
 */
export const POST = route(async (req: NextRequest) => {
  const hr = await requireHr();
  const b = await req.json().catch(() => ({}));
  const userId = parseInt(String(b.user ?? ""), 10);
  const from = String(b.from ?? "");
  const to = String(b.to ?? "");
  if (!Number.isFinite(userId)) return fail(400, "Pegawai tidak valid.");
  if (!DATE_RE.test(from) || !DATE_RE.test(to) || from > to) {
    return fail(400, "Periode slip tidak valid.");
  }
  // Pastikan pegawai milik dapur HR ini.
  const emp = await query<{ id: number }>(
    `SELECT id FROM users WHERE id = $1 AND sppg_id = $2`,
    [userId, hr.sppg_id],
  );
  if (!emp.length) return fail(404, "Pegawai tidak ditemukan.");

  // Toggle: bila sudah ditandatangani, batalkan (supaya bisa dikoreksi).
  const unsign = b.unsign === true;
  if (unsign) {
    await query(
      `UPDATE slip_konfirmasi SET hr_signed_at = NULL, hr_signed_by = NULL, hr_signed_nama = NULL
        WHERE user_id = $1 AND periode_from = $2 AND periode_to = $3`,
      [userId, from, to],
    );
    return ok({ signed: false });
  }

  await query(
    `INSERT INTO slip_konfirmasi (user_id, periode_from, periode_to, hr_signed_at, hr_signed_by, hr_signed_nama)
     VALUES ($1, $2, $3, now(), $4, $5)
     ON CONFLICT (user_id, periode_from, periode_to)
     DO UPDATE SET hr_signed_at = now(), hr_signed_by = EXCLUDED.hr_signed_by, hr_signed_nama = EXCLUDED.hr_signed_nama`,
    [userId, from, to, hr.uid, hr.nama],
  );
  return ok({ signed: true });
});
