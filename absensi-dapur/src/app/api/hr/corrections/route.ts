import { NextRequest } from "next/server";
import { query, withClient } from "@/lib/db";
import { requireHr, HttpError } from "@/lib/session";
import { getSppg } from "@/lib/sppg";
import { shiftDate, localDate, statusMasukShift } from "@/lib/time";
import { invalidateBoard } from "@/lib/leaderboard";
import { ok, fail, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = route(async () => {
  const s = await requireHr();
  return ok({corrections: await query(`SELECT c.*,u.nama FROM attendance_corrections c JOIN users u ON u.id=c.user_id
    WHERE c.sppg_id=$1 AND u.sppg_id=$1 ORDER BY (c.status='pending') DESC,c.id DESC LIMIT 200`,[s.sppg_id])});
});
export const PATCH = route(async (req:NextRequest) => {
  const s = await requireHr();
  const b = await req.json().catch(() => ({}));
  if (!b || typeof b!=="object" || Array.isArray(b)) return fail(400,"Permintaan tidak valid.");
  if (!Number.isSafeInteger(b.id) || !["disetujui","ditolak"].includes(b.status)
      || (b.catatan_admin != null && (typeof b.catatan_admin !== "string" || b.catatan_admin.length>2000)))
    return fail(400,"ID/status/catatan tidak valid.");
  const settings = await getSppg(s.sppg_id!);
  if (!settings) return fail(404,"Dapur tidak ditemukan.");
  await withClient(async c => {
    await c.query("BEGIN");
    try {
      // Lock in the same order as attendance writes, then lock the request.
      const owner = (await c.query<{user_id:number}>("SELECT user_id FROM attendance_corrections WHERE id=$1 AND sppg_id=$2",[b.id,s.sppg_id])).rows[0];
      if (!owner) throw new HttpError(404,"Koreksi tidak ditemukan.");
      await c.query("SELECT pg_advisory_xact_lock(7263012,$1)",[owner.user_id]);
      const correction = (await c.query(`SELECT c.* FROM attendance_corrections c JOIN users u ON u.id=c.user_id
        WHERE c.id=$1 AND c.sppg_id=$2 AND u.sppg_id=$2 AND c.status='pending' FOR UPDATE OF c`,[b.id,s.sppg_id])).rows[0];
      if (!correction) throw new HttpError(409,"Pengajuan sudah diproses atau karyawan pindah dapur.");
      if (b.status==="disetujui") {
        const a = (await c.query("SELECT * FROM attendance WHERE id=$1 AND user_id=$2 FOR UPDATE",[correction.attendance_id,owner.user_id])).rows[0];
        if (!a || Object.keys(correction.original).some(key => JSON.stringify(a[key]) !== JSON.stringify(correction.original[key])))
          throw new HttpError(409,"Absensi berubah sejak pengajuan. Tolak dan ajukan ulang.");
        if (!correction.check_out) {
          const other = (await c.query("SELECT id FROM attendance WHERE user_id=$1 AND id<>$2 AND check_in IS NOT NULL AND check_out IS NULL",[owner.user_id,a.id])).rows[0];
          if (other) throw new HttpError(409,"Ada shift lain yang masih terbuka.");
        }
        const at = new Date(correction.check_in);
        const masuk = a.shift_masuk || settings.jam_masuk, pulang = a.shift_pulang || settings.jam_pulang;
        const timing=(await c.query<{toleransi:number}>(`SELECT COALESCE(e.toleransi_menit,ds.toleransi_menit,d.toleransi_menit,0) AS toleransi
          FROM attendance a LEFT JOIN event_absensi e ON e.id=a.event_id
          LEFT JOIN divisi_shift ds ON ds.id=a.divisi_shift_id LEFT JOIN divisi d ON d.id=a.divisi_id WHERE a.id=$1`,[a.id])).rows[0];
        await c.query(`UPDATE attendance SET check_in=$1,check_out=$2,tanggal=$3,shift_tanggal=$4,status_masuk=$5 WHERE id=$6`,
          [correction.check_in,correction.check_out,localDate(settings.tz,at),shiftDate(at,masuk,pulang,settings.tz),
            statusMasukShift(at,masuk,pulang,settings.tz,timing?.toleransi || 0),a.id]);
      }
      await c.query(`UPDATE attendance_corrections SET status=$1,catatan_admin=$2,reviewed_by=$3,reviewed_at=now() WHERE id=$4`,
        [b.status,b.catatan_admin || null,s.uid,b.id]);
      await c.query("COMMIT");
    } catch(e) {await c.query("ROLLBACK");throw e;}
  });
  invalidateBoard(s.sppg_id!);
  return ok({id:b.id,status:b.status});
});
