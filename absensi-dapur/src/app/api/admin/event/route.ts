import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { isOvernight } from "@/lib/time";
import { applyEventToDate } from "@/lib/eventApply";
import { ok, fail, route } from "@/lib/api";
import type { EventAbsensi } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function withDerived(e: EventAbsensi): EventAbsensi {
  return { ...e, lintas_hari: isOvernight(e.jam_masuk, e.jam_pulang) };
}

export const GET = route(async () => {
  const admin = await requireAdmin();
  const rows = await query<EventAbsensi>(
    `SELECT e.*, COALESCE(p.ids, '{}') AS peserta_ids
       FROM event_absensi e
       LEFT JOIN LATERAL (
         SELECT array_agg(ep.user_id) AS ids FROM event_peserta ep WHERE ep.event_id = e.id
       ) p ON TRUE
      WHERE e.sppg_id = $1 ORDER BY e.tanggal DESC, e.id DESC`,
    [admin.sppg_id],
  );
  return ok({ events: rows.map(withDerived) });
});

export const POST = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const b = await req.json().catch(() => ({}));
  const nama = String(b.nama ?? "").trim();
  const tanggal = String(b.tanggal ?? "").trim();
  const jam_masuk = String(b.jam_masuk ?? "").trim();
  const jam_pulang = String(b.jam_pulang ?? "").trim();
  const toleransi_menit = Math.round(Number(b.toleransi_menit ?? 15));
  const aktif = b.aktif === false ? false : true;

  if (!nama) return fail(400, "Nama event wajib diisi.");
  if (!DATE_RE.test(tanggal)) return fail(400, "Tanggal event tidak valid.");
  if (!TIME_RE.test(jam_masuk) || !TIME_RE.test(jam_pulang)) {
    return fail(400, "Format jam harus HH:mm.");
  }
  if (!Number.isFinite(toleransi_menit) || toleransi_menit < 0 || toleransi_menit > 240) {
    return fail(400, "Toleransi tidak valid (0..240 menit).");
  }

  // Koordinat opsional: kalau diisi, peserta event bisa absen di titik ini.
  const lat = b.lat !== undefined && b.lat !== null && b.lat !== "" ? Number(b.lat) : null;
  const lng = b.lng !== undefined && b.lng !== null && b.lng !== "" ? Number(b.lng) : null;
  const radius_m =
    b.radius_m !== undefined && b.radius_m !== null && b.radius_m !== ""
      ? Math.round(Number(b.radius_m))
      : null;
  if ((lat === null) !== (lng === null)) {
    return fail(400, "Latitude dan longitude harus diisi berpasangan.");
  }
  if (lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) {
    return fail(400, "Latitude tidak valid (-90..90).");
  }
  if (lng !== null && (!Number.isFinite(lng) || lng < -180 || lng > 180)) {
    return fail(400, "Longitude tidak valid (-180..180).");
  }
  if (radius_m !== null && (!Number.isFinite(radius_m) || radius_m < 10 || radius_m > 100000)) {
    return fail(400, "Radius tidak valid (10..100000 m).");
  }

  const rows = await query<EventAbsensi>(
    `INSERT INTO event_absensi (nama, tanggal, jam_masuk, jam_pulang, toleransi_menit, aktif, sppg_id, lat, lng, radius_m)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [nama, tanggal, jam_masuk, jam_pulang, toleransi_menit, aktif, admin.sppg_id, lat, lng, radius_m],
  );
  // Terapkan ke absensi yang sudah tercatat pada tanggal event (retroaktif).
  // Peserta (opsional): bila diisi, event hanya berlaku untuk mereka.
  const pesertaIds: number[] = Array.isArray(b.peserta)
    ? ([
        ...new Set(
          b.peserta
            .map((x: unknown) => parseInt(String(x), 10))
            .filter((n: number) => Number.isFinite(n)),
        ),
      ] as number[])
    : [];
  if (pesertaIds.length) {
    await query(
      `INSERT INTO event_peserta (event_id, user_id)
       SELECT $1, u.id FROM users u WHERE u.id = ANY($2::int[]) AND u.sppg_id = $3
       ON CONFLICT DO NOTHING`,
      [rows[0].id, pesertaIds, admin.sppg_id],
    );
  }
  const affected = aktif ? await applyEventToDate(rows[0].id) : 0;
  return ok(
    { event: { ...withDerived(rows[0]), peserta_ids: pesertaIds }, affected },
    { status: 201 },
  );
});
