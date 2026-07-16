import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import { getSppg } from "@/lib/sppg";
import { localDate, statusMasukShift, isOvernight } from "@/lib/time";
import type { Attendance, AttendanceWithUser } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export const GET = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const sp = req.nextUrl.searchParams;
  const today = localDate("Asia/Jakarta");

  const from = DATE_RE.test(sp.get("from") || "") ? sp.get("from")! : today;
  const to = DATE_RE.test(sp.get("to") || "") ? sp.get("to")! : today;
  const userId = parseInt(sp.get("user_id") || "", 10);
  const divisiId = parseInt(sp.get("divisi_id") || "", 10);

  const conds = ["COALESCE(a.shift_tanggal, a.tanggal) BETWEEN $1 AND $2", "u.sppg_id = $3"];
  const params: unknown[] = [from, to, admin.sppg_id];
  if (Number.isFinite(userId)) {
    params.push(userId);
    conds.push(`a.user_id = $${params.length}`);
  }
  if (Number.isFinite(divisiId)) {
    params.push(divisiId);
    conds.push(`a.divisi_id = $${params.length}`);
  }

  const rows = await query<
    Omit<AttendanceWithUser, "selfie_in" | "selfie_out">
  >(
    `SELECT a.id, a.user_id,
            COALESCE(a.shift_tanggal, a.tanggal) AS tanggal,
            a.shift_tanggal, a.divisi_id, a.shift_masuk, a.shift_pulang,
            a.check_in, a.check_out, a.status_masuk,
            a.check_in_lat, a.check_in_lng, a.check_in_jarak,
            a.check_out_lat, a.check_out_lng, a.check_out_jarak, a.catatan, a.lokasi,
            u.nama, u.jabatan, u.nip, d.nama AS divisi_nama
       FROM attendance a
       JOIN users u ON u.id = a.user_id
       LEFT JOIN divisi d ON d.id = a.divisi_id
      WHERE ${conds.join(" AND ")}
      ORDER BY COALESCE(a.shift_tanggal, a.tanggal) DESC, a.check_in DESC NULLS LAST, u.nama ASC`,
    params,
  );

  return ok({ from, to, rekap: rows });
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
 * Tambah absensi manual: untuk pegawai yang lupa absen masuk. Admin memilih
 * jam masuk (dan opsional jam pulang); status masuk dihitung dari jadwal
 * divisi/dapur. Satu baris per (user_id, tanggal) — bila sudah ada, pakai Edit.
 */
export const POST = route(async (req: NextRequest) => {
  const admin = await requireAdmin();

  const b = await req.json().catch(() => ({}));
  const userId = Number(b.user_id);
  const tanggal: string = typeof b.tanggal === "string" ? b.tanggal : "";
  const jamMasuk: string = typeof b.jam_masuk === "string" ? b.jam_masuk : "";
  const jamPulang: string =
    typeof b.jam_pulang === "string" ? b.jam_pulang : "";

  if (!Number.isFinite(userId)) return fail(400, "Pegawai tidak valid.");
  if (!DATE_RE.test(tanggal)) return fail(400, "Tanggal tidak valid.");
  if (!TIME_RE.test(jamMasuk)) return fail(400, "Jam masuk tidak valid.");
  if (jamPulang && !TIME_RE.test(jamPulang))
    return fail(400, "Jam pulang tidak valid.");

  // Pegawai + snapshot jadwal divisinya, terbatas pada dapur admin ini.
  const emp = (
    await query<{
      id: number;
      d_masuk: string | null;
      d_pulang: string | null;
      d_tol: number | null;
    }>(
      `SELECT u.id, d.jam_masuk AS d_masuk, d.jam_pulang AS d_pulang, d.toleransi_menit AS d_tol
         FROM users u LEFT JOIN divisi d ON d.id = u.divisi_id AND d.aktif = TRUE
        WHERE u.id = $1 AND u.sppg_id = $2`,
      [userId, admin.sppg_id],
    )
  )[0];
  if (!emp) return fail(404, "Pegawai tidak ditemukan di dapur ini.");

  const dup = await query<{ id: number }>(
    `SELECT id FROM attendance WHERE user_id = $1 AND tanggal = $2`,
    [userId, tanggal],
  );
  if (dup.length)
    return fail(
      409,
      "Sudah ada absensi untuk pegawai ini pada tanggal tersebut. Gunakan Edit.",
    );

  const sppg = await getSppg(admin.sppg_id as number);
  const tz = sppg?.tz || "Asia/Jakarta";
  const schMasuk = emp.d_masuk || sppg?.jam_masuk || "07:00";
  const schPulang = emp.d_pulang || sppg?.jam_pulang || "15:00";
  const tol = emp.d_tol ?? 0;

  const checkIn = localToUtc(tanggal, jamMasuk, tz);
  let checkOut: Date | null = null;
  if (jamPulang) {
    checkOut = localToUtc(tanggal, jamPulang, tz);
    if (isOvernight(jamMasuk, jamPulang)) {
      checkOut = new Date(checkOut.getTime() + 24 * 60 * 60 * 1000);
    }
  }
  const status = statusMasukShift(checkIn, schMasuk, schPulang, tz, tol);

  const rows = await query<Attendance>(
    `INSERT INTO attendance (user_id, tanggal, shift_tanggal, divisi_id, shift_masuk, shift_pulang, check_in, check_out, status_masuk, selfie_in, lokasi, catatan)
     VALUES ($1,$2,$3,(SELECT divisi_id FROM users WHERE id=$1),$4,$5,$6,$7,$8,NULL,$9,$10)
     RETURNING *`,
    [
      userId,
      tanggal,
      tanggal,
      schMasuk,
      schPulang,
      checkIn.toISOString(),
      checkOut ? checkOut.toISOString() : null,
      status,
      "Input manual admin",
      `Ditambahkan manual oleh admin (${admin.nama})`,
    ],
  );
  return ok({ attendance: rows[0] }, { status: 201 });
});
