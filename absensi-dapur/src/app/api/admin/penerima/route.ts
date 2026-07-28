import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAkses } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import type { Penerima } from "@/lib/distribusi-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  const admin = await requireAkses("distribusi");
  const rows = await query<Penerima>(
    `SELECT * FROM penerima WHERE sppg_id = $1 ORDER BY urutan ASC, id ASC`,
    [admin.sppg_id],
  );
  return ok({ penerima: rows });
});

export const POST = route(async (req: NextRequest) => {
  const admin = await requireAkses("distribusi");
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const nama = String(b.nama ?? "").trim();
  if (!nama) return fail(400, "Nama penerima wajib diisi.");
  const jenis = b.jenis === "b3" ? "b3" : "serdik";
  // kategori hanya berlaku untuk B3 (balita / bumil / busui). Serdik selalu kosong.
  const KAT_B3 = ["balita", "bumil", "busui"];
  const kategori = jenis === "b3" ? (KAT_B3.includes(String(b.kategori)) ? String(b.kategori) : "balita") : "";
  const jenjang = String(b.jenjang ?? "").trim();
  const rawBesar = Math.max(0, Math.round(Number(b.besar ?? 0)) || 0);
  const rawKecil = Math.max(0, Math.round(Number(b.kecil ?? 0)) || 0);
  const rawB3 = Math.max(0, Math.round(Number(b.b3 ?? 0)) || 0);
  const rawPj = Math.max(0, Math.round(Number(b.pj ?? 0)) || 0);
  // Normalisasi porsi sesuai jenis: serdik tak punya B3; B3 tak punya besar/kecil/PJ.
  // Ini menjaga total master, distribusi, dan belanja tetap konsisten.
  const isB3 = jenis === "b3";
  const besar = isB3 ? 0 : rawBesar;
  const kecil = isB3 ? 0 : rawKecil;
  const b3 = isB3 ? rawB3 : 0;
  const pj = isB3 ? 0 : rawPj;
  const jam_kirim = String(b.jam_kirim ?? "07:00");
  const aktif = b.aktif === false ? false : true;
  const urutRow = await query<{ m: number | null }>(
    `SELECT MAX(urutan) AS m FROM penerima WHERE sppg_id = $1`,
    [admin.sppg_id],
  );
  const urutan = (urutRow[0]?.m ?? 0) + 1;
  const rows = await query<Penerima>(
    `INSERT INTO penerima (sppg_id, jenis, nama, jenjang, kategori, besar, kecil, b3, pj, jam_kirim, urutan, aktif)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [admin.sppg_id, jenis, nama, jenjang, kategori, besar, kecil, b3, pj, jam_kirim, urutan, aktif],
  );
  return ok({ penerima: rows[0] }, { status: 201 });
});
