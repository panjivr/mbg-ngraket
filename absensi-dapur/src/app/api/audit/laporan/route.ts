import { NextRequest } from "next/server";
import { ok, route } from "@/lib/api";
import { requireAkses } from "@/lib/session";
import { query } from "@/lib/db";
import { getSppg } from "@/lib/sppg";
import type { AuditTemuan } from "@/lib/audit-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SELECT_TEMUAN = `
  SELECT id, sppg_id, sesi_id, auditor_id, waktu, area, kategori, observasi,
         statement_, bukti, foto, standar_sop, gap, kemungkinan, dampak,
         risk_score, tingkat, status, rekomendasi, created_at, updated_at
    FROM audit_temuan`;

const RE_TGL = /^\d{4}-\d{2}-\d{2}$/;

export interface AuditLaporanStats {
  total: number;
  tingkat: { minor: number; mayor: number; kritis: number };
  status: { open: number; improvement: number; closed: number };
  kategori: Record<string, number>;
  area: Record<string, number>;
  /** Jumlah sesi audit yang sudah dikirim (finalisasi) pada rentang. */
  sesi_terkirim: number;
}

export interface AuditLaporanSppg {
  nama: string;
  alamat: string;
  kepala_sppg: string;
}

export interface AuditLaporanResponse {
  dari: string | null;
  sampai: string | null;
  sppg: AuditLaporanSppg | null;
  temuan: AuditTemuan[];
  stats: AuditLaporanStats;
}

/**
 * GET /api/audit/laporan?dari=&sampai=
 * Rekap temuan lintas sesi (scoped ke sppg auditor) + agregat statistik untuk
 * dashboard laporan & cetak. Rentang tanggal opsional (filter kolom waktu).
 */
export const GET = route(async (req: NextRequest) => {
  const me = await requireAkses("audit");
  const sp = new URL(req.url).searchParams;

  const cond: string[] = ["sppg_id IS NOT DISTINCT FROM $1"];
  const params: unknown[] = [me.sppg_id ?? null];

  const dariRaw = sp.get("dari");
  const dari = dariRaw && RE_TGL.test(dariRaw) ? dariRaw : null;
  if (dari) {
    params.push(dari);
    cond.push(`waktu >= $${params.length}::date`);
  }
  const sampaiRaw = sp.get("sampai");
  const sampai = sampaiRaw && RE_TGL.test(sampaiRaw) ? sampaiRaw : null;
  if (sampai) {
    params.push(sampai);
    // inklusif s/d akhir hari.
    cond.push(`waktu < ($${params.length}::date + INTERVAL '1 day')`);
  }

  const where = cond.join(" AND ");
  const temuan = await query<AuditTemuan>(
    `${SELECT_TEMUAN} WHERE ${where}
      ORDER BY risk_score DESC, waktu DESC`,
    params,
  );

  // Sesi terkirim pada rentang yang sama (berdasarkan tanggal sesi).
  const sesiCond: string[] = ["sppg_id IS NOT DISTINCT FROM $1", "dikirim_at IS NOT NULL"];
  const sesiParams: unknown[] = [me.sppg_id ?? null];
  if (dari) {
    sesiParams.push(dari);
    sesiCond.push(`tanggal >= $${sesiParams.length}::date`);
  }
  if (sampai) {
    sesiParams.push(sampai);
    sesiCond.push(`tanggal <= $${sesiParams.length}::date`);
  }
  const sesiRow = await query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM audit_sesi WHERE ${sesiCond.join(" AND ")}`,
    sesiParams,
  );

  const stats: AuditLaporanStats = {
    total: temuan.length,
    tingkat: { minor: 0, mayor: 0, kritis: 0 },
    status: { open: 0, improvement: 0, closed: 0 },
    kategori: {},
    area: {},
    sesi_terkirim: Number(sesiRow[0]?.n ?? 0),
  };
  for (const t of temuan) {
    if (t.tingkat === "minor" || t.tingkat === "mayor" || t.tingkat === "kritis")
      stats.tingkat[t.tingkat] += 1;
    if (t.status === "open" || t.status === "improvement" || t.status === "closed")
      stats.status[t.status] += 1;
    stats.kategori[t.kategori] = (stats.kategori[t.kategori] ?? 0) + 1;
    stats.area[t.area] = (stats.area[t.area] ?? 0) + 1;
  }

  // Kop dokumen: nama & alamat dapur untuk halaman cetak.
  const sppg = me.sppg_id ? await getSppg(me.sppg_id) : null;
  const sppgKop: AuditLaporanSppg | null = sppg
    ? { nama: sppg.nama, alamat: sppg.alamat, kepala_sppg: sppg.kepala_sppg }
    : null;

  const body: AuditLaporanResponse = { dari, sampai, sppg: sppgKop, temuan, stats };
  return ok(body);
});
