import { NextRequest } from "next/server";
import { requireAkses, requireAdmin } from "@/lib/session";
import { query } from "@/lib/db";
import { ok, fail, route } from "@/lib/api";
import { listPakets, getPaket, BANK_META } from "@/lib/bank-menu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const num = (x: unknown): number | null => {
  if (x === null || x === undefined || x === "") return null;
  const n = parseFloat(String(x).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

interface OverrideRow {
  bahan: string;
  nama: string | null;
  satuan: string | null;
  per_porsi: number | null;
  harga: number | null;
  hidden: boolean;
}

// GET /api/admin/bank-menu            → daftar paket ringkas
// GET /api/admin/bank-menu?paket=ID   → detail bahan paket (seed + koreksi dapur)
export const GET = route(async (req: NextRequest) => {
  const me = await requireAkses(["distribusi", "gizi", "laporan", "keuangan"]);
  const id = req.nextUrl.searchParams.get("paket");
  if (!id) return ok({ meta: BANK_META, pakets: listPakets() });

  const p = getPaket(id);
  if (!p) return fail(404, "Paket tidak ditemukan.");
  const ov = await query<OverrideRow>(
    `SELECT bahan, nama, satuan, per_porsi::float8 AS per_porsi, harga::float8 AS harga, hidden
       FROM bank_menu_override WHERE sppg_id = $1 AND paket_id = $2`,
    [me.sppg_id, id],
  );
  const ovMap = new Map(ov.map((o) => [o.bahan, o]));
  const bahan = p.bahan
    .map((b) => {
      const o = ovMap.get(b.n);
      if (o?.hidden) return null;
      return {
        bahan: b.n, // kunci asli (untuk simpan koreksi)
        nama: o?.nama || b.n,
        satuan: o?.satuan || b.s,
        per_porsi: o?.per_porsi ?? b.pp,
        harga: o?.harga ?? b.h,
        flag: b.f ? 1 : 0,
        diedit: !!o,
      };
    })
    .filter(Boolean);
  return ok({
    paket: { id: p.id, tanggal: p.tanggal, menu: p.menu, porsi: p.porsi, besar: p.besar, kecil: p.kecil, balita: p.balita, bumil: p.bumil },
    bahan,
  });
});

// POST — simpan koreksi admin (upsert per bahan). Kosongkan field = pakai seed.
export const POST = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const paket_id = String(b.paket_id ?? "").trim();
  const bahan = String(b.bahan ?? "").trim();
  if (!paket_id || !bahan) return fail(400, "paket_id & bahan wajib.");
  if (!getPaket(paket_id)) return fail(404, "Paket tidak ditemukan.");
  const nama = b.nama != null && String(b.nama).trim() ? String(b.nama).trim().slice(0, 120) : null;
  const satuan = b.satuan != null && String(b.satuan).trim() ? String(b.satuan).trim().slice(0, 20) : null;
  const per_porsi = num(b.per_porsi);
  const harga = num(b.harga);
  const hidden = b.hidden === true;
  await query(
    `INSERT INTO bank_menu_override (sppg_id, paket_id, bahan, nama, satuan, per_porsi, harga, hidden)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (sppg_id, paket_id, bahan)
       DO UPDATE SET nama=EXCLUDED.nama, satuan=EXCLUDED.satuan, per_porsi=EXCLUDED.per_porsi,
                     harga=EXCLUDED.harga, hidden=EXCLUDED.hidden`,
    [admin.sppg_id, paket_id, bahan, nama, satuan, per_porsi, harga, hidden],
  );
  return ok({ saved: true });
});

// DELETE ?paket=ID&bahan=NAMA — hapus koreksi (kembali ke seed).
export const DELETE = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const sp = req.nextUrl.searchParams;
  const paket_id = sp.get("paket") || "";
  const bahan = sp.get("bahan") || "";
  if (!paket_id || !bahan) return fail(400, "paket & bahan wajib.");
  await query(`DELETE FROM bank_menu_override WHERE sppg_id=$1 AND paket_id=$2 AND bahan=$3`, [admin.sppg_id, paket_id, bahan]);
  return ok({ deleted: true });
});
