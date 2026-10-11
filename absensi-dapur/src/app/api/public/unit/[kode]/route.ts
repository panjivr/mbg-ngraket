import { query } from "@/lib/db";
import { ok, fail, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ kode: string }> };

interface UnitPublic {
  nama: string;
  jenis: string;
  logo_url: string;
}

/**
 * Info publik ringkas satu unit untuk halaman login berbranding (/masuk/[kode]).
 * Hanya mengembalikan nama, jenis, & logo unit AKTIF — tidak ada data sensitif,
 * tidak butuh sesi. Dipakai agar portal karyawan perusahaan tampil berbeda
 * (logo & tema korporat) tanpa lambang BGN.
 */
export const GET = route(async (_req, ctx: Ctx) => {
  const id = parseInt((await ctx.params).kode, 10);
  if (!Number.isFinite(id)) return fail(400, "Kode unit tidak valid.");
  const row = (
    await query<UnitPublic>(
      `SELECT nama, jenis, logo_url FROM sppg WHERE id = $1 AND aktif = TRUE`,
      [id],
    )
  )[0];
  if (!row) return fail(404, "Unit tidak ditemukan.");
  return ok({ unit: row });
});
