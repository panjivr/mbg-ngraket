"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode, type CSSProperties } from "react";
import { addDays, durasiMenit, fmtDurasi } from "@/lib/time";
import FotoAbsen from "@/components/FotoAbsen";
import RingkasanHarian from "@/components/RingkasanHarian";
import AlertAbsensi from "@/components/AlertAbsensi";
import AnimatedNumber from "@/components/AnimatedNumber";

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
  lokasi: string | null;
}

interface TrendRow {
  user_id: number;
  tanggal: string;
  check_in: string | null;
}

// Baris kehadiran sepanjang periode (2 minggu) untuk analitik lanjutan.
interface PeriodRow {
  user_id: number;
  tanggal: string;
  nama: string;
  divisi_nama: string | null;
  check_in: string | null;
  check_out: string | null;
  status_masuk: string | null;
}

interface Periode {
  from: string | null;
  to: string | null;
  aktif: boolean;
}

// Label tanggal ringkas "05 Agu" (WIB).
function fmtTgl(d: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
  }).format(new Date(d + "T00:00:00"));
}

// Cincin gauge glowing (command-center). Nilai 0..100 mengisi busur; warna
// gradien via c1→c2. Isi tengah dioper sebagai children (angka + label).
function Gauge({
  value,
  size = 108,
  c1,
  c2,
  children,
}: {
  value: number;
  size?: number;
  c1: string;
  c2: string;
  children: ReactNode;
}) {
  const val = Math.max(0, Math.min(100, value));
  const style = {
    width: size,
    height: size,
    "--val": val,
    "--c1": c1,
    "--c2": c2,
  } as CSSProperties;
  return (
    <div className="gauge" style={style}>
      <div className="gauge-inner">{children}</div>
    </div>
  );
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
    calendar: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </>
    ),
    award: (
      <>
        <circle cx="12" cy="8" r="6" />
        <path d="M8.21 13.89 7 22l5-3 5 3-1.21-8.11" />
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

interface Ringkasan {
  menu: string;
  periode?: Periode;
  distribusi: { besar: number; kecil: number; b3: number; porsi: number; pagu: number; ikut: number; total: number };
  gudang: { total: number; habis: number; menipis: number; aman: number };
}
const rupiah = (n: number) => "Rp " + new Intl.NumberFormat("id-ID").format(n);

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [ring, setRing] = useState<Ringkasan | null>(null);
  const [rows, setRows] = useState<RekapRow[]>([]);
  const [weekRows, setWeekRows] = useState<TrendRow[]>([]);
  const [periodRows, setPeriodRows] = useState<PeriodRow[]>([]);
  const [periode, setPeriode] = useState<Periode | null>(null);
  const [tanggal, setTanggal] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [cari, setCari] = useState("");

  const load = useCallback(async () => {
    setRefreshing(true);
    const today = jakartaToday();
    const weekFrom = addDays(today, -6);
    try {
      const [s, a, w, r] = await Promise.all([
        fetch("/api/admin/stats", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/admin/attendance", { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/admin/attendance?from=${weekFrom}&to=${today}`, {
          cache: "no-store",
        }).then((r) => r.json()),
        fetch("/api/admin/dashboard", { cache: "no-store" }).then((r) => r.json()).catch(() => null),
      ]);
      setStats(s.stats);
      setTanggal(s.tanggal);
      setRows(a.rekap || []);
      setWeekRows(w.rekap || []);
      if (r && r.distribusi) setRing(r);

      // Periode Q (2 mingguan) — bila aktif, tarik seluruh baris kehadiran dalam
      // rentang periode untuk analitik lanjutan. Bergantung pada bounds dari
      // /api/admin/dashboard, jadi fetch menyusul (bukan paralel).
      const p: Periode | null =
        r && r.periode && r.periode.from && r.periode.to ? r.periode : null;
      setPeriode(p);
      if (p && p.from && p.to) {
        const pr = await fetch(
          `/api/admin/attendance?from=${p.from}&to=${p.to}`,
          { cache: "no-store" },
        )
          .then((res) => res.json())
          .catch(() => null);
        setPeriodRows(pr?.rekap || []);
      } else {
        setPeriodRows([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Filter tabel kehadiran hari ini berdasarkan pencarian nama/divisi/jabatan.
  const rowsTampil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.nama.toLowerCase().includes(q) ||
        (r.divisi_nama || "").toLowerCase().includes(q) ||
        (r.jabatan || "").toLowerCase().includes(q),
    );
  }, [rows, cari]);

  // Ekspor tabel kehadiran hari ini ke CSV (murni sisi klien, tanpa server).
  function exportCsv() {
    const head = [
      "Nama",
      "Jabatan",
      "Divisi",
      "Lokasi",
      "Shift",
      "Masuk",
      "Status",
      "Pulang",
      "Jarak (m)",
    ];
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const baris = rowsTampil.map((r) =>
      [
        r.nama,
        r.jabatan || "",
        r.divisi_nama || "",
        r.lokasi || "",
        r.shift_masuk && r.shift_pulang
          ? `${r.shift_masuk}-${r.shift_pulang}`
          : "",
        fmtTime(r.check_in),
        r.status_masuk || "",
        fmtTime(r.check_out),
        r.check_in_jarak != null ? String(r.check_in_jarak) : "",
      ]
        .map((c) => esc(String(c)))
        .join(","),
    );
    const csv = "﻿" + [head.map(esc).join(","), ...baris].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kehadiran-${tanggal || jakartaToday()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Tutup absen pulang pegawai yang lupa menekan tombol pulang.
  async function tutupAbsen(id: number, nama: string) {
    if (
      !confirm(
        `Tutup absen pulang untuk "${nama}"?\nJam pulang dicatat sesuai jadwal shift-nya (atau sekarang bila shift belum berakhir).`,
      )
    )
      return;
    const res = await fetch(`/api/admin/attendance/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "force_checkout" }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "Gagal menutup absen.");
      return;
    }
    await load();
  }

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

  // Insight cepat: rata-rata jam masuk, datang pertama, rata-rata jarak GPS,
  // jam tersibuk, dan selisih kehadiran vs kemarin. Semua turunan dari data
  // yang sudah di-fetch — tanpa endpoint baru.
  const insight = useMemo(() => {
    const masuk = rows.filter((r) => r.check_in);
    let avgJam: string | null = null;
    let pertama: { nama: string; time: string } | null = null;
    if (masuk.length) {
      let sumMin = 0;
      let earliest = Infinity;
      for (const r of masuk) {
        const parts = new Intl.DateTimeFormat("en-GB", {
          timeZone: "Asia/Jakarta",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }).formatToParts(new Date(r.check_in!));
        const hh = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
        const mm = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
        const tot = hh * 60 + mm;
        sumMin += tot;
        if (tot < earliest) {
          earliest = tot;
          pertama = { nama: r.nama, time: fmtTime(r.check_in) };
        }
      }
      const a = Math.round(sumMin / masuk.length);
      avgJam = `${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}`;
    }

    const jarak = rows
      .filter((r) => r.check_in_jarak != null)
      .map((r) => r.check_in_jarak as number);
    const avgJarak = jarak.length
      ? Math.round(jarak.reduce((s, v) => s + v, 0) / jarak.length)
      : null;

    const peak = checkin.items.reduce(
      (best, it) => (it.count > best.count ? it : best),
      { h: -1, count: -1 },
    );

    const todayCount = trend.length ? trend[trend.length - 1].count : 0;
    const yestCount = trend.length > 1 ? trend[trend.length - 2].count : 0;
    const deltaKemarin = todayCount - yestCount;

    return {
      avgJam,
      pertama,
      avgJarak,
      peakHour: peak.count > 0 ? peak.h : null,
      peakCount: peak.count > 0 ? peak.count : 0,
      deltaKemarin,
      todayCount,
    };
  }, [rows, checkin, trend]);

  const totalMenit = useMemo(
    () => rows.reduce((s, r) => s + durasiMenit(r.check_in, r.check_out), 0),
    [rows],
  );
  const avgMenit = derived.hadir ? Math.round(totalMenit / derived.hadir) : 0;
  const onTimeRate = pct(derived.onTime, derived.hadir);

  // === Analitik Periode Q (2 minggu) ==========================================
  // Semua diturunkan dari periodRows (baris kehadiran sepanjang rentang periode)
  // secara client-side — tanpa endpoint/skema baru.
  const periodStats = useMemo(() => {
    if (!periode?.from || !periode?.to || periodRows.length === 0) return null;

    // Daftar tanggal periode (inklusif), dibatasi supaya aman.
    const days: string[] = [];
    let cur = periode.from;
    let guard = 0;
    while (cur <= periode.to && guard < 60) {
      days.push(cur);
      cur = addDays(cur, 1);
      guard++;
    }

    type DayAgg = { hadir: Set<number>; onTime: number; late: number; menit: number };
    const byDay = new Map<string, DayAgg>();
    const byUser = new Map<number, { nama: string; hadir: number; late: number; menit: number }>();
    const byDivisi = new Map<string, { hadir: number; menit: number }>();
    // Pola per hari-dalam-minggu (0=Min..6=Sab): total hadir + jumlah hari unik.
    const dowAgg = new Map<number, { hadir: number; days: Set<string> }>();

    for (const r of periodRows) {
      if (!r.tanggal || !r.check_in) continue;
      const late = r.status_masuk === "Terlambat";
      const menit = durasiMenit(r.check_in, r.check_out);

      const day = byDay.get(r.tanggal) ?? { hadir: new Set<number>(), onTime: 0, late: 0, menit: 0 };
      day.hadir.add(r.user_id);
      if (late) day.late += 1;
      else day.onTime += 1;
      day.menit += menit;
      byDay.set(r.tanggal, day);

      const u = byUser.get(r.user_id) ?? { nama: r.nama, hadir: 0, late: 0, menit: 0 };
      u.hadir += 1;
      if (late) u.late += 1;
      u.menit += menit;
      byUser.set(r.user_id, u);

      const dvNama = r.divisi_nama || "Tanpa Divisi";
      const dv = byDivisi.get(dvNama) ?? { hadir: 0, menit: 0 };
      dv.hadir += 1;
      dv.menit += menit;
      byDivisi.set(dvNama, dv);

      const wd = new Date(r.tanggal + "T00:00:00").getDay();
      const da = dowAgg.get(wd) ?? { hadir: 0, days: new Set<string>() };
      da.hadir += 1;
      da.days.add(r.tanggal);
      dowAgg.set(wd, da);
    }

    const today = jakartaToday();
    // Deret harian + akumulasi jam kerja (menit → jam).
    let cumMenit = 0;
    const perDay = days.map((d) => {
      const x = byDay.get(d);
      const menit = x?.menit ?? 0;
      cumMenit += menit;
      return {
        date: d,
        hadir: x?.hadir.size ?? 0,
        onTime: x?.onTime ?? 0,
        late: x?.late ?? 0,
        menit,
        cumJam: Math.round((cumMenit / 60) * 10) / 10,
        future: d > today,
        isToday: d === today,
      };
    });

    const stackMax = Math.max(1, ...perDay.map((p) => p.onTime + p.late));
    const cumMax = Math.max(1, ...perDay.map((p) => p.cumJam));

    const ranking = [...byUser.values()].sort((a, b) => b.hadir - a.hadir || b.menit - a.menit);
    const rankMax = Math.max(1, ...ranking.map((r) => r.hadir));

    const divisi = [...byDivisi.entries()]
      .map(([nama, v]) => ({ nama, hadir: v.hadir, menit: v.menit }))
      .sort((a, b) => b.hadir - a.hadir);
    const divisiMax = Math.max(1, ...divisi.map((d) => d.hadir));

    // Pola hari: rata-rata kehadiran per hari-dalam-minggu (Sen..Min).
    const NAMA_DOW = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const urut = [1, 2, 3, 4, 5, 6, 0]; // tampil Senin dulu
    const pola = urut.map((wd) => {
      const a = dowAgg.get(wd);
      const jml = a?.days.size ?? 0;
      const rata = jml ? Math.round((a!.hadir / jml) * 10) / 10 : 0;
      return { label: NAMA_DOW[wd], rata, total: a?.hadir ?? 0 };
    });
    const polaMax = Math.max(1, ...pola.map((p) => p.rata));

    const totalMenitPeriode = perDay.reduce((s, p) => s + p.menit, 0);
    const totalHadirPeriode = perDay.reduce((s, p) => s + p.hadir, 0);
    const totalLatePeriode = perDay.reduce((s, p) => s + p.late, 0);
    const hariBerjalan = perDay.filter((p) => !p.future).length;
    const puncak = perDay.reduce(
      (best, p) => (p.hadir > best.hadir ? p : best),
      { date: "", hadir: -1 } as { date: string; hadir: number },
    );

    return {
      perDay,
      stackMax,
      cumMax,
      ranking,
      rankMax,
      divisi,
      divisiMax,
      pola,
      polaMax,
      totalJamPeriode: Math.round((totalMenitPeriode / 60) * 10) / 10,
      totalHadirPeriode,
      totalLatePeriode,
      onTimeRatePeriode: pct(totalHadirPeriode - totalLatePeriode, totalHadirPeriode),
      kehadiranRatePeriode: hariBerjalan
        ? pct(totalHadirPeriode / hariBerjalan, Math.max(byUser.size, 1))
        : 0,
      progresPeriode: pct(hariBerjalan, days.length),
      hariBerjalan,
      totalHari: days.length,
      pesertaUnik: byUser.size,
      puncak: puncak.hadir > 0 ? puncak : null,
      rerataHarian: hariBerjalan ? Math.round(totalHadirPeriode / hariBerjalan) : 0,
    };
  }, [periode, periodRows]);

  const dow = (d: string) =>
    new Intl.DateTimeFormat("id-ID", { weekday: "short", timeZone: "Asia/Jakarta" }).format(
      new Date(d + "T00:00:00"),
    );

  const donut = `conic-gradient(#34d399 0 ${derived.onTimePct}%, #fbbf24 ${derived.onTimePct}% ${
    derived.onTimePct + derived.latePct
  }%, rgba(148,163,184,0.25) ${derived.onTimePct + derived.latePct}% 100%)`;

  return (
    <div className="dash-stagger space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="border-l-2 border-gold-500/70 pl-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-400">Panel Operasional</p>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Dashboard Operasional</h1>
          <p className="mt-0.5 text-sm text-slate-400">
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

      {/* Ringkasan operasional: distribusi (porsi & pagu) + stok gudang */}
      {ring && (
        <div className="space-y-3">
          {ring.menu && (
            <p className="flex items-center gap-2 text-sm text-slate-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-gold-400">
                <path d="M4 3v7a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3M6 3v18M18 3c-1.5 0-3 1.5-3 5s1.5 4 3 4v9" />
              </svg>
              Menu hari ini: <span className="text-slate-200">{ring.menu}</span>
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <div className="stat-card"><p className="stat-label">Porsi Besar (+PJ)</p><p className="stat-value text-emerald-300"><AnimatedNumber value={ring.distribusi.besar} /></p></div>
            <div className="stat-card"><p className="stat-label">Porsi Kecil</p><p className="stat-value text-sky-300"><AnimatedNumber value={ring.distribusi.kecil} /></p></div>
            <div className="stat-card"><p className="stat-label">Porsi B3</p><p className="stat-value text-amber-300"><AnimatedNumber value={ring.distribusi.b3} /></p></div>
            <div className="stat-card"><p className="stat-label">Total Porsi</p><p className="stat-value"><AnimatedNumber value={ring.distribusi.porsi} /></p><p className="text-[11px] text-slate-500">{ring.distribusi.ikut}/{ring.distribusi.total} penerima</p></div>
            <div className="stat-card sm:col-span-1"><p className="stat-label">Pagu Hari Ini</p><p className="stat-value !text-lg text-gold-400"><AnimatedNumber value={ring.distribusi.pagu} format={rupiah} /></p></div>
            <div className="stat-card">
              <p className="stat-label">Stok Gudang</p>
              <p className="mt-0.5 text-sm"><b className="text-emerald-300">{ring.gudang.aman}</b> aman · <b className="text-amber-300">{ring.gudang.menipis}</b> menipis · <b className="text-red-300">{ring.gudang.habis}</b> habis</p>
              <p className="text-[11px] text-slate-500">{ring.gudang.total} jenis barang</p>
            </div>
          </div>
        </div>
      )}

      {/* Alert telat & belum absen hari ini (+ nudge WhatsApp) */}
      <AlertAbsensi />

      {/* Ringkasan harian siap-kirim (WhatsApp) */}
      <RingkasanHarian />

      {/* Kartu statistik */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => {
          const val = loading || !stats ? null : stats[c.key];
          const sub =
            c.key === "total_staff"
              ? "pegawai aktif"
              : `${pct(val ?? 0, derived.total)}% dari total`;
          return (
            <div key={c.key} className="stat-card">
              <span className={"absolute inset-y-0 left-0 w-0.5 " + c.bar} />
              <div className="flex items-center justify-between">
                <p className="stat-label">{c.label}</p>
                <span className={"grid h-8 w-8 place-items-center rounded-lg " + c.chip}>
                  <Icon name={c.icon} />
                </span>
              </div>
              <p className={"stat-value !text-3xl " + c.text}>
                <AnimatedNumber value={val} />
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
              {loading ? "–" : <AnimatedNumber value={totalMenit} format={fmtDurasi} />}
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
              {loading ? "–" : <AnimatedNumber value={avgMenit} format={fmtDurasi} />}
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-500/15 text-emerald-300">
            <Icon name="gauge" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-400">Ketepatan Waktu</p>
            <p className="text-xl font-bold text-emerald-300">
              <AnimatedNumber value={onTimeRate} format={(n) => `${Math.round(n)}%`} />
            </p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="bar-grow h-full rounded-full bg-emerald-400"
                style={{ width: `${onTimeRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Insight cepat — metrik ringkas yang sering dilihat, semua turunan data
          yang sudah ada. Di mobile bisa digeser (snap horizontal). */}
      <div className="snap-x-mobile -mx-1 flex gap-3 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 lg:grid-cols-5">
        <div className="stat-card min-w-[46%] shrink-0 sm:min-w-0">
          <div className="flex items-center justify-between">
            <p className="stat-label">Rata-rata Jam Masuk</p>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gold-500/15 text-gold-300"><Icon name="clock" /></span>
          </div>
          <p className="stat-value !text-2xl tabular-nums text-gold-300">{insight.avgJam ?? "—"}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">rata-rata seluruh yang hadir</p>
        </div>

        <div className="stat-card min-w-[46%] shrink-0 sm:min-w-0">
          <div className="flex items-center justify-between">
            <p className="stat-label">Jam Tersibuk</p>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-500/15 text-sky-300"><Icon name="trend" /></span>
          </div>
          <p className="stat-value !text-2xl tabular-nums text-sky-300">
            {insight.peakHour != null ? `${String(insight.peakHour).padStart(2, "0")}:00` : "—"}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {insight.peakHour != null ? `${insight.peakCount} orang absen di jam ini` : "belum ada data"}
          </p>
        </div>

        <div className="stat-card min-w-[46%] shrink-0 sm:min-w-0">
          <div className="flex items-center justify-between">
            <p className="stat-label">Datang Pertama</p>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/15 text-emerald-300"><Icon name="check" /></span>
          </div>
          <p className="stat-value !text-lg truncate text-emerald-300" title={insight.pertama?.nama}>
            {insight.pertama?.nama ?? "—"}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {insight.pertama ? `masuk ${insight.pertama.time}` : "belum ada"}
          </p>
        </div>

        <div className="stat-card min-w-[46%] shrink-0 sm:min-w-0">
          <div className="flex items-center justify-between">
            <p className="stat-label">Rata-rata Jarak GPS</p>
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/15 text-amber-300"><Icon name="gauge" /></span>
          </div>
          <p className="stat-value !text-2xl text-amber-300">
            {insight.avgJarak != null ? <AnimatedNumber value={insight.avgJarak} format={(n) => `${Math.round(n)} m`} /> : "—"}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">jarak absen dari titik dapur</p>
        </div>

        <div className="stat-card min-w-[46%] shrink-0 sm:min-w-0">
          <div className="flex items-center justify-between">
            <p className="stat-label">Kehadiran vs Kemarin</p>
            <span className={"grid h-8 w-8 place-items-center rounded-lg " + (insight.deltaKemarin >= 0 ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300")}><Icon name="trend" /></span>
          </div>
          <p className={"stat-value !text-2xl tabular-nums " + (insight.deltaKemarin > 0 ? "text-emerald-300" : insight.deltaKemarin < 0 ? "text-red-300" : "text-slate-200")}>
            {insight.deltaKemarin > 0 ? "+" : ""}{insight.deltaKemarin}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">{insight.todayCount} hadir hari ini</p>
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
                <span className="text-2xl font-bold"><AnimatedNumber value={derived.hadirPct} format={(n) => `${Math.round(n)}%`} /></span>
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
                  className="bar-grow h-full rounded-full bg-emerald-400"
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
                  className="bar-grow h-full rounded-full bg-amber-400"
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
            <AnimatedNumber value={derived.bekerja.length} />
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
                  className="bar-grow w-full max-w-[36px] rounded-t-md bg-gradient-to-t from-emerald-500/40 to-emerald-400"
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
                    className="bar-grow w-full rounded-t-md bg-gradient-to-t from-gold-500/40 to-gold-400"
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
                      className="bar-grow h-full bg-emerald-400"
                      style={{ width: `${pct(onTime, Math.max(d.hadir, 1))}%` }}
                    />
                    <div
                      className="bar-grow h-full bg-amber-400"
                      style={{ width: `${pct(d.terlambat, Math.max(d.hadir, 1))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* === Analitik Periode Q (2 minggu) === */}
      {periodStats && periode?.from && periode?.to && (
        <div className="space-y-4">
          {/* Hero periode — command center bergaya glowing */}
          <div className="card sheen grid-glow relative overflow-hidden p-5 ring-glow sm:p-6">
            <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-sky-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-gold-500/10 blur-3xl" />

            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-500/15 text-sky-300 ring-1 ring-inset ring-sky-400/30">
                  <Icon name="calendar" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] neon-cyan">
                    Command Center · Periode 2 Minggu
                  </p>
                  <p className="text-sm font-semibold text-slate-100">
                    {fmtTgl(periode.from)} – {fmtTgl(periode.to)}
                  </p>
                </div>
              </div>
              <span
                className={
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset " +
                  (periode.aktif
                    ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30"
                    : "bg-slate-500/15 text-slate-300 ring-white/10")
                }
              >
                {periode.aktif && (
                  <span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
                )}
                {periode.aktif ? "LIVE · Periode Aktif" : "Periode Nonaktif"}
              </span>
            </div>

            {/* Radial gauges */}
            <div className="mt-5 grid grid-cols-3 gap-3 sm:gap-5">
              <div className="flex flex-col items-center gap-2">
                <Gauge value={periodStats.onTimeRatePeriode} c1="#38bdf8" c2="#ffd66b">
                  <div className="text-xl font-bold tabular-nums neon-gold sm:text-2xl">
                    <AnimatedNumber
                      value={periodStats.onTimeRatePeriode}
                      format={(n) => `${Math.round(n)}%`}
                    />
                  </div>
                  <div className="text-[9px] uppercase tracking-wide text-slate-400">tepat</div>
                </Gauge>
                <p className="text-center text-[11px] font-medium text-slate-300">Tepat Waktu</p>
              </div>

              <div className="flex flex-col items-center gap-2">
                <Gauge value={periodStats.kehadiranRatePeriode} c1="#34d399" c2="#22d3ee">
                  <div className="text-xl font-bold tabular-nums neon-cyan sm:text-2xl">
                    <AnimatedNumber
                      value={periodStats.kehadiranRatePeriode}
                      format={(n) => `${Math.round(n)}%`}
                    />
                  </div>
                  <div className="text-[9px] uppercase tracking-wide text-slate-400">hadir</div>
                </Gauge>
                <p className="text-center text-[11px] font-medium text-slate-300">Rata Kehadiran</p>
              </div>

              <div className="flex flex-col items-center gap-2">
                <Gauge value={periodStats.progresPeriode} c1="#818cf8" c2="#f0abfc">
                  <div className="text-xl font-bold tabular-nums neon-magenta sm:text-2xl">
                    <AnimatedNumber
                      value={periodStats.progresPeriode}
                      format={(n) => `${Math.round(n)}%`}
                    />
                  </div>
                  <div className="text-[9px] uppercase tracking-wide text-slate-400">
                    {periodStats.hariBerjalan}/{periodStats.totalHari} hari
                  </div>
                </Gauge>
                <p className="text-center text-[11px] font-medium text-slate-300">Progres Periode</p>
              </div>
            </div>

            {/* Strip angka mentah — kartu berpendar */}
            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.07] p-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">Total Hadir</p>
                <p className="mt-0.5 text-xl font-bold tabular-nums text-emerald-300">
                  <AnimatedNumber value={periodStats.totalHadirPeriode} />
                </p>
              </div>
              <div className="rounded-xl border border-sky-400/20 bg-sky-500/[0.07] p-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">Jam Kerja</p>
                <p className="mt-0.5 text-xl font-bold tabular-nums text-sky-300">
                  <AnimatedNumber
                    value={periodStats.totalJamPeriode}
                    format={(n) => `${n.toLocaleString("id-ID")}j`}
                  />
                </p>
              </div>
              <div className="rounded-xl border border-gold-400/20 bg-gold-500/[0.07] p-3 text-center">
                <p className="text-[10px] uppercase tracking-wide text-slate-400">Peserta</p>
                <p className="mt-0.5 text-xl font-bold tabular-nums text-gold-300">
                  <AnimatedNumber value={periodStats.pesertaUnik} />
                </p>
              </div>
            </div>
          </div>

          {/* Tren tepat vs telat per hari (stacked) + akumulasi jam kerja */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card p-5">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/15 text-emerald-300">
                  <Icon name="trend" />
                </span>
                <p className="text-sm font-semibold">Tepat vs Telat · per hari</p>
              </div>
              <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> Tepat
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-400" /> Telat
                </span>
              </div>
              <div
                className="mt-4 flex items-end justify-between gap-1"
                style={{ height: 150 }}
              >
                {periodStats.perDay.map((p) => {
                  const totH = p.onTime + p.late;
                  return (
                    <div
                      key={p.date}
                      className="flex flex-1 flex-col items-center justify-end gap-1.5"
                    >
                      <span className="text-[10px] text-slate-400">
                        {totH > 0 ? totH : ""}
                      </span>
                      <div
                        className="flex w-full max-w-[26px] flex-col-reverse overflow-hidden rounded-t-md"
                        style={{
                          height: `${Math.max(totH ? 6 : 2, (totH / periodStats.stackMax) * 100)}%`,
                          opacity: p.future ? 0.25 : 1,
                          outline: p.isToday ? "1px solid rgba(212,175,55,0.6)" : "none",
                        }}
                        title={`${fmtTgl(p.date)} · ${p.onTime} tepat, ${p.late} telat`}
                      >
                        <div
                          className="bar-grow w-full bg-emerald-400"
                          style={{ height: `${pct(p.onTime, Math.max(totH, 1))}%` }}
                        />
                        <div
                          className="bar-grow w-full bg-amber-400"
                          style={{ height: `${pct(p.late, Math.max(totH, 1))}%` }}
                        />
                      </div>
                      <span className="text-[9px] text-slate-500">{fmtTgl(p.date).split(" ")[0]}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-sky-500/15 text-sky-300">
                  <Icon name="timer" />
                </span>
                <p className="text-sm font-semibold">Akumulasi Jam Kerja</p>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Kumulatif sepanjang periode · total{" "}
                <span className="font-semibold text-sky-300">
                  {periodStats.totalJamPeriode.toLocaleString("id-ID")} jam
                </span>
              </p>
              <div
                className="mt-4 flex items-end justify-between gap-1"
                style={{ height: 150 }}
              >
                {periodStats.perDay.map((p) => (
                  <div
                    key={p.date}
                    className="flex flex-1 flex-col items-center justify-end gap-1.5"
                  >
                    <div
                      className="bar-grow w-full max-w-[26px] rounded-t-md bg-gradient-to-t from-sky-500/40 to-sky-400"
                      style={{
                        height: `${Math.max(4, (p.cumJam / periodStats.cumMax) * 100)}%`,
                        opacity: p.future ? 0.25 : 1,
                      }}
                      title={`${fmtTgl(p.date)} · kumulatif ${p.cumJam} jam`}
                    />
                    <span className="text-[9px] text-slate-500">{fmtTgl(p.date).split(" ")[0]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Peringkat kehadiran pegawai + pola hari & divisi */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card p-5">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-gold-500/15 text-gold-300">
                  <Icon name="award" />
                </span>
                <p className="text-sm font-semibold">Peringkat Kehadiran Pegawai</p>
              </div>
              {periodStats.ranking.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">Belum ada data periode.</p>
              ) : (
                <div className="mt-4 space-y-2.5">
                  {periodStats.ranking.slice(0, 8).map((u, i) => (
                    <div key={u.nama + i} className="flex items-center gap-3">
                      <span
                        className={
                          "grid h-6 w-6 shrink-0 place-items-center rounded-md text-[11px] font-bold " +
                          (i === 0
                            ? "bg-gold-500/20 text-gold-300"
                            : i === 1
                              ? "bg-slate-400/20 text-slate-200"
                              : i === 2
                                ? "bg-amber-600/20 text-amber-400"
                                : "bg-white/5 text-slate-400")
                        }
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate font-medium">{u.nama}</span>
                          <span className="shrink-0 text-slate-400">
                            <span className="text-emerald-300">{u.hadir}×</span>
                            {u.late > 0 && (
                              <span className="text-amber-300"> · {u.late} telat</span>
                            )}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="bar-grow h-full rounded-full bg-gradient-to-r from-gold-500/50 to-gold-300"
                            style={{ width: `${pct(u.hadir, periodStats.rankMax)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-4">
              {/* Pola kehadiran per hari (Sen–Min) */}
              <div className="card p-5">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-violet-500/15 text-violet-300">
                    <Icon name="gauge" />
                  </span>
                  <p className="text-sm font-semibold">Pola Kehadiran per Hari</p>
                </div>
                <div
                  className="mt-4 flex items-end justify-between gap-2"
                  style={{ height: 100 }}
                >
                  {periodStats.pola.map((p) => (
                    <div
                      key={p.label}
                      className="flex flex-1 flex-col items-center justify-end gap-1.5"
                    >
                      <span className="text-[10px] text-slate-400">
                        {p.rata > 0 ? p.rata : ""}
                      </span>
                      <div
                        className="bar-grow w-full max-w-[30px] rounded-t-md bg-gradient-to-t from-violet-500/40 to-violet-400"
                        style={{
                          height: `${Math.max(p.rata ? 6 : 2, (p.rata / periodStats.polaMax) * 100)}%`,
                          opacity: p.rata ? 1 : 0.3,
                        }}
                        title={`${p.label} · rata-rata ${p.rata} hadir`}
                      />
                      <span className="text-[10px] text-slate-500">{p.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Perbandingan divisi sepanjang periode */}
              <div className="card p-5">
                <div className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-sky-500/15 text-sky-300">
                    <Icon name="grid" />
                  </span>
                  <p className="text-sm font-semibold">Kehadiran per Divisi · periode</p>
                </div>
                {periodStats.divisi.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">Belum ada data.</p>
                ) : (
                  <div className="mt-4 space-y-3">
                    {periodStats.divisi.slice(0, 6).map((d) => (
                      <div key={d.nama}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="truncate font-medium">{d.nama}</span>
                          <span className="shrink-0 text-slate-400">
                            {d.hadir}× ·{" "}
                            <span className="text-sky-300">
                              {Math.round((d.menit / 60) * 10) / 10} j
                            </span>
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="bar-grow h-full rounded-full bg-gradient-to-r from-sky-500/50 to-sky-400"
                            style={{ width: `${pct(d.hadir, periodStats.divisiMax)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabel kehadiran */}
      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 px-4 py-3">
          <p className="text-sm font-semibold">Kehadiran Shift Hari Ini</p>
          <div className="flex items-center gap-2">
            <input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari nama / divisi…"
              className="input h-8 w-40 py-1 text-xs sm:w-48"
            />
            <button
              onClick={exportCsv}
              disabled={rowsTampil.length === 0}
              className="btn-ghost gap-1.5 px-2.5 py-1 text-xs text-gold-400 disabled:opacity-40"
              title="Unduh tabel ini sebagai CSV (buka di Excel)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                <path d="M12 3v12M7 12l5 5 5-5M5 21h14" />
              </svg>
              CSV
            </button>
            <span className="text-xs text-slate-400">{rowsTampil.length} entri</span>
          </div>
        </div>
        {loading ? (
          <p className="p-6 text-center text-slate-400">Memuat…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-center text-slate-400">
            Belum ada yang absen hari ini.
          </p>
        ) : rowsTampil.length === 0 ? (
          <p className="p-6 text-center text-slate-400">
            Tidak ada yang cocok dengan pencarian “{cari}”.
          </p>
        ) : (
          <div className="scroll-x overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr className="border-b border-white/5">
                  <th className="px-4 py-2.5">Nama</th>
                  <th className="px-4 py-2.5">Divisi</th>
                  <th className="px-4 py-2.5">Lokasi</th>
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
                {rowsTampil.map((r) => {
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
                    <td className="px-4 py-2.5 text-slate-400">{r.lokasi || "—"}</td>
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
                          <span className="inline-flex items-center gap-1.5">
                            <span className="badge bg-sky-500/15 text-sky-300">
                              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
                              Bertugas
                            </span>
                            <button
                              onClick={() => tutupAbsen(r.id, r.nama)}
                              className="btn-ghost gap-1 px-2 py-0.5 text-[11px]"
                              title="Tutup absen pulang (untuk yang lupa menekan pulang)"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
                                <rect x="5" y="5" width="14" height="14" rx="2" />
                              </svg>
                              Tutup
                            </button>
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
