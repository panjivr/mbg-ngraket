import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { getSppg, type Sppg } from "@/lib/sppg";
import { ok, fail, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Bentuk objek settings (kompatibel UI lama) dari konfigurasi dapur. */
function asSettings(s: Sppg) {
  return {
    id: s.id,
    nama_dapur: s.nama,
    alamat: s.alamat,
    lat: s.lat,
    lng: s.lng,
    radius_m: s.radius_m,
    geofence_aktif: s.geofence_aktif,
    selfie_wajib: s.selfie_wajib,
    jam_masuk: s.jam_masuk,
    jam_pulang: s.jam_pulang,
    tz: s.tz,
  };
}

export const GET = route(async () => {
  const admin = await requireAdmin();
  const s = await getSppg(admin.sppg_id as number);
  if (!s) return fail(404, "Dapur tidak ditemukan.");
  return ok({ settings: asSettings(s) });
});

export const PUT = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const cur = await getSppg(admin.sppg_id as number);
  if (!cur) return fail(404, "Dapur tidak ditemukan.");
  const b = await req.json().catch(() => ({}));

  const nama = b.nama_dapur !== undefined ? String(b.nama_dapur).trim() : cur.nama;
  const alamat = b.alamat !== undefined ? String(b.alamat).trim() : cur.alamat;
  const lat = b.lat !== undefined ? Number(b.lat) : cur.lat;
  const lng = b.lng !== undefined ? Number(b.lng) : cur.lng;
  const radius_m = b.radius_m !== undefined ? Math.round(Number(b.radius_m)) : cur.radius_m;
  const geofence_aktif =
    b.geofence_aktif !== undefined ? Boolean(b.geofence_aktif) : cur.geofence_aktif;
  const selfie_wajib =
    b.selfie_wajib !== undefined ? Boolean(b.selfie_wajib) : cur.selfie_wajib;
  const jam_masuk = b.jam_masuk !== undefined ? String(b.jam_masuk) : cur.jam_masuk;
  const jam_pulang = b.jam_pulang !== undefined ? String(b.jam_pulang) : cur.jam_pulang;
  const tz = b.tz !== undefined ? String(b.tz).trim() : cur.tz;

  if (!nama) return fail(400, "Nama dapur wajib diisi.");
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    return fail(400, "Latitude tidak valid (-90..90).");
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    return fail(400, "Longitude tidak valid (-180..180).");
  }
  if (!Number.isFinite(radius_m) || radius_m < 10 || radius_m > 100_000) {
    return fail(400, "Radius tidak valid (10..100000 m).");
  }
  if (!TIME_RE.test(jam_masuk) || !TIME_RE.test(jam_pulang)) {
    return fail(400, "Format jam harus HH:mm.");
  }

  const rows = await query<Sppg>(
    `UPDATE sppg SET
        nama=$1, alamat=$2, lat=$3, lng=$4, radius_m=$5,
        geofence_aktif=$6, selfie_wajib=$7, jam_masuk=$8, jam_pulang=$9, tz=$10
     WHERE id = $11 RETURNING *`,
    [nama, alamat, lat, lng, radius_m, geofence_aktif, selfie_wajib, jam_masuk, jam_pulang, tz, cur.id],
  );
  return ok({ settings: asSettings(rows[0]) });
});
