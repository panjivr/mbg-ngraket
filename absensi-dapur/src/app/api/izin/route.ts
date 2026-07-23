import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const JENIS = ["izin", "sakit", "cuti"] as const;

export interface IzinRow {
  id: number;
  user_id: number;
  nama?: string;
  jenis: string;
  tanggal_mulai: string;
  tanggal_selesai: string;
  alasan: string;
  lampiran: string | null;
  status: string;
  catatan_admin: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// Daftar pengajuan milik sendiri.
export const GET = route(async () => {
  const s = await requireSession();
  const rows = await query<IzinRow>(
    `SELECT id, user_id, jenis, tanggal_mulai, tanggal_selesai, alasan, lampiran,
            status, catatan_admin, reviewed_at, created_at
       FROM izin WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
    [s.uid],
  );
  return ok({ izin: rows });
});

// Ajukan izin baru.
export const POST = route(async (req: NextRequest) => {
  const s = await requireSession();
  const b = await req.json().catch(() => ({}));
  const jenis = JENIS.includes(b.jenis) ? b.jenis : "izin";
  const mulai = String(b.tanggal_mulai ?? "").trim();
  const selesai = String(b.tanggal_selesai ?? "").trim();
  const alasan = String(b.alasan ?? "").trim();
  const lampiran =
    typeof b.lampiran === "string" && b.lampiran.startsWith("data:image")
      ? b.lampiran
      : null;

  if (!DATE_RE.test(mulai) || !DATE_RE.test(selesai))
    return fail(400, "Tanggal tidak valid.");
  if (mulai > selesai)
    return fail(400, "Tanggal mulai melewati tanggal selesai.");
  if (!alasan) return fail(400, "Alasan wajib diisi.");
  if (lampiran && lampiran.length > 2_500_000)
    return fail(400, "Ukuran lampiran terlalu besar.");

  const r = await query<{ id: number }>(
    `INSERT INTO izin (sppg_id, user_id, jenis, tanggal_mulai, tanggal_selesai, alasan, lampiran)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [s.sppg_id, s.uid, jenis, mulai, selesai, alasan, lampiran],
  );
  return ok({ id: r[0].id });
});

// Batalkan pengajuan yang masih pending (milik sendiri).
export const DELETE = route(async (req: NextRequest) => {
  const s = await requireSession();
  const id = parseInt(req.nextUrl.searchParams.get("id") || "", 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");
  const r = await query<{ id: number }>(
    `DELETE FROM izin WHERE id = $1 AND user_id = $2 AND status = 'pending' RETURNING id`,
    [id, s.uid],
  );
  if (!r.length) return fail(404, "Pengajuan tidak ditemukan atau sudah diproses.");
  return ok({ id });
});
