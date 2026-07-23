import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireHr } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Row {
  id: number;
  nama: string;
  divisi_nama: string | null;
  gaji_harian: number;
  lembur_per_hari: number;
  potongan_per_telat: number;
  bpjs_tk: boolean;
}

export const GET = route(async () => {
  const hr = await requireHr();
  const rows = await query<Row>(
    `SELECT u.id, u.nama, d.nama AS divisi_nama,
            u.gaji_harian, u.lembur_per_hari, u.potongan_per_telat, u.bpjs_tk
       FROM users u LEFT JOIN divisi d ON d.id = u.divisi_id
      WHERE u.sppg_id = $1 AND u.aktif = TRUE
      ORDER BY d.nama ASC NULLS LAST, u.nama ASC`,
    [hr.sppg_id],
  );
  return ok({ pegawai: rows });
});

// Simpan komponen gaji satu pegawai.
export const POST = route(async (req: NextRequest) => {
  const hr = await requireHr();
  const b = await req.json().catch(() => ({}));
  const id = parseInt(String(b.user_id), 10);
  if (!Number.isFinite(id)) return fail(400, "Pegawai tidak valid.");
  const num = (v: unknown) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  };
  const r = await query<{ id: number }>(
    `UPDATE users SET gaji_harian = $1, lembur_per_hari = $2, potongan_per_telat = $3, bpjs_tk = $4
      WHERE id = $5 AND sppg_id = $6 RETURNING id`,
    [num(b.gaji_harian), num(b.lembur_per_hari), num(b.potongan_per_telat), Boolean(b.bpjs_tk), id, hr.sppg_id],
  );
  if (!r.length) return fail(404, "Pegawai tidak ditemukan.");
  return ok({ id });
});
