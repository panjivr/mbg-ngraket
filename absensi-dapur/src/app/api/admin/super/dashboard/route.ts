import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireSuper } from "@/lib/session";
import { ok, route } from "@/lib/api";
import { parseSppgIds } from "@/lib/super";
import { localDate } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Dashboard lintas dapur (super admin). Untuk tanggal & daftar dapur terpilih,
 * mengembalikan per dapur: jumlah karyawan aktif, kehadiran (check-in), porsi
 * distribusi (besar/kecil/b3, PJ dihitung porsi besar), pagu, dan menu.
 * ?tanggal=YYYY-MM-DD (default hari ini) & ?sppg_ids=1,2,3 (default semua).
 */
export const GET = route(async (req: NextRequest) => {
  await requireSuper();
  const sp = req.nextUrl.searchParams;
  const tanggal = DATE_RE.test(sp.get("tanggal") || "") ? sp.get("tanggal")! : localDate("Asia/Jakarta");
  const ids = parseSppgIds(sp.get("sppg_ids"));

  const kitchens = await query<{ id: number; nama: string; hb: number; hk: number; h3: number }>(
    `SELECT id, nama, harga_besar::float8 AS hb, harga_kecil::float8 AS hk, harga_b3::float8 AS h3
       FROM sppg ${ids.length ? "WHERE id = ANY($1)" : ""} ORDER BY nama ASC`,
    ids.length ? [ids] : [],
  );
  const idList = kitchens.map((k) => k.id);
  if (!idList.length) return ok({ tanggal, dapur: [], total: emptyTotal() });

  const [kar, had, porsi, menu] = await Promise.all([
    query<{ sppg_id: number; n: number }>(
      `SELECT sppg_id, COUNT(*)::int AS n FROM users WHERE aktif = TRUE AND sppg_id = ANY($1) GROUP BY sppg_id`,
      [idList],
    ),
    query<{ sppg_id: number; n: number }>(
      `SELECT u.sppg_id, COUNT(DISTINCT a.user_id)::int AS n
         FROM attendance a JOIN users u ON u.id = a.user_id
        WHERE COALESCE(a.shift_tanggal, a.tanggal) = $1 AND a.check_in IS NOT NULL AND u.sppg_id = ANY($2)
        GROUP BY u.sppg_id`,
      [tanggal, idList],
    ),
    query<{ sppg_id: number; besar: number; kecil: number; b3: number; ikut_count: number }>(
      `WITH d AS (SELECT id, sppg_id FROM distribusi WHERE tanggal = $1 AND sppg_id = ANY($2)),
       rows AS (
         SELECT p.sppg_id, p.pj,
           COALESCE(i.besar, p.besar) AS besar,
           COALESCE(i.kecil, p.kecil) AS kecil,
           COALESCE(i.b3, p.b3) AS b3,
           COALESCE(i.ikut, TRUE) AS ikut
         FROM penerima p
         LEFT JOIN d ON d.sppg_id = p.sppg_id
         LEFT JOIN distribusi_item i ON i.distribusi_id = d.id AND i.penerima_id = p.id
         WHERE p.aktif = TRUE AND p.sppg_id = ANY($2)
       )
       SELECT sppg_id,
         COALESCE(SUM(CASE WHEN ikut THEN besar + pj ELSE 0 END),0)::float8 AS besar,
         COALESCE(SUM(CASE WHEN ikut THEN kecil ELSE 0 END),0)::float8 AS kecil,
         COALESCE(SUM(CASE WHEN ikut THEN b3 ELSE 0 END),0)::float8 AS b3,
         COALESCE(SUM(CASE WHEN ikut THEN 1 ELSE 0 END),0)::int AS ikut_count
       FROM rows GROUP BY sppg_id`,
      [tanggal, idList],
    ),
    query<{ sppg_id: number; menu: string }>(
      `SELECT sppg_id, menu FROM distribusi WHERE tanggal = $1 AND sppg_id = ANY($2)`,
      [tanggal, idList],
    ),
  ]);

  const karM = new Map(kar.map((r) => [r.sppg_id, r.n]));
  const hadM = new Map(had.map((r) => [r.sppg_id, r.n]));
  const porM = new Map(porsi.map((r) => [r.sppg_id, r]));
  const menuM = new Map(menu.map((r) => [r.sppg_id, r.menu]));

  const dapur = kitchens.map((k) => {
    const p = porM.get(k.id);
    const besar = p?.besar || 0, kecil = p?.kecil || 0, b3 = p?.b3 || 0;
    return {
      sppg_id: k.id,
      nama: k.nama,
      karyawan: karM.get(k.id) || 0,
      hadir: hadM.get(k.id) || 0,
      besar, kecil, b3,
      porsi: besar + kecil + b3,
      penerima: p?.ikut_count || 0,
      pagu: besar * k.hb + kecil * k.hk + b3 * k.h3,
      menu: menuM.get(k.id) || "",
    };
  });

  const total = dapur.reduce(
    (a, d) => ({
      dapur: a.dapur + 1,
      karyawan: a.karyawan + d.karyawan,
      hadir: a.hadir + d.hadir,
      porsi: a.porsi + d.porsi,
      penerima: a.penerima + d.penerima,
      pagu: a.pagu + d.pagu,
    }),
    emptyTotal(),
  );

  return ok({ tanggal, dapur, total });
});

function emptyTotal() {
  return { dapur: 0, karyawan: 0, hadir: 0, porsi: 0, penerima: 0, pagu: 0 };
}
