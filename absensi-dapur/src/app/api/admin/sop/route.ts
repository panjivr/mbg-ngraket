import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import type { Sop } from "@/lib/sop-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Daftar SOP milik dapur (SPPG) yang sedang login. */
export const GET = route(async () => {
  const admin = await requireAdmin();
  const rows = await query<Sop>(
    `SELECT * FROM sop WHERE sppg_id = $1 ORDER BY urutan ASC, kode ASC, id ASC`,
    [admin.sppg_id],
  );
  return ok({ sop: rows });
});

/** Buat SOP baru pada dapur (SPPG) yang sedang login. */
export const POST = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const kode = String(b.kode ?? "").trim();
  const judul = String(b.judul ?? "").trim();
  const kategori = String(b.kategori ?? "Umum").trim() || "Umum";
  const tujuan = String(b.tujuan ?? "").trim();
  const ruang_lingkup = String(b.ruang_lingkup ?? "").trim();
  const penanggung_jawab = String(b.penanggung_jawab ?? "").trim();
  const prosedur = String(b.prosedur ?? "").trim();
  const referensi = String(b.referensi ?? "").trim();
  const urutanNum = Number(b.urutan ?? 0);
  const urutan = Number.isFinite(urutanNum) ? Math.round(urutanNum) : 0;
  const aktif = b.aktif === false ? false : true;

  if (!judul) return fail(400, "Judul SOP wajib diisi.");

  const rows = await query<Sop>(
    `INSERT INTO sop (sppg_id, kode, judul, kategori, tujuan, ruang_lingkup, penanggung_jawab, prosedur, referensi, urutan, aktif)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    [
      admin.sppg_id,
      kode,
      judul,
      kategori,
      tujuan,
      ruang_lingkup,
      penanggung_jawab,
      prosedur,
      referensi,
      urutan,
      aktif,
    ],
  );
  return ok({ sop: rows[0] }, { status: 201 });
});
