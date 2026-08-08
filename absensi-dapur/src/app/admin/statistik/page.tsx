"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MOODS } from "@/lib/mood";
import {
  StatTile,
  Donut,
  Legend,
  HBar,
  DayTrend,
  type DayPoint,
  ON_TIME,
  LATE,
} from "@/components/StatCharts";

interface RankItem {
  nama: string;
  divisi: string | null;
  skor: number;
  tepat: number;
  terlambat: number;
  hadir: number;
  ketepatan: number;
}
interface DivisiItem {
  divisi: string;
  hadir: number;
  tepat: number;
  terlambat: number;
}
interface DistPoint {
  d: string;
  porsi: number;
  pagu: number;
  besar: number;
  kecil: number;
  b3: number;
}
interface Resp {
  from: string;
  to: string;
  daily: DayPoint[];
  mood: { mood: string; n: number }[];
  divisi: DivisiItem[];
  ranking: RankItem[];
  distribusi: DistPoint[];
}
const rupiah = (n: number) => "Rp " + Math.round(n || 0).toLocaleString("id-ID");
const fmtN = (n: number) => (n || 0).toLocaleString("id-ID");

const MEDALS = ["🥇", "🥈", "🥉"];

function jakartaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
function awalBulan(iso: string): string {
  return iso.slice(0, 8) + "01";
}
function barClassFor(s: number): string {
  if (s >= 85) return "bg-emerald-400";
  if (s >= 70) return "bg-gold-400";
  if (s >= 50) return "bg-amber-400";
  return "bg-rose-400";
}
function skorTone(s: number): string {
  if (s >= 85) return "text-emerald-300";
  if (s >= 70) return "text-gold-400";
  if (s >= 50) return "text-amber-300";
  return "text-rose-300";
}

export default function StatistikPage() {
  const today = jakartaToday();
  const [from, setFrom] = useState(awalBulan(today));
  const [to, setTo] = useState(today);
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/statistik?from=${from}&to=${to}`, {
        cache: "no-store",
      });
      setData(await res.json());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const kpi = useMemo(() => {
    const d = data?.daily ?? [];
    const hadir = d.reduce((s, x) => s + x.hadir, 0);
    const tepat = d.reduce((s, x) => s + x.tepat, 0);
    const telat = d.reduce((s, x) => s + x.terlambat, 0);
    const dinilai = tepat + telat;
    const ketepatan = dinilai > 0 ? Math.round((tepat / dinilai) * 100) : 0;
    return { hadir, tepat, telat, ketepatan, hariOp: d.length };
  }, [data]);

  const distTrend = useMemo(() => {
    const d = data?.distribusi ?? [];
    const totalPorsi = d.reduce((s, x) => s + x.porsi, 0);
    const totalPagu = d.reduce((s, x) => s + x.pagu, 0);
    const maxPorsi = Math.max(1, ...d.map((x) => x.porsi));
    const besar = d.reduce((s, x) => s + x.besar, 0);
    const kecil = d.reduce((s, x) => s + x.kecil, 0);
    const b3 = d.reduce((s, x) => s + x.b3, 0);
    return { hari: d.length, totalPorsi, totalPagu, maxPorsi, besar, kecil, b3 };
  }, [data]);

  const moodData = useMemo(() => {
    const map = new Map((data?.mood ?? []).map((m) => [m.mood, m.n]));
    const rows = MOODS.map((m) => ({ ...m, n: map.get(m.key) ?? 0 }));
    const total = rows.reduce((s, r) => s + r.n, 0);
    const dominan = total > 0 ? [...rows].sort((a, b) => b.n - a.n)[0] : null;
    return { rows, total, maks: Math.max(1, ...rows.map((r) => r.n)), dominan };
  }, [data]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold">📊 Statistik Absensi</h1>
          <p className="text-xs text-slate-400">
            Grafik kehadiran, ketepatan waktu, emosi tim & peringkat kinerja.
          </p>
        </div>
      </div>

      {/* Filter rentang tanggal */}
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="label">Dari Tanggal</label>
          <input
            type="date"
            className="input"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Sampai Tanggal</label>
          <input
            type="date"
            className="input"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <button onClick={load} className="btn-ghost" disabled={loading}>
          {loading ? "Memuat…" : "Tampilkan"}
        </button>
        {data && (
          <span className="ml-auto text-xs text-slate-400">
            {kpi.hariOp} hari ada absensi pada rentang ini
          </span>
        )}
      </div>

      {loading && !data ? (
        <div className="card p-8 text-center text-sm text-slate-400">Memuat data…</div>
      ) : (
        <>
          {/* KPI ringkas */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <StatTile label="Total Kehadiran" value={String(kpi.hadir)} />
            <StatTile label="Tepat Waktu" value={String(kpi.tepat)} tone="text-emerald-300" />
            <StatTile label="Terlambat" value={String(kpi.telat)} tone="text-amber-300" />
            <StatTile
              label="Ketepatan"
              value={`${kpi.ketepatan}%`}
              tone={skorTone(kpi.ketepatan)}
            />
          </div>

          {/* Donut ketepatan + tren harian */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="card p-4">
              <p className="mb-3 text-sm font-bold">🎯 Tepat Waktu vs Terlambat</p>
              {kpi.tepat + kpi.telat === 0 ? (
                <Kosong />
              ) : (
                <div className="flex items-center gap-4">
                  <Donut
                    segments={[
                      { label: "Tepat waktu", value: kpi.tepat, color: ON_TIME },
                      { label: "Terlambat", value: kpi.telat, color: LATE },
                    ]}
                    centerValue={`${kpi.ketepatan}%`}
                    centerLabel="tepat waktu"
                  />
                  <div className="min-w-0 flex-1">
                    <Legend
                      items={[
                        { label: "Tepat waktu", color: ON_TIME, value: String(kpi.tepat) },
                        { label: "Terlambat", color: LATE, value: String(kpi.telat) },
                      ]}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="card p-4 lg:col-span-2">
              <p className="mb-3 text-sm font-bold">📈 Tren Kehadiran Harian</p>
              {(data?.daily.length ?? 0) === 0 ? (
                <Kosong />
              ) : (
                <DayTrend data={data!.daily} />
              )}
            </div>

            <div className="card p-4 lg:col-span-2">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-bold">🍽️ Tren Porsi &amp; Pagu Distribusi</p>
                {distTrend.hari > 0 && (
                  <span className="text-xs text-slate-400">
                    Σ {fmtN(distTrend.totalPorsi)} porsi · {rupiah(distTrend.totalPagu)} · rata-rata {fmtN(Math.round(distTrend.totalPorsi / distTrend.hari))}/hari
                  </span>
                )}
              </div>
              {distTrend.hari === 0 ? (
                <Kosong />
              ) : (
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="scroll-x flex min-w-0 flex-1 items-end gap-1.5 overflow-x-auto pb-1" style={{ height: 160 }}>
                    {data!.distribusi.map((p) => (
                      <div
                        key={p.d}
                        className="flex min-w-[20px] flex-1 flex-col items-center gap-1"
                        title={`${p.d}: ${fmtN(p.porsi)} porsi (B ${fmtN(p.besar)} · K ${fmtN(p.kecil)} · B3 ${fmtN(p.b3)}) · ${rupiah(p.pagu)}`}
                      >
                        <div className="flex w-full flex-col-reverse items-center" style={{ height: 128 }}>
                          <div className="w-full max-w-[26px] bg-emerald-400" style={{ height: `${(p.besar / distTrend.maxPorsi) * 128}px` }} />
                          <div className="w-full max-w-[26px] bg-sky-400" style={{ height: `${(p.kecil / distTrend.maxPorsi) * 128}px` }} />
                          <div className="w-full max-w-[26px] rounded-t bg-amber-400" style={{ height: `${(p.b3 / distTrend.maxPorsi) * 128}px` }} />
                        </div>
                        <span className="text-[9px] tabular-nums text-slate-500">{p.d.slice(8)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 lg:w-60 lg:flex-col lg:items-stretch">
                    <Donut
                      segments={[
                        { label: "Besar", value: distTrend.besar, color: "#34d399" },
                        { label: "Kecil", value: distTrend.kecil, color: "#38bdf8" },
                        { label: "B3", value: distTrend.b3, color: "#fbbf24" },
                      ]}
                      centerValue={fmtN(distTrend.totalPorsi)}
                      centerLabel="porsi"
                    />
                    <Legend
                      items={[
                        { label: "Besar (+PJ)", color: "#34d399", value: fmtN(distTrend.besar) },
                        { label: "Kecil", color: "#38bdf8", value: fmtN(distTrend.kecil) },
                        { label: "B3", color: "#fbbf24", value: fmtN(distTrend.b3) },
                      ]}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Emosi tim + Peringkat */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold">😊 Emosi Tim</p>
                {moodData.dominan && moodData.total > 0 && (
                  <span className="text-xs text-slate-400">
                    Dominan {moodData.dominan.emoji} {moodData.dominan.label}
                  </span>
                )}
              </div>
              {moodData.total === 0 ? (
                <Kosong teks="Belum ada data emosi. Terisi saat karyawan memilih suasana hati ketika absen masuk." />
              ) : (
                <div className="space-y-2.5">
                  {moodData.rows.map((m) => {
                    const pct = Math.round((m.n / moodData.total) * 100);
                    return (
                      <HBar
                        key={m.key}
                        left={
                          <span>
                            <span className="mr-1">{m.emoji}</span>
                            {m.label}
                          </span>
                        }
                        value={m.n}
                        max={moodData.maks}
                        color={m.color}
                        right={`${m.n} · ${pct}%`}
                      />
                    );
                  })}
                </div>
              )}
            </div>

            <div className="card p-4">
              <p className="mb-3 text-sm font-bold">🏆 Peringkat Kinerja (10 besar)</p>
              {(data?.ranking.length ?? 0) === 0 ? (
                <Kosong />
              ) : (
                <div className="space-y-2.5">
                  {data!.ranking.map((r, i) => (
                    <HBar
                      key={r.nama + i}
                      left={
                        <span title={`${r.divisi || "Tanpa divisi"} · Hadir ${r.hadir} · Tepat ${r.tepat} · Telat ${r.terlambat}`}>
                          <span className="mr-1">{i < 3 ? MEDALS[i] : `${i + 1}.`}</span>
                          {r.nama}
                        </span>
                      }
                      value={r.skor}
                      max={100}
                      barClass={barClassFor(r.skor)}
                      right={<span className={skorTone(r.skor)}>{r.skor.toFixed(1)}</span>}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Per divisi */}
          <div className="card p-4">
            <p className="mb-3 text-sm font-bold">🧩 Ketepatan per Divisi</p>
            {(data?.divisi.length ?? 0) === 0 ? (
              <Kosong />
            ) : (
              <div className="space-y-2.5">
                {data!.divisi.map((d) => {
                  const dinilai = d.tepat + d.terlambat;
                  const pct = dinilai > 0 ? Math.round((d.tepat / dinilai) * 100) : 0;
                  return (
                    <HBar
                      key={d.divisi}
                      left={
                        <span title={`Hadir ${d.hadir} · Tepat ${d.tepat} · Telat ${d.terlambat}`}>
                          {d.divisi}
                        </span>
                      }
                      value={pct}
                      max={100}
                      barClass={barClassFor(pct)}
                      right={`${pct}%`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Kosong({ teks = "Belum ada data pada rentang ini." }: { teks?: string }) {
  return <p className="py-8 text-center text-sm text-slate-500">{teks}</p>;
}
