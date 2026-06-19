import { withClient } from "@/lib/db";
import { requireSession, HttpError } from "@/lib/session";
import { ok, route } from "@/lib/api";
import type { Attendance } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Batas waktu pembatalan absen terakhir (menit). Cukup longgar agar staf
 * (mis. lansia) sempat sadar salah pencet, tetapi tetap mencegah perubahan
 * catatan lama.
 */
const CANCEL_WINDOW_MIN = 180;

/**
 * Batalkan absen TERAKHIR milik pengguna:
 *  - Bila ada shift terbuka (baru absen masuk) -> hapus shift itu (batal masuk).
 *  - Bila shift terakhir sudah ditutup (baru absen pulang) -> buka kembali
 *    (batal pulang), sehingga pengguna dianggap masih bekerja.
 * Hanya berlaku untuk aksi yang baru saja dilakukan (dalam jendela waktu).
 */
export const POST = route(async () => {
  const session = await requireSession();
  const windowMs = CANCEL_WINDOW_MIN * 60_000;
  const now = Date.now();

  const result = await withClient(async (client) => {
    await client.query("BEGIN");
    try {
      await client.query("SELECT pg_advisory_xact_lock(7263012, $1)", [session.uid]);

      // 1) Shift yang masih terbuka -> batal absen masuk (hapus baris).
      const open = (
        await client.query<Attendance>(
          `SELECT * FROM attendance
            WHERE user_id = $1 AND check_in IS NOT NULL AND check_out IS NULL
            ORDER BY check_in DESC LIMIT 1 FOR UPDATE`,
          [session.uid],
        )
      ).rows[0];

      if (open) {
        const t = open.check_in ? new Date(open.check_in).getTime() : 0;
        if (now - t > windowMs) {
          throw new HttpError(
            400,
            "Absen masuk sudah terlalu lama untuk dibatalkan. Hubungi admin.",
          );
        }
        await client.query(`DELETE FROM attendance WHERE id = $1`, [open.id]);
        await client.query("COMMIT");
        return { action: "cancel_check_in" as const, attendance: null };
      }

      // 2) Tidak ada shift terbuka -> batal absen pulang (buka kembali shift terakhir).
      const last = (
        await client.query<Attendance>(
          `SELECT * FROM attendance
            WHERE user_id = $1 AND check_out IS NOT NULL
            ORDER BY check_out DESC LIMIT 1 FOR UPDATE`,
          [session.uid],
        )
      ).rows[0];

      if (!last) {
        throw new HttpError(400, "Tidak ada absen yang bisa dibatalkan.");
      }
      const t = last.check_out ? new Date(last.check_out).getTime() : 0;
      if (now - t > windowMs) {
        throw new HttpError(
          400,
          "Absen pulang sudah terlalu lama untuk dibatalkan. Hubungi admin.",
        );
      }

      const reopened = (
        await client.query<Attendance>(
          `UPDATE attendance
             SET check_out = NULL, check_out_lat = NULL, check_out_lng = NULL,
                 check_out_jarak = NULL, selfie_out = NULL
           WHERE id = $1 RETURNING *`,
          [last.id],
        )
      ).rows[0];
      await client.query("COMMIT");
      return { action: "cancel_check_out" as const, attendance: reopened };
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    }
  });

  return ok(result);
});
