import { NextRequest } from "next/server";
import { ok, fail, route } from "@/lib/api";
import { requireAkses } from "@/lib/session";
import { query, withClient } from "@/lib/db";
import { PENYEBAB_WASTE } from "@/lib/audit-risk";
import type { AuditFoodWaste, FotoBukti } from "@/lib/audit-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function sesiMilikku(sesiId: number, uid: number): Promise<boolean> {
  const r = await query<{ id: number }>(
    `SELECT id FROM audit_sesi WHERE id = $1 AND auditor_id = $2`,
    [sesiId, uid],
  );
  return !!r[0];
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

/** GET /api/audit/waste?sesi_id=123 — daftar food waste satu sesi. */
export const GET = route(async (req: NextRequest) => {
  const me = await requireAkses("audit");
  const sesiId = Number(new URL(req.url).searchParams.get("sesi_id"));
  if (!Number.isInteger(sesiId) || sesiId <= 0)
    return fail(400, "sesi_id tidak valid.");
  if (!(await sesiMilikku(sesiId, me.uid)))
    return fail(404, "Sesi tidak ditemukan.");

  const rows = await query<AuditFoodWaste>(
    `SELECT id, sesi_id, jenis, penyebab, jumlah, satuan, catatan, foto
       FROM audit_food_waste WHERE sesi_id = $1 ORDER BY id`,
    [sesiId],
  );
  return ok({ waste: rows });
});

/**
 * PUT /api/audit/waste { sesi_id, baris: [{ jenis, penyebab?, jumlah?, satuan?, catatan?, foto? }] }
 * Ganti seluruh daftar waste sesi (hapus lalu isi ulang) dalam satu transaksi.
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
      await client.query(`DELETE FROM audit_food_waste WHERE sesi_id = $1`, [sesiId]);
      for (const it of baris) {
        const o = (it ?? {}) as Record<string, unknown>;
        const jenis = typeof o.jenis === "string" ? o.jenis.trim() : "";
        if (!jenis) continue;
        const penyebab =
          typeof o.penyebab === "string" &&
          (PENYEBAB_WASTE as readonly string[]).includes(o.penyebab)
            ? o.penyebab
            : "proses";
        const jumlah = Math.max(0, Number(o.jumlah) || 0);
        await client.query(
          `INSERT INTO audit_food_waste (sesi_id, jenis, penyebab, jumlah, satuan, catatan, foto)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
          [
            sesiId,
            jenis,
            penyebab,
            jumlah,
            typeof o.satuan === "string" && o.satuan.trim() ? o.satuan.trim() : "kg",
            typeof o.catatan === "string" ? o.catatan : "",
            JSON.stringify(bersihkanFoto(o.foto)),
          ],
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
    const res = await client.query<AuditFoodWaste>(
      `SELECT id, sesi_id, jenis, penyebab, jumlah, satuan, catatan, foto
         FROM audit_food_waste WHERE sesi_id = $1 ORDER BY id`,
      [sesiId],
    );
    return res.rows;
  });

  return ok({ waste: rows });
});
