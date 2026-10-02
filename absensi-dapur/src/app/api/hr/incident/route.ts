import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireHr } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import { INSIDEN_STATUS } from "@/lib/people-culture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Row {
  id: number; kategori: string; deskripsi: string; tanggal: string | null; lokasi: string;
  pihak: string; saksi: string; berulang: boolean; dampak: string; urgensi: string;
  rahasia: boolean; status: string; created_at: string; pelapor: string | null;
}

// GET — daftar laporan (HR/case handler). Nama pelapor disembunyikan bila "rahasia".
export const GET = route(async () => {
  const hr = await requireHr();
  const rows = await query<Row>(
    `SELECT i.id, i.kategori, i.deskripsi, i.tanggal::text AS tanggal, i.lokasi, i.pihak, i.saksi,
            i.berulang, i.dampak, i.urgensi, i.rahasia, i.status, i.created_at,
            CASE WHEN i.rahasia THEN NULL ELSE u.nama END AS pelapor
       FROM pc_incident i LEFT JOIN users u ON u.id = i.pelapor_id
      WHERE i.sppg_id = $1 ORDER BY i.created_at DESC`,
    [hr.sppg_id],
  );
  const updates = await query<{ incident_id: number; status: string; catatan: string; oleh: string; created_at: string }>(
    `SELECT iu.incident_id, iu.status, iu.catatan, iu.oleh, iu.created_at
       FROM pc_incident_update iu JOIN pc_incident i ON i.id = iu.incident_id
      WHERE i.sppg_id=$1 ORDER BY iu.created_at ASC`,
    [hr.sppg_id],
  );
  return ok({ laporan: rows, updates, status_list: INSIDEN_STATUS });
});

// PATCH — ubah status + catatan tindak lanjut. body {id, status, catatan}
export const PATCH = route(async (req: NextRequest) => {
  const hr = await requireHr();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = parseInt(String(b.id), 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");
  if (!INSIDEN_STATUS.includes(String(b.status))) return fail(400, "Status tidak valid.");
  const own = (await query<{ id: number }>(`SELECT id FROM pc_incident WHERE id=$1 AND sppg_id=$2`, [id, hr.sppg_id]))[0];
  if (!own) return fail(404, "Laporan tidak ditemukan.");
  const status = String(b.status);
  const catatan = String(b.catatan ?? "").trim().slice(0, 1000);
  await query(`UPDATE pc_incident SET status=$1 WHERE id=$2`, [status, id]);
  await query(`INSERT INTO pc_incident_update (incident_id, status, catatan, oleh) VALUES ($1,$2,$3,$4)`, [id, status, catatan, hr.nama]);
  return ok({ updated: true });
});
