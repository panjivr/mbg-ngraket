import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireSuper } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import type { Sppg } from "@/lib/sppg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = route(async (req: NextRequest, ctx: Ctx) => {
  await requireSuper();
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");

  const cur = (await query<Sppg>(`SELECT * FROM sppg WHERE id = $1`, [id]))[0];
  if (!cur) return fail(404, "Dapur tidak ditemukan.");

  const b = await req.json().catch(() => ({}));
  const nama = b.nama !== undefined ? String(b.nama).trim() : cur.nama;
  const alamat = b.alamat !== undefined ? String(b.alamat).trim() : cur.alamat;
  const aktif = b.aktif !== undefined ? Boolean(b.aktif) : cur.aktif;
  if (!nama) return fail(400, "Nama dapur wajib diisi.");

  const rows = await query<Sppg>(
    `UPDATE sppg SET nama=$1, alamat=$2, aktif=$3 WHERE id=$4 RETURNING *`,
    [nama, alamat, aktif, id],
  );
  return ok({ sppg: rows[0] });
});

export const DELETE = route(async (_req: NextRequest, ctx: Ctx) => {
  const me = await requireSuper();
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");
  if (id === me.sppg_id) return fail(409, "Tidak bisa menghapus dapur Anda sendiri.");

  const count = (await query<{ c: string }>(`SELECT COUNT(*)::text AS c FROM sppg`))[0];
  if (Number(count.c) <= 1) return fail(409, "Minimal harus ada satu dapur.");

  // Hapus seluruh akun dapur ini (absensi ikut terhapus via FK), lalu dapurnya.
  await query(`DELETE FROM users WHERE sppg_id = $1`, [id]);
  await query(`DELETE FROM sppg WHERE id = $1`, [id]);
  return ok({ ok: true });
});
