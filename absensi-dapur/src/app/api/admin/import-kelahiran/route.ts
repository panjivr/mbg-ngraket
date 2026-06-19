import { withClient, query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ok, route } from "@/lib/api";
import { DATA_KELAHIRAN } from "@/lib/dataKelahiran";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalisasi(nama: string): string {
  return nama.toUpperCase().trim().replace(/\s+/g, " ");
}

/**
 * Melengkapi akun yang SUDAH ADA dengan tempat & tanggal lahir dari data PDF,
 * dicocokkan berdasarkan nama (tidak peka huruf besar/kecil & spasi ganda).
 * Hanya melakukan UPDATE — tidak pernah membuat akun baru.
 *
 * Mendukung pratinjau via body { preview: true } (tidak mengubah data).
 */
export const POST = route(async (req: Request) => {
  await requireAdmin();
  const body = await req.json().catch(() => ({}));
  const preview = body?.preview === true;

  const updatedNames: string[] = [];
  const unmatched: string[] = [];

  await withClient(async (client) => {
    await client.query("BEGIN");
    try {
      for (const d of DATA_KELAHIRAN) {
        const norm = normalisasi(d.nama);
        if (preview) {
          const r = await client.query(
            `SELECT 1 FROM users
              WHERE regexp_replace(upper(btrim(nama)), '\\s+', ' ', 'g') = $1
              LIMIT 1`,
            [norm],
          );
          if (r.rowCount && r.rowCount > 0) updatedNames.push(d.nama);
          else unmatched.push(d.nama);
        } else {
          const r = await client.query(
            `UPDATE users
                SET tempat_lahir = $1, tanggal_lahir = $2
              WHERE regexp_replace(upper(btrim(nama)), '\\s+', ' ', 'g') = $3`,
            [d.tempat_lahir, d.tanggal_lahir, norm],
          );
          if (r.rowCount && r.rowCount > 0) updatedNames.push(d.nama);
          else unmatched.push(d.nama);
        }
      }
      if (preview) await client.query("ROLLBACK");
      else await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    }
  });

  // Berapa akun yang masih belum punya tanggal lahir setelah impor.
  const sisa = (
    await query<{ c: string }>(
      `SELECT COUNT(*)::text AS c FROM users WHERE tanggal_lahir IS NULL`,
    )
  )[0];

  return ok({
    preview,
    total: DATA_KELAHIRAN.length,
    cocok: updatedNames.length,
    diperbarui: preview ? 0 : updatedNames.length,
    tidak_ditemukan: unmatched,
    sisa_tanpa_tanggal: Number(sisa?.c ?? 0),
  });
});
