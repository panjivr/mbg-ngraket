import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireHr } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import type { Pertanyaan } from "@/lib/people-culture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CycleRow { id: number; judul: string; tipe: string; min_responden: number; status: string; pertanyaan: Pertanyaan[]; subjek: number[] }
interface RespRow { subjek_id: number; reviewer_id: number; jawaban: Record<string, unknown>; na: boolean; catatan: string }

// GET ?id= — hasil agregat per SUBJEK (profil perilaku), N/A tak dihitung,
// hanya tampil bila responden valid >= ambang. Tanpa skor tunggal "baik/buruk".
export const GET = route(async (req: NextRequest) => {
  const hr = await requireHr();
  const id = parseInt(req.nextUrl.searchParams.get("id") || "", 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");
  const c = (await query<CycleRow>(`SELECT id, judul, tipe, min_responden, status, pertanyaan, subjek FROM pc_peer_cycle WHERE id=$1 AND sppg_id=$2`, [id, hr.sppg_id]))[0];
  if (!c) return fail(404, "Siklus tidak ditemukan.");

  const resp = await query<RespRow>(`SELECT subjek_id, reviewer_id, jawaban, na, catatan FROM pc_peer_resp WHERE cycle_id=$1`, [id]);
  const nama = new Map((await query<{ id: number; nama: string }>(`SELECT id, nama FROM users WHERE id = ANY($1::int[])`, [c.subjek])).map((r) => [r.id, r.nama]));

  const likertQ = c.pertanyaan.filter((q) => q.tipe === "likert5");
  const teksQ = c.pertanyaan.filter((q) => q.tipe === "teks");

  const perSubjek = c.subjek.map((sid) => {
    const rs = resp.filter((r) => r.subjek_id === sid);
    const valid = rs.filter((r) => !r.na); // N/A dikeluarkan
    const n = valid.length;
    const cukup = n >= c.min_responden;
    const dimensi = likertQ.map((q) => {
      const vals = valid.map((r) => Number((r.jawaban || {})[q.code])).filter((v) => v >= 1 && v <= 5);
      const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      return { code: q.code, kategori: q.kategori, teks: q.teks, mean: cukup && mean != null ? Math.round(mean * 100) / 100 : null };
    });
    const means = dimensi.map((d) => d.mean).filter((m): m is number => m != null);
    const overall = cukup && means.length ? Math.round((means.reduce((a, b) => a + b, 0) / means.length) * 100) / 100 : null;
    const teks = cukup
      ? teksQ.flatMap((q) => valid.map((r) => String((r.jawaban || {})[q.code] ?? "").trim()).filter(Boolean).map((t) => ({ q: q.teks, t })))
      : [];
    return { subjek_id: sid, nama: nama.get(sid) || `#${sid}`, n, naCount: rs.length - valid.length, cukup, overall, dimensi, teks };
  }).sort((a, b) => (b.overall ?? -1) - (a.overall ?? -1));

  return ok({ cycle: { id: c.id, judul: c.judul, tipe: c.tipe, min_responden: c.min_responden, status: c.status }, perSubjek });
});
