import { NextRequest } from "next/server";
import { withClient } from "@/lib/db";
import { requireGudang } from "@/lib/session";
import { getSppg } from "@/lib/sppg";
import { ok, fail, route } from "@/lib/api";
import { localDate } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const rnum = (n: number) => Math.round((n || 0) * 1000) / 1000;

// POST — Kuras gudang: set stok = 0 untuk barang terpilih (mis. barang habis),
// dicatat sebagai mutasi opname per barang. Butuh akses gudang penuh.
// body: { ids: number[], keterangan?: string, tanggal?: string }
export const POST = route(async (req: NextRequest) => {
  const admin = await requireGudang("full");
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const idsRaw = Array.isArray(b.ids) ? b.ids : [];
  const ids = [...new Set(idsRaw.map((x) => parseInt(String(x), 10)).filter((n) => Number.isFinite(n)))];
  if (ids.length === 0) return fail(400, "Tidak ada barang yang dipilih.");
  if (ids.length > 1000) return fail(400, "Terlalu banyak barang sekaligus.");
  const catatan = String(b.keterangan ?? "").trim().slice(0, 200);
  const sppg = await getSppg(admin.sppg_id as number);
  const tz = sppg?.tz || "Asia/Jakarta";
  const tanggal = DATE_RE.test(String(b.tanggal)) ? String(b.tanggal) : localDate(tz);

  const count = await withClient(async (client) => {
    await client.query("BEGIN");
    try {
      // Ambil hanya barang yang benar-benar milik dapur ini & stok > 0.
      const rows = (
        await client.query<{ id: number; stok: number }>(
          `SELECT id, stok::float8 AS stok FROM barang
             WHERE sppg_id = $1 AND id = ANY($2::int[]) AND stok <> 0 FOR UPDATE`,
          [admin.sppg_id, ids],
        )
      ).rows;
      for (const r of rows) {
        const ket = `Kuras gudang: sistem ${rnum(r.stok)} → 0 (barang habis)${catatan ? " · " + catatan : ""}`;
        await client.query(`UPDATE barang SET stok = 0 WHERE id = $1`, [r.id]);
        await client.query(
          `INSERT INTO stok_mutasi (sppg_id, barang_id, tanggal, tipe, jumlah, stok_sesudah, keterangan, oleh)
           VALUES ($1,$2,$3,'opname',0,0,$4,$5)`,
          [admin.sppg_id, r.id, tanggal, ket, admin.nama],
        );
      }
      await client.query("COMMIT");
      return rows.length;
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    }
  });

  return ok({ dikuras: count });
});
