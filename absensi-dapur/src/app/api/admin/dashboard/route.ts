import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { getSppg } from "@/lib/sppg";
import { ok, route } from "@/lib/api";
import { localDate } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Ringkasan operasional untuk dashboard: distribusi (porsi & pagu) hari ini,
// status stok gudang, dan menu hari ini. PJ dihitung sebagai porsi besar.
export const GET = route(async () => {
  const admin = await requireAdmin();
  const sppg = await getSppg(admin.sppg_id as number);
  const tanggal = localDate(sppg?.tz || "Asia/Jakarta");
  const hb = sppg?.harga_besar ?? 10000;
  const hk = sppg?.harga_kecil ?? 8000;
  const h3 = sppg?.harga_b3 ?? 8000;

  const [dist, gud, menuRow] = await Promise.all([
    query<{ besar: string; kecil: string; b3: string; ikut_count: string; total_count: string }>(
      `WITH d AS (SELECT id, menu FROM distribusi WHERE sppg_id = $1 AND tanggal = $2),
       rows AS (
         SELECT p.pj,
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
         COALESCE(SUM(CASE WHEN ikut THEN besar + pj ELSE 0 END),0)::text AS besar,
         COALESCE(SUM(CASE WHEN ikut THEN kecil ELSE 0 END),0)::text AS kecil,
         COALESCE(SUM(CASE WHEN ikut THEN b3 ELSE 0 END),0)::text AS b3,
         COALESCE(SUM(CASE WHEN ikut THEN 1 ELSE 0 END),0)::text AS ikut_count,
         COUNT(*)::text AS total_count
       FROM rows`,
      [admin.sppg_id, tanggal],
    ),
    query<{ total: string; habis: string; menipis: string; aman: string }>(
      `SELECT COUNT(*)::text AS total,
              COUNT(*) FILTER (WHERE stok <= 0)::text AS habis,
              COUNT(*) FILTER (WHERE stok > 0 AND stok <= stok_min)::text AS menipis,
              COUNT(*) FILTER (WHERE stok > stok_min)::text AS aman
         FROM barang WHERE sppg_id = $1`,
      [admin.sppg_id],
    ),
    query<{ menu: string }>(`SELECT menu FROM distribusi WHERE sppg_id = $1 AND tanggal = $2`, [admin.sppg_id, tanggal]),
  ]);

  const d = dist[0];
  const besar = Number(d?.besar || 0);
  const kecil = Number(d?.kecil || 0);
  const b3 = Number(d?.b3 || 0);
  const g = gud[0];

  return ok({
    tanggal,
    menu: menuRow[0]?.menu || "",
    distribusi: {
      besar, kecil, b3,
      porsi: besar + kecil + b3,
      pagu: besar * hb + kecil * hk + b3 * h3,
      ikut: Number(d?.ikut_count || 0),
      total: Number(d?.total_count || 0),
    },
    gudang: {
      total: Number(g?.total || 0),
      habis: Number(g?.habis || 0),
      menipis: Number(g?.menipis || 0),
      aman: Number(g?.aman || 0),
    },
  });
});
