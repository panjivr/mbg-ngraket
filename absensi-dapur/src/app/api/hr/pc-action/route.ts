import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireHr } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import { ACTION_STATUS, PRIORITAS } from "@/lib/people-culture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const d = (x: unknown) => (DATE_RE.test(String(x)) ? String(x) : null);

interface Row {
  id: number; judul: string; sumber: string; masalah: string; akar: string; tindakan: string;
  pic_user_id: number | null; pic_nama: string | null; prioritas: string; deadline: string | null;
  status: string; hasil: string; review_date: string | null; expected_outcome: string; created_at: string;
}

export const GET = route(async () => {
  const hr = await requireHr();
  const rows = await query<Row>(
    `SELECT a.id, a.judul, a.sumber, a.masalah, a.akar, a.tindakan, a.pic_user_id, u.nama AS pic_nama,
            a.prioritas, a.deadline::text AS deadline, a.status, a.hasil, a.review_date::text AS review_date,
            a.expected_outcome, a.created_at
       FROM pc_action a LEFT JOIN users u ON u.id = a.pic_user_id
      WHERE a.sppg_id=$1 ORDER BY (a.status IN ('DONE','REVIEWED')) ASC, a.deadline ASC NULLS LAST, a.created_at DESC`,
    [hr.sppg_id],
  );
  const pegawai = await query<{ id: number; nama: string }>(`SELECT id, nama FROM users WHERE sppg_id=$1 AND aktif=TRUE ORDER BY nama`, [hr.sppg_id]);
  return ok({ actions: rows, pegawai });
});

export const POST = route(async (req: NextRequest) => {
  const hr = await requireHr();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const judul = String(b.judul ?? "").trim().slice(0, 150);
  if (!judul) return fail(400, "Judul wajib.");
  const pic = parseInt(String(b.pic_user_id), 10);
  const prioritas = PRIORITAS.includes(String(b.prioritas)) ? String(b.prioritas) : "sedang";
  await query(
    `INSERT INTO pc_action (sppg_id, judul, sumber, masalah, akar, tindakan, pic_user_id, prioritas, deadline, status, expected_outcome, review_date, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'OPEN',$10,$11,$12)`,
    [hr.sppg_id, judul, String(b.sumber ?? "").slice(0, 100), String(b.masalah ?? "").slice(0, 1000),
      String(b.akar ?? "").slice(0, 1000), String(b.tindakan ?? "").slice(0, 1000),
      Number.isFinite(pic) ? pic : null, prioritas, d(b.deadline), String(b.expected_outcome ?? "").slice(0, 500), d(b.review_date), hr.nama],
  );
  return ok({ saved: true });
});

export const PATCH = route(async (req: NextRequest) => {
  const hr = await requireHr();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = parseInt(String(b.id), 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");
  const own = (await query<{ id: number }>(`SELECT id FROM pc_action WHERE id=$1 AND sppg_id=$2`, [id, hr.sppg_id]))[0];
  if (!own) return fail(404, "Tidak ditemukan.");
  const status = ACTION_STATUS.includes(String(b.status)) ? String(b.status) : null;
  await query(
    `UPDATE pc_action SET
       status = COALESCE($1, status),
       hasil = COALESCE($2, hasil),
       tindakan = COALESCE($3, tindakan),
       updated_at = now()
     WHERE id=$4`,
    [status, b.hasil != null ? String(b.hasil).slice(0, 1000) : null, b.tindakan != null ? String(b.tindakan).slice(0, 1000) : null, id],
  );
  return ok({ updated: true });
});

export const DELETE = route(async (req: NextRequest) => {
  const hr = await requireHr();
  const id = parseInt(req.nextUrl.searchParams.get("id") || "", 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");
  await query(`DELETE FROM pc_action WHERE id=$1 AND sppg_id=$2`, [id, hr.sppg_id]);
  return ok({ deleted: id });
});
