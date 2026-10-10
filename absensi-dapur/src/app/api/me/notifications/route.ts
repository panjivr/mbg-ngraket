import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = route(async () => {
  const s = await requireSession();
  const notifications = await query(`WITH messages AS (
    SELECT 'pengumuman:'||id AS key,judul AS title,isi AS body,created_at AS at FROM pengumuman WHERE sppg_id=$2 AND aktif=TRUE
    UNION ALL SELECT 'izin:'||id||':'||status,'Pengajuan '||jenis,status||COALESCE(' — '||catatan_admin,''),reviewed_at
      FROM izin WHERE user_id=$1 AND sppg_id=$2 AND reviewed_at IS NOT NULL
    UNION ALL SELECT 'koreksi:'||id||':'||status,'Koreksi absensi',status||COALESCE(' — '||catatan_admin,''),reviewed_at
      FROM attendance_corrections WHERE user_id=$1 AND sppg_id=$2 AND reviewed_at IS NOT NULL
  ) SELECT m.*,r.read_at IS NOT NULL AS read FROM messages m LEFT JOIN employee_notification_reads r
    ON r.user_id=$1 AND r.notification_key=m.key ORDER BY m.at DESC LIMIT 100`,[s.uid,s.sppg_id]);
  return ok({notifications});
});
export const POST = route(async (req:NextRequest) => {
  const s = await requireSession();
  const b = await req.json().catch(() => ({}));
  if (!b || typeof b!=="object" || Array.isArray(b)) return fail(400,"Permintaan tidak valid.");
  if (typeof b.key!=="string" || !/^(pengumuman:\d+|(?:izin|koreksi):\d+:(?:disetujui|ditolak))$/.test(b.key))
    return fail(400,"Notifikasi tidak valid.");
  const [kind,id,status] = b.key.split(":");
  const owned = await query(`SELECT 1 WHERE
    ($1='pengumuman' AND EXISTS(SELECT 1 FROM pengumuman WHERE id=$2 AND sppg_id=$5 AND aktif=TRUE))
    OR ($1='izin' AND EXISTS(SELECT 1 FROM izin WHERE id=$2 AND user_id=$4 AND sppg_id=$5 AND status=$3 AND reviewed_at IS NOT NULL))
    OR ($1='koreksi' AND EXISTS(SELECT 1 FROM attendance_corrections WHERE id=$2 AND user_id=$4 AND sppg_id=$5 AND status=$3 AND reviewed_at IS NOT NULL))`,
    [kind,Number(id),status || null,s.uid,s.sppg_id]);
  if(!owned.length)return fail(404,"Notifikasi tidak ditemukan.");
  await query("INSERT INTO employee_notification_reads(user_id,notification_key) VALUES($1,$2) ON CONFLICT DO NOTHING",[s.uid,b.key]);
  return ok({read:true});
});
