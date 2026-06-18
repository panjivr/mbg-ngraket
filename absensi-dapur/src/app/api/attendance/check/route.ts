import { NextRequest } from "next/server";
import { query, withClient } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import { haversineMeters } from "@/lib/geo";
import { localDate, shiftDate, statusMasukShift } from "@/lib/time";
import type { Settings, Attendance } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SELFIE_CHARS = 2_000_000; // ~1.5 MB base64

interface ShiftRow {
  divisi_id: number | null;
  jam_masuk: string | null;
  jam_pulang: string | null;
  toleransi_menit: number | null;
}

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

  // Jadwal shift efektif: dari divisi pegawai bila ada, jika tidak pakai
  // jam global pada pengaturan.
  const shift = (
    await query<ShiftRow>(
      `SELECT d.id AS divisi_id, d.jam_masuk, d.jam_pulang, d.toleransi_menit
         FROM users u
         LEFT JOIN divisi d ON d.id = u.divisi_id AND d.aktif = TRUE
        WHERE u.id = $1`,
      [session.uid],
    )
  )[0];

  const jamMasuk = shift?.jam_masuk || settings.jam_masuk;
  const jamPulang = shift?.jam_pulang || settings.jam_pulang;
  const toleransi = shift?.toleransi_menit ?? 0;
  const divisiId = shift?.divisi_id ?? null;

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

  const now = new Date();

  const result = await withClient(async (client) => {
    await client.query("BEGIN");
    try {
      // Kunci per-pengguna agar dua ketukan beruntun tidak membuat shift ganda.
      await client.query("SELECT pg_advisory_xact_lock(7263012, $1)", [
        session.uid,
      ]);

      // Cari shift yang masih TERBUKA (sudah masuk, belum pulang) — apa pun
      // tanggalnya. Inilah inti dukungan shift lintas hari.
      const open = (
        await client.query<Attendance>(
          `SELECT * FROM attendance
            WHERE user_id = $1 AND check_in IS NOT NULL AND check_out IS NULL
            ORDER BY check_in DESC
            LIMIT 1
            FOR UPDATE`,
          [session.uid],
        )
      ).rows[0];

      // CHECK OUT — tutup shift yang terbuka.
      if (open) {
        const updated = (
          await client.query<Attendance>(
            `UPDATE attendance
               SET check_out = $1, check_out_lat = $2, check_out_lng = $3,
                   check_out_jarak = $4, selfie_out = COALESCE($5, selfie_out)
             WHERE id = $6 RETURNING *`,
            [now.toISOString(), lat, lng, jarak, selfie, open.id],
          )
        ).rows[0];
        await client.query("COMMIT");
        return { action: "check_out" as const, attendance: updated };
      }

      // CHECK IN — mulai shift baru.
      const status = statusMasukShift(now, jamMasuk, jamPulang, settings.tz, toleransi);
      const shiftTgl = shiftDate(now, jamMasuk, jamPulang, settings.tz);
      const tanggal = localDate(settings.tz, now);

      const inserted = (
        await client.query<Attendance>(
          `INSERT INTO attendance
             (user_id, tanggal, shift_tanggal, divisi_id, shift_masuk, shift_pulang,
              check_in, status_masuk, check_in_lat, check_in_lng, check_in_jarak, selfie_in)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           RETURNING *`,
          [
            session.uid,
            tanggal,
            shiftTgl,
            divisiId,
            jamMasuk,
            jamPulang,
            now.toISOString(),
            status,
            lat,
            lng,
            jarak,
            selfie,
          ],
        )
      ).rows[0];
      await client.query("COMMIT");
      return { action: "check_in" as const, attendance: inserted };
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    }
  });

  return ok({ action: result.action, jarak, attendance: result.attendance });
});

function toNum(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
