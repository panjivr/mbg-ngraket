"use client";

import { useCallback, useEffect, useState } from "react";

interface BoardRow {
  user_id: number;
  nama: string;
  divisi_nama: string | null;
  hadir: number;
  tepat: number;
  terlambat: number;
  skor: number;
}

interface LeaderboardResponse {
  from: string;
  to: string;
  board: BoardRow[];
}

function jakartaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardPage() {
  const today = jakartaToday();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [board, setBoard] = useState<BoardRow[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/leaderboard?from=${from}&to=${to}`,
        { cache: "no-store" },
      );
      const data: LeaderboardResponse = await res.json();
      setBoard(data.board || []);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">🏆 Leaderboard Kedisiplinan</h1>
      </div>

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
      </div>

      <p className="text-xs text-slate-400">
        Skor = Tepat Waktu × 2 + Hadir − Terlambat. Semakin tinggi skor, semakin
        disiplin kehadirannya pada rentang tanggal terpilih.
      </p>

      <div className="card overflow-hidden">
        <div className="border-b border-white/5 px-4 py-3 text-sm text-slate-400">
          {board.length} pegawai
        </div>
        {loading ? (
          <p className="p-6 text-center text-slate-400">Memuat…</p>
        ) : board.length === 0 ? (
          <p className="p-6 text-center text-slate-400">
            Tidak ada data pada rentang ini.
          </p>
        ) : (
          <div className="scroll-x overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-xs uppercase text-slate-400">
                <tr className="border-b border-white/5">
                  <th className="px-4 py-2.5 text-center">#</th>
                  <th className="px-4 py-2.5">Nama</th>
                  <th className="px-4 py-2.5">Divisi</th>
                  <th className="px-4 py-2.5 text-right">Hadir</th>
                  <th className="px-4 py-2.5 text-right">Tepat Waktu</th>
                  <th className="px-4 py-2.5 text-right">Terlambat</th>
                  <th className="px-4 py-2.5 text-right">Skor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {board.map((r, i) => {
                  const top3 = i < 3;
                  return (
                    <tr
                      key={r.user_id}
                      className={top3 ? "bg-gold-400/10" : undefined}
                    >
                      <td className="px-4 py-2.5 text-center text-base">
                        {top3 ? (
                          <span title={`Peringkat ${i + 1}`}>{MEDALS[i]}</span>
                        ) : (
                          <span className="text-slate-400">{i + 1}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-medium">{r.nama}</td>
                      <td className="px-4 py-2.5 text-slate-400">
                        {r.divisi_nama || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-right">{r.hadir}</td>
                      <td className="px-4 py-2.5 text-right text-emerald-300">
                        {r.tepat}
                      </td>
                      <td className="px-4 py-2.5 text-right text-amber-300">
                        {r.terlambat}
                      </td>
                      <td className="px-4 py-2.5 text-right text-lg font-bold text-gold-400">
                        {r.skor}
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
