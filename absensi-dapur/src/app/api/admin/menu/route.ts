import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAkses } from "@/lib/session";
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
                jumlah_dasar::float8 AS jumlah_dasar, pembulatan, urutan
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
  return ok({ menu, barang });
});

// Buat menu baru (tanpa bahan; bahan ditambah lewat PUT /[id]).
export const POST = route(async (req: NextRequest) => {
  const admin = await requireAkses("distribusi");
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const nama = String(b.nama ?? "").trim().slice(0, 120);
  if (!nama) return fail(400, "Nama menu wajib diisi.");
  const kategori = normalizeKategoriMenu(b.kategori);
  const porsi_dasar = Math.max(1, Math.round(Number(b.porsi_dasar)) || 1000);
  const maxUrut =
    (await query<{ m: number }>(`SELECT COALESCE(MAX(urutan),0) AS m FROM menu WHERE sppg_id = $1`, [admin.sppg_id]))[0]
      ?.m ?? 0;
  const rows = await query<Menu>(
    `INSERT INTO menu (sppg_id, nama, kategori, porsi_dasar, keterangan, aktif, urutan)
     VALUES ($1,$2,$3,$4,'',TRUE,$5)
     RETURNING id, sppg_id, nama, kategori, porsi_dasar, keterangan, aktif, urutan`,
    [admin.sppg_id, nama, kategori, porsi_dasar, maxUrut + 1],
  );
  return ok({ menu: { ...rows[0], bahan: [] } }, { status: 201 });
});
