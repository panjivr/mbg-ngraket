import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface HeadRow {
  id: number;
  kategori: string;
  isi: string;
  anonim: boolean;
  status: string;
  balasan: string | null;
  dibalas_at: string | null;
  created_at: string;
  pelapor: string | null;
}
interface PesanRow {
  id: number;
  from_admin: boolean;
  isi: string;
  nama: string | null;
  created_at: string;
}

interface ThreadPesan {
  from_admin: boolean;
  isi: string;
  nama: string | null;
  created_at: string;
}

async function getId(ctx: { params: Promise<{ id: string }> }): Promise<number> {
  const p = await ctx.params;
  return Number(p.id);
}

/** Ambil satu thread aspirasi (identitas disembunyikan bila anonim). */
export const GET = route(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin();
  const id = await getId(ctx);
  if (!id) return fail(400, "ID tidak valid.");

  const heads = await query<HeadRow>(
    `SELECT p.id, p.kategori, p.isi, p.anonim, p.status, p.balasan,
            p.dibalas_at, p.created_at,
            CASE WHEN p.anonim THEN NULL ELSE u.nama END AS pelapor
       FROM pengaduan p
       LEFT JOIN users u ON u.id = p.user_id
      WHERE p.id = $1 AND p.sppg_id = $2
      LIMIT 1`,
    [id, admin.sppg_id],
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

  const pelaporLabel = head.anonim ? "Anonim" : head.pelapor || "Pegawai";
  const messages: ThreadPesan[] = [
    { from_admin: false, isi: head.isi, nama: pelaporLabel, created_at: head.created_at },
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
      nama: r.from_admin ? r.nama || "Manajemen" : pelaporLabel,
      created_at: r.created_at,
    });
  }
  messages.sort((a, b) => a.created_at.localeCompare(b.created_at));

  return ok({
    pengaduan: {
      id: head.id,
      kategori: head.kategori,
      status: head.status,
      anonim: head.anonim,
      pelapor: pelaporLabel,
    },
    messages,
  });
});

/** Admin membalas dalam thread. Balasan anonim tidak akan terlihat pegawai. */
export const POST = route(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin();
  const id = await getId(ctx);
  if (!id) return fail(400, "ID tidak valid.");

  const body = (await req.json().catch(() => ({}))) as { isi?: string };
  const isi = (body.isi || "").trim();
  if (isi.length < 1) return fail(400, "Pesan tidak boleh kosong.");
  if (isi.length > 4000) return fail(400, "Pesan terlalu panjang.");

  const owned = await query<{ id: number }>(
    `SELECT id FROM pengaduan WHERE id = $1 AND sppg_id = $2 LIMIT 1`,
    [id, admin.sppg_id],
  );
  if (!owned[0]) return fail(404, "Laporan tidak ditemukan.");

  await query(
    `INSERT INTO pengaduan_pesan (pengaduan_id, sppg_id, from_admin, user_id, isi)
     VALUES ($1, $2, TRUE, $3, $4)`,
    [id, admin.sppg_id, admin.uid, isi],
  );
  await query(
    `UPDATE pengaduan SET status = 'dibaca'
      WHERE id = $1 AND sppg_id = $2 AND status = 'baru'`,
    [id, admin.sppg_id],
  );
  return ok({ sukses: true });
});
