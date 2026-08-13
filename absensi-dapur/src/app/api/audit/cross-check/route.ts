import { NextRequest } from "next/server";
import { ok, fail, route } from "@/lib/api";
import { requireAkses } from "@/lib/session";
import { query, withClient } from "@/lib/db";
import type { AuditCrossCheck } from "@/lib/audit-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function sesiMilikku(sesiId: number, uid: number): Promise<boolean> {
  const r = await query<{ id: number }>(
    `SELECT id FROM audit_sesi WHERE id = $1 AND auditor_id = $2`,
    [sesiId, uid],
  );
  return !!r[0];
}

function num(raw: unknown): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** GET /api/audit/cross-check?sesi_id=123 — daftar cross-check dokumen satu sesi. */
export const GET = route(async (req: NextRequest) => {
  const me = await requireAkses("audit");
  const sesiId = Number(new URL(req.url).searchParams.get("sesi_id"));
  if (!Number.isInteger(sesiId) || sesiId <= 0)
    return fail(400, "sesi_id tidak valid.");
  if (!(await sesiMilikku(sesiId, me.uid)))
    return fail(404, "Sesi tidak ditemukan.");

  const rows = await query<AuditCrossCheck>(
    `SELECT id, sesi_id, bahan, satuan, po, receiving, storage, production,
            waste, output_porsi, gap_catatan
       FROM audit_cross_check WHERE sesi_id = $1 ORDER BY id`,
    [sesiId],
  );
  return ok({ cross_check: rows });
});

/**
 * PUT /api/audit/cross-check { sesi_id, baris: [{ bahan, satuan?, po?, receiving?,
 *   storage?, production?, waste?, output_porsi?, gap_catatan? }] }
 * Ganti seluruh daftar cross-check sesi (hapus lalu isi ulang) dalam satu transaksi.
 */
export const PUT = route(async (req: NextRequest) => {
  const me = await requireAkses("audit");
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const sesiId = Number(body.sesi_id);
  if (!Number.isInteger(sesiId) || sesiId <= 0)
    return fail(400, "sesi_id tidak valid.");
  if (!(await sesiMilikku(sesiId, me.uid)))
    return fail(404, "Sesi tidak ditemukan.");

  const baris = Array.isArray(body.baris) ? body.baris : [];

  const rows = await withClient(async (client) => {
    await client.query("BEGIN");
    try {
      await client.query(`DELETE FROM audit_cross_check WHERE sesi_id = $1`, [sesiId]);
      for (const it of baris) {
        const o = (it ?? {}) as Record<string, unknown>;
        const bahan = typeof o.bahan === "string" ? o.bahan.trim() : "";
        if (!bahan) continue;
        await client.query(
          `INSERT INTO audit_cross_check
             (sesi_id, bahan, satuan, po, receiving, storage, production, waste, output_porsi, gap_catatan)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [
            sesiId,
            bahan,
            typeof o.satuan === "string" && o.satuan.trim() ? o.satuan.trim() : "kg",
            num(o.po),
            num(o.receiving),
            num(o.storage),
            num(o.production),
            num(o.waste),
            Math.round(num(o.output_porsi)),
            typeof o.gap_catatan === "string" ? o.gap_catatan : "",
          ],
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
    const res = await client.query<AuditCrossCheck>(
      `SELECT id, sesi_id, bahan, satuan, po, receiving, storage, production,
              waste, output_porsi, gap_catatan
         FROM audit_cross_check WHERE sesi_id = $1 ORDER BY id`,
      [sesiId],
    );
    return res.rows;
  });

  return ok({ cross_check: rows });
});
