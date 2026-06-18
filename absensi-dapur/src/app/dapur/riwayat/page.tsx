"use client";

import { useEffect, useState } from "react";

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
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(v + "T00:00:00"));
}

export default function RiwayatPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/attendance/me?limit=60", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setRows(d.riwayat || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">Riwayat Absensi Saya</h1>

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
                  <p className="text-sm font-semibold">{fmtDate(r.tanggal)}</p>
                  <p className="text-xs text-slate-400">
                    Masuk {fmtTime(r.check_in)} · Pulang {fmtTime(r.check_out)}
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
  );
}
