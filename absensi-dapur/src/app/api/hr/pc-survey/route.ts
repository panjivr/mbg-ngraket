import { NextRequest } from "next/server";
import { query, withClient } from "@/lib/db";
import { requireHr } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import { sanitizePertanyaan, MIN_RESPONDEN_DEFAULT } from "@/lib/people-culture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SurveyRow {
  id: number; judul: string; deskripsi: string; anonim: boolean; min_responden: number;
  status: string; dibuat_oleh: string; created_at: string; closed_at: string | null;
  jml_soal: number; target: number; selesai: number;
}
interface PegawaiRow { id: number; nama: string; divisi_nama: string | null }

// GET — daftar survey + daftar pegawai (untuk checklist HR).
export const GET = route(async () => {
  const hr = await requireHr();
  const surveys = await query<SurveyRow>(
    `SELECT s.id, s.judul, s.deskripsi, s.anonim, s.min_responden, s.status, s.dibuat_oleh,
            s.created_at, s.closed_at,
            jsonb_array_length(s.pertanyaan) AS jml_soal,
            (SELECT count(*) FROM pc_target t WHERE t.survey_id = s.id)::int AS target,
            (SELECT count(*) FROM pc_target t WHERE t.survey_id = s.id AND t.status = 'selesai')::int AS selesai
       FROM pc_survey s WHERE s.sppg_id = $1 ORDER BY s.created_at DESC`,
    [hr.sppg_id],
  );
  const pegawai = await query<PegawaiRow>(
    `SELECT u.id, u.nama, d.nama AS divisi_nama
       FROM users u LEFT JOIN divisi d ON d.id = u.divisi_id
      WHERE u.sppg_id = $1 AND u.aktif = TRUE
      ORDER BY d.nama ASC NULLS LAST, u.nama ASC`,
    [hr.sppg_id],
  );
  return ok({ surveys, pegawai });
});

// POST — buat & TAMPILKAN survey ke karyawan terpilih (langsung aktif).
export const POST = route(async (req: NextRequest) => {
  const hr = await requireHr();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const judul = String(b.judul ?? "").trim().slice(0, 150);
  if (!judul) return fail(400, "Judul survey wajib.");
  const deskripsi = String(b.deskripsi ?? "").trim().slice(0, 500);
  const anonim = b.anonim !== false;
  const min_responden = Math.max(1, parseInt(String(b.min_responden), 10) || MIN_RESPONDEN_DEFAULT);
  const pertanyaan = sanitizePertanyaan(b.pertanyaan);
  if (pertanyaan.length === 0) return fail(400, "Minimal 1 pertanyaan.");
  const userIds = Array.isArray(b.userIds)
    ? [...new Set((b.userIds as unknown[]).map((x) => parseInt(String(x), 10)).filter(Number.isFinite))]
    : [];
  if (userIds.length === 0) return fail(400, "Centang minimal 1 karyawan.");

  const id = await withClient(async (client) => {
    await client.query("BEGIN");
    try {
      // Pastikan hanya user milik dapur ini yang jadi target.
      const valid = (
        await client.query<{ id: number }>(
          `SELECT id FROM users WHERE sppg_id = $1 AND aktif = TRUE AND id = ANY($2::int[])`,
          [hr.sppg_id, userIds],
        )
      ).rows.map((r) => r.id);
      if (valid.length === 0) { await client.query("ROLLBACK"); return null; }
      const s = await client.query<{ id: number }>(
        `INSERT INTO pc_survey (sppg_id, judul, deskripsi, pertanyaan, anonim, min_responden, status, dibuat_oleh)
         VALUES ($1,$2,$3,$4::jsonb,$5,$6,'aktif',$7) RETURNING id`,
        [hr.sppg_id, judul, deskripsi, JSON.stringify(pertanyaan), anonim, min_responden, hr.nama],
      );
      const sid = s.rows[0].id;
      for (const uid of valid) {
        await client.query(`INSERT INTO pc_target (survey_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [sid, uid]);
      }
      await client.query("COMMIT");
      return sid;
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    }
  });
  if (!id) return fail(400, "Karyawan terpilih tidak valid.");
  return ok({ id });
});

// PATCH — hentikan/aktifkan survey. body {id, status:'selesai'|'aktif'}
export const PATCH = route(async (req: NextRequest) => {
  const hr = await requireHr();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = parseInt(String(b.id), 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");
  const status = b.status === "aktif" ? "aktif" : "selesai";
  await query(
    `UPDATE pc_survey SET status=$1, closed_at = CASE WHEN $1='selesai' THEN now() ELSE NULL END
       WHERE id=$2 AND sppg_id=$3`,
    [status, id, hr.sppg_id],
  );
  return ok({ updated: true });
});

// DELETE ?id= — hapus survey (beserta target & jawaban).
export const DELETE = route(async (req: NextRequest) => {
  const hr = await requireHr();
  const id = parseInt(req.nextUrl.searchParams.get("id") || "", 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");
  await query(`DELETE FROM pc_survey WHERE id=$1 AND sppg_id=$2`, [id, hr.sppg_id]);
  return ok({ deleted: id });
});
