import { NextRequest } from "next/server";
import { requireAkses, requireAdmin } from "@/lib/session";
import { query } from "@/lib/db";
import { ok, fail, route } from "@/lib/api";
import { getBahanKatalog, getKomponen, KATALOG_META, KATEGORI } from "@/lib/bank-komponen";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const num = (x: unknown): number | null => {
  if (x === null || x === undefined || x === "") return null;
  const n = parseFloat(String(x).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

interface OvRow {
  bahan: string;
  nama: string | null;
  satuan: string | null;
  per_porsi: number | null;
  harga: number | null;
  hidden: boolean;
}

// GET — katalog komponen + bahan (seed digabung koreksi per dapur).
export const GET = route(async () => {
  const me = await requireAkses(["distribusi", "gizi", "laporan", "keuangan"]);
  const ov = await query<OvRow>(
    `SELECT bahan, nama, satuan, per_porsi::float8 AS per_porsi, harga::float8 AS harga, hidden
       FROM bahan_catalog_override WHERE sppg_id = $1`,
    [me.sppg_id],
  );
  const ovMap = new Map(ov.map((o) => [o.bahan, o]));

  const bahan = getBahanKatalog()
    .map((b) => {
      const o = ovMap.get(b.n);
      if (o?.hidden) return null;
      return {
        n: o?.nama || b.n,
        key: b.n, // kunci asli untuk simpan koreksi
        s: o?.satuan || b.s,
        kat: b.kat,
        pp: o?.per_porsi ?? b.pp,
        h: o?.harga ?? b.h,
        obs: b.obs,
        diedit: !!o,
      };
    })
    .filter(Boolean);

  // komponen: pakai bahan utama, terapkan override bila bahan utamanya dikoreksi
  const komponen = getKomponen().map((k) => {
    if (!k.u) return k;
    const o = ovMap.get(k.u.n);
    if (o?.hidden) return { ...k, u: null };
    return {
      n: k.n,
      kat: k.kat,
      f: k.f,
      u: { n: o?.nama || k.u.n, key: k.u.n, s: o?.satuan || k.u.s, pp: o?.per_porsi ?? k.u.pp, h: o?.harga ?? k.u.h },
    };
  });

  return ok({ meta: KATALOG_META, kategori: KATEGORI, bahan, komponen });
});

// POST — simpan koreksi katalog (upsert per bahan). Admin penuh.
export const POST = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const bahan = String(b.bahan ?? "").trim();
  if (!bahan) return fail(400, "bahan wajib.");
  const nama = b.nama != null && String(b.nama).trim() ? String(b.nama).trim().slice(0, 120) : null;
  const satuan = b.satuan != null && String(b.satuan).trim() ? String(b.satuan).trim().slice(0, 20) : null;
  const per_porsi = num(b.per_porsi);
  const harga = num(b.harga);
  const hidden = b.hidden === true;
  await query(
    `INSERT INTO bahan_catalog_override (sppg_id, bahan, nama, satuan, per_porsi, harga, hidden)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (sppg_id, bahan)
       DO UPDATE SET nama=EXCLUDED.nama, satuan=EXCLUDED.satuan, per_porsi=EXCLUDED.per_porsi,
                     harga=EXCLUDED.harga, hidden=EXCLUDED.hidden`,
    [admin.sppg_id, bahan, nama, satuan, per_porsi, harga, hidden],
  );
  return ok({ saved: true });
});

// DELETE ?bahan=NAMA — hapus koreksi (kembali ke katalog seed).
export const DELETE = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const bahan = req.nextUrl.searchParams.get("bahan") || "";
  if (!bahan) return fail(400, "bahan wajib.");
  await query(`DELETE FROM bahan_catalog_override WHERE sppg_id=$1 AND bahan=$2`, [admin.sppg_id, bahan]);
  return ok({ deleted: true });
});
