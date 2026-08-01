import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Row {
  id: number;
  kategori: string;
  isi: string;
  anonim: boolean;
  status: string;
  balasan: string | null;
  dibalas_at: string | null;
  created_at: string;
  pelapor: string | null;
  jabatan: string | null;
}

const STATUS = ["baru", "dibaca", "selesai"];

/** Inbox pengaduan untuk manajemen. Identitas disembunyikan bila anonim. */
export const GET = route(async () => {
  const admin = await requireAdmin();
  const rows = await query<Row>(
    `SELECT p.id, p.kategori, p.isi, p.anonim, p.status, p.balasan,
            p.dibalas_at, p.created_at,
            CASE WHEN p.anonim THEN NULL ELSE u.nama END AS pelapor,
            CASE WHEN p.anonim THEN NULL ELSE u.jabatan END AS jabatan
       FROM pengaduan p
       LEFT JOIN users u ON u.id = p.user_id
      WHERE p.sppg_id = $1
      ORDER BY (p.status = 'baru') DESC, p.created_at DESC
      LIMIT 300`,
    [admin.sppg_id],
  );
  return ok({ pengaduan: rows });
});

/** Ubah status dan/atau balas pengaduan. */
export const PATCH = route(async (req: Request) => {
  const admin = await requireAdmin();
  const body = (await req.json().catch(() => ({}))) as {
    id?: number;
    status?: string;
    balasan?: string;
  };
  if (!body.id) return fail(400, "ID tidak valid.");

  const set: string[] = [];
  const vals: unknown[] = [];
  let i = 1;
  if (body.status !== undefined) {
    if (!STATUS.includes(body.status)) return fail(400, "Status tidak valid.");
    set.push(`status = $${i++}`);
    vals.push(body.status);
  }
  if (body.balasan !== undefined) {
    const b = body.balasan.trim();
    set.push(`balasan = $${i++}`, `dibalas_by = $${i++}`, `dibalas_at = now()`);
    vals.push(b || null, admin.uid);
  }
  if (set.length === 0) return fail(400, "Tidak ada perubahan.");

  vals.push(body.id, admin.sppg_id);
  await query(
    `UPDATE pengaduan SET ${set.join(", ")}
      WHERE id = $${i++} AND sppg_id = $${i}`,
    vals,
  );
  return ok({ sukses: true });
});
