import { NextRequest } from "next/server";
import crypto from "crypto";
import { requireSession } from "@/lib/session";
import { getSppg } from "@/lib/sppg";
import { query } from "@/lib/db";
import { ok, fail, route } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_KONTEN = 60_000;

function newId(): string {
  // 12 karakter base32 (tanpa karakter ambigu) — cukup acak & ringkas untuk QR.
  const buf = crypto.randomBytes(8);
  const ab = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 12; i++) out += ab[buf[i % buf.length] % ab.length];
  return out;
}

function parseWaktu(w: string): string | null {
  if (!w) return null;
  const d = new Date(w);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Terbitkan dokumen TTE baru (menyimpan isi dokumen). Kembalikan id untuk QR. */
export const POST = route(async (req: NextRequest) => {
  const s = await requireSession();
  const sppg = await getSppg(s.sppg_id as number);
  const b = await req.json().catch(() => ({}));
  const jenis = String(b.jenis ?? "Dokumen").slice(0, 160);
  const konten = String(b.konten ?? "").slice(0, MAX_KONTEN);
  const waktu = parseWaktu(String(b.waktu ?? ""));
  const id = newId();
  await query(
    `INSERT INTO tte_dokumen (id, sppg_id, signer_uid, signer_nama, unit, jenis, waktu, konten)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [id, s.sppg_id, s.uid, s.nama, sppg?.nama || "", jenis, waktu, konten],
  );
  return ok({ id });
});

/** Perbarui isi dokumen TTE (otomatis saat dokumen diisi/diubah). */
export const PUT = route(async (req: NextRequest) => {
  const s = await requireSession();
  const b = await req.json().catch(() => ({}));
  const id = String(b.id ?? "");
  if (!/^[A-Z2-9]{12}$/.test(id)) return fail(400, "ID tidak valid.");
  const jenis = String(b.jenis ?? "Dokumen").slice(0, 160);
  const konten = String(b.konten ?? "").slice(0, MAX_KONTEN);
  const waktu = parseWaktu(String(b.waktu ?? ""));
  // Hanya pemilik (unit & user yang sama) yang boleh memperbarui.
  await query(
    `UPDATE tte_dokumen SET jenis=$1, konten=$2, waktu=$3
      WHERE id=$4 AND sppg_id=$5 AND signer_uid=$6`,
    [jenis, konten, waktu, id, s.sppg_id, s.uid],
  );
  return ok({ ok: true });
});
