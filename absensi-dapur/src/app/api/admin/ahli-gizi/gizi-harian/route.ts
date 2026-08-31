import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAkses } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import { localDate } from "@/lib/time";
import { type Sasaran } from "@/lib/jadwal";
import {
  rincianGiziPerPorsi,
  KATEGORI_MENU_LABEL,
  normalizeKategoriMenu,
  normalizeKomponen,
  type KomponenGizi,
  type BahanGiziRinci,
} from "@/lib/menu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Baris jadwal + menu untuk satu tanggal (join jadwal_menu → menu).
interface JadwalMenuRow {
  jadwal_id: number;
  sasaran: Sasaran;
  urutan: number;
  menu_id: number;
  nama: string;
  kategori: string;
  porsi_dasar: number;
}
// Baris bahan menu (join menu_bahan).
interface BahanRow {
  menu_id: number;
  nama: string;
  satuan: string;
  jumlah_dasar: number;
  komponen: string;
}

interface MenuGizi {
  jadwal_id: number;
  menu_id: number;
  nama: string;
  waktu: string; // label kategori (Sarapan / Makan Siang / ...)
  bahan: BahanGiziRinci[];
  total: { energi: number; protein: number; lemak: number; karbo: number; serat: number };
  takTerhitung: string[];
}
interface SasaranGizi {
  menus: MenuGizi[];
  total: { energi: number; protein: number; lemak: number; karbo: number; serat: number };
}

function totalKosong() {
  return { energi: 0, protein: 0, lemak: 0, karbo: 0, serat: 0 };
}

/**
 * GET /api/admin/ahli-gizi/gizi-harian?tanggal=YYYY-MM-DD
 * Agregasi kandungan gizi seluruh menu yang dijadwalkan pada tanggal tsb,
 * dikelompokkan per sasaran (reguler / b3). Tiap menu memuat rincian gizi
 * PER BAHAN (sumber pangan + berat/porsi) + total, siap dipakai laporan
 * ahli gizi tanpa input manual. Estimasi perencanaan berbasis tabel TKPI.
 */
export const GET = route(async (req: NextRequest) => {
  const admin = await requireAkses(["distribusi", "gizi"]);
  const tanggal = new URL(req.url).searchParams.get("tanggal") || localDate("Asia/Jakarta");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return fail(400, "Tanggal tidak valid.");

  // Menu terjadwal pada tanggal ini (milik dapur ybs).
  const rows = await query<JadwalMenuRow>(
    `SELECT j.id AS jadwal_id, j.sasaran, j.urutan,
            m.id AS menu_id, m.nama, m.kategori, m.porsi_dasar
       FROM jadwal_menu j JOIN menu m ON m.id = j.menu_id
      WHERE j.sppg_id = $1 AND j.tanggal = $2
      ORDER BY j.sasaran ASC, j.urutan ASC, j.id ASC`,
    [admin.sppg_id, tanggal],
  );

  const bahanByMenu = new Map<number, BahanRow[]>();
  if (rows.length) {
    const menuIds = Array.from(new Set(rows.map((r) => r.menu_id)));
    const bahan = await query<BahanRow>(
      `SELECT menu_id, nama, satuan, jumlah_dasar::float8 AS jumlah_dasar, komponen
         FROM menu_bahan
        WHERE menu_id = ANY($1::int[])
        ORDER BY urutan ASC, id ASC`,
      [menuIds],
    );
    for (const b of bahan) {
      if (!bahanByMenu.has(b.menu_id)) bahanByMenu.set(b.menu_id, []);
      bahanByMenu.get(b.menu_id)!.push(b);
    }
  }

  const perSasaran: Record<Sasaran, SasaranGizi> = {
    reguler: { menus: [], total: totalKosong() },
    b3: { menus: [], total: totalKosong() },
  };

  for (const r of rows) {
    const bahanRows = bahanByMenu.get(r.menu_id) ?? [];
    const rincian = rincianGiziPerPorsi(
      bahanRows.map((b) => ({
        nama: b.nama,
        satuan: b.satuan,
        jumlah_dasar: b.jumlah_dasar,
        komponen: normalizeKomponen(b.komponen) as KomponenGizi,
      })),
      r.porsi_dasar,
    );
    const menuGizi: MenuGizi = {
      jadwal_id: r.jadwal_id,
      menu_id: r.menu_id,
      nama: r.nama,
      waktu: KATEGORI_MENU_LABEL[normalizeKategoriMenu(r.kategori)],
      bahan: rincian.bahan,
      total: rincian.total,
      takTerhitung: rincian.takTerhitung,
    };
    const grp = perSasaran[r.sasaran] ?? perSasaran.reguler;
    grp.menus.push(menuGizi);
    grp.total.energi += rincian.total.energi;
    grp.total.protein += rincian.total.protein;
    grp.total.lemak += rincian.total.lemak;
    grp.total.karbo += rincian.total.karbo;
    grp.total.serat += rincian.total.serat;
  }

  return ok({ tanggal, reguler: perSasaran.reguler, b3: perSasaran.b3 });
});
