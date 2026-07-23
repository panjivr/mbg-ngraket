import { NextRequest } from "next/server";
import { query, withClient } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { getSppg } from "@/lib/sppg";
import { ok, fail, route } from "@/lib/api";
import { localDate } from "@/lib/time";
import type { Mutasi, TipeMutasi } from "@/lib/gudang";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Riwayat mutasi: ?barang_id= (satu barang) atau semua (terbaru).
export const GET = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const bid = req.nextUrl.searchParams.get("barang_id");
  const params: unknown[] = [admin.sppg_id];
  let extra = "";
  if (bid && Number.isFinite(parseInt(bid, 10))) { params.push(parseInt(bid, 10)); extra = ` AND barang_id = $2`; }
  const rows = await query<Mutasi>(
    `SELECT id, barang_id, tanggal, tipe, jumlah::float8 AS jumlah, stok_sesudah::float8 AS stok_sesudah, keterangan, oleh, created_at
       FROM stok_mutasi WHERE sppg_id = $1${extra} ORDER BY created_at DESC LIMIT 300`,
    params,
  );
  return ok({ mutasi: rows });
});

export const POST = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const barang_id = parseInt(String(b.barang_id), 10);
  if (!Number.isFinite(barang_id)) return fail(400, "Barang tidak valid.");
  const tipe = (["masuk", "keluar", "opname"].includes(String(b.tipe)) ? b.tipe : "masuk") as TipeMutasi;
  const jumlah = Math.max(0, Number(b.jumlah) || 0);
  if (jumlah <= 0 && tipe !== "opname") return fail(400, "Jumlah harus lebih dari 0.");
  const keteranganIn = String(b.keterangan ?? "").trim().slice(0, 300);
  const sppg = await getSppg(admin.sppg_id as number);
  const tz = sppg?.tz || "Asia/Jakarta";
  const tanggal = DATE_RE.test(String(b.tanggal)) ? String(b.tanggal) : localDate(tz);

  const result = await withClient(async (client) => {
    await client.query("BEGIN");
    try {
      const cur = (
        await client.query<{ stok: number; nama: string }>(
          `SELECT stok::float8 AS stok, nama FROM barang WHERE id = $1 AND sppg_id = $2 FOR UPDATE`,
          [barang_id, admin.sppg_id],
        )
      ).rows[0];
      if (!cur) { await client.query("ROLLBACK"); return null; }

      let stokBaru = cur.stok;
      let keterangan = keteranganIn;
      if (tipe === "masuk") stokBaru = cur.stok + jumlah;
      else if (tipe === "keluar") stokBaru = Math.max(0, cur.stok - jumlah);
      else {
        // opname: jumlah = hasil hitung fisik; catat selisihnya.
        stokBaru = jumlah;
        const selisih = jumlah - cur.stok;
        const tanda = selisih > 0 ? "+" : "";
        keterangan = `Opname: sistem ${cur.stok} → fisik ${jumlah} (selisih ${tanda}${selisih})${keteranganIn ? " · " + keteranganIn : ""}`;
      }

      await client.query(`UPDATE barang SET stok = $1 WHERE id = $2`, [stokBaru, barang_id]);
      await client.query(
        `INSERT INTO stok_mutasi (sppg_id, barang_id, tanggal, tipe, jumlah, stok_sesudah, keterangan, oleh)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [admin.sppg_id, barang_id, tanggal, tipe, jumlah, stokBaru, keterangan, admin.nama],
      );
      await client.query("COMMIT");
      return { stok: stokBaru };
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    }
  });

  if (!result) return fail(404, "Barang tidak ditemukan.");
  return ok({ ok: true, stok: result.stok });
});
