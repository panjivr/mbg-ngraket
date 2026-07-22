import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import type { Penerima } from "@/lib/distribusi-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const admin = await requireAdmin();
  const rows = await query<Penerima>(
    `SELECT * FROM penerima WHERE sppg_id = $1 ORDER BY urutan ASC, id ASC`,
    [admin.sppg_id],
  );
  return ok({ penerima: rows });
});

export const POST = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const nama = String(b.nama ?? "").trim();
  if (!nama) return fail(400, "Nama penerima wajib diisi.");
  const jenis = b.jenis === "b3" ? "b3" : "serdik";
  const jenjang = String(b.jenjang ?? "").trim();
  const besar = Math.max(0, Math.round(Number(b.besar ?? 0)) || 0);
  const kecil = Math.max(0, Math.round(Number(b.kecil ?? 0)) || 0);
  const b3 = Math.max(0, Math.round(Number(b.b3 ?? 0)) || 0);
  const pj = Math.max(0, Math.round(Number(b.pj ?? 0)) || 0);
  const jam_kirim = String(b.jam_kirim ?? "07:00");
  const aktif = b.aktif === false ? false : true;
  const urutRow = await query<{ m: number | null }>(
    `SELECT MAX(urutan) AS m FROM penerima WHERE sppg_id = $1`,
    [admin.sppg_id],
  );
  const urutan = (urutRow[0]?.m ?? 0) + 1;
  const rows = await query<Penerima>(
    `INSERT INTO penerima (sppg_id, jenis, nama, jenjang, besar, kecil, b3, pj, jam_kirim, urutan, aktif)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [admin.sppg_id, jenis, nama, jenjang, besar, kecil, b3, pj, jam_kirim, urutan, aktif],
  );
  return ok({ penerima: rows[0] }, { status: 201 });
});
