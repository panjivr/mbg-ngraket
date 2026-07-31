import { query } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getSppg } from "@/lib/sppg";
import { ok, route } from "@/lib/api";
import { localDate } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Beban dapur hari ini untuk info semua tim (bisa diakses staf).
 * Ambil dari distribusi: rincian porsi per sasaran (serdik besar/kecil,
 * balita, bumil, busui), total porsi (= jumlah ompreng), dan menu.
 * PJ dihitung sebagai porsi besar (konsisten dengan dashboard).
 */
export const GET = route(async () => {
  const s = await requireSession();
  const sppg = await getSppg(s.sppg_id as number);
  const tanggal = localDate(sppg?.tz || "Asia/Jakarta");

  const [agg, menuRow] = await Promise.all([
    query<{ besar: number; kecil: number; balita: number; bumil: number; busui: number; b3: number }>(
      `WITH d AS (SELECT id FROM distribusi WHERE sppg_id = $1 AND tanggal = $2),
       rows AS (
         SELECT p.pj, p.kategori,
           COALESCE(i.besar, p.besar) AS besar,
           COALESCE(i.kecil, p.kecil) AS kecil,
           COALESCE(i.b3, p.b3) AS b3,
           COALESCE(i.ikut, TRUE) AS ikut
         FROM penerima p
         LEFT JOIN d ON TRUE
         LEFT JOIN distribusi_item i ON i.distribusi_id = d.id AND i.penerima_id = p.id
         WHERE p.sppg_id = $1 AND p.aktif = TRUE
       )
       SELECT
         COALESCE(SUM(CASE WHEN ikut THEN besar + pj ELSE 0 END),0)::float8 AS besar,
         COALESCE(SUM(CASE WHEN ikut THEN kecil ELSE 0 END),0)::float8 AS kecil,
         COALESCE(SUM(CASE WHEN ikut AND kategori = 'balita' THEN b3 ELSE 0 END),0)::float8 AS balita,
         COALESCE(SUM(CASE WHEN ikut AND kategori = 'bumil' THEN b3 ELSE 0 END),0)::float8 AS bumil,
         COALESCE(SUM(CASE WHEN ikut AND kategori = 'busui' THEN b3 ELSE 0 END),0)::float8 AS busui,
         COALESCE(SUM(CASE WHEN ikut THEN b3 ELSE 0 END),0)::float8 AS b3
       FROM rows`,
      [s.sppg_id, tanggal],
    ),
    query<{ menu: string }>(`SELECT menu FROM distribusi WHERE sppg_id = $1 AND tanggal = $2`, [s.sppg_id, tanggal]),
  ]);

  const a = agg[0] || { besar: 0, kecil: 0, balita: 0, bumil: 0, busui: 0, b3: 0 };
  return ok({
    tanggal,
    menu: menuRow[0]?.menu || "",
    besar: a.besar,
    kecil: a.kecil,
    balita: a.balita,
    bumil: a.bumil,
    busui: a.busui,
    total: a.besar + a.kecil + a.b3,
  });
});
