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
  const buf = crypto.randomBytes(12);
  const ab = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 12; i++) out += ab[buf[i] % ab.length];
  return out;
}

function parseWaktu(w: string): string | null {
  if (!w) return null;
  const d = new Date(w);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** Bersihkan nama/peran: satu baris, buang tanda kurung/koma berlebih. */
function bersih(s: string, max: number): string {
  return String(s ?? "")
    .replace(/\s+/g, " ")
    .replace(/^[()\s]+|[()\s]+$/g, "")
    .trim()
    .slice(0, max);
}

/** Terbitkan dokumen TTE (menyimpan isi dokumen + penanda tangan kolomnya). */
export const POST = route(async (req: NextRequest) => {
  const s = await requireSession();
  const sppg = await getSppg(s.sppg_id as number);
  const b = await req.json().catch(() => ({}));
  const nama = bersih(b.nama, 120); // penanda tangan sesuai dokumen (bukan akun)
  const peran = bersih(b.peran, 120);
  const jenis = String(b.jenis ?? "Dokumen").slice(0, 160);
  const konten = String(b.konten ?? "").slice(0, MAX_KONTEN);
  const waktu = parseWaktu(String(b.waktu ?? ""));
  const id = newId();
  await query(
    `INSERT INTO tte_dokumen (id, sppg_id, signer_uid, signer_nama, peran, unit, jenis, waktu, konten)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [id, s.sppg_id, s.uid, nama, peran, sppg?.nama || "", jenis, waktu, konten],
  );
  return ok({ id });
});

/** Perbarui isi/penanda tangan dokumen TTE (otomatis saat dokumen diisi/diubah). */
export const PUT = route(async (req: NextRequest) => {
  const s = await requireSession();
  const b = await req.json().catch(() => ({}));
  const id = String(b.id ?? "");
  if (!/^[A-Z2-9]{12}$/.test(id)) return fail(400, "ID tidak valid.");
  const nama = bersih(b.nama, 120);
  const peran = bersih(b.peran, 120);
  const jenis = String(b.jenis ?? "Dokumen").slice(0, 160);
  const konten = String(b.konten ?? "").slice(0, MAX_KONTEN);
  const waktu = parseWaktu(String(b.waktu ?? ""));
  await query(
    `UPDATE tte_dokumen SET signer_nama=$1, peran=$2, jenis=$3, konten=$4, waktu=$5
      WHERE id=$6 AND sppg_id=$7 AND signer_uid=$8`,
    [nama, peran, jenis, konten, waktu, id, s.sppg_id, s.uid],
  );
  return ok({ ok: true });
});
