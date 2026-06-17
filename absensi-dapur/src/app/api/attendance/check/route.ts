import { NextRequest } from "next/server";
import { query, withClient } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import { haversineMeters } from "@/lib/geo";
import { localDate, statusMasuk } from "@/lib/time";
import type { Settings, Attendance } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SELFIE_CHARS = 2_000_000; // ~1.5 MB base64

export const POST = route(async (req: NextRequest) => {
  const session = await requireSession();
  const body = await req.json().catch(() => ({}));

  const lat = toNum(body.lat);
  const lng = toNum(body.lng);
  const selfie = typeof body.selfie === "string" ? body.selfie : null;

  const settings = (
    await query<Settings>(`SELECT * FROM settings WHERE id = 1`)
  )[0];
  if (!settings) return fail(500, "Pengaturan dapur belum tersedia.");

  // --- Validasi selfie ---
  if (settings.selfie_wajib) {
    if (!selfie || !selfie.startsWith("data:image")) {
      return fail(400, "Selfie wajib. Aktifkan kamera lalu ambil foto.");
    }
  }
  if (selfie && selfie.length > MAX_SELFIE_CHARS) {
    return fail(413, "Ukuran foto selfie terlalu besar.");
  }

  // --- Validasi geofence ---
  let jarak: number | null = null;
  if (lat !== null && lng !== null) {
    jarak = haversineMeters(settings.lat, settings.lng, lat, lng);
  }
  if (settings.geofence_aktif) {
    if (lat === null || lng === null) {
      return fail(
        400,
        "Lokasi GPS tidak terdeteksi. Izinkan akses lokasi lalu coba lagi.",
      );
    }
    if (jarak !== null && jarak > settings.radius_m) {
      return fail(
        403,
        `Anda berada ${jarak} m dari dapur (maks ${settings.radius_m} m). Absen hanya bisa di lokasi dapur.`,
      );
    }
  }

  const tanggal = localDate(settings.tz);
  const now = new Date();

  const result = await withClient(async (client) => {
    await client.query("BEGIN");
    try {
      const existing = (
        await client.query<Attendance>(
          `SELECT * FROM attendance WHERE user_id = $1 AND tanggal = $2 FOR UPDATE`,
          [session.uid, tanggal],
        )
      ).rows[0];

      // CHECK OUT
      if (existing && existing.check_in && !existing.check_out) {
        const updated = (
          await client.query<Attendance>(
            `UPDATE attendance
               SET check_out = $1, check_out_lat = $2, check_out_lng = $3,
                   check_out_jarak = $4, selfie_out = COALESCE($5, selfie_out)
             WHERE id = $6 RETURNING *`,
            [now.toISOString(), lat, lng, jarak, selfie, existing.id],
          )
        ).rows[0];
        await client.query("COMMIT");
        return { action: "check_out" as const, attendance: updated };
      }

      // ALREADY COMPLETE
      if (existing && existing.check_in && existing.check_out) {
        await client.query("ROLLBACK");
        return { action: "done" as const, attendance: existing };
      }

      // CHECK IN (no row yet, or row without check_in)
      const status = statusMasuk(now, settings.jam_masuk, settings.tz);
      const upserted = (
        await client.query<Attendance>(
          `INSERT INTO attendance
             (user_id, tanggal, check_in, status_masuk, check_in_lat, check_in_lng, check_in_jarak, selfie_in)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (user_id, tanggal) DO UPDATE
             SET check_in = EXCLUDED.check_in,
                 status_masuk = EXCLUDED.status_masuk,
                 check_in_lat = EXCLUDED.check_in_lat,
                 check_in_lng = EXCLUDED.check_in_lng,
                 check_in_jarak = EXCLUDED.check_in_jarak,
                 selfie_in = EXCLUDED.selfie_in
           RETURNING *`,
          [session.uid, tanggal, now.toISOString(), status, lat, lng, jarak, selfie],
        )
      ).rows[0];
      await client.query("COMMIT");
      return { action: "check_in" as const, attendance: upserted };
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    }
  });

  if (result.action === "done") {
    return fail(409, "Anda sudah absen masuk dan pulang hari ini.");
  }

  return ok({
    action: result.action,
    jarak,
    attendance: result.attendance,
  });
});

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
