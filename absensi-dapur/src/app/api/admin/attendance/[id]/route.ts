import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import { getSppg } from "@/lib/sppg";
import { isOvernight } from "@/lib/time";
import type { Attendance, AttendanceWithUser } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const GET = route(async (_req: NextRequest, ctx: Ctx) => {
  const admin = await requireAdmin();
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");

  const rows = await query<AttendanceWithUser>(
    `SELECT a.*, u.nama, u.jabatan, u.nip
       FROM attendance a JOIN users u ON u.id = a.user_id
      WHERE a.id = $1 AND u.sppg_id = $2`,
    [id, admin.sppg_id],
  );
  if (!rows.length) return fail(404, "Data absensi tidak ditemukan.");
  return ok({ detail: rows[0] });
});

// Offset zona waktu Indonesia (tanpa DST) untuk mengubah jam lokal -> UTC.
const TZ_OFFSET: Record<string, number> = {
  "Asia/Jakarta": 7,
  "Asia/Makassar": 8,
  "Asia/Jayapura": 9,
};

function localToUtc(dateStr: string, hhmm: string, tz: string): Date {
  const [y, m, d] = dateStr.split("-").map((n) => parseInt(n, 10));
  const [hh, mm] = hhmm.split(":").map((n) => parseInt(n, 10));
  const off = TZ_OFFSET[tz] ?? 7;
  return new Date(Date.UTC(y, m - 1, d, hh - off, mm, 0));
}

/**
 * Aksi admin pada satu catatan absensi.
 * { action: "force_checkout" } — tutup shift pegawai yang lupa absen pulang.
 * Jam pulang dicatat = jadwal pulang shift-nya (atau sekarang, mana yang
 * lebih awal), tidak pernah sebelum jam masuk.
 */
export const PUT = route(async (req: NextRequest, ctx: Ctx) => {
  const admin = await requireAdmin();
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");

  const b = await req.json().catch(() => ({}));
  if (b.action !== "force_checkout") {
    return fail(400, "Aksi tidak dikenal.");
  }

  const row = (
    await query<Attendance & { sppg_id: number | null }>(
      `SELECT a.*, u.sppg_id
         FROM attendance a JOIN users u ON u.id = a.user_id
        WHERE a.id = $1 AND u.sppg_id = $2`,
      [id, admin.sppg_id],
    )
  )[0];
  if (!row) return fail(404, "Data absensi tidak ditemukan.");
  if (!row.check_in) return fail(409, "Pegawai belum absen masuk.");
  if (row.check_out) return fail(409, "Pegawai ini sudah absen pulang.");

  const sppg = await getSppg(admin.sppg_id as number);
  const tz = sppg?.tz || "Asia/Jakarta";
  const now = new Date();
  const checkIn = new Date(row.check_in);

  // Jadwal pulang shift: tanggal shift + jam pulang (+1 hari bila lintas hari).
  let checkOut = now;
  const tglShift = row.shift_tanggal || row.tanggal;
  if (tglShift && row.shift_masuk && row.shift_pulang) {
    let jadwal = localToUtc(String(tglShift).slice(0, 10), row.shift_pulang, tz);
    if (isOvernight(row.shift_masuk, row.shift_pulang)) {
      jadwal = new Date(jadwal.getTime() + 24 * 60 * 60 * 1000);
    }
    if (jadwal.getTime() < now.getTime()) checkOut = jadwal;
  }
  if (checkOut.getTime() <= checkIn.getTime()) checkOut = now;

  const updated = (
    await query<Attendance>(
      `UPDATE attendance
          SET check_out = $1,
              catatan = COALESCE(catatan || ' · ', '') || $2
        WHERE id = $3 RETURNING *`,
      [
        checkOut.toISOString(),
        `Absen pulang ditutup oleh admin (${admin.nama})`,
        id,
      ],
    )
  )[0];
  return ok({ attendance: updated });
});
