import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { getSppg } from "@/lib/sppg";
import { ok, route } from "@/lib/api";
import { localDate } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TelatRow {
  nama: string;
  jabatan: string | null;
  check_in: string | null;
}
interface BelumRow {
  nama: string;
  jabatan: string | null;
}

/**
 * Alert absensi hari ini (read-only): daftar nama pegawai yang TELAT dan yang
 * BELUM absen masuk. Definisi "belum" sama dengan kartu dashboard —
 * semua pegawai aktif dapur ini yang belum punya check-in hari ini.
 * Tidak mengubah data/skema apa pun.
 */
export const GET = route(async () => {
  const admin = await requireAdmin();
  const sppg = await getSppg(admin.sppg_id as number);
  const tanggal = localDate(sppg?.tz || "Asia/Jakarta");

  const [telat, belum] = await Promise.all([
    query<TelatRow>(
      `SELECT u.nama, u.jabatan, a.check_in
         FROM attendance a JOIN users u ON u.id = a.user_id
        WHERE COALESCE(a.shift_tanggal, a.tanggal) = $1
          AND a.status_masuk = 'Terlambat'
          AND u.sppg_id = $2
        ORDER BY a.check_in ASC NULLS LAST, u.nama ASC`,
      [tanggal, admin.sppg_id],
    ),
    query<BelumRow>(
      `SELECT u.nama, u.jabatan
         FROM users u
        WHERE u.aktif = TRUE AND u.sppg_id = $2
          AND NOT EXISTS (
            SELECT 1 FROM attendance a
             WHERE a.user_id = u.id
               AND COALESCE(a.shift_tanggal, a.tanggal) = $1
               AND a.check_in IS NOT NULL
          )
        ORDER BY u.nama ASC`,
      [tanggal, admin.sppg_id],
    ),
  ]);

  return ok({ tanggal, telat, belum });
});
