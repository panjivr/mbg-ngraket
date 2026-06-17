import { query } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { ok, route } from "@/lib/api";
import { localDate } from "@/lib/time";
import type { Settings } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TodayRow {
  id: number;
  tanggal: string;
  check_in: string | null;
  check_out: string | null;
  status_masuk: string | null;
  check_in_jarak: number | null;
  check_out_jarak: number | null;
}

export const GET = route(async () => {
  const session = await requireSession();
  const settings = (
    await query<Settings>(`SELECT * FROM settings WHERE id = 1`)
  )[0];
  const tanggal = localDate(settings?.tz || "Asia/Jakarta");

  const today =
    (
      await query<TodayRow>(
        `SELECT id, tanggal, check_in, check_out, status_masuk,
                check_in_jarak, check_out_jarak
           FROM attendance WHERE user_id = $1 AND tanggal = $2`,
        [session.uid, tanggal],
      )
    )[0] ?? null;

  return ok({
    today,
    tanggal,
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
