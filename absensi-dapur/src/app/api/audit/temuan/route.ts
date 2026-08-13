import { NextRequest } from "next/server";
import { ok, fail, route } from "@/lib/api";
import { requireAkses } from "@/lib/session";
import { query } from "@/lib/db";
import { hitungRisk, hitungTingkat, KATEGORI_TEMUAN } from "@/lib/audit-risk";
import { AREA_KEYS } from "@/lib/audit-seed";
import type { AuditTemuan, FotoBukti, TemuanStatus } from "@/lib/audit-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS: TemuanStatus[] = ["open", "improvement", "closed"];

const SELECT_TEMUAN = `
  SELECT id, sppg_id, sesi_id, auditor_id, waktu, area, kategori, observasi,
         statement_, bukti, foto, standar_sop, gap, kemungkinan, dampak,
         risk_score, tingkat, status, rekomendasi, created_at, updated_at
    FROM audit_temuan`;

function bersihkanFoto(raw: unknown): FotoBukti[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((it) => {
      const o = (it ?? {}) as Record<string, unknown>;
      return {
        url: typeof o.url === "string" ? o.url : "",
        keterangan_bukti:
          typeof o.keterangan_bukti === "string" ? o.keterangan_bukti : "",
      };
    })
    .filter((f) => f.url);
}

function hitungClamp(raw: unknown): number {
  const n = Math.round(Number(raw) || 1);
  return Math.min(5, Math.max(1, n));
}

/**
 * GET /api/audit/temuan?sesi_id=&status=&area=
 * Daftar temuan (scoped ke sppg auditor), filter opsional. Urut risk tertinggi.
 */
export const GET = route(async (req: NextRequest) => {
  const me = await requireAkses("audit");
  const sp = new URL(req.url).searchParams;

  const cond: string[] = ["sppg_id IS NOT DISTINCT FROM $1"];
  const params: unknown[] = [me.sppg_id ?? null];

  const sesiId = Number(sp.get("sesi_id"));
  if (Number.isInteger(sesiId) && sesiId > 0) {
    params.push(sesiId);
    cond.push(`sesi_id = $${params.length}`);
  }
  const status = sp.get("status");
  if (status && STATUS.includes(status as TemuanStatus)) {
    params.push(status);
    cond.push(`status = $${params.length}`);
  }
  const area = sp.get("area");
  if (area && AREA_KEYS.includes(area as never)) {
    params.push(area);
    cond.push(`area = $${params.length}`);
  }

  const rows = await query<AuditTemuan>(
    `${SELECT_TEMUAN} WHERE ${cond.join(" AND ")}
      ORDER BY risk_score DESC, waktu DESC`,
    params,
  );
  return ok({ temuan: rows });
});

/**
 * POST /api/audit/temuan { sesi_id?, area, kategori?, observasi, statement_, bukti?,
 *   foto?, standar_sop?, gap?, kemungkinan?, dampak?, rekomendasi? }
 * Buat temuan baru. risk_score dihitung DB (generated); tingkat di-derive server.
 */
export const POST = route(async (req: NextRequest) => {
  const me = await requireAkses("audit");
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const area = typeof body.area === "string" ? body.area : "";
  if (!AREA_KEYS.includes(area as never)) return fail(400, "Area tidak valid.");

  const observasi = typeof body.observasi === "string" ? body.observasi.trim() : "";
  if (!observasi) return fail(400, "Observasi wajib diisi.");

  const kategori =
    typeof body.kategori === "string" &&
    (KATEGORI_TEMUAN as readonly string[]).includes(body.kategori)
      ? body.kategori
      : "sop";
  const kemungkinan = hitungClamp(body.kemungkinan);
  const dampak = hitungClamp(body.dampak);
  const tingkat = hitungTingkat(hitungRisk(kemungkinan, dampak));

  let sesiId: number | null = null;
  if (Number.isInteger(Number(body.sesi_id)) && Number(body.sesi_id) > 0) {
    const r = await query<{ id: number }>(
      `SELECT id FROM audit_sesi WHERE id = $1 AND auditor_id = $2`,
      [Number(body.sesi_id), me.uid],
    );
    if (!r[0]) return fail(404, "Sesi tidak ditemukan.");
    sesiId = r[0].id;
  }

  const rows = await query<AuditTemuan>(
    `INSERT INTO audit_temuan
       (sppg_id, sesi_id, auditor_id, area, kategori, observasi, statement_, bukti,
        foto, standar_sop, gap, kemungkinan, dampak, tingkat, status, rekomendasi)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14,'open',$15)
     RETURNING id, sppg_id, sesi_id, auditor_id, waktu, area, kategori, observasi,
               statement_, bukti, foto, standar_sop, gap, kemungkinan, dampak,
               risk_score, tingkat, status, rekomendasi, created_at, updated_at`,
    [
      me.sppg_id ?? null,
      sesiId,
      me.uid,
      area,
      kategori,
      observasi,
      typeof body.statement_ === "string" ? body.statement_ : "",
      typeof body.bukti === "string" ? body.bukti : "",
      JSON.stringify(bersihkanFoto(body.foto)),
      typeof body.standar_sop === "string" ? body.standar_sop : "",
      typeof body.gap === "string" ? body.gap : "",
      kemungkinan,
      dampak,
      tingkat,
      typeof body.rekomendasi === "string" ? body.rekomendasi : "",
    ],
  );
  return ok({ temuan: rows[0] });
});
