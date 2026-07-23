import { NextRequest } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { getSppg } from "@/lib/sppg";
import { ok, fail, route } from "@/lib/api";
import { localDate } from "@/lib/time";
import {
  mergeIsi, mergeFoto, LAPORAN_FOTO_KOSONG,
  type LaporanIsi, type LaporanFoto, type Personel,
} from "@/lib/laporan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const str = (v: unknown, max = 4000) => String(v ?? "").slice(0, max);
const strArr = (v: unknown, maxItems = 60, maxLen = 400) =>
  Array.isArray(v) ? v.slice(0, maxItems).map((x) => str(x, maxLen)) : [];

function cleanIsi(v: unknown): LaporanIsi {
  const o = (v ?? {}) as Record<string, unknown>;
  const mt = (o.menu_tabel ?? {}) as Record<string, unknown>;
  const personel: Personel[] = Array.isArray(o.personel)
    ? (o.personel as unknown[]).slice(0, 40).map((p) => {
        const r = (p ?? {}) as Record<string, unknown>;
        return { label: str(r.label, 120), jumlah: Math.max(0, Math.round(Number(r.jumlah)) || 0) };
      })
    : [];
  return mergeIsi({
    menu_teks: str(o.menu_teks, 500),
    menu_tabel: {
      besar: strArr(mt.besar), kecil: strArr(mt.kecil),
      busui_bumil: strArr(mt.busui_bumil), balita: strArr(mt.balita),
    },
    personel: personel.length ? personel : undefined,
    kegiatan: Array.isArray(o.kegiatan) ? strArr(o.kegiatan, 40, 1000) : undefined,
    kendala: str(o.kendala, 3000),
    solusi: str(o.solusi, 3000),
  });
}

// Foto: hanya terima data URL gambar; batasi ukuran per foto (~3MB base64).
function cleanFoto(v: unknown): LaporanFoto {
  const o = (v ?? {}) as Record<string, unknown>;
  const one = (x: unknown) => {
    const s = String(x ?? "");
    return s.startsWith("data:image/") && s.length < 3_500_000 ? s : "";
  };
  return {
    menu: one(o.menu), penerimaan: one(o.penerimaan), persiapan: one(o.persiapan),
    pengolahan: one(o.pengolahan), pemorsian: one(o.pemorsian),
    distribusi: one(o.distribusi), cuci: one(o.cuci),
  };
}

export const GET = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const s = await getSppg(admin.sppg_id as number);
  const tz = s?.tz || "Asia/Jakarta";
  const sp = req.nextUrl.searchParams;
  const tanggal = DATE_RE.test(sp.get("tanggal") || "") ? sp.get("tanggal")! : localDate(tz);

  const row = (
    await query<{ isi: Partial<LaporanIsi>; foto: Partial<LaporanFoto> }>(
      `SELECT isi, foto FROM laporan WHERE sppg_id = $1 AND tanggal = $2`,
      [admin.sppg_id, tanggal],
    )
  )[0];

  return ok({
    tanggal,
    tersimpan: !!row,
    sppg: { nama: s?.nama ?? "", alamat: s?.alamat ?? "", kepala_sppg: s?.kepala_sppg ?? "", tz },
    isi: mergeIsi(row?.isi),
    foto: row ? mergeFoto(row.foto) : LAPORAN_FOTO_KOSONG,
  });
});

export const POST = route(async (req: NextRequest) => {
  const admin = await requireAdmin();
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const tanggal = str(b.tanggal, 10);
  if (!DATE_RE.test(tanggal)) return fail(400, "Tanggal tidak valid.");
  const isi = cleanIsi(b.isi);
  const foto = cleanFoto(b.foto);

  await query(
    `INSERT INTO laporan (sppg_id, tanggal, isi, foto, updated_at)
     VALUES ($1,$2,$3::jsonb,$4::jsonb, now())
     ON CONFLICT (sppg_id, tanggal) DO UPDATE
       SET isi = EXCLUDED.isi, foto = EXCLUDED.foto, updated_at = now()`,
    [admin.sppg_id, tanggal, JSON.stringify(isi), JSON.stringify(foto)],
  );
  return ok({ ok: true });
});
