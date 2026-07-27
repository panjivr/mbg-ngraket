import { NextRequest } from "next/server";
import { requireHr } from "@/lib/session";
import { query, withClient } from "@/lib/db";
import { ok, fail, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STATUS = ["penuh", "setengah", "sakit", "izin", "alpha", "libur"];

// HR menyimpan penyesuaian slip per hari untuk satu pegawai.
// body: { user, items: [{ tanggal, status, upah, lembur, catatan, reset? }] }
export const POST = route(async (req: NextRequest) => {
  const hr = await requireHr();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const userId = parseInt(String(b.user ?? ""), 10);
  if (!Number.isFinite(userId)) return fail(400, "Pegawai tidak valid.");

  // Pastikan pegawai milik dapur ini.
  const milik = await query<{ id: number }>(
    `SELECT id FROM users WHERE id = $1 AND sppg_id = $2`,
    [userId, hr.sppg_id],
  );
  if (!milik.length) return fail(404, "Pegawai tidak ditemukan.");

  const items = Array.isArray(b.items) ? (b.items as Record<string, unknown>[]) : [];

  await withClient(async (client) => {
    await client.query("BEGIN");
    try {
      for (const it of items) {
        const tanggal = String(it.tanggal ?? "");
        if (!DATE_RE.test(tanggal)) continue;
        if (it.reset === true) {
          await client.query(
            `DELETE FROM slip_adjust WHERE user_id = $1 AND tanggal = $2`,
            [userId, tanggal],
          );
          continue;
        }
        const status = STATUS.includes(String(it.status)) ? String(it.status) : "penuh";
        const upah = Math.max(0, Math.round(Number(it.upah)) || 0);
        const lembur = it.lembur === true;
        const catatan = String(it.catatan ?? "").slice(0, 200);
        await client.query(
          `INSERT INTO slip_adjust (sppg_id, user_id, tanggal, status, upah, lembur, catatan)
           VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (user_id, tanggal) DO UPDATE
             SET status = EXCLUDED.status, upah = EXCLUDED.upah,
                 lembur = EXCLUDED.lembur, catatan = EXCLUDED.catatan, sppg_id = EXCLUDED.sppg_id`,
          [hr.sppg_id, userId, tanggal, status, upah, lembur, catatan],
        );
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    }
  });

  return ok({ ok: true });
});
