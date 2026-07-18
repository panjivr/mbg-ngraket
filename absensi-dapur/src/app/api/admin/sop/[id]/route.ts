import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import type { Sop } from "@/lib/sop-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Ambil satu SOP yang di-scope ke dapur (SPPG) yang sedang login. */
async function loadSop(
  id: number,
  sppgId: number | null | undefined,
): Promise<Sop | undefined> {
  const rows = await query<Sop>(`SELECT * FROM sop WHERE id = $1 AND sppg_id = $2`, [
    id,
    sppgId,
  ]);
  return rows[0];
}

/** Ubah SOP: hanya menimpa field yang dikirim, sisanya dipertahankan. */
export const PUT = route(async (req: NextRequest, ctx: Ctx) => {
  const admin = await requireAdmin();
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");

  const existing = await loadSop(id, admin.sppg_id);
  if (!existing) return fail(404, "SOP tidak ditemukan.");

  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const kode = "kode" in b ? String(b.kode ?? "").trim() : existing.kode;
  const judul = "judul" in b ? String(b.judul ?? "").trim() : existing.judul;
  const kategori =
    "kategori" in b ? String(b.kategori ?? "").trim() || "Umum" : existing.kategori;
  const tujuan = "tujuan" in b ? String(b.tujuan ?? "").trim() : existing.tujuan;
  const ruang_lingkup =
    "ruang_lingkup" in b ? String(b.ruang_lingkup ?? "").trim() : existing.ruang_lingkup;
  const penanggung_jawab =
    "penanggung_jawab" in b
      ? String(b.penanggung_jawab ?? "").trim()
      : existing.penanggung_jawab;
  const prosedur = "prosedur" in b ? String(b.prosedur ?? "").trim() : existing.prosedur;
  const referensi = "referensi" in b ? String(b.referensi ?? "").trim() : existing.referensi;
  const urutan =
    "urutan" in b && Number.isFinite(Number(b.urutan))
      ? Math.round(Number(b.urutan))
      : existing.urutan;
  const aktif = "aktif" in b ? Boolean(b.aktif) : existing.aktif;

  if (!judul) return fail(400, "Judul SOP wajib diisi.");

  const rows = await query<Sop>(
    `UPDATE sop SET kode=$1, judul=$2, kategori=$3, tujuan=$4, ruang_lingkup=$5, penanggung_jawab=$6, prosedur=$7, referensi=$8, urutan=$9, aktif=$10, updated_at=now()
      WHERE id=$11 AND sppg_id=$12 RETURNING *`,
    [
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
      id,
      admin.sppg_id,
    ],
  );
  return ok({ sop: rows[0] });
});

/** Hapus SOP milik dapur (SPPG) yang sedang login. */
export const DELETE = route(async (_req: NextRequest, ctx: Ctx) => {
  const admin = await requireAdmin();
  const id = parseInt((await ctx.params).id, 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");

  const rows = await query<{ id: number }>(
    `DELETE FROM sop WHERE id = $1 AND sppg_id = $2 RETURNING id`,
    [id, admin.sppg_id],
  );
  if (!rows.length) return fail(404, "SOP tidak ditemukan.");
  return ok({ ok: true });
});
