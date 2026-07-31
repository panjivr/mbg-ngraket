import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { catatAudit } from "@/lib/audit";
import { ok, fail, route } from "@/lib/api";
import { sanitizeBaHtml } from "@/lib/berita-acara";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;
const str = (v: unknown, max: number) => String(v ?? "").slice(0, max);

interface GiziRow {
  id: number;
  slug: string;
  judul: string;
  nomor: string;
  tanggal: string;
  dibuat_oleh: string;
  created_at: string;
  updated_at: string;
}

// GET: daftar dokumen gizi tersimpan. ?tanggal=YYYY-MM-DD (satu hari) atau
// ?bulan=YYYY-MM (satu bulan). Tanpa parameter -> semua di dapur ini (terbaru).
export const GET = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const sp = req.nextUrl.searchParams;
  const tanggal = sp.get("tanggal") || "";
  const bulan = sp.get("bulan") || "";

  let where = "sppg_id = $1";
  const params: unknown[] = [admin.sppg_id];
  if (DATE_RE.test(tanggal)) {
    where += " AND tanggal = $2";
    params.push(tanggal);
  } else if (MONTH_RE.test(bulan)) {
    where += " AND to_char(tanggal, 'YYYY-MM') = $2";
    params.push(bulan);
  }

  const rows = await query<GiziRow>(
    `SELECT id, slug, judul, nomor, tanggal, dibuat_oleh, created_at, updated_at
       FROM laporan_gizi
      WHERE ${where}
      ORDER BY tanggal DESC, id DESC
      LIMIT 500`,
    params,
  );
  return ok({ items: rows });
});

// POST: simpan (buat baru) atau perbarui (bila id dikirim) satu dokumen gizi.
export const POST = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const tanggal = str(b.tanggal, 10);
  if (!DATE_RE.test(tanggal)) return fail(400, "Tanggal tidak valid.");
  const slug = str(b.slug, 60);
  const judul = str(b.judul, 200);
  const nomor = str(b.nomor, 120);
  const konten = sanitizeBaHtml(str(b.konten_html, 400_000));
  if (!konten.trim()) return fail(400, "Konten kosong.");
  const idRaw = Number(b.id);
  const id = Number.isInteger(idRaw) && idRaw > 0 ? idRaw : null;

  if (id !== null) {
    const upd = await query<{ id: number }>(
      `UPDATE laporan_gizi
          SET judul = $1, nomor = $2, tanggal = $3, konten_html = $4, updated_at = now()
        WHERE id = $5 AND sppg_id = $6
        RETURNING id`,
      [judul, nomor, tanggal, konten, id, admin.sppg_id],
    );
    if (!upd.length) return fail(404, "Data tidak ditemukan.");
    await catatAudit(admin, "ubah", "Laporan Gizi", `${judul} (${tanggal})`);
    return ok({ id: upd[0].id });
  }

  const ins = await query<{ id: number }>(
    `INSERT INTO laporan_gizi (sppg_id, slug, judul, nomor, tanggal, konten_html, dibuat_oleh)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [admin.sppg_id, slug, judul, nomor, tanggal, konten, admin.nama ?? ""],
  );
  await catatAudit(admin, "buat", "Laporan Gizi", `${judul} (${tanggal})`);
  return ok({ id: ins[0].id }, { status: 201 });
});
