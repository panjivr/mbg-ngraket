"use client";

import { useEffect, useState } from "react";

interface Row {
  tanggal: string;
  jam_masuk: string | null;
  jam_pulang: string | null;
  keterangan: string | null;
  libur: boolean;
}

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function fmt(iso: string): string {
  return parseISO(iso).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

export default function JadwalSayaPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [today, setToday] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/jadwal", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setRows(d.jadwal || []);
        setToday(d.today || "");
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold">🗓️ Jadwal Saya</h1>
      {loading ? (
        <div className="card p-6 text-center text-slate-400">Memuat…</div>
      ) : rows.length === 0 ? (
        <div className="card p-6 text-center text-sm text-slate-400">
          Belum ada jadwal yang ditetapkan.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.tanggal}
              className={
                "card flex items-center justify-between gap-3 p-4 " +
                (r.tanggal === today ? "border-gold-500/40" : "")
              }
            >
              <div>
                <p className="font-medium">
                  {fmt(r.tanggal)}
                  {r.tanggal === today && <span className="ml-2 text-xs text-gold-400">Hari ini</span>}
                </p>
                {r.keterangan && <p className="text-xs text-slate-400">{r.keterangan}</p>}
              </div>
              {r.libur ? (
                <span className="rounded-lg bg-rose-500/15 px-2.5 py-1 text-sm font-semibold text-rose-300">
                  🏖️ Libur
                </span>
              ) : r.jam_masuk && r.jam_pulang ? (
                <span className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-sm font-semibold text-emerald-200">
                  {r.jam_masuk} – {r.jam_pulang}
                </span>
              ) : (
                <span className="text-sm text-slate-400">Masuk</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
