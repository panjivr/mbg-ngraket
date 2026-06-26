import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireSuper } from "@/lib/session";
import { ok, route } from "@/lib/api";
import { localDate } from "@/lib/time";
import { parseSppgIds, type SuperRekapRow } from "@/lib/super";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const GET = route(async (req: NextRequest) => {
  await requireSuper();
  const sp = req.nextUrl.searchParams;
  const today = localDate("Asia/Jakarta");

  const from = DATE_RE.test(sp.get("from") || "") ? sp.get("from")! : today;
  const to = DATE_RE.test(sp.get("to") || "") ? sp.get("to")! : today;
  const ids = parseSppgIds(sp.get("sppg_ids"));

  const params: unknown[] = [from, to];
  let filter = "";
  if (ids.length) {
    params.push(ids);
    filter = `AND u.sppg_id = ANY($${params.length}::int[])`;
  }

  const rows = await query<SuperRekapRow>(
    `SELECT a.user_id,
            COALESCE(a.shift_tanggal, a.tanggal) AS tanggal,
            a.check_in, a.check_out,
            u.nama, u.jabatan, u.nip, u.sppg_id,
            s.nama AS sppg_nama, d.nama AS divisi_nama
       FROM attendance a
       JOIN users u ON u.id = a.user_id
       JOIN sppg  s ON s.id = u.sppg_id
       LEFT JOIN divisi d ON d.id = a.divisi_id
      WHERE COALESCE(a.shift_tanggal, a.tanggal) BETWEEN $1 AND $2 ${filter}
      ORDER BY s.nama ASC, d.nama ASC NULLS LAST, u.nama ASC`,
    params,
  );

  return ok({ from, to, rows });
});
