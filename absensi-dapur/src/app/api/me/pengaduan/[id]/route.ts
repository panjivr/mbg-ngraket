import { query } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface HeadRow {
  id: number;
  kategori: string;
  isi: string;
  status: string;
  balasan: string | null;
  dibalas_at: string | null;
  created_at: string;
}
interface PesanRow {
  id: number;
  from_admin: boolean;
  isi: string;
  nama: string | null;
  created_at: string;
}

export interface ThreadPesan {
  from_admin: boolean;
  isi: string;
  nama: string | null;
  created_at: string;
}

async function getId(ctx: { params: Promise<{ id: string }> }): Promise<number> {
  const p = await ctx.params;
  return Number(p.id);
}

/** Ambil satu thread aspirasi milik pegawai ini (bukan anonim). */
export const GET = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const s = await requireSession();
  const id = await getId(ctx);
  if (!id) return fail(400, "ID tidak valid.");

  const heads = await query<HeadRow>(
    `SELECT id, kategori, isi, status, balasan, dibalas_at, created_at
       FROM pengaduan
      WHERE id = $1 AND user_id = $2 AND anonim = FALSE
      LIMIT 1`,
    [id, s.uid],
  );
  const head = heads[0];
  if (!head) return fail(404, "Laporan tidak ditemukan.");

  const pesanRows = await query<PesanRow>(
    `SELECT p.id, p.from_admin, p.isi, p.created_at,
            CASE WHEN p.from_admin THEN u.nama ELSE NULL END AS nama
       FROM pengaduan_pesan p
       LEFT JOIN users u ON u.id = p.user_id
      WHERE p.pengaduan_id = $1
      ORDER BY p.created_at ASC`,
    [id],
  );

  const messages: ThreadPesan[] = [
    { from_admin: false, isi: head.isi, nama: null, created_at: head.created_at },
  ];
  if (head.balasan) {
    messages.push({
      from_admin: true,
      isi: head.balasan,
      nama: "Manajemen",
      created_at: head.dibalas_at || head.created_at,
    });
  }
  for (const r of pesanRows) {
    messages.push({
      from_admin: r.from_admin,
      isi: r.isi,
      nama: r.from_admin ? r.nama || "Manajemen" : null,
      created_at: r.created_at,
    });
  }
  messages.sort((a, b) => a.created_at.localeCompare(b.created_at));

  return ok({
    pengaduan: { id: head.id, kategori: head.kategori, status: head.status },
    messages,
  });
});

/** Pegawai membalas dalam thread aspirasinya. */
export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const s = await requireSession();
  const id = await getId(ctx);
  if (!id) return fail(400, "ID tidak valid.");

  const body = (await req.json().catch(() => ({}))) as { isi?: string };
  const isi = (body.isi || "").trim();
  if (isi.length < 1) return fail(400, "Pesan tidak boleh kosong.");
  if (isi.length > 4000) return fail(400, "Pesan terlalu panjang.");

  const owned = await query<{ id: number }>(
    `SELECT id FROM pengaduan
      WHERE id = $1 AND user_id = $2 AND anonim = FALSE LIMIT 1`,
    [id, s.uid],
  );
  if (!owned[0]) return fail(404, "Laporan tidak ditemukan.");

  await query(
    `INSERT INTO pengaduan_pesan (pengaduan_id, sppg_id, from_admin, user_id, isi)
     VALUES ($1, $2, FALSE, $3, $4)`,
    [id, s.sppg_id, s.uid, isi],
  );
  // Pesan baru dari pegawai → tandai perlu ditinjau lagi.
  await query(
    `UPDATE pengaduan SET status = 'baru' WHERE id = $1 AND status = 'selesai'`,
    [id],
  );
  return ok({ sukses: true });
});
