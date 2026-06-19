import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import { getKartuPegawai } from "@/lib/kartu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

interface AdminRow {
  username: string;
  role: string;
  aktif: boolean;
}

interface RiwayatRow {
  id: number;
  tanggal: string | null;
  check_in: string | null;
  check_out: string | null;
  status_masuk: string | null;
  divisi_nama: string | null;
}

export const GET = route(async (_req: NextRequest, ctx: Ctx) => {
  await requireAdmin();
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");

  const kartu = await getKartuPegawai(id);
  if (!kartu) return fail(404, "Pegawai tidak ditemukan.");

  const admin = (
    await query<AdminRow>(
      `SELECT username, role, aktif FROM users WHERE id = $1`,
      [id],
    )
  )[0];

  const riwayat = await query<RiwayatRow>(
    `SELECT a.id, COALESCE(a.shift_tanggal, a.tanggal) AS tanggal,
            a.check_in, a.check_out, a.status_masuk, d.nama AS divisi_nama
       FROM attendance a
       LEFT JOIN divisi d ON d.id = a.divisi_id
      WHERE a.user_id = $1
      ORDER BY a.check_in DESC NULLS LAST, a.id DESC
      LIMIT 15`,
    [id],
  );

  return ok({
    kartu,
    akun: admin ?? null,
    riwayat,
  });
});
