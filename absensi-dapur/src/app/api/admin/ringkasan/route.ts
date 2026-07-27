import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { getSppg } from "@/lib/sppg";
import { ok, route } from "@/lib/api";
import { localDate } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const rupiah = (n: number) => "Rp " + new Intl.NumberFormat("id-ID").format(n);

/**
 * Ringkasan operasional harian dalam bentuk teks siap-tempel (mis. ke grup
 * WhatsApp): kehadiran, distribusi (porsi & pagu), dan status stok gudang.
 * Menggabungkan sumber data yang sama dengan dashboard & stats.
 */
export const GET = route(async () => {
  const admin = await requireAdmin();
  const sppgId = admin.sppg_id as number;
  const sppg = await getSppg(sppgId);
  const tz = sppg?.tz || "Asia/Jakarta";
  const tanggal = localDate(tz);
  const hb = sppg?.harga_besar ?? 10000;
  const hk = sppg?.harga_kecil ?? 8000;
  const h3 = sppg?.harga_b3 ?? 8000;
  const namaDapur = (sppg?.nama || "Dapur").replace(/^SPPG\s+/i, "");

  const [statRows, dist, gud, menuRow] = await Promise.all([
    query<{ total: string; hadir: string; terlambat: string; pulang: string }>(
      `SELECT
         (SELECT COUNT(*) FROM users WHERE aktif = TRUE AND sppg_id = $2)::text AS total,
         (SELECT COUNT(DISTINCT a.user_id) FROM attendance a JOIN users u ON u.id = a.user_id
            WHERE COALESCE(a.shift_tanggal, a.tanggal) = $1 AND a.check_in IS NOT NULL AND u.sppg_id = $2)::text AS hadir,
         (SELECT COUNT(*) FROM attendance a JOIN users u ON u.id = a.user_id
            WHERE COALESCE(a.shift_tanggal, a.tanggal) = $1 AND a.status_masuk = 'Terlambat' AND u.sppg_id = $2)::text AS terlambat,
         (SELECT COUNT(*) FROM attendance a JOIN users u ON u.id = a.user_id
            WHERE COALESCE(a.shift_tanggal, a.tanggal) = $1 AND a.check_out IS NOT NULL AND u.sppg_id = $2)::text AS pulang`,
      [tanggal, sppgId],
    ),
    query<{ besar: string; kecil: string; b3: string }>(
      `WITH d AS (SELECT id FROM distribusi WHERE sppg_id = $1 AND tanggal = $2),
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
         COALESCE(SUM(CASE WHEN ikut THEN b3 ELSE 0 END),0)::text AS b3
       FROM rows`,
      [sppgId, tanggal],
    ),
    query<{ menipis: string; habis: string }>(
      `SELECT COUNT(*) FILTER (WHERE stok > 0 AND stok <= stok_min)::text AS menipis,
              COUNT(*) FILTER (WHERE stok <= 0)::text AS habis
         FROM barang WHERE sppg_id = $1 AND aktif = TRUE`,
      [sppgId],
    ),
    query<{ menu: string }>(`SELECT menu FROM distribusi WHERE sppg_id = $1 AND tanggal = $2`, [sppgId, tanggal]),
  ]);

  const s = statRows[0];
  const total = Number(s?.total || 0);
  const hadir = Number(s?.hadir || 0);
  const terlambat = Number(s?.terlambat || 0);
  const belum = Math.max(total - hadir, 0);
  const tepat = Math.max(hadir - Math.min(terlambat, hadir), 0);

  const besar = Number(dist[0]?.besar || 0);
  const kecil = Number(dist[0]?.kecil || 0);
  const b3 = Number(dist[0]?.b3 || 0);
  const totalPorsi = besar + kecil + b3;
  const pagu = besar * hb + kecil * hk + b3 * h3;
  const menu = menuRow[0]?.menu || "";

  const menipis = Number(gud[0]?.menipis || 0);
  const habis = Number(gud[0]?.habis || 0);

  const tglPanjang = new Intl.DateTimeFormat("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: tz,
  }).format(new Date(tanggal + "T00:00:00"));

  const L: string[] = [];
  L.push(`📋 *RINGKASAN HARIAN — SPPG ${namaDapur.toUpperCase()}*`);
  L.push(tglPanjang);
  L.push("");
  L.push("👥 *Kehadiran*");
  L.push(`• Hadir: ${hadir}/${total} (${tepat} tepat, ${terlambat} telat)`);
  L.push(`• Sudah pulang: ${Number(s?.pulang || 0)}`);
  L.push(`• Belum absen: ${belum}`);
  L.push("");
  L.push("🚚 *Distribusi*");
  if (menu) L.push(`• Menu: ${menu}`);
  L.push(`• Porsi: besar ${besar}, kecil ${kecil}, B3 ${b3}`);
  L.push(`• Total: ${totalPorsi} porsi`);
  L.push(`• Pagu: ${rupiah(pagu)}`);
  L.push("");
  L.push("📦 *Stok Gudang*");
  if (habis > 0 || menipis > 0) {
    if (habis > 0) L.push(`• ⛔ ${habis} barang habis`);
    if (menipis > 0) L.push(`• ⚠️ ${menipis} barang menipis`);
  } else {
    L.push("• ✅ Stok aman");
  }
  L.push("");
  L.push("_Dikirim via Bismillah Software MBG_");

  return ok({
    tanggal,
    teks: L.join("\n"),
    ringkas: {
      hadir, total, terlambat, tepat, belum,
      besar, kecil, b3, totalPorsi, pagu, menu, menipis, habis,
    },
  });
});
