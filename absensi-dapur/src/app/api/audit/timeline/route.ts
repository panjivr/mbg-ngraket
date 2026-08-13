import { NextRequest } from "next/server";
import { ok, fail, route } from "@/lib/api";
import { requireAkses } from "@/lib/session";
import { query, withClient } from "@/lib/db";
import type { AuditTimeline, TimelineStatus } from "@/lib/audit-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;
const STATUS: TimelineStatus[] = ["normal", "over_time", "lebih_awal"];

async function sesiMilikku(sesiId: number, uid: number): Promise<boolean> {
  const r = await query<{ id: number }>(
    `SELECT id FROM audit_sesi WHERE id = $1 AND auditor_id = $2`,
    [sesiId, uid],
  );
  return !!r[0];
}

function jam(raw: unknown): string | null {
  return typeof raw === "string" && TIME_RE.test(raw) ? raw : null;
}

/**
 * GET /api/audit/timeline?sesi_id=123
 * Daftar baris timeline (motion study) untuk satu sesi, urut kolom urutan.
 */
export const GET = route(async (req: NextRequest) => {
  const me = await requireAkses("audit");
  const sesiId = Number(new URL(req.url).searchParams.get("sesi_id"));
  if (!Number.isInteger(sesiId) || sesiId <= 0)
    return fail(400, "sesi_id tidak valid.");
  if (!(await sesiMilikku(sesiId, me.uid)))
    return fail(404, "Sesi tidak ditemukan.");

  const rows = await query<AuditTimeline>(
    `SELECT id, sesi_id, proses, to_char(mulai,'HH24:MI') AS mulai,
            to_char(selesai,'HH24:MI') AS selesai, durasi_menit, status,
            catatan, urutan
       FROM audit_timeline WHERE sesi_id = $1 ORDER BY urutan, id`,
    [sesiId],
  );
  return ok({ timeline: rows });
});

/**
 * PUT /api/audit/timeline { sesi_id, baris: [{ proses, mulai?, selesai?, status?, catatan? }] }
 * Ganti seluruh daftar timeline sesi (hapus lalu isi ulang) dalam satu transaksi.
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
      await client.query(`DELETE FROM audit_timeline WHERE sesi_id = $1`, [sesiId]);
      let urutan = 0;
      for (const it of baris) {
        const o = (it ?? {}) as Record<string, unknown>;
        const proses = typeof o.proses === "string" ? o.proses.trim() : "";
        if (!proses) continue;
        const status = STATUS.includes(o.status as TimelineStatus)
          ? (o.status as TimelineStatus)
          : "normal";
        await client.query(
          `INSERT INTO audit_timeline (sesi_id, proses, mulai, selesai, status, catatan, urutan)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            sesiId,
            proses,
            jam(o.mulai),
            jam(o.selesai),
            status,
            typeof o.catatan === "string" ? o.catatan : "",
            urutan++,
          ],
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
    const res = await client.query<AuditTimeline>(
      `SELECT id, sesi_id, proses, to_char(mulai,'HH24:MI') AS mulai,
              to_char(selesai,'HH24:MI') AS selesai, durasi_menit, status,
              catatan, urutan
         FROM audit_timeline WHERE sesi_id = $1 ORDER BY urutan, id`,
      [sesiId],
    );
    return res.rows;
  });

  return ok({ timeline: rows });
});
