import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { getSppg } from "@/lib/sppg";
import { ok, fail, route } from "@/lib/api";
import { localDate } from "@/lib/time";
import type { Kendaraan, KilometerEntri } from "@/lib/kilometer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const num = (v: unknown) => Math.max(0, Math.round(Number(v)) || 0);
const foto = (v: unknown) => {
  const s = String(v ?? "");
  return s.startsWith("data:image/") && s.length < 3_500_000 ? s : "";
};

/** GET ?tanggal=  → kendaraan aktif + entri tanggal itu.
 *  GET ?from=&to=&kendaraan_id= → entri rentang (untuk tabel/cetak). */
export const GET = route(async (req: NextRequest) => {
  const s = await requireSession();
  const sppgId = s.sppg_id;
  const sp = req.nextUrl.searchParams;
  const sppg = await getSppg(sppgId as number);
  const tz = sppg?.tz || "Asia/Jakarta";

  const kendaraan = await query<Kendaraan>(
    `SELECT * FROM kendaraan WHERE sppg_id = $1 ORDER BY urutan ASC, id ASC`,
    [sppgId],
  );

  const from = sp.get("from");
  const to = sp.get("to");
  if (from && to && DATE_RE.test(from) && DATE_RE.test(to)) {
    const kid = sp.get("kendaraan_id");
    const params: unknown[] = [sppgId, from, to];
    let extra = "";
    if (kid && Number.isFinite(parseInt(kid, 10))) { params.push(parseInt(kid, 10)); extra = ` AND kendaraan_id = $4`; }
    const entri = await query<KilometerEntri>(
      `SELECT id, kendaraan_id, tanggal, km_berangkat, km_pulang, foto_berangkat, foto_pulang
         FROM kilometer WHERE sppg_id = $1 AND tanggal BETWEEN $2 AND $3${extra}
        ORDER BY tanggal ASC, kendaraan_id ASC`,
      params,
    );
    return ok({ kendaraan, entri, from, to, sppg: { nama: sppg?.nama ?? "" } });
  }

  const tanggal = DATE_RE.test(sp.get("tanggal") || "") ? sp.get("tanggal")! : localDate(tz);
  const entri = await query<KilometerEntri>(
    `SELECT id, kendaraan_id, tanggal, km_berangkat, km_pulang, foto_berangkat, foto_pulang
       FROM kilometer WHERE sppg_id = $1 AND tanggal = $2`,
    [sppgId, tanggal],
  );
  return ok({ tanggal, kendaraan, entri, sppg: { nama: sppg?.nama ?? "" } });
});

export const POST = route(async (req: NextRequest) => {
  const s = await requireSession();
  const sppgId = s.sppg_id;
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const tanggal = String(b.tanggal ?? "");
  if (!DATE_RE.test(tanggal)) return fail(400, "Tanggal tidak valid.");
  const kid = parseInt(String(b.kendaraan_id), 10);
  if (!Number.isFinite(kid)) return fail(400, "Kendaraan tidak valid.");

  // Pastikan kendaraan milik dapur ini.
  const owns = (await query<{ id: number }>(`SELECT id FROM kendaraan WHERE id = $1 AND sppg_id = $2`, [kid, sppgId]))[0];
  if (!owns) return fail(404, "Kendaraan tidak ditemukan.");

  await query(
    `INSERT INTO kilometer (sppg_id, kendaraan_id, tanggal, km_berangkat, km_pulang, foto_berangkat, foto_pulang, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7, now())
     ON CONFLICT (kendaraan_id, tanggal) DO UPDATE
       SET km_berangkat = EXCLUDED.km_berangkat, km_pulang = EXCLUDED.km_pulang,
           foto_berangkat = EXCLUDED.foto_berangkat, foto_pulang = EXCLUDED.foto_pulang, updated_at = now()`,
    [sppgId, kid, tanggal, num(b.km_berangkat), num(b.km_pulang), foto(b.foto_berangkat), foto(b.foto_pulang)],
  );
  return ok({ ok: true });
});
