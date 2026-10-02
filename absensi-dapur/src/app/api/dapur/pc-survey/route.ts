import { NextRequest } from "next/server";
import { query, withClient } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import type { Pertanyaan } from "@/lib/people-culture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Row { id: number; judul: string; deskripsi: string; anonim: boolean; pertanyaan: Pertanyaan[] }

// GET — survey WAJIB yang aktif & belum diisi karyawan ini (untuk popup).
export const GET = route(async () => {
  const me = await requireSession();
  const rows = await query<Row>(
    `SELECT s.id, s.judul, s.deskripsi, s.anonim, s.pertanyaan
       FROM pc_target t JOIN pc_survey s ON s.id = t.survey_id
      WHERE t.user_id = $1 AND t.status = 'pending' AND s.status = 'aktif'
      ORDER BY s.created_at ASC LIMIT 1`,
    [me.uid],
  );
  return ok({ survey: rows[0] ?? null });
});

// POST — kirim jawaban. Tervalidasi: semua pertanyaan WAJIB harus terisi.
export const POST = route(async (req: NextRequest) => {
  const me = await requireSession();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const survey_id = parseInt(String(b.survey_id), 10);
  if (!Number.isFinite(survey_id)) return fail(400, "Survey tidak valid.");
  const jawaban = (b.jawaban && typeof b.jawaban === "object" ? b.jawaban : {}) as Record<string, unknown>;

  const srow = (await query<Row & { status: string }>(
    `SELECT s.id, s.pertanyaan, s.status
       FROM pc_target t JOIN pc_survey s ON s.id = t.survey_id
      WHERE t.survey_id = $1 AND t.user_id = $2`,
    [survey_id, me.uid],
  ))[0];
  if (!srow) return fail(404, "Survey tidak ditugaskan untuk Anda.");
  if (srow.status !== "aktif") return fail(400, "Survey sudah ditutup.");

  // Validasi kelengkapan pertanyaan wajib.
  for (const q of srow.pertanyaan) {
    if (!q.wajib) continue;
    const v = jawaban[q.code];
    if (q.tipe === "likert5") {
      const n = Number(v);
      if (!(n >= 1 && n <= 5)) return fail(400, `Pertanyaan "${q.teks}" belum dijawab.`);
    } else if (String(v ?? "").trim() === "") {
      return fail(400, `Pertanyaan "${q.teks}" belum diisi.`);
    }
  }

  // Simpan hanya kode yang dikenal, batasi panjang teks.
  const clean: Record<string, unknown> = {};
  const codes = new Set(srow.pertanyaan.map((q) => q.code));
  for (const q of srow.pertanyaan) {
    if (!codes.has(q.code)) continue;
    const v = jawaban[q.code];
    if (q.tipe === "likert5") { const n = Number(v); if (n >= 1 && n <= 5) clean[q.code] = n; }
    else { const t = String(v ?? "").trim().slice(0, 1000); if (t) clean[q.code] = t; }
  }

  await withClient(async (client) => {
    await client.query("BEGIN");
    try {
      await client.query(
        `INSERT INTO pc_jawaban (survey_id, user_id, jawaban) VALUES ($1,$2,$3::jsonb)
         ON CONFLICT (survey_id, user_id) DO UPDATE SET jawaban = EXCLUDED.jawaban, created_at = now()`,
        [survey_id, me.uid, JSON.stringify(clean)],
      );
      await client.query(
        `UPDATE pc_target SET status='selesai', selesai_at=now() WHERE survey_id=$1 AND user_id=$2`,
        [survey_id, me.uid],
      );
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    }
  });
  return ok({ selesai: true });
});
