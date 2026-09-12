import { requireAkses } from "@/lib/session";
import { query } from "@/lib/db";
import { ok, route } from "@/lib/api";
import { getBahanMaster, getResepAll, RESEP_META, RESEP_KATEGORI, PORSI_KB, KEMAS_TAMBAHAN } from "@/lib/resep";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface OvRow { bahan: string; nama: string | null; satuan: string | null; harga: number | null; hidden: boolean }

// GET — katalog resep + bahan master (harga digabung koreksi per dapur).
// Koreksi harga/nama bahan disimpan lewat /api/admin/purchasing (tabel yang sama,
// bahan_catalog_override, dikunci pada nama bahan).
export const GET = route(async () => {
  const me = await requireAkses(["distribusi", "gizi", "laporan", "keuangan"]);
  const ov = await query<OvRow>(
    `SELECT bahan, nama, satuan, harga::float8 AS harga, hidden FROM bahan_catalog_override WHERE sppg_id = $1`,
    [me.sppg_id],
  );
  const ovMap = new Map(ov.map((o) => [o.bahan, o]));

  const bahan = getBahanMaster().map((b) => {
    const o = ovMap.get(b.n);
    if (!o) return b;
    return {
      ...b,
      n: o.nama || b.n,
      s: o.satuan || b.s,
      h: o.harga ?? b.h,
      hsrc: o.harga != null ? "koreksi dapur" : b.hsrc,
      diedit: true,
    };
  });

  return ok({ meta: RESEP_META, kategori: RESEP_KATEGORI, porsiKB: PORSI_KB, kemasTambahan: KEMAS_TAMBAHAN, resep: getResepAll(), bahan });
});
