import { query } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getSppg } from "@/lib/sppg";
import { ok, route } from "@/lib/api";
import { localDate } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface MeRow {
  check_in: string | null;
  check_out: string | null;
}
interface TemanRow {
  masuk: number;
  pulang: number;
  jam_masuk_terakhir: string | null;
  jam_pulang_terakhir: string | null;
}

/**
 * Pengingat absen personal (read-only) untuk pegawai yang sedang login:
 * - belumMasuk : pegawai ini belum check-in padahal ada rekan yang sudah masuk.
 * - belumPulang: pegawai ini sudah masuk tapi belum check-out padahal ada rekan
 *   di dapur yang sama sudah absen pulang hari ini.
 * Tidak mengubah data/skema apa pun.
 */
export const GET = route(async () => {
  const s = await requireSession();
  const sppg = await getSppg(s.sppg_id as number);
  const tanggal = localDate(sppg?.tz || "Asia/Jakarta");

  const [meRows, temanRows] = await Promise.all([
    query<MeRow>(
      `SELECT a.check_in, a.check_out
         FROM attendance a
        WHERE a.user_id = $1
          AND COALESCE(a.shift_tanggal, a.tanggal) = $2
        LIMIT 1`,
      [s.uid, tanggal],
    ),
    query<TemanRow>(
      `SELECT
          COUNT(*) FILTER (WHERE a.check_in IS NOT NULL)::int  AS masuk,
          COUNT(*) FILTER (WHERE a.check_out IS NOT NULL)::int AS pulang,
          MAX(a.check_in)  FILTER (WHERE a.check_in IS NOT NULL)  AS jam_masuk_terakhir,
          MAX(a.check_out) FILTER (WHERE a.check_out IS NOT NULL) AS jam_pulang_terakhir
         FROM attendance a
         JOIN users u ON u.id = a.user_id
        WHERE u.sppg_id = $1
          AND a.user_id <> $2
          AND COALESCE(a.shift_tanggal, a.tanggal) = $3`,
      [s.sppg_id, s.uid, tanggal],
    ),
  ]);

  const me = meRows[0];
  const teman = temanRows[0] || {
    masuk: 0,
    pulang: 0,
    jam_masuk_terakhir: null,
    jam_pulang_terakhir: null,
  };

  const sudahMasuk = !!me?.check_in;
  const sudahPulang = !!me?.check_out;

  const belumMasuk = !sudahMasuk && teman.masuk > 0;
  const belumPulang = sudahMasuk && !sudahPulang && teman.pulang > 0;

  return ok({
    tanggal,
    belumMasuk,
    belumPulang,
    jamTemanMasuk: belumMasuk ? teman.jam_masuk_terakhir : null,
    jamTemanPulang: belumPulang ? teman.jam_pulang_terakhir : null,
  });
});
