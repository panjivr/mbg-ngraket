import { NextRequest } from "next/server";
import { requireHr } from "@/lib/session";
import { getSppg } from "@/lib/sppg";
import { query } from "@/lib/db";
import { ok, fail, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/**
 * Tanda tangan elektronik slip oleh ADMIN HR. Aksi:
 *  - 'sahkan' / 'batal-sah'   : tanda tangan penyetuju HR (mode 'dua').
 *  - 'terima' / 'batal-terima': HR menandai "diterima" mewakili penerima
 *    (mode 'satu'/'terima'); waktunya bisa diatur via `at` (datetime-local),
 *    ditafsirkan pada zona waktu dapur.
 */
export const POST = route(async (req: NextRequest) => {
  const hr = await requireHr();
  const b = await req.json().catch(() => ({}));
  const userId = parseInt(String(b.user ?? ""), 10);
  const from = String(b.from ?? "");
  const to = String(b.to ?? "");
  const action = String(b.action ?? "sahkan");
  const at = String(b.at ?? "");
  if (!Number.isFinite(userId)) return fail(400, "Pegawai tidak valid.");
  if (!DATE_RE.test(from) || !DATE_RE.test(to) || from > to) {
    return fail(400, "Periode slip tidak valid.");
  }
  if (at && !DT_RE.test(at)) return fail(400, "Format waktu tidak valid.");

  const emp = await query<{ id: number }>(
    `SELECT id FROM users WHERE id = $1 AND sppg_id = $2`,
    [userId, hr.sppg_id],
  );
  if (!emp.length) return fail(404, "Pegawai tidak ditemukan.");

  const key = [userId, from, to] as const;

  if (action === "batal-sah") {
    await query(
      `UPDATE slip_konfirmasi SET hr_signed_at = NULL, hr_signed_by = NULL, hr_signed_nama = NULL
        WHERE user_id = $1 AND periode_from = $2 AND periode_to = $3`,
      [...key],
    );
    return ok({ ok: true });
  }
  if (action === "batal-terima") {
    await query(
      `UPDATE slip_konfirmasi SET confirmed_at = NULL
        WHERE user_id = $1 AND periode_from = $2 AND periode_to = $3`,
      [...key],
    );
    return ok({ ok: true });
  }
  if (action === "terima") {
    // Waktu dari HR ditafsirkan sebagai jam dinding zona dapur.
    const sppg = await getSppg(hr.sppg_id as number);
    const tz = sppg?.tz || "Asia/Jakarta";
    if (at) {
      await query(
        `INSERT INTO slip_konfirmasi (user_id, periode_from, periode_to, confirmed_at)
         VALUES ($1, $2, $3, ($4 || ':00')::timestamp AT TIME ZONE $5)
         ON CONFLICT (user_id, periode_from, periode_to)
         DO UPDATE SET confirmed_at = ($4 || ':00')::timestamp AT TIME ZONE $5`,
        [...key, at, tz],
      );
    } else {
      await query(
        `INSERT INTO slip_konfirmasi (user_id, periode_from, periode_to, confirmed_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (user_id, periode_from, periode_to)
         DO UPDATE SET confirmed_at = now()`,
        [...key],
      );
    }
    return ok({ ok: true });
  }

  // action 'sahkan' (default): tanda tangan penyetuju HR.
  await query(
    `INSERT INTO slip_konfirmasi (user_id, periode_from, periode_to, hr_signed_at, hr_signed_by, hr_signed_nama)
     VALUES ($1, $2, $3, now(), $4, $5)
     ON CONFLICT (user_id, periode_from, periode_to)
     DO UPDATE SET hr_signed_at = now(), hr_signed_by = EXCLUDED.hr_signed_by, hr_signed_nama = EXCLUDED.hr_signed_nama`,
    [...key, hr.uid, hr.nama],
  );
  return ok({ ok: true });
});
