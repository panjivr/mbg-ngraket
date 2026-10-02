import { NextRequest } from "next/server";
import { query, withClient } from "@/lib/db";
import { requireHr } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import { sanitizePertanyaan } from "@/lib/people-culture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CycleRow {
  id: number; judul: string; tipe: string; min_responden: number; status: string;
  created_at: string; jml_soal: number; raters: number[]; subjek: number[]; respons: number;
}
interface Pegawai { id: number; nama: string; divisi_nama: string | null }

// GET — daftar siklus + pegawai + daftar pimpinan yang ditunjuk.
export const GET = route(async () => {
  const hr = await requireHr();
  const cycles = await query<CycleRow>(
    `SELECT c.id, c.judul, c.tipe, c.min_responden, c.status, c.created_at,
            jsonb_array_length(c.pertanyaan) AS jml_soal, c.raters, c.subjek,
            (SELECT count(*) FROM pc_peer_resp r WHERE r.cycle_id = c.id)::int AS respons
       FROM pc_peer_cycle c WHERE c.sppg_id = $1 ORDER BY c.created_at DESC`,
    [hr.sppg_id],
  );
  const pegawai = await query<Pegawai>(
    `SELECT u.id, u.nama, d.nama AS divisi_nama FROM users u LEFT JOIN divisi d ON d.id = u.divisi_id
      WHERE u.sppg_id = $1 AND u.aktif = TRUE ORDER BY d.nama ASC NULLS LAST, u.nama ASC`,
    [hr.sppg_id],
  );
  const leaders = (await query<{ user_id: number }>(`SELECT user_id FROM pc_leader WHERE sppg_id = $1`, [hr.sppg_id])).map((r) => r.user_id);
  return ok({
    cycles: cycles.map((c) => ({ ...c, raterCount: c.raters.length, subjekCount: c.subjek.length })),
    pegawai, leaders,
  });
});

// POST — buat & aktifkan siklus feedback rekan/pimpinan.
// body {judul, tipe:'peer'|'leadership', pertanyaan[], raterIds[], subjekIds[], min_responden}
export const POST = route(async (req: NextRequest) => {
  const hr = await requireHr();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const judul = String(b.judul ?? "").trim().slice(0, 150);
  if (!judul) return fail(400, "Judul wajib.");
  const tipe = b.tipe === "leadership" ? "leadership" : "peer";
  const pertanyaan = sanitizePertanyaan(b.pertanyaan);
  if (pertanyaan.length === 0) return fail(400, "Minimal 1 pertanyaan.");
  const min_responden = Math.max(1, parseInt(String(b.min_responden), 10) || 3);
  const ints = (x: unknown) => (Array.isArray(x) ? [...new Set(x.map((v) => parseInt(String(v), 10)).filter(Number.isFinite))] : []);
  const raterIds = ints(b.raterIds);
  const subjekIds = ints(b.subjekIds);
  if (raterIds.length === 0 || subjekIds.length === 0) return fail(400, "Pilih penilai & subjek.");

  // Validasi semua user milik dapur ini.
  const valid = (await query<{ id: number }>(
    `SELECT id FROM users WHERE sppg_id=$1 AND aktif=TRUE AND id = ANY($2::int[])`,
    [hr.sppg_id, [...new Set([...raterIds, ...subjekIds])]],
  )).map((r) => r.id);
  const vs = new Set(valid);
  const raters = raterIds.filter((x) => vs.has(x));
  const subjek = subjekIds.filter((x) => vs.has(x));
  if (raters.length === 0 || subjek.length === 0) return fail(400, "Peserta tidak valid.");

  const id = (await query<{ id: number }>(
    `INSERT INTO pc_peer_cycle (sppg_id, judul, tipe, pertanyaan, raters, subjek, min_responden, status)
     VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb,$7,'aktif') RETURNING id`,
    [hr.sppg_id, judul, tipe, JSON.stringify(pertanyaan), JSON.stringify(raters), JSON.stringify(subjek), min_responden],
  ))[0].id;
  return ok({ id });
});

// PUT — tetapkan daftar pimpinan (untuk Feedback Pimpinan). body {leaderIds[]}
export const PUT = route(async (req: NextRequest) => {
  const hr = await requireHr();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const ids = Array.isArray(b.leaderIds) ? [...new Set((b.leaderIds as unknown[]).map((v) => parseInt(String(v), 10)).filter(Number.isFinite))] : [];
  await withClient(async (c) => {
    await c.query("BEGIN");
    try {
      await c.query(`DELETE FROM pc_leader WHERE sppg_id=$1`, [hr.sppg_id]);
      for (const uid of ids) await c.query(`INSERT INTO pc_leader (sppg_id, user_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`, [hr.sppg_id, uid]);
      await c.query("COMMIT");
    } catch (e) { await c.query("ROLLBACK").catch(() => {}); throw e; }
  });
  return ok({ saved: true });
});

export const PATCH = route(async (req: NextRequest) => {
  const hr = await requireHr();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = parseInt(String(b.id), 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");
  const status = b.status === "aktif" ? "aktif" : "selesai";
  await query(`UPDATE pc_peer_cycle SET status=$1, closed_at=CASE WHEN $1='selesai' THEN now() ELSE NULL END WHERE id=$2 AND sppg_id=$3`, [status, id, hr.sppg_id]);
  return ok({ updated: true });
});

export const DELETE = route(async (req: NextRequest) => {
  const hr = await requireHr();
  const id = parseInt(req.nextUrl.searchParams.get("id") || "", 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");
  await query(`DELETE FROM pc_peer_cycle WHERE id=$1 AND sppg_id=$2`, [id, hr.sppg_id]);
  return ok({ deleted: id });
});
