import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Row {
  id: number;
  judul: string;
  isi: string;
  pinned: boolean;
  created_at: string;
  dibaca: boolean;
}

// Pengumuman aktif untuk karyawan + status sudah/belum dibaca oleh dirinya.
export const GET = route(async () => {
  const s = await requireSession();
  const rows = await query<Row>(
    `SELECT p.id, p.judul, p.isi, p.pinned, p.created_at,
            (b.user_id IS NOT NULL) AS dibaca
       FROM pengumuman p
       LEFT JOIN pengumuman_baca b ON b.pengumuman_id = p.id AND b.user_id = $2
      WHERE p.sppg_id = $1 AND p.aktif = TRUE
      ORDER BY p.pinned DESC, p.created_at DESC
      LIMIT 50`,
    [s.sppg_id, s.uid],
  );
  return ok({ pengumuman: rows, belum: rows.filter((r) => !r.dibaca).length });
});

// Tandai satu pengumuman sudah dibaca.
export const POST = route(async (req: NextRequest) => {
  const s = await requireSession();
  const b = await req.json().catch(() => ({}));
  const id = parseInt(String(b.id), 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");
  await query(
    `INSERT INTO pengumuman_baca (pengumuman_id, user_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [id, s.uid],
  );
  return ok({ id });
});
