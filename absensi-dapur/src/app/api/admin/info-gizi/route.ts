import { NextRequest } from "next/server";
import QRCode from "qrcode";
import { query } from "@/lib/db";
import { requireAkses } from "@/lib/session";
import { getSppg } from "@/lib/sppg";
import { ok, fail, route } from "@/lib/api";
import { localDate } from "@/lib/time";
import { mergeInfoGizi, type InfoGiziIsi } from "@/lib/info-gizi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** URL publik yang ditanam di QR — permanen per dapur, isinya ikut hari ini. */
function urlPublik(req: NextRequest, sppgId: number): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).replace(/\/+$/, "");
  return `${base}/info-gizi/${sppgId}`;
}

export const GET = route(async (req: NextRequest) => {
  const admin = await requireAkses("gizi");
  const sppgId = admin.sppg_id as number;
  const s = await getSppg(sppgId);
  const tz = s?.tz || "Asia/Jakarta";
  const sp = req.nextUrl.searchParams;
  const tanggal = DATE_RE.test(sp.get("tanggal") || "") ? sp.get("tanggal")! : localDate(tz);

  const row = (
    await query<{ isi: Partial<InfoGiziIsi> }>(
      `SELECT isi FROM info_gizi WHERE sppg_id = $1 AND tanggal = $2`,
      [sppgId, tanggal],
    )
  )[0];

  const url = urlPublik(req, sppgId);
  const qr = await QRCode.toDataURL(url, {
    width: 720,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#0b3d22", light: "#ffffff" },
  });

  return ok({
    tanggal,
    tersimpan: !!row,
    url,
    qr,
    sppg: { nama: s?.nama ?? "", alamat: s?.alamat ?? "", tz },
    isi: mergeInfoGizi(row?.isi),
  });
});

export const POST = route(async (req: NextRequest) => {
  const admin = await requireAkses("gizi");
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const tanggal = String(b.tanggal ?? "").slice(0, 10);
  if (!DATE_RE.test(tanggal)) return fail(400, "Tanggal tidak valid.");
  const isi = mergeInfoGizi(b.isi);

  await query(
    `INSERT INTO info_gizi (sppg_id, tanggal, isi, updated_at)
     VALUES ($1,$2,$3::jsonb, now())
     ON CONFLICT (sppg_id, tanggal) DO UPDATE
       SET isi = EXCLUDED.isi, updated_at = now()`,
    [admin.sppg_id, tanggal, JSON.stringify(isi)],
  );
  return ok({ ok: true });
});
