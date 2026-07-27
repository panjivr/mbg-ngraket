import { NextRequest } from "next/server";
import { requireHr } from "@/lib/session";
import { query } from "@/lib/db";
import { ok, fail, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface KasbonRow {
  id: number;
  user_id: number;
  tanggal: string;
  jumlah: number;
  keterangan: string;
  lunas: boolean;
}

// Daftar kasbon satu pegawai (untuk panel HR).
export const GET = route(async (req: NextRequest) => {
  const hr = await requireHr();
  const userId = parseInt(req.nextUrl.searchParams.get("user") || "", 10);
  if (!Number.isFinite(userId)) return fail(400, "Pegawai tidak valid.");
  const rows = await query<KasbonRow>(
    `SELECT id, user_id, tanggal::text AS tanggal, jumlah, keterangan, lunas
       FROM kasbon WHERE user_id = $1 AND sppg_id = $2
      ORDER BY lunas ASC, tanggal DESC, id DESC`,
    [userId, hr.sppg_id],
  );
  return ok({ kasbon: rows });
});

// Tambah kasbon: { user, tanggal, jumlah, keterangan }
export const POST = route(async (req: NextRequest) => {
  const hr = await requireHr();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const userId = parseInt(String(b.user ?? ""), 10);
  if (!Number.isFinite(userId)) return fail(400, "Pegawai tidak valid.");
  const milik = await query<{ id: number }>(
    `SELECT id FROM users WHERE id = $1 AND sppg_id = $2`,
    [userId, hr.sppg_id],
  );
  if (!milik.length) return fail(404, "Pegawai tidak ditemukan.");

  const jumlah = Math.max(0, Math.round(Number(b.jumlah)) || 0);
  if (jumlah <= 0) return fail(400, "Jumlah kasbon harus lebih dari 0.");
  const tanggal = DATE_RE.test(String(b.tanggal)) ? String(b.tanggal) : null;
  const keterangan = String(b.keterangan ?? "").slice(0, 200);

  const rows = await query<KasbonRow>(
    `INSERT INTO kasbon (sppg_id, user_id, tanggal, jumlah, keterangan)
     VALUES ($1,$2,COALESCE($3::date, CURRENT_DATE),$4,$5)
     RETURNING id, user_id, tanggal::text AS tanggal, jumlah, keterangan, lunas`,
    [hr.sppg_id, userId, tanggal, jumlah, keterangan],
  );
  return ok({ kasbon: rows[0] }, { status: 201 });
});
