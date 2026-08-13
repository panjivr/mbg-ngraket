import { NextRequest } from "next/server";
import { ok, fail, route } from "@/lib/api";
import { requireAkses } from "@/lib/session";
import { query } from "@/lib/db";
import { hitungRisk, hitungTingkat, KATEGORI_TEMUAN } from "@/lib/audit-risk";
import type { AuditTemuan, FotoBukti, TemuanStatus } from "@/lib/audit-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS: TemuanStatus[] = ["open", "improvement", "closed"];

const SELECT_TEMUAN = `
  SELECT id, sppg_id, sesi_id, auditor_id, waktu, area, kategori, observasi,
         statement_, bukti, foto, standar_sop, gap, kemungkinan, dampak,
         risk_score, tingkat, status, rekomendasi, created_at, updated_at
    FROM audit_temuan`;

type Ctx = { params: Promise<{ id: string }> };

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

function clamp(raw: unknown, fallback: number): number {
  if (raw == null) return fallback;
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(5, Math.max(1, n));
}

function strOrNull(raw: unknown): string | null {
  return typeof raw === "string" ? raw : null;
}

/** GET /api/audit/temuan/[id] — detail satu temuan (scoped sppg). */
export const GET = route(async (req: NextRequest, ctx: Ctx) => {
  const me = await requireAkses("audit");
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return fail(400, "ID tidak valid.");

  const rows = await query<AuditTemuan>(
    `${SELECT_TEMUAN} WHERE id = $1 AND sppg_id IS NOT DISTINCT FROM $2`,
    [id, me.sppg_id ?? null],
  );
  if (!rows[0]) return fail(404, "Temuan tidak ditemukan.");
  return ok({ temuan: rows[0] });
});

/**
 * PUT /api/audit/temuan/[id] — update sebagian field temuan. Bila kemungkinan
 * atau dampak berubah, tingkat di-hitung ulang server-side agar konsisten.
 */
export const PUT = route(async (req: NextRequest, ctx: Ctx) => {
  const me = await requireAkses("audit");
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return fail(400, "ID tidak valid.");
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const cur = await query<{ kemungkinan: number; dampak: number }>(
    `SELECT kemungkinan, dampak FROM audit_temuan
      WHERE id = $1 AND sppg_id IS NOT DISTINCT FROM $2`,
    [id, me.sppg_id ?? null],
  );
  if (!cur[0]) return fail(404, "Temuan tidak ditemukan.");

  const kemungkinan = clamp(body.kemungkinan, cur[0].kemungkinan);
  const dampak = clamp(body.dampak, cur[0].dampak);
  const tingkat = hitungTingkat(hitungRisk(kemungkinan, dampak));
  const status = STATUS.includes(body.status as TemuanStatus)
    ? (body.status as TemuanStatus)
    : null;
  const kategori =
    typeof body.kategori === "string" &&
    (KATEGORI_TEMUAN as readonly string[]).includes(body.kategori)
      ? body.kategori
      : null;
  const foto =
    body.foto === undefined ? null : JSON.stringify(bersihkanFoto(body.foto));

  const rows = await query<AuditTemuan>(
    `UPDATE audit_temuan SET
        area        = COALESCE($3, area),
        kategori    = COALESCE($4, kategori),
        observasi   = COALESCE($5, observasi),
        statement_  = COALESCE($6, statement_),
        bukti       = COALESCE($7, bukti),
        standar_sop = COALESCE($8, standar_sop),
        gap         = COALESCE($9, gap),
        rekomendasi = COALESCE($10, rekomendasi),
        kemungkinan = $11,
        dampak      = $12,
        tingkat     = $13,
        status      = COALESCE($14, status),
        foto        = COALESCE($15::jsonb, foto),
        updated_at  = now()
      WHERE id = $1 AND sppg_id IS NOT DISTINCT FROM $2
      RETURNING id, sppg_id, sesi_id, auditor_id, waktu, area, kategori, observasi,
                statement_, bukti, foto, standar_sop, gap, kemungkinan, dampak,
                risk_score, tingkat, status, rekomendasi, created_at, updated_at`,
    [
      id,
      me.sppg_id ?? null,
      strOrNull(body.area),
      kategori,
      strOrNull(body.observasi),
      strOrNull(body.statement_),
      strOrNull(body.bukti),
      strOrNull(body.standar_sop),
      strOrNull(body.gap),
      strOrNull(body.rekomendasi),
      kemungkinan,
      dampak,
      tingkat,
      status,
      foto,
    ],
  );
  if (!rows[0]) return fail(404, "Temuan tidak ditemukan.");
  return ok({ temuan: rows[0] });
});

/** DELETE /api/audit/temuan/[id] — hapus temuan (scoped sppg). */
export const DELETE = route(async (req: NextRequest, ctx: Ctx) => {
  const me = await requireAkses("audit");
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return fail(400, "ID tidak valid.");

  const rows = await query<{ id: number }>(
    `DELETE FROM audit_temuan
      WHERE id = $1 AND sppg_id IS NOT DISTINCT FROM $2 RETURNING id`,
    [id, me.sppg_id ?? null],
  );
  if (!rows[0]) return fail(404, "Temuan tidak ditemukan.");
  return ok({ deleted: rows[0].id });
});
