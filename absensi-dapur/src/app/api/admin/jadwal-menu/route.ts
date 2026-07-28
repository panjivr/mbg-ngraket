import { NextRequest } from "next/server";
import { query, withClient } from "@/lib/db";
import { requireAkses } from "@/lib/session";
import { ok, fail, route } from "@/lib/api";
import { localDate } from "@/lib/time";
import { normalizeSasaran, type Porsi, type Sasaran } from "@/lib/jadwal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Tambah `n` hari ke tanggal "YYYY-MM-DD" (aman zona waktu, pakai UTC). */
function tambahHari(tgl: string, n: number): string {
  const [y, m, d] = tgl.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

interface JadwalRow {
  id: number;
  tanggal: string;
  sasaran: Sasaran;
  menu_id: number;
  nama: string;
  urutan: number;
}
interface PorsiRow {
  tanggal: string;
  besar: number;
  kecil: number;
  b3: number;
}

// GET: satu periode jadwal (mulai + jumlah hari) beserta porsi & daftar menu.
export const GET = route(async (req: NextRequest) => {
  const admin = await requireAkses("distribusi");
  const url = new URL(req.url);
  const mulai = url.searchParams.get("mulai") || localDate("Asia/Jakarta");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(mulai)) return fail(400, "Tanggal mulai tidak valid.");
  const hari = Math.min(31, Math.max(1, parseInt(url.searchParams.get("hari") || "14", 10) || 14));
  const selesai = tambahHari(mulai, hari - 1);
  const tanggalList = Array.from({ length: hari }, (_, i) => tambahHari(mulai, i));

  // Porsi default = total penerima terdaftar aktif (Besar/Kecil/B3).
  const pd = await query<Porsi>(
    `SELECT COALESCE(SUM(besar),0)::int AS besar,
            COALESCE(SUM(kecil),0)::int AS kecil,
            COALESCE(SUM(b3),0)::int    AS b3
       FROM penerima WHERE sppg_id = $1 AND aktif = TRUE`,
    [admin.sppg_id],
  );
  const porsiDefault: Porsi = pd[0] ?? { besar: 0, kecil: 0, b3: 0 };

  const items = await query<JadwalRow>(
    `SELECT j.id, j.tanggal::text AS tanggal, j.sasaran, j.menu_id, m.nama, j.urutan
       FROM jadwal_menu j JOIN menu m ON m.id = j.menu_id
      WHERE j.sppg_id = $1 AND j.tanggal BETWEEN $2 AND $3
      ORDER BY j.tanggal ASC, j.sasaran ASC, j.urutan ASC, j.id ASC`,
    [admin.sppg_id, mulai, selesai],
  );
  const overrides = await query<PorsiRow>(
    `SELECT tanggal::text AS tanggal, besar, kecil, b3
       FROM jadwal_porsi WHERE sppg_id = $1 AND tanggal BETWEEN $2 AND $3`,
    [admin.sppg_id, mulai, selesai],
  );
  const ovMap = new Map(overrides.map((o) => [o.tanggal, o]));

  const hariList = tanggalList.map((tanggal) => {
    const ov = ovMap.get(tanggal);
    const dayItems = items.filter((it) => it.tanggal === tanggal);
    return {
      tanggal,
      porsi: ov ? { besar: ov.besar, kecil: ov.kecil, b3: ov.b3 } : porsiDefault,
      porsiOverride: !!ov,
      reguler: dayItems.filter((it) => it.sasaran === "reguler"),
      b3: dayItems.filter((it) => it.sasaran === "b3"),
    };
  });

  const menus = await query<{ id: number; nama: string; kategori: string }>(
    `SELECT id, nama, kategori FROM menu WHERE sppg_id = $1 AND aktif = TRUE
      ORDER BY urutan ASC, nama ASC`,
    [admin.sppg_id],
  );

  return ok({ mulai, selesai, hari, porsiDefault, menus, hariList });
});

// POST: tempel satu menu ke tanggal (sasaran reguler/b3).
export const POST = route(async (req: NextRequest) => {
  const admin = await requireAkses("distribusi");
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const tanggal = String(b.tanggal ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return fail(400, "Tanggal tidak valid.");
  const sasaran = normalizeSasaran(b.sasaran);
  const menuId = Number(b.menu_id) || 0;
  if (!menuId) return fail(400, "Menu wajib dipilih.");

  const created = await withClient(async (client) => {
    const own = await client.query(`SELECT id FROM menu WHERE id = $1 AND sppg_id = $2`, [
      menuId,
      admin.sppg_id,
    ]);
    if (!own.rows[0]) return null;
    const maxUrut =
      (
        await client.query<{ m: number }>(
          `SELECT COALESCE(MAX(urutan),0) AS m FROM jadwal_menu WHERE sppg_id=$1 AND tanggal=$2 AND sasaran=$3`,
          [admin.sppg_id, tanggal, sasaran],
        )
      ).rows[0]?.m ?? 0;
    const r = await client.query<{ id: number }>(
      `INSERT INTO jadwal_menu (sppg_id, tanggal, sasaran, menu_id, urutan)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (sppg_id, tanggal, sasaran, menu_id) DO NOTHING
       RETURNING id`,
      [admin.sppg_id, tanggal, sasaran, menuId, maxUrut + 1],
    );
    return r.rows[0]?.id ?? 0;
  });
  if (created === null) return fail(404, "Menu tidak ditemukan.");
  return ok({ ok: true, id: created }, { status: 201 });
});

// DELETE: lepas satu menu dari jadwal (?id=).
export const DELETE = route(async (req: NextRequest) => {
  const admin = await requireAkses("distribusi");
  const id = parseInt(new URL(req.url).searchParams.get("id") || "", 10);
  if (!Number.isFinite(id)) return fail(400, "ID tidak valid.");
  const done = await withClient(async (client) => {
    const r = await client.query(`DELETE FROM jadwal_menu WHERE id = $1 AND sppg_id = $2`, [
      id,
      admin.sppg_id,
    ]);
    return (r.rowCount ?? 0) > 0;
  });
  if (!done) return fail(404, "Jadwal tidak ditemukan.");
  return ok({ ok: true });
});

// PUT: set/override jumlah porsi untuk satu tanggal.
export const PUT = route(async (req: NextRequest) => {
  const admin = await requireAkses("distribusi");
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const tanggal = String(b.tanggal ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return fail(400, "Tanggal tidak valid.");
  const clamp = (v: unknown) => Math.max(0, Math.round(Number(v) || 0));
  const besar = clamp(b.besar);
  const kecil = clamp(b.kecil);
  const b3 = clamp(b.b3);
  await query(
    `INSERT INTO jadwal_porsi (sppg_id, tanggal, besar, kecil, b3)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (sppg_id, tanggal) DO UPDATE SET besar=$3, kecil=$4, b3=$5`,
    [admin.sppg_id, tanggal, besar, kecil, b3],
  );
  return ok({ ok: true });
});
