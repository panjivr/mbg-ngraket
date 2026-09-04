import { NextRequest } from "next/server";
import { requireHr } from "@/lib/session";
import { query } from "@/lib/db";
import { ok, fail, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface HariKhusus {
  id: number;
  tanggal: string;
  keterangan: string;
  digaji: boolean;
}

// GET /api/hr/hari-khusus[?from=&to=] — daftar hari khusus dapur (kalender kerja).
export const GET = route(async (req: NextRequest) => {
  const hr = await requireHr();
  const sp = req.nextUrl.searchParams;
  const from = DATE_RE.test(sp.get("from") || "") ? sp.get("from")! : null;
  const to = DATE_RE.test(sp.get("to") || "") ? sp.get("to")! : null;
  const rows =
    from && to
      ? await query<HariKhusus>(
          `SELECT id, tanggal::text AS tanggal, keterangan, digaji
             FROM hari_khusus WHERE sppg_id = $1 AND tanggal BETWEEN $2 AND $3
            ORDER BY tanggal DESC`,
          [hr.sppg_id, from, to],
        )
      : await query<HariKhusus>(
          `SELECT id, tanggal::text AS tanggal, keterangan, digaji
             FROM hari_khusus WHERE sppg_id = $1 ORDER BY tanggal DESC LIMIT 200`,
          [hr.sppg_id],
        );
  return ok({ hari: rows });
});

// POST /api/hr/hari-khusus { tanggal, keterangan?, digaji? } — tambah/ubah (upsert per tanggal).
export const POST = route(async (req: NextRequest) => {
  const hr = await requireHr();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const tanggal = String(b.tanggal ?? "");
  if (!DATE_RE.test(tanggal)) return fail(400, "Tanggal tidak valid.");
  const keterangan = String(b.keterangan ?? "").trim().slice(0, 200);
  const digaji = b.digaji === true;
  const rows = await query<HariKhusus>(
    `INSERT INTO hari_khusus (sppg_id, tanggal, keterangan, digaji)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (sppg_id, tanggal)
       DO UPDATE SET keterangan = EXCLUDED.keterangan, digaji = EXCLUDED.digaji
     RETURNING id, tanggal::text AS tanggal, keterangan, digaji`,
    [hr.sppg_id, tanggal, keterangan, digaji],
  );
  return ok({ hari: rows[0] });
});

// DELETE /api/hr/hari-khusus?tanggal=YYYY-MM-DD — hapus hari khusus.
export const DELETE = route(async (req: NextRequest) => {
  const hr = await requireHr();
  const tanggal = req.nextUrl.searchParams.get("tanggal") || "";
  if (!DATE_RE.test(tanggal)) return fail(400, "Tanggal tidak valid.");
  await query(`DELETE FROM hari_khusus WHERE sppg_id = $1 AND tanggal = $2`, [hr.sppg_id, tanggal]);
  return ok({ deleted: tanggal });
});
