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
    `SELECT * FROM event_absensi WHERE sppg_id = $1 ORDER BY tanggal DESC, id DESC`,
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

  const rows = await query<EventAbsensi>(
    `INSERT INTO event_absensi (nama, tanggal, jam_masuk, jam_pulang, toleransi_menit, aktif, sppg_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [nama, tanggal, jam_masuk, jam_pulang, toleransi_menit, aktif, admin.sppg_id],
  );
  // Terapkan ke absensi yang sudah tercatat pada tanggal event (retroaktif).
  const affected = aktif ? await applyEventToDate(rows[0].id) : 0;
  return ok({ event: withDerived(rows[0]), affected }, { status: 201 });
});
