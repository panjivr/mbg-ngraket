import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import { INSIDEN_KATEGORI, URGENSI } from "@/lib/people-culture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// GET — laporan yang saya buat + status terkini.
export const GET = route(async () => {
  const me = await requireSession();
  const rows = await query<{ id: number; kategori: string; status: string; created_at: string; urgensi: string }>(
    `SELECT id, kategori, status, urgensi, created_at FROM pc_incident WHERE sppg_id=$1 AND pelapor_id=$2 ORDER BY created_at DESC LIMIT 30`,
    [me.sppg_id, me.uid],
  );
  return ok({ laporan: rows, kategori: INSIDEN_KATEGORI, urgensi: URGENSI });
});

// POST — lapor masalah. body {kategori, deskripsi, tanggal, lokasi, pihak, saksi, berulang, dampak, urgensi, rahasia}
export const POST = route(async (req: NextRequest) => {
  const me = await requireSession();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const kategori = String(b.kategori ?? "").trim();
  if (!INSIDEN_KATEGORI.includes(kategori)) return fail(400, "Kategori tidak valid.");
  const deskripsi = String(b.deskripsi ?? "").trim().slice(0, 2000);
  if (deskripsi.length < 5) return fail(400, "Deskripsi kejadian wajib diisi.");
  const tanggal = DATE_RE.test(String(b.tanggal)) ? String(b.tanggal) : null;
  const urgensi = URGENSI.includes(String(b.urgensi)) ? String(b.urgensi) : "sedang";
  // rahasia = sembunyikan identitas pelapor dari pihak dilaporkan; pelapor_id tetap
  // disimpan agar HR/case handler bisa menindaklanjuti bertanggung jawab (sesuai MD).
  const rahasia = b.rahasia === true;
  await query(
    `INSERT INTO pc_incident (sppg_id, pelapor_id, kategori, deskripsi, tanggal, lokasi, pihak, saksi, berulang, dampak, urgensi, rahasia, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'SUBMITTED')`,
    [me.sppg_id, me.uid, kategori, deskripsi, tanggal,
      String(b.lokasi ?? "").trim().slice(0, 150), String(b.pihak ?? "").trim().slice(0, 200),
      String(b.saksi ?? "").trim().slice(0, 200), b.berulang === true,
      String(b.dampak ?? "").trim().slice(0, 500), urgensi, rahasia],
  );
  return ok({ saved: true });
});
