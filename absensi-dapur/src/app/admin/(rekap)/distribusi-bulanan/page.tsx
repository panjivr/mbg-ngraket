"use client";

import { useCallback, useEffect, useState } from "react";

interface Hari {
  tanggal: string;
  menu: string;
  besar: number;
  kecil: number;
  b3: number;
  porsi: number;
  pagu: number;
}
interface Total {
  besar: number;
  kecil: number;
  b3: number;
  porsi: number;
  pagu: number;
}
interface Data {
  mode: "rentang" | "bulan";
  bulan: string;
  dari: string;
  sampai: string;
  harga: { besar: number; kecil: number; b3: number };
  hariAktif: number;
  hari: Hari[];
  total: Total;
}

type Mode = "bulan" | "rentang";

const rupiah = (n: number) => "Rp " + new Intl.NumberFormat("id-ID").format(n);

function bulanIni(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
  })
    .format(new Date())
    .slice(0, 7);
}

function tglHariIni(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Awal bulan berjalan (YYYY-MM-01) untuk nilai default rentang. */
function awalBulanIni(): string {
  return `${bulanIni()}-01`;
}

function labelTgl(v: string) {
  const d = new Date(v + "T00:00:00");
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(d);
}

function labelBulan(v: string) {
  const d = new Date(v + "-01T00:00:00");
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(d);
}

export default function RekapDistribusiPage() {
  const [mode, setMode] = useState<Mode>("bulan");
  const [bulan, setBulan] = useState(bulanIni());
  const [dari, setDari] = useState(awalBulanIni());
  const [sampai, setSampai] = useState(tglHariIni());
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs =
        mode === "rentang"
          ? `dari=${dari}&sampai=${sampai}`
          : `bulan=${bulan}`;
      const r = await fetch(`/api/admin/rekap-distribusi?${qs}`, { cache: "no-store" });
      const d = await r.json();
      setData(d && Array.isArray(d.hari) ? d : null);
    } finally {
      setLoading(false);
    }
  }, [mode, bulan, dari, sampai]);

  useEffect(() => {
    load();
  }, [load]);

  const exportCsv = () => {
    if (!data) return;
    const esc = (v: string | number) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["Tanggal", "Menu", "Besar", "Kecil", "B3", "Total Porsi", "Pagu (Rp)"];
    const body = data.hari.map((h) =>
      [h.tanggal, h.menu, h.besar, h.kecil, h.b3, h.porsi, h.pagu].map(esc).join(","),
    );
    const totalRow = ["TOTAL", "", data.total.besar, data.total.kecil, data.total.b3, data.total.porsi, data.total.pagu]
      .map(esc)
      .join(",");
    const csv = "﻿" + [head.map(esc).join(","), ...body, totalRow].join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    const suffix = mode === "rentang" ? `${dari}_sd_${sampai}` : bulan;
    a.download = `rekap-distribusi-${suffix}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const t = data?.total;
  // Label periode aktif untuk header tabel & empty state.
  const labelPeriode =
    mode === "rentang" ? `${labelTgl(dari)} – ${labelTgl(sampai)}` : labelBulan(bulan);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Rekap Distribusi & Pagu</h1>
          <p className="text-sm text-slate-400">
            Porsi dan biaya pagu per hari — pilih laporan per bulan atau rentang tanggal.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Pemilih mode: Bulanan / Rentang tanggal */}
          <div className="inline-flex overflow-hidden rounded-lg border border-ink-700 bg-ink-900/60 p-0.5">
            {(["bulan", "rentang"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  mode === m
                    ? "bg-gold-500/20 text-gold-200 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {m === "bulan" ? "Bulanan" : "Rentang"}
              </button>
            ))}
          </div>

          {mode === "bulan" ? (
            <input
              type="month"
              value={bulan}
              onChange={(e) => setBulan(e.target.value)}
              className="input px-3 py-1.5 text-sm"
            />
          ) : (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={dari}
                max={sampai}
                onChange={(e) => setDari(e.target.value)}
                className="input px-3 py-1.5 text-sm"
                aria-label="Tanggal mulai"
              />
              <span className="text-xs text-slate-500">s/d</span>
              <input
                type="date"
                value={sampai}
                min={dari}
                onChange={(e) => setSampai(e.target.value)}
                className="input px-3 py-1.5 text-sm"
                aria-label="Tanggal akhir"
              />
            </div>
          )}

          <button onClick={exportCsv} disabled={loading || !data || data.hari.length === 0} className="btn-ghost px-3 py-1.5 text-xs">
            Ekspor CSV
          </button>
        </div>
      </div>

      {/* Kartu ringkas total bulan */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Total Porsi", t ? t.porsi.toLocaleString("id-ID") : "—"],
          ["Total Pagu", t ? rupiah(t.pagu) : "—"],
          ["Hari Distribusi", data ? String(data.hariAktif) : "—"],
          ["Rata-rata Porsi/Hari", data && data.hariAktif > 0 ? Math.round(t!.porsi / data.hariAktif).toLocaleString("id-ID") : "—"],
        ].map(([label, val]) => (
          <div key={label} className="card p-4">
            <p className="text-xs text-slate-400">{label}</p>
            <p className="mt-1 text-lg font-bold text-gold-400">{val}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <p className="p-6 text-center text-slate-400">Memuat…</p>
        ) : !data || data.hari.length === 0 ? (
          <p className="p-8 text-center text-slate-500">Belum ada distribusi di {labelPeriode}.</p>
        ) : (
          <div className="scroll-x overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-slate-400">
                  <th className="px-4 py-2 font-medium">Tanggal</th>
                  <th className="px-4 py-2 font-medium">Menu</th>
                  <th className="px-3 py-2 text-right font-medium">Besar</th>
                  <th className="px-3 py-2 text-right font-medium">Kecil</th>
                  <th className="px-3 py-2 text-right font-medium">B3</th>
                  <th className="px-3 py-2 text-right font-medium">Porsi</th>
                  <th className="px-4 py-2 text-right font-medium">Pagu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.hari.map((h) => (
                  <tr key={h.tanggal} className="hover:bg-white/[0.02]">
                    <td className="whitespace-nowrap px-4 py-2">{labelTgl(h.tanggal)}</td>
                    <td className="max-w-[220px] truncate px-4 py-2 text-slate-300" title={h.menu}>
                      {h.menu || "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{h.besar}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{h.kecil}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{h.b3}</td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums">{h.porsi}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">{rupiah(h.pagu)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/10 bg-white/[0.03] font-semibold">
                  <td className="px-4 py-2.5" colSpan={2}>
                    TOTAL {labelPeriode}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{t!.besar}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{t!.kecil}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{t!.b3}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{t!.porsi}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-right text-gold-400 tabular-nums">{rupiah(t!.pagu)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {data && (
        <p className="text-center text-xs text-slate-500">
          Pagu dihitung dari harga: besar {rupiah(data.harga.besar)}, kecil {rupiah(data.harga.kecil)}, B3 {rupiah(data.harga.b3)}.
        </p>
      )}
    </div>
  );
}
