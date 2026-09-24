import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireSession, requireSuper } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import { daftarTurnamen } from "@/lib/game";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Daftar turnamen (semua akun boleh melihat, mis. jadwal & hadiah).
export const GET = route(async () => {
  await requireSession();
  return ok({ turnamen: await daftarTurnamen() });
});

function teks(v: unknown, max = 200): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

// Buat turnamen baru — hanya admin pusat (super admin).
export const POST = route(async (req: NextRequest) => {
  const s = await requireSuper();
  const b = await req.json().catch(() => null);
  const nama = teks(b?.nama, 120);
  const mulai = new Date(b?.mulai);
  const selesai = new Date(b?.selesai);
  if (!nama) return fail(400, "Nama turnamen wajib diisi.");
  if (isNaN(mulai.getTime()) || isNaN(selesai.getTime()))
    return fail(400, "Waktu mulai/selesai tidak valid.");
  if (selesai.getTime() <= mulai.getTime())
    return fail(400, "Waktu selesai harus setelah waktu mulai.");

  const rows = await query<{ id: number }>(
    `INSERT INTO game_turnamen (nama, mulai, selesai, hadiah1, hadiah2, hadiah3, catatan, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      nama,
      mulai.toISOString(),
      selesai.toISOString(),
      teks(b?.hadiah1),
      teks(b?.hadiah2),
      teks(b?.hadiah3),
      teks(b?.catatan, 500),
      s.uid,
    ],
  );
  return ok({ id: rows[0]?.id });
});
