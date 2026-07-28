import { NextRequest } from "next/server";
import { query, withClient } from "@/lib/db";
import { requireAkses } from "@/lib/session";
import { getSppg } from "@/lib/sppg";
import { ok, fail, route } from "@/lib/api";
import {
  normalizeKategoriMenu,
  type Menu,
  type MenuBahan,
  type MenuLengkap,
} from "@/lib/menu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface BarangPilih {
  id: number;
  nama: string;
  satuan: string;
  kategori: string;
}

// Daftar semua menu (beserta bahannya) + daftar barang gudang untuk pemilih bahan.
export const GET = route(async () => {
  const admin = await requireAkses("distribusi");
  const menus = await query<Menu>(
    `SELECT id, sppg_id, nama, kategori, porsi_dasar, keterangan, aktif, urutan
       FROM menu WHERE sppg_id = $1 ORDER BY urutan ASC, id ASC`,
    [admin.sppg_id],
  );
  const bahan = menus.length
    ? await query<MenuBahan>(
        `SELECT id, menu_id, barang_id, nama, satuan,
                jumlah_dasar::float8 AS jumlah_dasar, pembulatan, komponen,
                harga::float8 AS harga, pasar_ref, urutan
           FROM menu_bahan
          WHERE menu_id = ANY($1::int[])
          ORDER BY urutan ASC, id ASC`,
        [menus.map((m) => m.id)],
      )
    : [];
  const byMenu = new Map<number, MenuBahan[]>();
  for (const b of bahan) {
    if (!byMenu.has(b.menu_id)) byMenu.set(b.menu_id, []);
    byMenu.get(b.menu_id)!.push(b);
  }
  const menu: MenuLengkap[] = menus.map((m) => ({ ...m, bahan: byMenu.get(m.id) || [] }));

  const barang = await query<BarangPilih>(
    `SELECT id, nama, satuan, kategori FROM barang
      WHERE sppg_id = $1 AND aktif = TRUE ORDER BY nama ASC`,
    [admin.sppg_id],
  );
  // Pagu (harga per porsi) untuk pembanding HPP/food cost.
  const sppg = await getSppg(admin.sppg_id as number);
  const pagu = {
    besar: sppg?.harga_besar ?? 10000,
    kecil: sppg?.harga_kecil ?? 8000,
    b3: sppg?.harga_b3 ?? 8000,
  };
  return ok({ menu, barang, pagu });
});

// Buat menu baru. Jika `duplikat_dari` diisi, salin menu + seluruh bahannya
// (untuk membuat variasi menu dengan cepat). Selain itu buat menu kosong.
export const POST = route(async (req: NextRequest) => {
  const admin = await requireAkses("distribusi");
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const nama = String(b.nama ?? "").trim().slice(0, 120);
  if (!nama) return fail(400, "Nama menu wajib diisi.");
  const dupId =
    b.duplikat_dari === null || b.duplikat_dari === undefined ? null : Number(b.duplikat_dari) || null;

  const created = await withClient(async (client) => {
    const maxUrut =
      (await client.query<{ m: number }>(`SELECT COALESCE(MAX(urutan),0) AS m FROM menu WHERE sppg_id = $1`, [admin.sppg_id]))
        .rows[0]?.m ?? 0;

    // Sumber duplikat (opsional) — harus milik dapur ini.
    let kategori = normalizeKategoriMenu(b.kategori);
    let porsi_dasar = Math.max(1, Math.round(Number(b.porsi_dasar)) || 1000);
    let keterangan = "";
    if (dupId) {
      const src = await client.query<{ kategori: string; porsi_dasar: number; keterangan: string }>(
        `SELECT kategori, porsi_dasar, keterangan FROM menu WHERE id = $1 AND sppg_id = $2`,
        [dupId, admin.sppg_id],
      );
      if (!src.rows[0]) return null;
      kategori = normalizeKategoriMenu(src.rows[0].kategori);
      porsi_dasar = src.rows[0].porsi_dasar;
      keterangan = src.rows[0].keterangan;
    }

    const rows = await client.query<Menu>(
      `INSERT INTO menu (sppg_id, nama, kategori, porsi_dasar, keterangan, aktif, urutan)
       VALUES ($1,$2,$3,$4,$5,TRUE,$6)
       RETURNING id, sppg_id, nama, kategori, porsi_dasar, keterangan, aktif, urutan`,
      [admin.sppg_id, nama, kategori, porsi_dasar, keterangan, maxUrut + 1],
    );
    const menu = rows.rows[0];

    if (dupId) {
      await client.query(
        `INSERT INTO menu_bahan (menu_id, barang_id, nama, satuan, jumlah_dasar, pembulatan, komponen, harga, pasar_ref, urutan)
         SELECT $1, barang_id, nama, satuan, jumlah_dasar, pembulatan, komponen, harga, pasar_ref, urutan
           FROM menu_bahan WHERE menu_id = $2`,
        [menu.id, dupId],
      );
    }
    const bahan = await client.query<MenuBahan>(
      `SELECT id, menu_id, barang_id, nama, satuan,
              jumlah_dasar::float8 AS jumlah_dasar, pembulatan, komponen, urutan
         FROM menu_bahan WHERE menu_id = $1 ORDER BY urutan ASC, id ASC`,
      [menu.id],
    );
    return { ...menu, bahan: bahan.rows } as MenuLengkap;
  });

  if (!created) return fail(404, "Menu sumber duplikat tidak ditemukan.");
  return ok({ menu: created }, { status: 201 });
});
