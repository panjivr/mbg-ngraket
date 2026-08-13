import { NextRequest } from "next/server";
import { ok, fail, route } from "@/lib/api";
import { requireAkses } from "@/lib/session";
import { query } from "@/lib/db";
import { AREA_KEYS } from "@/lib/audit-seed";
import type { AuditObservasi, ChecklistItem, FotoBukti } from "@/lib/audit-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Pastikan sesi milik auditor yang login (cegah akses lintas auditor/sppg). */
async function sesiMilikku(sesiId: number, uid: number): Promise<boolean> {
  const r = await query<{ id: number }>(
    `SELECT id FROM audit_sesi WHERE id = $1 AND auditor_id = $2`,
    [sesiId, uid],
  );
  return !!r[0];
}

function bersihkanChecklist(raw: unknown): ChecklistItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((it) => {
    const o = (it ?? {}) as Record<string, unknown>;
    const jawaban = o.jawaban === "ya" || o.jawaban === "na" ? o.jawaban : "tidak";
    return {
      pertanyaan: typeof o.pertanyaan === "string" ? o.pertanyaan : "",
      jawaban,
      catatan: typeof o.catatan === "string" ? o.catatan : "",
    };
  });
}

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

/**
 * GET /api/audit/observasi?sesi_id=123
 * Daftar observasi (semua area yang sudah diisi) untuk satu sesi.
 */
export const GET = route(async (req: NextRequest) => {
  const me = await requireAkses("audit");
  const sesiId = Number(new URL(req.url).searchParams.get("sesi_id"));
  if (!Number.isInteger(sesiId) || sesiId <= 0)
    return fail(400, "sesi_id tidak valid.");
  if (!(await sesiMilikku(sesiId, me.uid)))
    return fail(404, "Sesi tidak ditemukan.");

  const rows = await query<AuditObservasi>(
    `SELECT id, sesi_id, area, checklist, catatan, foto, updated_at
       FROM audit_observasi WHERE sesi_id = $1 ORDER BY area`,
    [sesiId],
  );
  return ok({ observasi: rows });
});

/**
 * PUT /api/audit/observasi { sesi_id, area, checklist?, catatan?, foto? }
 * Upsert observasi satu area (UNIQUE sesi_id,area).
 */
export const PUT = route(async (req: NextRequest) => {
  const me = await requireAkses("audit");
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const sesiId = Number(body.sesi_id);
  const area = typeof body.area === "string" ? body.area : "";
  if (!Number.isInteger(sesiId) || sesiId <= 0)
    return fail(400, "sesi_id tidak valid.");
  if (!AREA_KEYS.includes(area as never)) return fail(400, "Area tidak valid.");
  if (!(await sesiMilikku(sesiId, me.uid)))
    return fail(404, "Sesi tidak ditemukan.");

  const checklist = bersihkanChecklist(body.checklist);
  const catatan = typeof body.catatan === "string" ? body.catatan : "";
  const foto = bersihkanFoto(body.foto);

  const rows = await query<AuditObservasi>(
    `INSERT INTO audit_observasi (sesi_id, area, checklist, catatan, foto)
     VALUES ($1, $2, $3::jsonb, $4, $5::jsonb)
     ON CONFLICT (sesi_id, area)
       DO UPDATE SET checklist = EXCLUDED.checklist, catatan = EXCLUDED.catatan,
                     foto = EXCLUDED.foto, updated_at = now()
     RETURNING id, sesi_id, area, checklist, catatan, foto, updated_at`,
    [sesiId, area, JSON.stringify(checklist), catatan, JSON.stringify(foto)],
  );
  return ok({ observasi: rows[0] });
});
