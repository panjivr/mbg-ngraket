"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { addDays, durasiMenit, fmtDurasi } from "@/lib/time";
import FotoAbsen from "@/components/FotoAbsen";

function jakartaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function jakartaHour(v: string): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      hour12: false,
    }).format(new Date(v)),
  );
}

interface Stats {
  total_staff: number;
  hadir: number;
  terlambat: number;
  pulang: number;
  belum: number;
}

interface RekapRow {
  id: number;
  nama: string;
  jabatan: string | null;
  divisi_nama: string | null;
  check_in: string | null;
  check_out: string | null;
  status_masuk: string | null;
  check_in_jarak: number | null;
  shift_masuk: string | null;
  shift_pulang: string | null;
}

interface TrendRow {
  user_id: number;
  tanggal: string;
  check_in: string | null;
}

function fmtTime(v: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function initials(nama: string) {
  const p = nama.trim().split(/\s+/);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "?";
}

function pct(n: number, d: number) {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}

/* ---------- ikon garis sederhana ---------- */
function Icon({ name }: { name: string }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const paths: Record<string, ReactNode> = {
    users: (
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    check: (
      <>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <path d="M22 4 12 14.01l-3-3" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    out: (
      <>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <path d="M16 17l5-5-5-5M21 12H9" />
      </>
    ),
    minus: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M8 12h8" />
      </>
    ),
    trend: (
      <>
        <path d="M3 3v18h18" />
        <path d="M19 9l-5 5-4-4-3 3" />
      </>
    ),
    timer: (
      <>
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2.5 2.5M9 2h6" />
      </>
    ),
    gauge: (
      <>
        <path d="M12 13l4-4" />
        <path d="M3.5 18a9 9 0 1 1 17 0" />
      </>
    ),
    pie: (
      <>
        <path d="M21 12a9 9 0 1 1-9-9v9z" />
        <path d="M21 12a9 9 0 0 0-9-9" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
  };
  return <svg {...common}>{paths[name]}</svg>;
}

interface CardDef {
  key: keyof Stats;
  label: string;
  icon: string;
  text: string;
  chip: string;
  bar: string;
}

const cards: CardDef[] = [
  { key: "total_staff", label: "Total Pegawai", icon: "users", text: "text-slate-100", chip: "bg-slate-500/15 text-slate-200", bar: "bg-slate-400" },
  { key: "hadir", label: "Hadir", icon: "check", text: "text-emerald-300", chip: "bg-emerald-500/15 text-emerald-300", bar: "bg-emerald-400" },
  { key: "terlambat", label: "Terlambat", icon: "clock", text: "text-amber-300", chip: "bg-amber-500/15 text-amber-300", bar: "bg-amber-400" },
  { key: "pulang", label: "Sudah Pulang", icon: "out", text: "text-sky-300", chip: "bg-sky-500/15 text-sky-300", bar: "bg-sky-400" },
  { key: "belum", label: "Belum Absen", icon: "minus", text: "text-red-300", chip: "bg-red-500/15 text-red-300", bar: "bg-red-400" },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<RekapRow[]>([]);
  const [weekRows, setWeekRows] = useState<TrendRow[]>([]);
  const [tanggal, setTanggal] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    const today = jakartaToday();
    const weekFrom = addDays(today, -6);
    try {
      const [s, a, w] = await Promise.all([
        fetch("/api/admin/stats", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/admin/attendance", { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/admin/attendance?from=${weekFrom}&to=${today}`, {
          cache: "no-store",
        }).then((r) => r.json()),
      ]);
      setStats(s.stats);
      setTanggal(s.tanggal);
      setRows(a.rekap || []);
      setWeekRows(w.rekap || []);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Jam berjalan (WIB).
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const tanggalTampil = tanggal
    ? new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(tanggal + "T00:00:00"))
    : "";

  const jam = now
    ? new Intl.DateTimeFormat("id-ID", {
        timeZone: "Asia/Jakarta",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(now)
    : "--:--:--";

  // Metrik turunan dari data yang sudah ada (tanpa endpoint baru).
  const derived = useMemo(() => {
    const total = stats?.total_staff ?? 0;
    const hadir = stats?.hadir ?? 0;
    const late = Math.min(stats?.terlambat ?? 0, hadir);
    const onTime = Math.max(hadir - late, 0);
    const belum = stats?.belum ?? Math.max(total - hadir, 0);

    const onTimePct = pct(onTime, total);
    const latePct = pct(late, total);
    const hadirPct = pct(hadir, total);

    const bekerja = rows.filter((r) => r.check_in && !r.check_out);

    // Kelompokkan per divisi.
    const divMap = new Map<
      string,
      { nama: string; hadir: number; terlambat: number; pulang: number }
    >();
    for (const r of rows) {
      const nama = r.divisi_nama || "Tanpa Divisi";
      const g = divMap.get(nama) || { nama, hadir: 0, terlambat: 0, pulang: 0 };
      if (r.check_in) g.hadir += 1;
      if (r.status_masuk === "Terlambat") g.terlambat += 1;
      if (r.check_out) g.pulang += 1;
      divMap.set(nama, g);
    }
    const divisi = [...divMap.values()].sort((a, b) => b.hadir - a.hadir);

    return { total, hadir, late, onTime, belum, onTimePct, latePct, hadirPct, bekerja, divisi };
  }, [stats, rows]);

  // Tren kehadiran 7 hari terakhir (jumlah pegawai hadir per hari).
  const trend = useMemo(() => {
    const today = jakartaToday();
    const days: string[] = [];
    for (let i = 6; i >= 0; i--) days.push(addDays(today, -i));
    const map = new Map<string, Set<number>>();
    for (const r of weekRows) {
      if (!r.check_in || !r.tanggal) continue;
      const set = map.get(r.tanggal) ?? new Set<number>();
      set.add(r.user_id);
      map.set(r.tanggal, set);
    }
    return days.map((d) => ({ date: d, count: map.get(d)?.size ?? 0 }));
  }, [weekRows]);
  const trendMax = Math.max(1, ...trend.map((t) => t.count));

  // Distribusi jam absen masuk hari ini (per jam).
  const checkin = useMemo(() => {
    const buckets = new Map<number, number>();
    for (const r of rows) {
      if (!r.check_in) continue;
      const h = jakartaHour(r.check_in);
      if (!Number.isFinite(h)) continue;
      buckets.set(h, (buckets.get(h) ?? 0) + 1);
    }
    const hours = [...buckets.keys()].sort((a, b) => a - b);
    if (!hours.length) return { items: [] as Array<{ h: number; count: number }>, max: 0 };
    const items: Array<{ h: number; count: number }> = [];
    for (let h = hours[0]; h <= hours[hours.length - 1]; h++) {
      items.push({ h, count: buckets.get(h) ?? 0 });
    }
    return { items, max: Math.max(1, ...items.map((i) => i.count)) };
  }, [rows]);

  const totalMenit = useMemo(
    () => rows.reduce((s, r) => s + durasiMenit(r.check_in, r.check_out), 0),
    [rows],
  );
  const avgMenit = derived.hadir ? Math.round(totalMenit / derived.hadir) : 0;
  const onTimeRate = pct(derived.onTime, derived.hadir);

  const dow = (d: string) =>
    new Intl.DateTimeFormat("id-ID", { weekday: "short", timeZone: "Asia/Jakarta" }).format(
      new Date(d + "T00:00:00"),
    );

  const donut = `conic-gradient(#34d399 0 ${derived.onTimePct}%, #fbbf24 ${derived.onTimePct}% ${
    derived.onTimePct + derived.latePct
  }%, rgba(148,163,184,0.25) ${derived.onTimePct + derived.latePct}% 100%)`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Dashboard Operasional</h1>
          <p className="text-sm text-slate-400">
            {tanggalTampil || "Memuat tanggal…"} ·{" "}
            <span className="font-mono tabular-nums text-slate-300">{jam} WIB</span>
          </p>
        </div>
        <button
          onClick={load}
          disabled={refreshing}
          className="btn-ghost px-3 py-1.5 text-xs"
        >
          <svg
            width={14}
            height={14}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={refreshing ? "animate-spin" : ""}
          >
            <path d="M23 4v6h-6M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
          {refreshing ? "Menyegarkan…" : "Segarkan"}
        </button>
      </div>

      {/* Kartu statistik */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => {
          const val = loading || !stats ? null : stats[c.key];
          const sub =
            c.key === "total_staff"
              ? "pegawai aktif"
              : `${pct(val ?? 0, derived.total)}% dari total`;
          return (
            <div key={c.key} className="card relative overflow-hidden p-4">
              <span className={"absolute inset-x-0 top-0 h-0.5 " + c.bar} />
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">{c.label}</p>
                <span className={"grid h-8 w-8 place-items-center rounded-lg " + c.chip}>
                  <Icon name={c.icon} />
                </span>
              </div>
              <p className={"mt-2 text-3xl font-bold " + c.text}>
                {val ?? "–"}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">{sub}</p>
            </div>
          );
        })}
      </div>

      {/* Sorotan jam kerja & ketepatan */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="card flex items-center gap-3 p-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-gold-500/15 text-gold-300">
            <Icon name="timer" />
          </span>
          <div>
            <p className="text-xs text-slate-400">Total Jam Kerja Hari Ini</p>
            <p className="text-xl font-bold text-gold-300">
              {loading ? "–" : fmtDurasi(totalMenit)}
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-sky-500/15 text-sky-300">
            <Icon name="users" />
          </span>
          <div>
            <p className="text-xs text-slate-400">Rata-rata / Pegawai</p>
            <p className="text-xl font-bold text-sky-300">
              {loading ? "–" : fmtDurasi(avgMenit)}
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300">
            <Icon name="gauge" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-400">Ketepatan Waktu</p>
            <p className="text-xl font-bold text-emerald-300">{onTimeRate}%</p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-400"
                style={{ width: `${onTimeRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Analitik: tingkat kehadiran + ketepatan waktu + sedang bertugas */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Donut tingkat kehadiran */}
        <div className="card p-5">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/15 text-emerald-300">
              <Icon name="pie" />
            </span>
            <p className="text-sm font-semibold">Tingkat Kehadiran</p>
          </div>
          <div className="mt-4 flex items-center gap-5">
            <div
              className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full"
              style={{ background: donut }}
            >
              <div className="grid h-20 w-20 place-items-center rounded-full bg-ink-850">
                <span className="text-2xl font-bold">{derived.hadirPct}%</span>
              </div>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                Tepat waktu
                <span className="ml-auto font-semibold tabular-nums">{derived.onTime}</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                Terlambat
                <span className="ml-auto font-semibold tabular-nums">{derived.late}</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
                Belum absen
                <span className="ml-auto font-semibold tabular-nums">{derived.belum}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Ketepatan waktu */}
        <div className="card p-5">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-amber-500/15 text-amber-300">
              <Icon name="gauge" />
            </span>
            <p className="text-sm font-semibold">Ketepatan Waktu</p>
          </div>
          <p className="mt-1 text-xs text-slate-400">Dari {derived.hadir} pegawai yang hadir</p>
          <div className="mt-5 space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-emerald-300">Tepat Waktu</span>
                <span className="font-semibold tabular-nums">
                  {derived.onTime} · {pct(derived.onTime, derived.hadir)}%
                </span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all"
                  style={{ width: `${pct(derived.onTime, derived.hadir)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-amber-300">Terlambat</span>
                <span className="font-semibold tabular-nums">
                  {derived.late} · {pct(derived.late, derived.hadir)}%
                </span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-amber-400 transition-all"
                  style={{ width: `${pct(derived.late, derived.hadir)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sedang bertugas */}
        <div className="card flex flex-col p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Sedang Bertugas</p>
            <span className="badge bg-emerald-500/15 text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              live
            </span>
          </div>
          <p className="mt-1 text-3xl font-bold text-emerald-300">
            {derived.bekerja.length}
            <span className="ml-1 text-sm font-normal text-slate-400">orang di dapur</span>
          </p>
          <div className="scroll-x mt-3 max-h-32 space-y-2 overflow-y-auto pr-1">
            {derived.bekerja.length === 0 ? (
              <p className="text-sm text-slate-500">Belum ada yang clock-in aktif.</p>
            ) : (
              derived.bekerja.map((r) => (
                <div key={r.id} className="flex items-center gap-2.5 text-sm">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gold-500/20 text-[10px] font-bold text-gold-400">
                    {initials(r.nama)}
                  </span>
                  <span className="truncate">{r.nama}</span>
                  <span className="ml-auto whitespace-nowrap text-xs text-slate-400">
                    masuk {fmtTime(r.check_in)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Grafik tren & distribusi jam masuk */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/15 text-emerald-300">
              <Icon name="trend" />
            </span>
            <p className="text-sm font-semibold">Tren Kehadiran 7 Hari</p>
          </div>
          <div className="mt-5 flex items-end justify-between gap-2" style={{ height: 140 }}>
            {trend.map((t) => (
              <div
                key={t.date}
                className="flex flex-1 flex-col items-center justify-end gap-2"
              >
                <span className="text-[11px] text-slate-400">{t.count}</span>
                <div
                  className="w-full max-w-[36px] rounded-t-md bg-gradient-to-t from-emerald-500/40 to-emerald-400"
                  style={{ height: `${Math.max(4, (t.count / trendMax) * 100)}%` }}
                  title={`${t.count} hadir`}
                />
                <span className="text-[10px] text-slate-500">{dow(t.date)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gold-500/15 text-gold-300">
              <Icon name="clock" />
            </span>
            <p className="text-sm font-semibold">Distribusi Jam Masuk · hari ini</p>
          </div>
          {checkin.items.length === 0 ? (
            <p className="mt-8 text-center text-sm text-slate-500">
              Belum ada absen masuk hari ini.
            </p>
          ) : (
            <div
              className="mt-5 flex items-end justify-between gap-1.5"
              style={{ height: 140 }}
            >
              {checkin.items.map((it) => (
                <div
                  key={it.h}
                  className="flex flex-1 flex-col items-center justify-end gap-2"
                >
                  <span className="text-[10px] text-slate-400">
                    {it.count > 0 ? it.count : ""}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-gold-500/40 to-gold-400"
                    style={{
                      height: `${Math.max(it.count ? 6 : 2, (it.count / checkin.max) * 100)}%`,
                      opacity: it.count ? 1 : 0.3,
                    }}
                    title={`${it.count} masuk jam ${String(it.h).padStart(2, "0")}:00`}
                  />
                  <span className="text-[10px] text-slate-500">
                    {String(it.h).padStart(2, "0")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Kehadiran per divisi */}
      <div className="card p-5">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-sky-500/15 text-sky-300">
            <Icon name="grid" />
          </span>
          <p className="text-sm font-semibold">Kehadiran per Divisi</p>
        </div>
        {loading ? (
          <p className="mt-4 text-sm text-slate-400">Memuat…</p>
        ) : derived.divisi.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Belum ada data shift hari ini.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {derived.divisi.map((d) => {
              const onTime = Math.max(d.hadir - d.terlambat, 0);
              return (
                <div key={d.nama}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{d.nama}</span>
                    <span className="text-slate-400">
                      <span className="text-emerald-300">{onTime} tepat</span>
                      {d.terlambat > 0 && (
                        <span className="text-amber-300"> · {d.terlambat} telat</span>
                      )}
                      <span> · {d.hadir} hadir</span>
                    </span>
                  </div>
                  <div className="mt-1.5 flex h-2.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full bg-emerald-400"
                      style={{ width: `${pct(onTime, Math.max(d.hadir, 1))}%` }}
                    />
                    <div
                      className="h-full bg-amber-400"
                      style={{ width: `${pct(d.terlambat, Math.max(d.hadir, 1))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Tabel kehadiran */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
          <p className="text-sm font-semibold">Kehadiran Shift Hari Ini</p>
          <span className="text-xs text-slate-400">{rows.length} entri</span>
        </div>
        {loading ? (
          <p className="p-6 text-center text-slate-400">Memuat…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-center text-slate-400">
            Belum ada yang absen hari ini.
          </p>
        ) : (
          <div className="scroll-x overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr className="border-b border-white/5">
                  <th className="px-4 py-2.5">Nama</th>
                  <th className="px-4 py-2.5">Divisi</th>
                  <th className="px-4 py-2.5">Shift</th>
                  <th className="px-4 py-2.5">Masuk</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Pulang</th>
                  <th className="px-4 py-2.5">Durasi</th>
                  <th className="px-4 py-2.5">Jarak</th>
                  <th className="px-4 py-2.5 text-right">Foto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((r) => {
                  const masihBekerja = r.check_in && !r.check_out;
                  return (
                    <tr key={r.id} className="hover:bg-white/[0.025]">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold-500/20 text-[10px] font-bold text-gold-400">
                            {initials(r.nama)}
                          </span>
                          <div className="leading-tight">
                            <p className="font-medium">{r.nama}</p>
                            <p className="text-[11px] text-slate-500">{r.jabatan || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-400">{r.divisi_nama || "—"}</td>
                      <td className="px-4 py-2.5 text-slate-400">
                        {r.shift_masuk && r.shift_pulang
                          ? `${r.shift_masuk}–${r.shift_pulang}`
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">{fmtTime(r.check_in)}</td>
                      <td className="px-4 py-2.5">
                        {r.status_masuk ? (
                          <span
                            className={
                              "badge " +
                              (r.status_masuk === "Terlambat"
                                ? "bg-red-500/15 text-red-300"
                                : "bg-emerald-500/15 text-emerald-300")
                            }
                          >
                            {r.status_masuk}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums">
                        {masihBekerja ? (
                          <span className="badge bg-sky-500/15 text-sky-300">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
                            Bertugas
                          </span>
                        ) : (
                          fmtTime(r.check_out)
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-gold-400">
                        {fmtDurasi(durasiMenit(r.check_in, r.check_out))}
                      </td>
                      <td className="px-4 py-2.5 text-slate-400">
                        {r.check_in_jarak != null ? `${r.check_in_jarak} m` : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end">
                          <FotoAbsen id={r.id} nama={r.nama} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
