import { NextRequest } from "next/server";
import { query, withClient } from "@/lib/db";
import { requireAkses } from "@/lib/session";
import { getSppg } from "@/lib/sppg";
import { ok, fail, route } from "@/lib/api";
import { localDate } from "@/lib/time";
import type { Penerima, DistribusiBaris, MenuGrup } from "@/lib/distribusi-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface ItemRow {
  penerima_id: number;
  besar: number;
  kecil: number;
  b3: number;
  ikut: boolean;
}

/** Bersihkan struktur menu (grup + item) dari input agar aman disimpan. */
function cleanMenu(v: unknown): MenuGrup[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 30).map((g) => {
    const o = (g ?? {}) as Record<string, unknown>;
    const items = Array.isArray(o.items)
      ? (o.items as unknown[]).slice(0, 60).map((i) => String(i ?? "").slice(0, 200))
      : [];
    return { judul: String(o.judul ?? "").slice(0, 160), items };
  });
}

export const GET = route(async (req: NextRequest) => {
  const admin = await requireAkses("distribusi");
  const s = await getSppg(admin.sppg_id as number);
  const tz = s?.tz || "Asia/Jakarta";
  const sp = req.nextUrl.searchParams;
  const tanggal = DATE_RE.test(sp.get("tanggal") || "") ? sp.get("tanggal")! : localDate(tz);

  const penerima = await query<Penerima>(
    `SELECT * FROM penerima WHERE sppg_id = $1 AND aktif = TRUE ORDER BY urutan ASC, id ASC`,
    [admin.sppg_id],
  );

  const dist = (
    await query<{
      id: number; driver: string; menu: string; catatan: string;
      menu_sekolah: MenuGrup[]; menu_posyandu: MenuGrup[];
    }>(
      `SELECT id, driver, menu, catatan, menu_sekolah, menu_posyandu
         FROM distribusi WHERE sppg_id = $1 AND tanggal = $2`,
      [admin.sppg_id, tanggal],
    )
  )[0];

  const itemMap = new Map<number, ItemRow>();
  if (dist) {
    const items = await query<ItemRow>(
      `SELECT penerima_id, besar, kecil, b3, ikut FROM distribusi_item WHERE distribusi_id = $1`,
      [dist.id],
    );
    for (const it of items) itemMap.set(it.penerima_id, it);
  }

  const baris: DistribusiBaris[] = penerima.map((p) => {
    const ov = itemMap.get(p.id);
    return {
      penerima_id: p.id,
      jenis: p.jenis,
      nama: p.nama,
      jenjang: p.jenjang,
      jam_kirim: p.jam_kirim,
      besar: ov ? ov.besar : p.besar,
      kecil: ov ? ov.kecil : p.kecil,
      b3: ov ? ov.b3 : p.b3,
      pj: p.pj,
      ikut: ov ? ov.ikut : true,
    };
  });

  const hb = s?.harga_besar ?? 10000;
  const hk = s?.harga_kecil ?? 8000;
  const h3 = s?.harga_b3 ?? 8000;
  let tBesar = 0,
    tKecil = 0,
    tB3 = 0;
  for (const r of baris) {
    if (!r.ikut) continue;
    // PJ (penanggung jawab) dihitung sebagai porsi besar (harga besar 10.000).
    tBesar += r.besar + r.pj;
    tKecil += r.kecil;
    tB3 += r.b3;
  }
  const pagu = tBesar * hb + tKecil * hk + tB3 * h3;

  return ok({
    tanggal,
    tersimpan: !!dist,
    sppg: {
      nama: s?.nama ?? "",
      kepala_sppg: s?.kepala_sppg ?? "",
      alamat: s?.alamat ?? "",
      harga_besar: hb,
      harga_kecil: hk,
      harga_b3: h3,
      ahli_gizi: s?.ahli_gizi ?? "",
      koordinator: s?.koordinator ?? "",
      tz,
    },
    distribusi: dist
      ? {
          driver: dist.driver, menu: dist.menu, catatan: dist.catatan,
          menu_sekolah: dist.menu_sekolah ?? [],
          menu_posyandu: dist.menu_posyandu ?? [],
        }
      : { driver: "", menu: "", catatan: "", menu_sekolah: [], menu_posyandu: [] },
    baris,
    total: {
      besar: tBesar,
      kecil: tKecil,
      b3: tB3,
      porsi: tBesar + tKecil + tB3,
      pagu,
    },
  });
});

export const POST = route(async (req: NextRequest) => {
  const admin = await requireAkses("distribusi");
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const tanggal = String(b.tanggal ?? "");
  if (!DATE_RE.test(tanggal)) return fail(400, "Tanggal tidak valid.");
  const driver = String(b.driver ?? "").trim();
  const menu = String(b.menu ?? "").trim();
  const catatan = String(b.catatan ?? "").trim();
  const menuSekolah = cleanMenu(b.menu_sekolah);
  const menuPosyandu = cleanMenu(b.menu_posyandu);
  const items = Array.isArray(b.items) ? (b.items as Record<string, unknown>[]) : [];

  await withClient(async (client) => {
    await client.query("BEGIN");
    try {
      const dist = (
        await client.query<{ id: number }>(
          `INSERT INTO distribusi (sppg_id, tanggal, driver, menu, catatan, menu_sekolah, menu_posyandu)
           VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)
           ON CONFLICT (sppg_id, tanggal) DO UPDATE
             SET driver = EXCLUDED.driver, menu = EXCLUDED.menu, catatan = EXCLUDED.catatan,
                 menu_sekolah = EXCLUDED.menu_sekolah, menu_posyandu = EXCLUDED.menu_posyandu
           RETURNING id`,
          [admin.sppg_id, tanggal, driver, menu, catatan, JSON.stringify(menuSekolah), JSON.stringify(menuPosyandu)],
        )
      ).rows[0];

      // Set penerima yang valid milik dapur ini.
      const valid = new Set(
        (
          await client.query<{ id: number }>(
            `SELECT id FROM penerima WHERE sppg_id = $1`,
            [admin.sppg_id],
          )
        ).rows.map((r) => r.id),
      );

      for (const it of items) {
        const pid = parseInt(String(it.penerima_id), 10);
        if (!valid.has(pid)) continue;
        const num = (v: unknown) => Math.max(0, Math.round(Number(v)) || 0);
        await client.query(
          `INSERT INTO distribusi_item (distribusi_id, penerima_id, besar, kecil, b3, ikut)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (distribusi_id, penerima_id) DO UPDATE
             SET besar = EXCLUDED.besar, kecil = EXCLUDED.kecil, b3 = EXCLUDED.b3, ikut = EXCLUDED.ikut`,
          [dist.id, pid, num(it.besar), num(it.kecil), num(it.b3), it.ikut === false ? false : true],
        );
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {});
      throw e;
    }
  });

  return ok({ ok: true });
});
