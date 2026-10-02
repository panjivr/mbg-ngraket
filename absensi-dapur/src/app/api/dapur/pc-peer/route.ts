import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import type { Pertanyaan } from "@/lib/people-culture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CycleRow { id: number; judul: string; tipe: string; pertanyaan: Pertanyaan[]; raters: number[]; subjek: number[] }

// GET — siklus feedback rekan/pimpinan aktif untuk saya + daftar subjek (teman)
// yang harus/boleh saya nilai beserta status (sudah/belum).
export const GET = route(async () => {
  const me = await requireSession();
  const cycles = await query<CycleRow>(
    `SELECT id, judul, tipe, pertanyaan, raters, subjek FROM pc_peer_cycle
      WHERE sppg_id=$1 AND status='aktif' AND raters @> $2::jsonb ORDER BY created_at ASC`,
    [me.sppg_id, JSON.stringify([me.uid])],
  );
  if (cycles.length === 0) return ok({ cycles: [] });

  const done = await query<{ cycle_id: number; subjek_id: number }>(
    `SELECT cycle_id, subjek_id FROM pc_peer_resp WHERE reviewer_id=$1 AND cycle_id = ANY($2::int[])`,
    [me.uid, cycles.map((c) => c.id)],
  );
  const doneSet = new Set(done.map((d) => `${d.cycle_id}:${d.subjek_id}`));
  const subjIds = [...new Set(cycles.flatMap((c) => c.subjek))].filter((x) => x !== me.uid);
  const nm = new Map((await query<{ id: number; nama: string; divisi_nama: string | null }>(
    `SELECT u.id, u.nama, d.nama AS divisi_nama FROM users u LEFT JOIN divisi d ON d.id=u.divisi_id WHERE u.id = ANY($1::int[])`,
    [subjIds.length ? subjIds : [0]],
  )).map((r) => [r.id, r]));

  return ok({
    cycles: cycles.map((c) => ({
      id: c.id, judul: c.judul, tipe: c.tipe, pertanyaan: c.pertanyaan,
      subjek: c.subjek.filter((s) => s !== me.uid).map((s) => ({
        id: s, nama: nm.get(s)?.nama || `#${s}`, divisi: nm.get(s)?.divisi_nama || null,
        selesai: doneSet.has(`${c.id}:${s}`),
      })),
    })),
  });
});

// POST — kirim penilaian 1 subjek. body {cycle_id, subjek_id, na, jawaban, catatan}
export const POST = route(async (req: NextRequest) => {
  const me = await requireSession();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const cycle_id = parseInt(String(b.cycle_id), 10);
  const subjek_id = parseInt(String(b.subjek_id), 10);
  if (!Number.isFinite(cycle_id) || !Number.isFinite(subjek_id)) return fail(400, "Data tidak valid.");
  if (subjek_id === me.uid) return fail(400, "Tidak bisa menilai diri sendiri.");
  const c = (await query<CycleRow & { status: string }>(`SELECT id, pertanyaan, raters, subjek, status FROM pc_peer_cycle WHERE id=$1 AND sppg_id=$2`, [cycle_id, me.sppg_id]))[0];
  if (!c) return fail(404, "Siklus tidak ditemukan.");
  if (c.status !== "aktif") return fail(400, "Siklus sudah ditutup.");
  if (!c.raters.includes(me.uid)) return fail(403, "Anda bukan penilai pada siklus ini.");
  if (!c.subjek.includes(subjek_id)) return fail(400, "Subjek tidak termasuk siklus ini.");

  const na = b.na === true;
  const jawabanIn = (b.jawaban && typeof b.jawaban === "object" ? b.jawaban : {}) as Record<string, unknown>;
  const clean: Record<string, unknown> = {};
  if (!na) {
    for (const q of c.pertanyaan) {
      const v = jawabanIn[q.code];
      if (q.tipe === "likert5") {
        const n = Number(v);
        if (q.wajib && !(n >= 1 && n <= 5)) return fail(400, `"${q.teks}" belum dinilai.`);
        if (n >= 1 && n <= 5) clean[q.code] = n;
      } else {
        const t = String(v ?? "").trim().slice(0, 800); if (t) clean[q.code] = t;
      }
    }
  }
  const catatan = String(b.catatan ?? "").trim().slice(0, 800);
  await query(
    `INSERT INTO pc_peer_resp (cycle_id, reviewer_id, subjek_id, jawaban, na, catatan)
     VALUES ($1,$2,$3,$4::jsonb,$5,$6)
     ON CONFLICT (cycle_id, reviewer_id, subjek_id)
       DO UPDATE SET jawaban=EXCLUDED.jawaban, na=EXCLUDED.na, catatan=EXCLUDED.catatan, created_at=now()`,
    [cycle_id, me.uid, subjek_id, JSON.stringify(clean), na, catatan],
  );
  return ok({ saved: true });
});
