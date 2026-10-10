import { NextRequest } from "next/server";
import { query, withClient } from "@/lib/db";
import { requireSession, HttpError } from "@/lib/session";
import { validImage, validCoordinates, validCapture } from "@/lib/employee-validation";
import { getSppg } from "@/lib/sppg";
import { ok, fail, route } from "@/lib/api";
import { haversineMeters } from "@/lib/geo";
import { localDate, shiftDate, statusMasukShift } from "@/lib/time";
import { MOOD_KEYS } from "@/lib/mood";
import type { Attendance } from "@/lib/types";
import { attendanceEvent, workSchedule } from "@/lib/attendance-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SELFIE_CHARS = 2_000_000; // ~1.5 MB base64

// Ekspresi wajah valid dari face-api (selaras dengan MoodAI.tsx).
const EMOSI_KEYS = [
  "happy",
  "sad",
  "angry",
  "fearful",
  "disgusted",
  "surprised",
  "neutral",
];

interface ShiftRow {
  divisi_id: number | null;
  jam_masuk: string | null;
  jam_pulang: string | null;
  toleransi_menit: number | null;
}

export const POST = route(async (req: NextRequest) => {
  const session = await requireSession();
  const body = await req.json().catch(() => ({}));
  if (!body || typeof body!=="object" || Array.isArray(body)) return fail(400,"Permintaan tidak valid.");
  const mobile = req.headers.has("authorization");
  const requestId = typeof body.request_id === "string" ? body.request_id : null;
  if (body.action != null && !["check_in","check_out"].includes(body.action)) return fail(400,"Action tidak valid.");
  if (body.shift_id != null && (typeof body.shift_id !== "number" || !Number.isSafeInteger(body.shift_id) || body.shift_id<1))
    return fail(400,"ID shift tidak valid.");
  if (mobile && (!requestId || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)
      || !["check_in","check_out"].includes(body.action))) return fail(400, "Action dan request_id wajib valid.");
  if (mobile) {
    const prior = (await query<{result:unknown}>("SELECT result FROM attendance_requests WHERE user_id=$1 AND request_id=$2", [session.uid,requestId]))[0];
    if (prior) return ok(prior.result);
  }
  if ((body.lat != null || body.lng != null) && !validCoordinates(body.lat, body.lng)) return fail(400, "Koordinat GPS tidak valid.");
  if (mobile && (body.mocked !== false || !validCapture(body.captured_at)
      || typeof body.accuracy !== "number" || !Number.isFinite(body.accuracy) || body.accuracy < 0 || body.accuracy > 100))
    return fail(400, "Gunakan lokasi GPS asli, akurasi maksimal 100 m, dan foto/lokasi baru.");

  const lat = toNum(body.lat);
  const lng = toNum(body.lng);
  const selfie = typeof body.selfie === "string" ? body.selfie : null;
  if (selfie && !validImage(selfie)) return fail(400, "Selfie harus JPEG/PNG valid, maksimal 1,5 MB.");
  // Suasana hati (opsional) — hanya dicatat saat check-in & harus dari daftar.
  const mood =
    typeof body.mood === "string" && MOOD_KEYS.includes(body.mood)
      ? body.mood
      : null;
  // Hasil deteksi emosi wajah AI (opsional, dari perangkat). `emosi` = ekspresi
  // dominan, `bahagia` = probabilitas 0..1. Disimpan untuk grafik emosi.
  const emosi =
    typeof body.emosi === "string" && EMOSI_KEYS.includes(body.emosi)
      ? body.emosi
      : null;
  const bahagiaRaw = toNum(body.bahagia);
  const bahagia =
    bahagiaRaw === null ? null : Math.max(0, Math.min(1, bahagiaRaw));

  const settings = await getSppg(session.sppg_id as number);
  if (!settings) return fail(500, "Pengaturan dapur belum tersedia.");

  // Jadwal shift efektif: dari divisi pegawai bila ada, jika tidak pakai
  // jam global pada pengaturan.
  const shift = (
    await query<ShiftRow>(
      `SELECT d.id AS divisi_id, d.jam_masuk, d.jam_pulang, d.toleransi_menit
         FROM users u
         LEFT JOIN divisi d ON d.id = u.divisi_id AND d.aktif = TRUE AND d.sppg_id = u.sppg_id
        WHERE u.id = $1`,
      [session.uid],
    )
  )[0];

  let jamMasuk = shift?.jam_masuk || settings.jam_masuk;
  let jamPulang = shift?.jam_pulang || settings.jam_pulang;
  let toleransi = shift?.toleransi_menit ?? 0;
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

  const now = new Date();

  // --- Jadwal efektif: Event > Jadwal tanggal > Sub-shift > Divisi > Global ---
  let divisiShiftId: number | null = null;
  let eventId: number | null = null;
  const ev = await attendanceEvent(session.uid,session.sppg_id!,settings.tz,now);
  const schedule = await workSchedule(session.uid,settings.tz,now);
  if (ev) {
    jamMasuk = ev.jam_masuk;
    jamPulang = ev.jam_pulang;
    toleransi = ev.toleransi_menit;
    eventId = ev.id;
  } else {
    const shiftIdReq = toNum(body.shift_id);
    if (shiftIdReq !== null && !divisiId) return fail(400,"Tidak ada sub-shift untuk divisi Anda.");
    if (shiftIdReq !== null && divisiId) {
      const sh = (
        await query<{
          id: number;
          jam_masuk: string;
          jam_pulang: string;
          toleransi_menit: number;
        }>(
          `SELECT id, jam_masuk, jam_pulang, toleransi_menit FROM divisi_shift
            WHERE id = $1 AND divisi_id = $2`,
          [shiftIdReq, divisiId],
        )
      )[0];
      if (!sh) return fail(400, "Shift tidak sesuai divisi Anda.");
      if (sh) {
        jamMasuk = sh.jam_masuk;
        jamPulang = sh.jam_pulang;
        toleransi = sh.toleransi_menit;
        divisiShiftId = sh.id;
      }
    }
  }
  if (!ev && schedule && !schedule.libur) {
    jamMasuk=schedule.jam_masuk || jamMasuk;
    jamPulang=schedule.jam_pulang || jamPulang;
    divisiShiftId=null;
  }

  // --- Titik absen: dapur (default) atau titik GPS event (bila event punya
  // koordinat dan pegawai memilih absen di lokasi event). Penjaga dapur
  // cukup memilih "dapur" — geofence tetap divalidasi ke titik dapur.
  const pilihEvent =
    body.titik === "event" && !!ev && ev.lat !== null && ev.lng !== null;
  if (body.titik === "event" && !pilihEvent) return fail(400,"Lokasi event tidak tersedia untuk Anda.");
  const target = pilihEvent
    ? {
        lat: ev!.lat as number,
        lng: ev!.lng as number,
        radius_m: ev!.radius_m ?? settings.radius_m,
        nama: ev!.nama,
      }
    : {
        lat: settings.lat,
        lng: settings.lng,
        radius_m: settings.radius_m,
        nama: settings.nama || "Dapur",
      };

  // --- Validasi geofence terhadap titik terpilih ---
  let jarak: number | null = null;
  if (lat !== null && lng !== null) {
    jarak = haversineMeters(target.lat, target.lng, lat, lng);
  }
  if (settings.geofence_aktif) {
    if (lat === null || lng === null) {
      return fail(
        400,
        "Lokasi GPS tidak terdeteksi. Izinkan akses lokasi lalu coba lagi.",
      );
    }
    if (jarak !== null && jarak > target.radius_m) {
      return fail(
        403,
        `Anda berada ${jarak} m dari titik "${target.nama}" (maks ${target.radius_m} m). Absen hanya bisa di lokasi tersebut.`,
      );
    }
  }

  const result = await withClient(async (client) => {
    await client.query("BEGIN");
    try {
      // Kunci per-pengguna agar dua ketukan beruntun tidak membuat shift ganda.
      await client.query("SELECT pg_advisory_xact_lock(7263012, $1)", [
        session.uid,
      ]);
      if (mobile) {
        const prior = (await client.query<{result: {action:"check_in"|"check_out"; attendance:Attendance}}>(
          "SELECT result FROM attendance_requests WHERE user_id=$1 AND request_id=$2", [session.uid, requestId])).rows[0];
        if (prior) { await client.query("COMMIT"); return prior.result; }
      }
      const save = async (action: "check_in" | "check_out", attendance: Attendance) => {
        const result = {action, attendance};
        if (mobile) await client.query("INSERT INTO attendance_requests(user_id,request_id,result) VALUES($1,$2,$3)",
          [session.uid, requestId, JSON.stringify(result)]);
        await client.query("COMMIT");
        return result;
      };

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
      if (body.action === "check_in" && open) throw new HttpError(409, "Shift masih terbuka. Muat ulang status.");
      if (body.action === "check_out" && !open) throw new HttpError(409, "Tidak ada shift terbuka. Muat ulang status.");
      if (!open && !ev && schedule?.libur) throw new HttpError(403, "Hari ini dijadwalkan libur. Hubungi admin untuk perubahan jadwal.");

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
        return await save("check_out", updated);
      }

      // CHECK IN — mulai shift baru.
      const status = statusMasukShift(now, jamMasuk, jamPulang, settings.tz, toleransi);
      const shiftTgl = shiftDate(now, jamMasuk, jamPulang, settings.tz);
      const tanggal = localDate(settings.tz, now);

      const inserted = (
        await client.query<Attendance>(
          `INSERT INTO attendance
             (user_id, tanggal, shift_tanggal, divisi_id, shift_masuk, shift_pulang,
              check_in, status_masuk, check_in_lat, check_in_lng, check_in_jarak, selfie_in,
              divisi_shift_id, event_id, lokasi, mood, emosi, bahagia)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
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
            divisiShiftId,
            eventId,
            target.nama,
            mood,
            emosi,
            bahagia,
          ],
        )
      ).rows[0];
      return await save("check_in", inserted);
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
