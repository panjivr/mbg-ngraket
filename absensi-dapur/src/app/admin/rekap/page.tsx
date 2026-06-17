"use client";

import { useCallback, useEffect, useState } from "react";

interface RekapRow {
  id: number;
  nama: string;
  jabatan: string | null;
  nip: string | null;
  tanggal: string;
  check_in: string | null;
  check_out: string | null;
  status_masuk: string | null;
  check_in_jarak: number | null;
  check_out_jarak: number | null;
}

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

function fmtDate(v: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(v + "T00:00:00"));
}

export default function RekapPage() {
  const today = jakartaToday();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<RekapRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/attendance?from=${from}&to=${to}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      setRows(data.rekap || []);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold">Rekap Absensi</h1>

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
        <a
          href={`/api/admin/export?from=${from}&to=${to}`}
          className="btn-gold ml-auto"
        >
          ⬇ Unduh CSV
        </a>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-white/5 px-4 py-3 text-sm text-slate-400">
          {rows.length} catatan
        </div>
        {loading ? (
          <p className="p-6 text-center text-slate-400">Memuat…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-center text-slate-400">
            Tidak ada data pada rentang ini.
          </p>
        ) : (
          <div className="scroll-x overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr className="border-b border-white/5">
                  <th className="px-4 py-2.5">Tanggal</th>
                  <th className="px-4 py-2.5">Nama</th>
                  <th className="px-4 py-2.5">Jabatan</th>
                  <th className="px-4 py-2.5">Masuk</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Pulang</th>
                  <th className="px-4 py-2.5">Jarak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2.5 whitespace-nowrap">{fmtDate(r.tanggal)}</td>
                    <td className="px-4 py-2.5 font-medium">{r.nama}</td>
                    <td className="px-4 py-2.5 text-slate-400">{r.jabatan || "—"}</td>
                    <td className="px-4 py-2.5">{fmtTime(r.check_in)}</td>
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
                    <td className="px-4 py-2.5">{fmtTime(r.check_out)}</td>
                    <td className="px-4 py-2.5 text-slate-400">
                      {r.check_in_jarak != null ? `${r.check_in_jarak} m` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
