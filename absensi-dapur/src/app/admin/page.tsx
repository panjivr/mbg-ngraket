"use client";

import { useEffect, useState } from "react";

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

const cards: Array<{ key: keyof Stats; label: string; cls: string }> = [
  { key: "total_staff", label: "Total Pegawai", cls: "text-slate-100" },
  { key: "hadir", label: "Hadir", cls: "text-emerald-300" },
  { key: "terlambat", label: "Terlambat", cls: "text-amber-300" },
  { key: "pulang", label: "Sudah Pulang", cls: "text-sky-300" },
  { key: "belum", label: "Belum Absen", cls: "text-red-300" },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<RekapRow[]>([]);
  const [tanggal, setTanggal] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/stats", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/admin/attendance", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([s, a]) => {
        setStats(s.stats);
        setTanggal(s.tanggal);
        setRows(a.rekap || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const tanggalTampil = tanggal
    ? new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(tanggal + "T00:00:00"))
    : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Dashboard Shift Hari Ini</h1>
        <p className="text-sm text-slate-400">{tanggalTampil}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.key} className="card p-4">
            <p className="text-xs text-slate-400">{c.label}</p>
            <p className={"mt-1 text-3xl font-bold " + c.cls}>
              {loading || !stats ? "–" : stats[c.key]}
            </p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-white/5 px-4 py-3">
          <p className="text-sm font-semibold">Kehadiran Shift Hari Ini</p>
        </div>
        {loading ? (
          <p className="p-6 text-center text-slate-400">Memuat…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-center text-slate-400">
            Belum ada yang absen hari ini.
          </p>
        ) : (
          <div className="scroll-x overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr className="border-b border-white/5">
                  <th className="px-4 py-2.5">Nama</th>
                  <th className="px-4 py-2.5">Jabatan</th>
                  <th className="px-4 py-2.5">Divisi</th>
                  <th className="px-4 py-2.5">Masuk</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Pulang</th>
                  <th className="px-4 py-2.5">Jarak</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2.5 font-medium">{r.nama}</td>
                    <td className="px-4 py-2.5 text-slate-400">{r.jabatan || "—"}</td>
                    <td className="px-4 py-2.5 text-slate-400">{r.divisi_nama || "—"}</td>
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
