import { NextRequest } from "next/server";
import { query, withClient } from "@/lib/db";
import { requireSession, HttpError } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import { validTimestamp } from "@/lib/employee-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = route(async () => {
  const s = await requireSession();
  return ok({corrections: await query(`SELECT id,attendance_id,check_in,check_out,alasan,status,catatan_admin,created_at
    FROM attendance_corrections WHERE user_id=$1 AND sppg_id=$2 ORDER BY id DESC LIMIT 100`, [s.uid,s.sppg_id])});
});
export const POST = route(async (req:NextRequest) => {
  const s = await requireSession();
  const b = await req.json().catch(() => ({}));
  if (!b || typeof b!=="object" || Array.isArray(b)) return fail(400,"Permintaan tidak valid.");
  const start = typeof b.check_in === "string" ? Date.parse(b.check_in) : NaN;
  const end = b.check_out == null ? null : typeof b.check_out === "string" ? Date.parse(b.check_out) : NaN;
  if (!Number.isSafeInteger(b.attendance_id) || b.attendance_id < 1 || !validTimestamp(b.check_in) || !Number.isFinite(start) || start>Date.now()
      || (end !== null && (!validTimestamp(b.check_out) || !Number.isFinite(end) || end<=start || end>Date.now() || end-start>48*3600000))
      || typeof b.alasan !== "string" || b.alasan.trim().length<5 || b.alasan.length>2000)
    return fail(400, "Isi ID absensi, waktu ISO dengan zona waktu, dan alasan (5–2000 karakter) yang valid.");
  const id = await withClient(async c => {
    await c.query("BEGIN");
    try {
      await c.query("SELECT pg_advisory_xact_lock(7263012,$1)", [s.uid]);
      const original = (await c.query(`SELECT a.* FROM attendance a JOIN users u ON u.id=a.user_id
        WHERE a.id=$1 AND a.user_id=$2 AND u.sppg_id=$3 FOR UPDATE OF a`, [b.attendance_id,s.uid,s.sppg_id])).rows[0];
      if (!original) throw new HttpError(404,"Absensi tidak ditemukan.");
      const pending = (await c.query("SELECT id FROM attendance_corrections WHERE attendance_id=$1 AND status='pending'",[b.attendance_id])).rows[0];
      if (pending) throw new HttpError(409,"Koreksi untuk absensi ini masih menunggu peninjauan.");
      const row = (await c.query(`INSERT INTO attendance_corrections(user_id,sppg_id,attendance_id,check_in,check_out,alasan,original)
        VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`, [s.uid,s.sppg_id,b.attendance_id,new Date(start).toISOString(),
        end===null ? null : new Date(end).toISOString(),b.alasan.trim(),JSON.stringify(original)])).rows[0];
      await c.query("COMMIT"); return row.id;
    } catch(e) {await c.query("ROLLBACK");throw e;}
  });
  return ok({id}, {status:201});
});
