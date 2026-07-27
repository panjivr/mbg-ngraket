import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAkses } from "@/lib/session";
import { getSppg, invalidateSppg } from "@/lib/sppg";
import { catatAudit } from "@/lib/audit";
import { ok, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const admin = await requireAkses("distribusi");
  const s = await getSppg(admin.sppg_id as number);
  return ok({
    pengaturan: {
      nama_sppg: s?.nama ?? "",
      alamat: s?.alamat ?? "",
      kepala_sppg: s?.kepala_sppg ?? "",
      harga_besar: s?.harga_besar ?? 10000,
      harga_kecil: s?.harga_kecil ?? 8000,
      harga_b3: s?.harga_b3 ?? 8000,
      ahli_gizi: s?.ahli_gizi ?? "",
      koordinator: s?.koordinator ?? "",
    },
  });
});

export const PUT = route(async (req: NextRequest) => {
  const admin = await requireAkses("distribusi");
  const s = await getSppg(admin.sppg_id as number);
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const num = (v: unknown, d: number) =>
    v === undefined ? d : Math.max(0, Math.round(Number(v)) || 0);

  const nama = b.nama_sppg !== undefined ? String(b.nama_sppg).trim() : s?.nama ?? "";
  const alamat = b.alamat !== undefined ? String(b.alamat).trim() : s?.alamat ?? "";
  const kepala =
    b.kepala_sppg !== undefined ? String(b.kepala_sppg).trim() : s?.kepala_sppg ?? "";
  const hb = num(b.harga_besar, s?.harga_besar ?? 10000);
  const hk = num(b.harga_kecil, s?.harga_kecil ?? 8000);
  const h3 = num(b.harga_b3, s?.harga_b3 ?? 8000);
  const ahliGizi =
    b.ahli_gizi !== undefined ? String(b.ahli_gizi).trim() : s?.ahli_gizi ?? "";
  const koordinator =
    b.koordinator !== undefined ? String(b.koordinator).trim() : s?.koordinator ?? "";

  await query(
    `UPDATE sppg SET nama=$1, alamat=$2, kepala_sppg=$3, harga_besar=$4, harga_kecil=$5, harga_b3=$6, ahli_gizi=$7, koordinator=$8 WHERE id=$9`,
    [nama, alamat, kepala, hb, hk, h3, ahliGizi, koordinator, admin.sppg_id],
  );
  invalidateSppg(admin.sppg_id as number);
  await catatAudit(
    admin,
    "ubah",
    "Pengaturan Distribusi",
    `Identitas & harga pagu: ${nama} · besar ${hb}, kecil ${hk}, B3 ${h3}`,
  );
  return ok({
    pengaturan: {
      nama_sppg: nama, alamat, kepala_sppg: kepala, harga_besar: hb, harga_kecil: hk, harga_b3: h3,
      ahli_gizi: ahliGizi, koordinator,
    },
  });
});
