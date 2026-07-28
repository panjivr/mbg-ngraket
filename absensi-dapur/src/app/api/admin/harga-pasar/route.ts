import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin, requireAkses } from "@/lib/session";
import { getSppg, invalidateSppg } from "@/lib/sppg";
import { ok, fail, route } from "@/lib/api";
import { localDate } from "@/lib/time";
import {
  KABKOTA_JATIM,
  ambilHargaPasar,
  isKabkotaValid,
  labelKabkota,
} from "@/lib/siskaperbapo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET: daftar harga komoditas pasar (SISKAPERBAPO Jatim) untuk lokasi & tanggal.
// Lokasi default = pengaturan dapur; bisa dioverride via ?kabkota=. SISKAPERBAPO
// memakai zona Jatim (WIB), jadi tanggal dihitung Asia/Jakarta.
export const GET = route(async (req: NextRequest) => {
  const admin = await requireAkses("distribusi");
  const sppg = await getSppg(admin.sppg_id as number);
  const url = new URL(req.url);
  const qKab = url.searchParams.get("kabkota");
  const kabkota = qKab !== null && isKabkotaValid(qKab) ? qKab : sppg?.siskaperbapo_kabkota || "";
  const tanggal = localDate("Asia/Jakarta");

  const data = await ambilHargaPasar(kabkota, tanggal);

  return ok({
    tersedia: !!data,
    tanggal,
    kabkota,
    label: labelKabkota(kabkota),
    daftarKabkota: KABKOTA_JATIM,
    lokasiDapur: sppg?.siskaperbapo_kabkota || "",
    sumber: data?.sumber || null,
    komoditas: data?.komoditas || [],
    catatan: data
      ? null
      : "Data harga pasar sedang tidak bisa diambil dari SISKAPERBAPO. Harga bisa diisi manual.",
  });
});

// PUT: simpan lokasi kab/kota SISKAPERBAPO default untuk dapur ini.
export const PUT = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const kabkota = String(b.kabkota ?? "");
  if (kabkota !== "" && !isKabkotaValid(kabkota)) return fail(400, "Lokasi kab/kota tidak valid.");
  await query(`UPDATE sppg SET siskaperbapo_kabkota = $1 WHERE id = $2`, [kabkota, admin.sppg_id]);
  invalidateSppg(admin.sppg_id as number);
  return ok({ ok: true, kabkota, label: labelKabkota(kabkota) });
});
