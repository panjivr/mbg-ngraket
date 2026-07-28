import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAkses } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import { localDate } from "@/lib/time";
import {
  agregasiBelanja,
  porsiSasaran,
  type KontribusiMenu,
  type Porsi,
  type Sasaran,
} from "@/lib/jadwal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function tambahHari(tgl: string, n: number): string {
  const [y, m, d] = tgl.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

interface JadwalRow {
  tanggal: string;
  sasaran: Sasaran;
  menu_id: number;
  nama: string;
  porsi_dasar: number;
}
interface BahanRow {
  menu_id: number;
  barang_id: number | null;
  nama: string;
  satuan: string;
  jumlah_dasar: number;
  harga: number;
}

// GET: daftar belanja teragregasi untuk satu periode (per hari + total periode).
export const GET = route(async (req: NextRequest) => {
  const admin = await requireAkses("distribusi");
  const url = new URL(req.url);
  const mulai = url.searchParams.get("mulai") || localDate("Asia/Jakarta");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(mulai)) return fail(400, "Tanggal mulai tidak valid.");
  const hari = Math.min(31, Math.max(1, parseInt(url.searchParams.get("hari") || "14", 10) || 14));
  const selesai = tambahHari(mulai, hari - 1);
  const tanggalList = Array.from({ length: hari }, (_, i) => tambahHari(mulai, i));

  const jadwal = await query<JadwalRow>(
    `SELECT j.tanggal::text AS tanggal, j.sasaran, j.menu_id, m.nama, m.porsi_dasar
       FROM jadwal_menu j JOIN menu m ON m.id = j.menu_id
      WHERE j.sppg_id = $1 AND j.tanggal BETWEEN $2 AND $3
      ORDER BY j.tanggal ASC, j.sasaran ASC, j.urutan ASC`,
    [admin.sppg_id, mulai, selesai],
  );

  const menuIds = [...new Set(jadwal.map((j) => j.menu_id))];
  const bahan = menuIds.length
    ? await query<BahanRow>(
        `SELECT menu_id, barang_id, nama, satuan,
                jumlah_dasar::float8 AS jumlah_dasar, harga::float8 AS harga
           FROM menu_bahan WHERE menu_id = ANY($1::int[])`,
        [menuIds],
      )
    : [];
  const bahanByMenu = new Map<number, BahanRow[]>();
  for (const b of bahan) {
    if (!bahanByMenu.has(b.menu_id)) bahanByMenu.set(b.menu_id, []);
    bahanByMenu.get(b.menu_id)!.push(b);
  }

  // Porsi default (penerima terdaftar) + override per tanggal.
  const pd = await query<Porsi>(
    `SELECT COALESCE(SUM(besar),0)::int AS besar,
            COALESCE(SUM(kecil),0)::int AS kecil,
            COALESCE(SUM(b3),0)::int    AS b3
       FROM penerima WHERE sppg_id = $1 AND aktif = TRUE`,
    [admin.sppg_id],
  );
  const porsiDefault: Porsi = pd[0] ?? { besar: 0, kecil: 0, b3: 0 };
  const overrides = await query<{ tanggal: string; besar: number; kecil: number; b3: number }>(
    `SELECT tanggal::text AS tanggal, besar, kecil, b3
       FROM jadwal_porsi WHERE sppg_id = $1 AND tanggal BETWEEN $2 AND $3`,
    [admin.sppg_id, mulai, selesai],
  );
  const ovMap = new Map(overrides.map((o) => [o.tanggal, { besar: o.besar, kecil: o.kecil, b3: o.b3 }]));

  const semuaKontribusi: KontribusiMenu[] = [];
  const hariList = tanggalList.map((tanggal) => {
    const porsi = ovMap.get(tanggal) ?? porsiDefault;
    const dayJadwal = jadwal.filter((j) => j.tanggal === tanggal);
    const kontribusi: KontribusiMenu[] = dayJadwal.map((j) => ({
      porsiDasar: j.porsi_dasar,
      porsi: porsiSasaran(porsi, j.sasaran),
      bahan: bahanByMenu.get(j.menu_id) ?? [],
    }));
    semuaKontribusi.push(...kontribusi);
    const { baris, total } = agregasiBelanja(kontribusi);
    return {
      tanggal,
      porsi,
      menus: dayJadwal.map((j) => ({ nama: j.nama, sasaran: j.sasaran })),
      baris,
      total,
    };
  });

  const periode = agregasiBelanja(semuaKontribusi);

  // Realisasi harga beli aktual (HARGA AK) tersimpan untuk periode ini.
  const akRows = await query<{ bahan_key: string; harga_ak: number }>(
    `SELECT bahan_key, harga_ak::float8 AS harga_ak
       FROM belanja_ak WHERE sppg_id = $1 AND mulai = $2 AND hari = $3`,
    [admin.sppg_id, mulai, hari],
  );
  const akMap = new Map(akRows.map((r) => [r.bahan_key, r.harga_ak]));
  const barisBaru = periode.baris.map((b) => {
    const harga_ak = akMap.get(b.key) ?? 0;
    const subtotal_ak = Math.round(b.jumlah * harga_ak);
    return { ...b, harga_ak, subtotal_ak };
  });
  const totalAk = barisBaru.reduce((a, r) => a + r.subtotal_ak, 0);

  return ok({
    mulai,
    selesai,
    hari,
    porsiDefault,
    hariList,
    periode: { baris: barisBaru, total: periode.total, totalAk },
  });
});

// PUT: simpan/ubah harga beli aktual (HARGA AK) satu bahan untuk satu periode.
export const PUT = route(async (req: NextRequest) => {
  const admin = await requireAkses("distribusi");
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const mulai = String(b.mulai ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(mulai)) return fail(400, "Tanggal tidak valid.");
  const hari = Math.min(31, Math.max(1, Math.round(Number(b.hari)) || 0));
  if (!hari) return fail(400, "Periode tidak valid.");
  const bahanKey = String(b.bahan_key ?? "").trim().slice(0, 200);
  if (!bahanKey) return fail(400, "Bahan tidak valid.");
  const hargaAk = Math.max(0, Number(b.harga_ak) || 0);

  await query(
    `INSERT INTO belanja_ak (sppg_id, mulai, hari, bahan_key, harga_ak)
       VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (sppg_id, mulai, hari, bahan_key)
       DO UPDATE SET harga_ak = $5`,
    [admin.sppg_id, mulai, hari, bahanKey, hargaAk],
  );

  return ok({ ok: true });
});
