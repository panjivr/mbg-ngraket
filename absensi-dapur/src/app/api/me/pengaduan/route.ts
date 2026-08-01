import { query } from "@/lib/db";
import { requireSession } from "@/lib/session";
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
}

const KATEGORI = ["keluhan", "penilaian", "masalah", "saran", "lainnya"];

/** Daftar pengaduan milik pegawai ini (yang tidak dikirim anonim). */
export const GET = route(async () => {
  const s = await requireSession();
  const rows = await query<Row>(
    `SELECT id, kategori, isi, anonim, status, balasan, dibalas_at, created_at
       FROM pengaduan
      WHERE user_id = $1 AND anonim = FALSE
      ORDER BY created_at DESC
      LIMIT 100`,
    [s.uid],
  );
  return ok({ pengaduan: rows });
});

/** Kirim pengaduan baru. anonim = TRUE menyembunyikan identitas dari admin. */
export const POST = route(async (req: Request) => {
  const s = await requireSession();
  const body = (await req.json().catch(() => ({}))) as {
    kategori?: string;
    isi?: string;
    anonim?: boolean;
  };
  const isi = (body.isi || "").trim();
  if (isi.length < 5) return fail(400, "Isi laporan minimal 5 karakter.");
  if (isi.length > 4000) return fail(400, "Isi laporan terlalu panjang.");
  const kategori = KATEGORI.includes(body.kategori || "")
    ? (body.kategori as string)
    : "lainnya";
  const anonim = body.anonim === true;

  await query(
    `INSERT INTO pengaduan (sppg_id, user_id, anonim, kategori, isi)
     VALUES ($1, $2, $3, $4, $5)`,
    [s.sppg_id, anonim ? null : s.uid, anonim, kategori, isi],
  );
  return ok({ sukses: true });
});
