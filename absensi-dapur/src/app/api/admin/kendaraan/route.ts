import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAkses } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import type { Kendaraan } from "@/lib/kilometer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const admin = await requireAkses("laporan");
  const rows = await query<Kendaraan>(
    `SELECT * FROM kendaraan WHERE sppg_id = $1 ORDER BY urutan ASC, id ASC`,
    [admin.sppg_id],
  );
  return ok({ kendaraan: rows });
});

export const POST = route(async (req: NextRequest) => {
  const admin = await requireAkses("laporan");
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const nopol = String(b.nopol ?? "").trim().slice(0, 40);
  const nama = String(b.nama ?? "").trim().slice(0, 60);
  if (!nopol && !nama) return fail(400, "Nopol atau nama kendaraan wajib diisi.");
  const konsumsi = Math.max(0, Number(b.konsumsi) || 0);
  const maxUrut = (await query<{ m: number }>(`SELECT COALESCE(MAX(urutan),0) AS m FROM kendaraan WHERE sppg_id = $1`, [admin.sppg_id]))[0]?.m ?? 0;
  const rows = await query<Kendaraan>(
    `INSERT INTO kendaraan (sppg_id, nopol, nama, konsumsi, aktif, urutan)
     VALUES ($1,$2,$3,$4,TRUE,$5) RETURNING *`,
    [admin.sppg_id, nopol, nama, konsumsi, maxUrut + 1],
  );
  return ok({ kendaraan: rows[0] });
});
