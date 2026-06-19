"use client";

import { useEffect, useMemo, useState } from "react";
import { durasiMenit, fmtDurasi } from "@/lib/time";

interface Row {
  id: number;
  tanggal: string;
  check_in: string | null;
  check_out: string | null;
  status_masuk: string | null;
  divisi_nama: string | null;
  shift_masuk: string | null;
  shift_pulang: string | null;
}

const HARI = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function jakartaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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

function fmtDateLong(v: string) {
  return new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(v + "T00:00:00"));
}

function ymd(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function RiwayatPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const today = jakartaToday();
  const [year, setYear] = useState(() => Number(today.slice(0, 4)));
  const [month, setMonth] = useState(() => Number(today.slice(5, 7)) - 1); // 0-based
  const [selected, setSelected] = useState<string | null>(today);

  useEffect(() => {
    fetch("/api/attendance/me?limit=180", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setRows(d.riwayat || []))
      .finally(() => setLoading(false));
  }, []);

  // Peta tanggal -> ringkasan hari itu.
  const byDate = useMemo(() => {
    const map = new Map<
      string,
      { hadir: boolean; terlambat: boolean; menit: number; rows: Row[] }
    >();
    for (const r of rows) {
      if (!r.tanggal) continue;
      const g = map.get(r.tanggal) || {
        hadir: false,
        terlambat: false,
        menit: 0,
        rows: [],
      };
      if (r.check_in) g.hadir = true;
      if (r.status_masuk === "Terlambat") g.terlambat = true;
      g.menit += durasiMenit(r.check_in, r.check_out);
      g.rows.push(r);
      map.set(r.tanggal, g);
    }
    return map;
  }, [rows]);

  // Ringkasan bulan yang sedang ditampilkan.
  const ringkasan = useMemo(() => {
    let hadir = 0;
    let terlambat = 0;
    let menit = 0;
    for (const [tgl, g] of byDate) {
      if (tgl.startsWith(ymd(year, month, 0).slice(0, 7))) {
        if (g.hadir) hadir += 1;
        if (g.terlambat) terlambat += 1;
        menit += g.menit;
      }
    }
    return { hadir, terlambat, menit };
  }, [byDate, year, month]);

  // Sel kalender (termasuk sel kosong di awal untuk perataan minggu).
  const cells = useMemo(() => {
    const firstWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay(); // 0=Min
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const out: Array<number | null> = [];
    for (let i = 0; i < firstWeekday; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(d);
    return out;
  }, [year, month]);

  function prevMonth() {
    setSelected(null);
    if (month === 0) {
      setYear(year - 1);
      setMonth(11);
    } else setMonth(month - 1);
  }
  function nextMonth() {
    setSelected(null);
    if (month === 11) {
      setYear(year + 1);
      setMonth(0);
    } else setMonth(month + 1);
  }

  const selDetail = selected ? byDate.get(selected) : undefined;

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">Riwayat & Kalender Absensi</h1>

      {/* Ringkasan bulan */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3 text-center">
          <p className="text-xs text-slate-400">Hari Hadir</p>
          <p className="mt-1 text-xl font-bold text-emerald-300">{ringkasan.hadir}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-slate-400">Terlambat</p>
          <p className="mt-1 text-xl font-bold text-amber-300">{ringkasan.terlambat}</p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs text-slate-400">Jam Kerja</p>
          <p className="mt-1 text-xl font-bold text-gold-400">{fmtDurasi(ringkasan.menit)}</p>
        </div>
      </div>

      {/* Kalender */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="btn-ghost px-3 py-1.5 text-sm">
            ‹
          </button>
          <p className="text-sm font-semibold">
            {BULAN[month]} {year}
          </p>
          <button onClick={nextMonth} className="btn-ghost px-3 py-1.5 text-sm">
            ›
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] text-slate-500">
          {HARI.map((h) => (
            <div key={h} className="py-1">
              {h}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (d === null) return <div key={`e${i}`} />;
            const tgl = ymd(year, month, d);
            const g = byDate.get(tgl);
            const isToday = tgl === today;
            const isSel = tgl === selected;
            let tone = "bg-white/5 text-slate-300 hover:bg-white/10";
            if (g?.terlambat) tone = "bg-amber-500/20 text-amber-200 hover:bg-amber-500/30";
            else if (g?.hadir) tone = "bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30";
            return (
              <button
                key={tgl}
                onClick={() => setSelected(tgl)}
                className={
                  "relative aspect-square rounded-lg text-sm transition " +
                  tone +
                  (isSel ? " ring-2 ring-gold-400" : "") +
                  (isToday && !isSel ? " ring-1 ring-white/40" : "")
                }
              >
                {d}
                {g?.hadir && (
                  <span
                    className={
                      "absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full " +
                      (g.terlambat ? "bg-amber-400" : "bg-emerald-400")
                    }
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Legenda */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-emerald-500/40" /> Hadir tepat waktu
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-amber-500/40" /> Terlambat
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded bg-white/10" /> Tidak ada absen
          </span>
        </div>
      </div>

      {/* Detail hari terpilih */}
      {selected && (
        <div className="card p-4">
          <p className="text-sm font-semibold">{fmtDateLong(selected)}</p>
          {selDetail && selDetail.rows.length > 0 ? (
            <div className="mt-3 space-y-2">
              {selDetail.rows.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between gap-3 rounded-lg bg-ink-900/60 p-3 text-sm"
                >
                  <div>
                    <p>
                      Masuk <span className="font-semibold">{fmtTime(r.check_in)}</span> ·
                      Pulang <span className="font-semibold">{fmtTime(r.check_out)}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {r.divisi_nama || "Umum"}
                      {r.check_in && r.check_out
                        ? ` · ${fmtDurasi(durasiMenit(r.check_in, r.check_out))}`
                        : ""}
                    </p>
                  </div>
                  {r.status_masuk && (
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
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Tidak ada catatan absen di hari ini.</p>
          )}
        </div>
      )}

      {/* Daftar lengkap */}
      <div>
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Semua Catatan
        </p>
        {loading ? (
          <div className="card p-6 text-center text-slate-400">Memuat…</div>
        ) : rows.length === 0 ? (
          <div className="card p-6 text-center text-slate-400">
            Belum ada catatan absensi.
          </div>
        ) : (
          <div className="card overflow-hidden">
            <ul className="divide-y divide-white/5">
              {rows.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {r.tanggal ? fmtDateLong(r.tanggal) : "—"}
                    </p>
                    <p className="text-xs text-slate-400">
                      Masuk {fmtTime(r.check_in)} · Pulang {fmtTime(r.check_out)}
                      {r.check_in && r.check_out
                        ? ` · ${fmtDurasi(durasiMenit(r.check_in, r.check_out))}`
                        : ""}
                    </p>
                    {r.divisi_nama && (
                      <p className="mt-0.5 text-xs text-slate-500">
                        {r.divisi_nama}
                        {r.shift_masuk && r.shift_pulang
                          ? ` · ${r.shift_masuk}–${r.shift_pulang}`
                          : ""}
                      </p>
                    )}
                  </div>
                  {r.status_masuk && (
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
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
