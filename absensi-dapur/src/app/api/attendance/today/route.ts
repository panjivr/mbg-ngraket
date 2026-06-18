import { query } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { ok, route } from "@/lib/api";
import { isOvernight, localDate } from "@/lib/time";
import type { Settings } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ShiftRow {
  divisi_nama: string | null;
  jam_masuk: string | null;
  jam_pulang: string | null;
  toleransi_menit: number | null;
}

interface AbsRow {
  id: number;
  shift_tanggal: string | null;
  tanggal: string | null;
  check_in: string | null;
  check_out: string | null;
  status_masuk: string | null;
  shift_masuk: string | null;
  shift_pulang: string | null;
  check_in_jarak: number | null;
  check_out_jarak: number | null;
}

export const GET = route(async () => {
  const session = await requireSession();
  const settings = (
    await query<Settings>(`SELECT * FROM settings WHERE id = 1`)
  )[0];
  const tz = settings?.tz || "Asia/Jakarta";
  const tanggal = localDate(tz);

  const shiftRow = (
    await query<ShiftRow>(
      `SELECT d.nama AS divisi_nama, d.jam_masuk, d.jam_pulang, d.toleransi_menit
         FROM users u
         LEFT JOIN divisi d ON d.id = u.divisi_id AND d.aktif = TRUE
        WHERE u.id = $1`,
      [session.uid],
    )
  )[0];

  const jam_masuk = shiftRow?.jam_masuk || settings.jam_masuk;
  const jam_pulang = shiftRow?.jam_pulang || settings.jam_pulang;

  // Shift yang sedang terbuka (sudah masuk, belum pulang) — apa pun tanggalnya.
  const current =
    (
      await query<AbsRow>(
        `SELECT id, shift_tanggal, tanggal, check_in, check_out, status_masuk,
                shift_masuk, shift_pulang, check_in_jarak, check_out_jarak
           FROM attendance
          WHERE user_id = $1 AND check_in IS NOT NULL AND check_out IS NULL
          ORDER BY check_in DESC LIMIT 1`,
        [session.uid],
      )
    )[0] ?? null;

  // Shift terakhir (untuk ringkasan, termasuk yang sudah selesai).
  const last =
    (
      await query<AbsRow>(
        `SELECT id, shift_tanggal, tanggal, check_in, check_out, status_masuk,
                shift_masuk, shift_pulang, check_in_jarak, check_out_jarak
           FROM attendance
          WHERE user_id = $1
          ORDER BY check_in DESC NULLS LAST, id DESC LIMIT 1`,
        [session.uid],
      )
    )[0] ?? null;

  return ok({
    current,
    last,
    tanggal,
    shift: {
      divisi_nama: shiftRow?.divisi_nama ?? null,
      jam_masuk,
      jam_pulang,
      toleransi_menit: shiftRow?.toleransi_menit ?? 0,
      lintas_hari: isOvernight(jam_masuk, jam_pulang),
    },
    settings: {
      nama_dapur: settings.nama_dapur,
      alamat: settings.alamat,
      lat: settings.lat,
      lng: settings.lng,
      radius_m: settings.radius_m,
      geofence_aktif: settings.geofence_aktif,
      selfie_wajib: settings.selfie_wajib,
      jam_masuk: settings.jam_masuk,
      jam_pulang: settings.jam_pulang,
      tz: settings.tz,
    },
  });
});
