import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireHr } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import type { Pertanyaan } from "@/lib/people-culture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SurveyRow { id: number; judul: string; deskripsi: string; anonim: boolean; min_responden: number; status: string; pertanyaan: Pertanyaan[] }
interface JawabanRow { user_id: number; nama: string; jawaban: Record<string, unknown>; created_at: string }
interface TargetRow { user_id: number; nama: string; divisi_nama: string | null; status: string; selesai_at: string | null }

// GET ?id= — hasil agregat survey (per pertanyaan Likert: mean + distribusi;
// pertanyaan teks: daftar jawaban tanpa identitas bila anonim). Agregat hanya
// tampil bila jumlah responden >= ambang (anti-tebak identitas).
export const GET = route(async (req: NextRequest) => {
  const hr = await requireHr();
  const id = parseInt(req.nextUrl.searchParams.get("id") || "", 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");

  const srow = (await query<SurveyRow>(
    `SELECT id, judul, deskripsi, anonim, min_responden, status, pertanyaan FROM pc_survey WHERE id=$1 AND sppg_id=$2`,
    [id, hr.sppg_id],
  ))[0];
  if (!srow) return fail(404, "Survey tidak ditemukan.");

  const target = await query<TargetRow>(
    `SELECT t.user_id, u.nama, d.nama AS divisi_nama, t.status, t.selesai_at
       FROM pc_target t JOIN users u ON u.id = t.user_id LEFT JOIN divisi d ON d.id = u.divisi_id
      WHERE t.survey_id = $1 ORDER BY t.status DESC, u.nama ASC`,
    [id],
  );
  const jwb = await query<JawabanRow>(
    `SELECT j.user_id, u.nama, j.jawaban, j.created_at
       FROM pc_jawaban j JOIN users u ON u.id = j.user_id WHERE j.survey_id = $1`,
    [id],
  );

  const n = jwb.length;
  const cukup = n >= srow.min_responden;

  const ringkas = srow.pertanyaan.map((q) => {
    if (q.tipe === "likert5") {
      const vals: number[] = [];
      const dist = [0, 0, 0, 0, 0]; // skor 1..5
      for (const j of jwb) {
        const v = Number((j.jawaban || {})[q.code]);
        if (v >= 1 && v <= 5) { vals.push(v); dist[v - 1]++; }
      }
      const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      return {
        code: q.code, kategori: q.kategori, teks: q.teks, tipe: q.tipe,
        n: vals.length,
        // Sembunyikan nilai bila responden kurang dari ambang.
        mean: cukup && mean != null ? Math.round(mean * 100) / 100 : null,
        dist: cukup ? dist : null,
      };
    }
    // Teks: kumpulkan jawaban non-kosong. Anonim → tanpa nama.
    const teksJawab = jwb
      .map((j) => ({ nama: srow.anonim ? null : j.nama, teks: String((j.jawaban || {})[q.code] ?? "").trim() }))
      .filter((x) => x.teks);
    return { code: q.code, kategori: q.kategori, teks: q.teks, tipe: q.tipe, n: teksJawab.length, jawaban: cukup ? teksJawab : [] };
  });

  // Rata-rata keseluruhan Likert (indikasi iklim kerja) — hanya bila cukup.
  let overall: number | null = null;
  if (cukup) {
    const means = ringkas.filter((r) => r.tipe === "likert5" && r.mean != null).map((r) => r.mean as number);
    overall = means.length ? Math.round((means.reduce((a, b) => a + b, 0) / means.length) * 100) / 100 : null;
  }

  return ok({
    survey: { id: srow.id, judul: srow.judul, deskripsi: srow.deskripsi, anonim: srow.anonim, min_responden: srow.min_responden, status: srow.status },
    responden: n, target: target.length, cukup, overall,
    ringkas,
    // Daftar penyelesaian (identitas) — untuk HR memantau siapa sudah mengisi, bukan isi jawabannya.
    target_list: target.map((t) => ({ nama: t.nama, divisi: t.divisi_nama, status: t.status, selesai_at: t.selesai_at })),
  });
});
