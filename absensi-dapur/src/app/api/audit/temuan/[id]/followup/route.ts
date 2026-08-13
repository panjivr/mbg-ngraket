import { NextRequest } from "next/server";
import { ok, fail, route } from "@/lib/api";
import { requireAkses } from "@/lib/session";
import { withClient } from "@/lib/db";
import { eskalasiTingkat, type Tingkat } from "@/lib/audit-risk";
import { localDate } from "@/lib/time";
import type { AuditTemuan, AuditTemuanFollowup, FollowupStatus } from "@/lib/audit-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUS: FollowupStatus[] = [
  "belum_sesuai",
  "improvement",
  "closed",
  "masih_terjadi",
];
const TINGKAT: Tingkat[] = ["minor", "mayor", "kritis"];
const ESKALASI_AMBANG = 3; // 3× "masih_terjadi" beruntun -> naik tingkat.

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/audit/temuan/[id]/followup — riwayat follow-up satu temuan. */
export const GET = route(async (req: NextRequest, ctx: Ctx) => {
  const me = await requireAkses("audit");
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return fail(400, "ID tidak valid.");

  const rows = await withClient(async (client) => {
    const own = await client.query(
      `SELECT id FROM audit_temuan WHERE id = $1 AND sppg_id IS NOT DISTINCT FROM $2`,
      [id, me.sppg_id ?? null],
    );
    if (!own.rows[0]) return null;
    const r = await client.query<AuditTemuanFollowup>(
      `SELECT id, temuan_id, minggu_ke, to_char(tanggal_cek,'YYYY-MM-DD') AS tanggal_cek,
              status, catatan, created_at
         FROM audit_temuan_followup WHERE temuan_id = $1
        ORDER BY minggu_ke, id`,
      [id],
    );
    return r.rows;
  });
  if (rows === null) return fail(404, "Temuan tidak ditemukan.");
  return ok({ followup: rows });
});

/**
 * POST /api/audit/temuan/[id]/followup { minggu_ke?, tanggal_cek?, status, catatan? }
 * Catat follow-up mingguan. Auto-eskalasi tingkat temuan bila 3× "masih_terjadi"
 * beruntun; status "closed" pada follow-up ikut menutup temuan.
 */
export const POST = route(async (req: NextRequest, ctx: Ctx) => {
  const me = await requireAkses("audit");
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id) || id <= 0) return fail(400, "ID tidak valid.");
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const status = STATUS.includes(body.status as FollowupStatus)
    ? (body.status as FollowupStatus)
    : null;
  if (!status) return fail(400, "Status follow-up tidak valid.");
  const tanggalCek =
    typeof body.tanggal_cek === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.tanggal_cek)
      ? body.tanggal_cek
      : localDate();
  const catatan = typeof body.catatan === "string" ? body.catatan : "";

  const result = await withClient(async (client) => {
    await client.query("BEGIN");
    try {
      const own = await client.query<{ tingkat: string }>(
        `SELECT tingkat FROM audit_temuan
          WHERE id = $1 AND sppg_id IS NOT DISTINCT FROM $2 FOR UPDATE`,
        [id, me.sppg_id ?? null],
      );
      if (!own.rows[0]) {
        await client.query("ROLLBACK");
        return { notFound: true as const };
      }

      // minggu_ke: pakai yang dikirim, atau lanjut dari maksimum + 1.
      let mingguKe = Number(body.minggu_ke);
      if (!Number.isInteger(mingguKe) || mingguKe <= 0) {
        const mx = await client.query<{ mx: number | null }>(
          `SELECT MAX(minggu_ke) AS mx FROM audit_temuan_followup WHERE temuan_id = $1`,
          [id],
        );
        mingguKe = (mx.rows[0]?.mx ?? 0) + 1;
      }

      const ins = await client.query<AuditTemuanFollowup>(
        `INSERT INTO audit_temuan_followup (temuan_id, minggu_ke, tanggal_cek, status, catatan)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, temuan_id, minggu_ke, to_char(tanggal_cek,'YYYY-MM-DD') AS tanggal_cek,
                   status, catatan, created_at`,
        [id, mingguKe, tanggalCek, status, catatan],
      );

      // Auto-eskalasi: cek 3 follow-up terakhir semuanya "masih_terjadi".
      let tingkatBaru: string | null = null;
      const last = await client.query<{ status: string }>(
        `SELECT status FROM audit_temuan_followup WHERE temuan_id = $1
          ORDER BY minggu_ke DESC, id DESC LIMIT $2`,
        [id, ESKALASI_AMBANG],
      );
      const beruntun =
        last.rows.length >= ESKALASI_AMBANG &&
        last.rows.every((r) => r.status === "masih_terjadi");
      if (beruntun && TINGKAT.includes(own.rows[0].tingkat as Tingkat)) {
        tingkatBaru = eskalasiTingkat(own.rows[0].tingkat as Tingkat);
      }

      // Sinkronkan status/tingkat temuan induk, kembalikan baris temuan terbaru
      // agar badge di register ikut ter-update (kontrak client: { followup, temuan }).
      const statusTemuan =
        status === "closed" ? "closed" : status === "improvement" ? "improvement" : null;
      const upd = await client.query<AuditTemuan>(
        `UPDATE audit_temuan SET
            tingkat = COALESCE($2, tingkat),
            status  = COALESCE($3, status),
            updated_at = now()
          WHERE id = $1
          RETURNING id, sppg_id, sesi_id, auditor_id, waktu, area, kategori, observasi,
                    statement_, bukti, foto, standar_sop, gap, kemungkinan, dampak,
                    risk_score, tingkat, status, rekomendasi, created_at, updated_at`,
        [id, tingkatBaru, statusTemuan],
      );

      await client.query("COMMIT");
      return { followup: ins.rows[0], temuan: upd.rows[0], eskalasi: tingkatBaru };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  });

  if ("notFound" in result) return fail(404, "Temuan tidak ditemukan.");
  return ok(result);
});
