import { NextRequest } from "next/server";
import { ok, fail, route } from "@/lib/api";
import { requireAkses } from "@/lib/session";
import { query } from "@/lib/db";
import { localDate } from "@/lib/time";
import type { AuditSesi, AuditObservasi } from "@/lib/audit-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/audit/sesi?tanggal=YYYY-MM-DD
 * Ambil (atau siapkan) sesi audit auditor untuk tanggal tertentu. Default hari
 * ini. Mengembalikan sesi bila sudah ada; null bila belum dibuat.
 */
export const GET = route(async (req: NextRequest) => {
  const me = await requireAkses("audit");
  const url = new URL(req.url);
  const tanggal = url.searchParams.get("tanggal") || localDate();
  if (!DATE_RE.test(tanggal)) return fail(400, "Tanggal tidak valid.");

  const rows = await query<AuditSesi>(
    `SELECT id, sppg_id, auditor_id, to_char(tanggal,'YYYY-MM-DD') AS tanggal,
            mode, ringkasan, dikirim_at, created_at, updated_at
       FROM audit_sesi
      WHERE sppg_id IS NOT DISTINCT FROM $1 AND auditor_id = $2 AND tanggal = $3`,
    [me.sppg_id ?? null, me.uid, tanggal],
  );
  const sesi = rows[0] ?? null;
  // Sertakan observasi sekaligus (bootstrap 1 round-trip) → tampilan awal Audit
  // Dapur (tab Observasi) langsung terisi tanpa request kedua.
  const observasi = sesi
    ? await query<AuditObservasi>(
        `SELECT id, sesi_id, area, checklist, catatan, foto, updated_at
           FROM audit_observasi WHERE sesi_id = $1 ORDER BY area`,
        [sesi.id],
      )
    : [];
  return ok({ sesi, observasi });
});

/**
 * POST /api/audit/sesi { tanggal?, mode? }
 * Buat/ambil sesi audit (upsert idempoten pada UNIQUE sppg_id,auditor_id,tanggal).
 */
export const POST = route(async (req: NextRequest) => {
  const me = await requireAkses("audit");
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const tanggal = typeof body.tanggal === "string" ? body.tanggal : localDate();
  if (!DATE_RE.test(tanggal)) return fail(400, "Tanggal tidak valid.");
  const mode = body.mode === "dokumen" ? "dokumen" : "lapangan";

  const rows = await query<AuditSesi>(
    `INSERT INTO audit_sesi (sppg_id, auditor_id, tanggal, mode)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (sppg_id, auditor_id, tanggal)
       DO UPDATE SET mode = EXCLUDED.mode, updated_at = now()
     RETURNING id, sppg_id, auditor_id, to_char(tanggal,'YYYY-MM-DD') AS tanggal,
               mode, ringkasan, dikirim_at, created_at, updated_at`,
    [me.sppg_id ?? null, me.uid, tanggal, mode],
  );
  return ok({ sesi: rows[0] });
});

/**
 * PUT /api/audit/sesi { id, ringkasan?, kirim? }
 * Simpan ringkasan dan/atau tandai sesi terkirim (dikirim_at = now()).
 */
export const PUT = route(async (req: NextRequest) => {
  const me = await requireAkses("audit");
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) return fail(400, "ID sesi tidak valid.");

  const ringkasan = typeof body.ringkasan === "string" ? body.ringkasan : null;
  const kirim = body.kirim === true;

  const rows = await query<AuditSesi>(
    `UPDATE audit_sesi
        SET ringkasan  = COALESCE($3, ringkasan),
            dikirim_at = CASE WHEN $4 THEN now() ELSE dikirim_at END,
            updated_at = now()
      WHERE id = $1 AND auditor_id = $2
      RETURNING id, sppg_id, auditor_id, to_char(tanggal,'YYYY-MM-DD') AS tanggal,
                mode, ringkasan, dikirim_at, created_at, updated_at`,
    [id, me.uid, ringkasan, kirim],
  );
  if (!rows[0]) return fail(404, "Sesi tidak ditemukan.");
  return ok({ sesi: rows[0] });
});
