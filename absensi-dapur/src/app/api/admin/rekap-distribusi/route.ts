import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { getSppg } from "@/lib/sppg";
import { ok, route } from "@/lib/api";
import { localDate } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Rekap bulanan distribusi & pagu: porsi (besar/kecil/B3) dan biaya pagu per
 * hari untuk satu bulan. Perhitungan porsi memakai override per-hari
 * (distribusi_item) di atas nilai dasar penerima — konsisten dengan dashboard
 * & ringkasan harian. PJ dihitung sebagai porsi besar.
 */
export const GET = route(async (req: Request) => {
  const admin = await requireAdmin();
  const sppgId = admin.sppg_id as number;
  const sppg = await getSppg(sppgId);
  const tz = sppg?.tz || "Asia/Jakarta";
  const hb = sppg?.harga_besar ?? 10000;
  const hk = sppg?.harga_kecil ?? 8000;
  const h3 = sppg?.harga_b3 ?? 8000;

  // Bulan target "YYYY-MM"; default bulan berjalan.
  const url = new URL(req.url);
  const bulanParam = url.searchParams.get("bulan") || "";
  const bulan = /^\d{4}-\d{2}$/.test(bulanParam) ? bulanParam : localDate(tz).slice(0, 7);
  const awal = `${bulan}-01`;
  const [y, m] = bulan.split("-").map(Number);
  const akhir = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`;

  const rows = await query<{
    tanggal: string;
    menu: string;
    besar: string;
    kecil: string;
    b3: string;
  }>(
    `WITH d AS (
       SELECT id, tanggal, menu FROM distribusi
        WHERE sppg_id = $1 AND tanggal >= $2 AND tanggal < $3
     ),
     r AS (
       SELECT d.tanggal, d.menu, p.pj,
         COALESCE(i.besar, p.besar) AS besar,
         COALESCE(i.kecil, p.kecil) AS kecil,
         COALESCE(i.b3, p.b3) AS b3,
         COALESCE(i.ikut, TRUE) AS ikut
       FROM d
       CROSS JOIN penerima p
       LEFT JOIN distribusi_item i ON i.distribusi_id = d.id AND i.penerima_id = p.id
       WHERE p.sppg_id = $1 AND p.aktif = TRUE
     )
     SELECT to_char(tanggal, 'YYYY-MM-DD') AS tanggal,
            COALESCE(MAX(menu), '') AS menu,
            COALESCE(SUM(CASE WHEN ikut THEN besar + pj ELSE 0 END), 0)::text AS besar,
            COALESCE(SUM(CASE WHEN ikut THEN kecil ELSE 0 END), 0)::text AS kecil,
            COALESCE(SUM(CASE WHEN ikut THEN b3 ELSE 0 END), 0)::text AS b3
       FROM r
      GROUP BY tanggal
      ORDER BY tanggal`,
    [sppgId, awal, akhir],
  );

  const hari = rows.map((row) => {
    const besar = Number(row.besar || 0);
    const kecil = Number(row.kecil || 0);
    const b3 = Number(row.b3 || 0);
    return {
      tanggal: row.tanggal,
      menu: row.menu || "",
      besar,
      kecil,
      b3,
      porsi: besar + kecil + b3,
      pagu: besar * hb + kecil * hk + b3 * h3,
    };
  });

  const total = hari.reduce(
    (a, h) => ({
      besar: a.besar + h.besar,
      kecil: a.kecil + h.kecil,
      b3: a.b3 + h.b3,
      porsi: a.porsi + h.porsi,
      pagu: a.pagu + h.pagu,
    }),
    { besar: 0, kecil: 0, b3: 0, porsi: 0, pagu: 0 },
  );

  return ok({
    bulan,
    harga: { besar: hb, kecil: hk, b3: h3 },
    hariAktif: hari.length,
    hari,
    total,
  });
});
