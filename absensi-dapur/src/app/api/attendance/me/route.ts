import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { ok, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RiwayatRow {
  id: number;
  tanggal: string | null;
  shift_tanggal: string | null;
  check_in: string | null;
  check_out: string | null;
  status_masuk: string | null;
  shift_masuk: string | null;
  shift_pulang: string | null;
  divisi_nama: string | null;
  check_in_jarak: number | null;
  check_out_jarak: number | null;
}

export const GET = route(async (req: NextRequest) => {
  const session = await requireSession();
  const limit = Math.min(
    Math.max(parseInt(req.nextUrl.searchParams.get("limit") || "30", 10), 1),
    180,
  );

  const rows = await query<RiwayatRow>(
    `SELECT a.id,
            COALESCE(a.shift_tanggal, a.tanggal) AS tanggal,
            a.shift_tanggal, a.check_in, a.check_out, a.status_masuk,
            a.shift_masuk, a.shift_pulang, d.nama AS divisi_nama,
            a.check_in_jarak, a.check_out_jarak
       FROM attendance a
       LEFT JOIN divisi d ON d.id = a.divisi_id
      WHERE a.user_id = $1
      ORDER BY a.check_in DESC NULLS LAST, a.id DESC
      LIMIT $2`,
    [session.uid, limit],
  );

  return ok({ riwayat: rows });
});
