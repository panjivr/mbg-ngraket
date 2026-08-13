"use client";

/**
 * Dashboard Laporan Audit — rekap temuan lintas sesi dengan filter rentang tanggal,
 * ringkasan statistik (tingkat/status/kategori/area), dan tabel temuan terurut risk.
 * Tombol "Cetak" membuka /cetak/audit dengan rentang yang sama. Akses HR-gated (page).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getLaporan, type AuditLaporanResponse } from "@/lib/audit-client";
import { tingkatMeta, KATEGORI_LABEL, type Tingkat } from "@/lib/audit-risk";
import { areaLabel } from "@/lib/audit-seed";

/** Tanggal hari ini (YYYY-MM-DD, zona lokal). */
function hariIni(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}
/** Awal bulan berjalan (YYYY-MM-01). */
function awalBulan(): string {
  return hariIni().slice(0, 8) + "01";
}

const STATUS_META: Record<string, { label: string; badge: string }> = {
  open: { label: "Terbuka", badge: "bg-red-500/15 text-red-300 ring-red-500/30" },
  improvement: { label: "Perbaikan", badge: "bg-amber-500/15 text-amber-300 ring-amber-500/30" },
  closed: { label: "Selesai", badge: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30" },
};

function fmtTgl(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export default function LaporanClient() {
  const [dari, setDari] = useState(awalBulan());
  const [sampai, setSampai] = useState(hariIni());
  const [data, setData] = useState<AuditLaporanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const muat = useCallback(() => {
    setLoading(true);
    setMsg(null);
    getLaporan({ dari, sampai })
      .then(setData)
      .catch((e) => setMsg((e as Error).message))
      .finally(() => setLoading(false));
  }, [dari, sampai]);

  useEffect(() => {
    muat();
  }, [muat]);

  const cetakHref = useMemo(() => {
    const q = new URLSearchParams();
    if (dari) q.set("dari", dari);
    if (sampai) q.set("sampai", sampai);
    return `/cetak/audit?${q.toString()}`;
  }, [dari, sampai]);

  const stats = data?.stats;

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-ink-700 bg-ink-850 p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-gold-300">Laporan Audit Dapur</h1>
            <p className="text-xs text-slate-500">Rekap temuan lintas sesi &amp; ekspor cetak.</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-400">Dari</span>
              <input
                type="date"
                value={dari}
                max={sampai || undefined}
                onChange={(e) => setDari(e.target.value)}
                className="rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-slate-100 focus:border-gold-500/40 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-400">Sampai</span>
              <input
                type="date"
                value={sampai}
                min={dari || undefined}
                onChange={(e) => setSampai(e.target.value)}
                className="rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-slate-100 focus:border-gold-500/40 focus:outline-none"
              />
            </label>
            <Link
              href={cetakHref}
              className="rounded-lg bg-gold-500/15 px-4 py-2 text-sm font-semibold text-gold-300 ring-1 ring-gold-500/30 transition hover:bg-gold-500/25"
            >
              Cetak
            </Link>
            <Link
              href="/admin/audit-dapur/register"
              className="rounded-lg border border-ink-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5"
            >
              Register
            </Link>
          </div>
        </div>
        {msg && <p className="mt-2 text-xs text-red-300">{msg}</p>}
      </header>

      {loading ? (
        <p className="py-16 text-center text-sm text-slate-500">Memuat laporan…</p>
      ) : !stats ? (
        <p className="py-16 text-center text-sm text-slate-500">Tidak ada data.</p>
      ) : (
        <>
          {/* Ringkasan angka */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Total temuan" value={stats.total} tone="gold" />
            <StatCard label="Kritis" value={stats.tingkat.kritis} tone="red" />
            <StatCard label="Mayor" value={stats.tingkat.mayor} tone="orange" />
            <StatCard label="Minor" value={stats.tingkat.minor} tone="amber" />
            <StatCard label="Terbuka" value={stats.status.open} tone="red" />
            <StatCard label="Sesi terkirim" value={stats.sesi_terkirim} tone="emerald" />
          </section>

          {/* Breakdown kategori & area */}
          <section className="grid gap-3 lg:grid-cols-2">
            <Breakdown
              title="Per kategori"
              rows={Object.entries(stats.kategori)
                .map(([k, n]) => ({
                  label: KATEGORI_LABEL[k as keyof typeof KATEGORI_LABEL] ?? k,
                  n,
                }))
                .sort((a, b) => b.n - a.n)}
              total={stats.total}
            />
            <Breakdown
              title="Per area"
              rows={Object.entries(stats.area)
                .map(([k, n]) => ({ label: areaLabel(k), n }))
                .sort((a, b) => b.n - a.n)}
              total={stats.total}
            />
          </section>

          {/* Tabel temuan */}
          <section className="overflow-hidden rounded-2xl border border-ink-700 bg-ink-850">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-ink-700 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3 font-medium">Tanggal</th>
                    <th className="px-4 py-3 font-medium">Area</th>
                    <th className="px-4 py-3 font-medium">Observasi</th>
                    <th className="px-4 py-3 font-medium">Risk</th>
                    <th className="px-4 py-3 font-medium">Tingkat</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.temuan.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                        Tidak ada temuan pada rentang ini.
                      </td>
                    </tr>
                  ) : (
                    data.temuan.map((t) => {
                      const tm = tingkatMeta(t.tingkat as Tingkat);
                      const sm = STATUS_META[t.status] ?? STATUS_META.open;
                      return (
                        <tr key={t.id} className="border-b border-ink-800/60 last:border-0">
                          <td className="whitespace-nowrap px-4 py-3 text-slate-400">
                            {fmtTgl(t.waktu)}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-slate-300">
                            {areaLabel(t.area)}
                          </td>
                          <td className="px-4 py-3 text-slate-200">
                            <span className="line-clamp-2">{t.observasi}</span>
                          </td>
                          <td className="px-4 py-3 font-semibold tabular-nums text-slate-200">
                            {t.risk_score}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={
                                "rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset " +
                                tm.badge
                              }
                            >
                              {tm.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={
                                "rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset " +
                                sm.badge
                              }
                            >
                              {sm.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

const TONE: Record<string, string> = {
  gold: "text-gold-300",
  red: "text-red-300",
  orange: "text-orange-300",
  amber: "text-amber-300",
  emerald: "text-emerald-300",
};

function StatCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-850 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={"mt-1 text-2xl font-bold tabular-nums " + (TONE[tone] ?? "text-slate-100")}>
        {value}
      </p>
    </div>
  );
}

function Breakdown({
  title,
  rows,
  total,
}: {
  title: string;
  rows: { label: string; n: number }[];
  total: number;
}) {
  return (
    <div className="rounded-2xl border border-ink-700 bg-ink-850 p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-200">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-500">Belum ada data.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const pct = total > 0 ? Math.round((r.n / total) * 100) : 0;
            return (
              <li key={r.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-slate-300">{r.label}</span>
                  <span className="tabular-nums text-slate-500">
                    {r.n} · {pct}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-ink-900">
                  <div
                    className="h-full rounded-full bg-gold-500/50"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
