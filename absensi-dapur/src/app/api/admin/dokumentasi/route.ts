import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAkses } from "@/lib/session";
import { getSppg } from "@/lib/sppg";
import { ok, fail, route } from "@/lib/api";
import { localDate } from "@/lib/time";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const FOTO_MAX = 30;

function cleanFoto(v: unknown): string[] {
  const arr = Array.isArray(v) ? v : [];
  return arr
    .map((i) => String(i ?? ""))
    .filter((s) => s.startsWith("data:image/") && s.length < 3_500_000)
    .slice(0, FOTO_MAX);
}

export const GET = route(async (req: NextRequest) => {
  const admin = await requireAkses("laporan");
  const s = await getSppg(admin.sppg_id as number);
  const tz = s?.tz || "Asia/Jakarta";
  const sp = req.nextUrl.searchParams;
  const tanggal = DATE_RE.test(sp.get("tanggal") || "") ? sp.get("tanggal")! : localDate(tz);
  const kegiatan = (sp.get("kegiatan") || "").slice(0, 160);

  const row = (
    await query<{ foto: string[] }>(
      `SELECT foto FROM dokumentasi WHERE sppg_id = $1 AND tanggal = $2 AND kegiatan = $3`,
      [admin.sppg_id, tanggal, kegiatan],
    )
  )[0];

  return ok({
    tanggal,
    kegiatan,
    tersimpan: !!row,
    sppg: { nama: s?.nama ?? "", tz },
    foto: row ? cleanFoto(row.foto) : [],
  });
});

export const POST = route(async (req: NextRequest) => {
  const admin = await requireAkses("laporan");
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const tanggal = String(b.tanggal ?? "");
  if (!DATE_RE.test(tanggal)) return fail(400, "Tanggal tidak valid.");
  const kegiatan = String(b.kegiatan ?? "").trim().slice(0, 160);
  const foto = cleanFoto(b.foto);

  await query(
    `INSERT INTO dokumentasi (sppg_id, tanggal, kegiatan, foto, updated_at)
     VALUES ($1,$2,$3,$4::jsonb, now())
     ON CONFLICT (sppg_id, tanggal, kegiatan) DO UPDATE
       SET foto = EXCLUDED.foto, updated_at = now()`,
    [admin.sppg_id, tanggal, kegiatan, JSON.stringify(foto)],
  );
  return ok({ ok: true });
});
