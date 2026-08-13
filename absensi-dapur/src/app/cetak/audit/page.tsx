"use client";

/**
 * Cetak Laporan Audit Mutu Dapur — dokumen siap cetak/PDF berisi rekap temuan
 * lintas sesi pada rentang tanggal (dari ?dari=&sampai=). Data diambil dari
 * /api/audit/laporan (scoped ke SPPG auditor). Akses HR-gated: middleware
 * mengizinkan /cetak/audit bagi pemegang akses_audit; route ikut mengecek DB.
 */
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getLaporan, type AuditLaporanResponse } from "@/lib/audit-client";
import { tingkatMeta, KATEGORI_LABEL, type Tingkat } from "@/lib/audit-risk";
import { areaLabel } from "@/lib/audit-seed";

const PAPERS: Record<string, { label: string; size: string }> = {
  A4: { label: "A4 (210×297)", size: "210mm 297mm" },
  F4: { label: "F4 / Folio (215×330)", size: "215mm 330mm" },
  Letter: { label: "Letter (216×279)", size: "216mm 279mm" },
  Legal: { label: "Legal (216×356)", size: "216mm 356mm" },
};

const STATUS_LABEL: Record<string, string> = {
  open: "Terbuka",
  improvement: "Perbaikan",
  closed: "Selesai",
};

const RE_TGL = /^\d{4}-\d{2}-\d{2}$/;
const D = (t: string) => new Date(t + "T00:00:00");
const tglLong = (t: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(D(t));
function tglShort(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}
function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function Inner() {
  const sp = useSearchParams();
  const dari = RE_TGL.test(sp.get("dari") || "") ? sp.get("dari")! : undefined;
  const sampai = RE_TGL.test(sp.get("sampai") || "") ? sp.get("sampai")! : undefined;

  const [data, setData] = useState<AuditLaporanResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [paper, setPaper] = useState("A4");

  useEffect(() => {
    getLaporan({ dari, sampai })
      .then(setData)
      .catch((e) => setErr((e as Error).message));
  }, [dari, sampai]);

  const rentang = useMemo(() => {
    if (data?.dari && data?.sampai) return `${tglLong(data.dari)} — ${tglLong(data.sampai)}`;
    if (data?.dari) return `sejak ${tglLong(data.dari)}`;
    if (data?.sampai) return `s/d ${tglLong(data.sampai)}`;
    return "seluruh periode";
  }, [data]);

  if (err) return <p className="p-8 text-center">Gagal memuat laporan: {err}</p>;
  if (!data) return <p className="p-8 text-center">Memuat…</p>;

  const { stats, temuan, sppg } = data;
  const namaSppg = (sppg?.nama || "").replace(/^SPPG\s+/i, "");
  const alamat = sppg?.alamat || "";
  const kota = alamat ? alamat.split(",")[0] : "";
  const cell = "border border-black px-2 py-1 align-top";
  const th = "border border-black px-2 py-1 text-center";
  const blue = { backgroundColor: "#8EAADB" };

  return (
    <div className="min-h-screen bg-white py-6 text-black">
      <style>{`@media print{@page{size:${PAPERS[paper]?.size || PAPERS.A4.size};margin:12mm}.no-print{display:none}}`}</style>
      <div className="no-print mx-auto mb-4 flex max-w-[900px] flex-wrap items-center justify-between gap-3 px-4">
        <p className="text-sm text-gray-600">Laporan Audit Mutu Dapur · {rentang}</p>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Ukuran kertas</label>
          <select
            value={paper}
            onChange={(e) => setPaper(e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
          >
            {Object.entries(PAPERS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => window.print()}
            className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white"
          >
            🖨️ Cetak / Simpan PDF
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[900px] bg-white p-8 font-serif text-black">
        {/* Kop */}
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/bgn-logo.webp"
            alt="Logo BGN"
            className="absolute left-0 top-1/2 h-16 w-16 -translate-y-1/2 object-contain"
          />
          <div className="px-20 text-center leading-snug">
            <p className="text-base font-bold">LAPORAN AUDIT MUTU DAPUR</p>
            {namaSppg && <p className="text-sm font-bold">SPPG {namaSppg.toUpperCase()}</p>}
            {alamat && <p className="text-xs">{alamat}</p>}
          </div>
          <div className="mt-2 border-b-4 border-black" />
        </div>

        {/* Info periode */}
        <table className="mt-4 text-sm">
          <tbody>
            <tr>
              <td className="w-36 align-top">Periode Audit</td>
              <td className="align-top">: {rentang}</td>
            </tr>
            <tr>
              <td className="align-top">Sesi Terkirim</td>
              <td className="align-top">: {stats.sesi_terkirim} sesi</td>
            </tr>
            <tr>
              <td className="align-top">Total Temuan</td>
              <td className="align-top">: {stats.total} temuan</td>
            </tr>
          </tbody>
        </table>

        {/* Ringkasan tingkat & status */}
        <p className="mt-5 text-sm font-bold">Ringkasan:</p>
        <table className="mt-1 w-full border-collapse text-sm">
          <thead>
            <tr style={blue} className="font-bold">
              <th className={th}>Kritis</th>
              <th className={th}>Mayor</th>
              <th className={th}>Minor</th>
              <th className={th}>Terbuka</th>
              <th className={th}>Perbaikan</th>
              <th className={th}>Selesai</th>
            </tr>
          </thead>
          <tbody>
            <tr className="text-center">
              <td className={th}>{stats.tingkat.kritis}</td>
              <td className={th}>{stats.tingkat.mayor}</td>
              <td className={th}>{stats.tingkat.minor}</td>
              <td className={th}>{stats.status.open}</td>
              <td className={th}>{stats.status.improvement}</td>
              <td className={th}>{stats.status.closed}</td>
            </tr>
          </tbody>
        </table>

        {/* Daftar temuan */}
        <p className="mt-5 text-sm font-bold">Daftar Temuan (urut risiko tertinggi):</p>
        <table className="mt-1 w-full border-collapse text-sm">
          <thead>
            <tr style={blue} className="font-bold">
              <th className={th + " w-8"}>No</th>
              <th className={th + " w-20"}>Tanggal</th>
              <th className={th}>Area</th>
              <th className={th}>Kategori</th>
              <th className={th}>Observasi</th>
              <th className={th + " w-14"}>Risk</th>
              <th className={th + " w-16"}>Tingkat</th>
              <th className={th}>Rekomendasi</th>
              <th className={th + " w-16"}>Status</th>
            </tr>
          </thead>
          <tbody>
            {temuan.length === 0 ? (
              <tr>
                <td className={cell + " text-center"} colSpan={9}>
                  Tidak ada temuan pada periode ini.
                </td>
              </tr>
            ) : (
              temuan.map((t, i) => {
                const tm = tingkatMeta(t.tingkat as Tingkat);
                return (
                  <tr key={t.id}>
                    <td className={th}>{i + 1}</td>
                    <td className={cell}>{tglShort(t.waktu)}</td>
                    <td className={cell}>{areaLabel(t.area)}</td>
                    <td className={cell}>
                      {KATEGORI_LABEL[t.kategori as keyof typeof KATEGORI_LABEL] ?? t.kategori}
                    </td>
                    <td className={cell}>{t.observasi}</td>
                    <td className={th}>
                      {t.kemungkinan}×{t.dampak}={t.risk_score}
                    </td>
                    <td className={th}>{tm.label}</td>
                    <td className={cell}>{t.rekomendasi || "-"}</td>
                    <td className={th}>{STATUS_LABEL[t.status] ?? t.status}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Tanda tangan */}
        <div className="mt-10 flex justify-end">
          <div className="text-center text-sm">
            <p>
              {kota ? `${kota}, ` : ""}
              {tglLong(data.sampai || data.dari || todayIso())}
            </p>
            <p className="mt-1">Auditor Mutu Dapur</p>
            <div className="h-20" />
            <p className="font-bold underline">{sppg?.kepala_sppg || "……………………………"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CetakAuditPage() {
  return (
    <Suspense fallback={<p className="p-8 text-center">Memuat…</p>}>
      <Inner />
    </Suspense>
  );
}
