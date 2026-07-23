"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

interface BoardRow {
  user_id: number;
  nama: string;
  divisi_nama: string | null;
  hidden: boolean;
  hadir: number;
  tepat: number;
  terlambat: number;
  selesai: number;
  ketepatan: number; // %
  jam_rata: number; // jam/hari
  skor: number; // 0..100
}

interface LeaderboardResponse {
  from: string;
  to: string;
  board: BoardRow[];
  op_days: number;
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

function skorColor(s: number): string {
  if (s >= 85) return "text-emerald-300";
  if (s >= 70) return "text-gold-400";
  if (s >= 50) return "text-amber-300";
  return "text-rose-300";
}
function barColor(s: number): string {
  if (s >= 85) return "bg-emerald-400";
  if (s >= 70) return "bg-gold-400";
  if (s >= 50) return "bg-amber-400";
  return "bg-rose-400";
}

export default function LeaderboardPage() {
  const today = jakartaToday();
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [board, setBoard] = useState<BoardRow[]>([]);
  const [opDays, setOpDays] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/leaderboard?from=${from}&to=${to}`, {
        cache: "no-store",
      });
      const data: LeaderboardResponse = await res.json();
      setBoard(data.board || []);
      setOpDays(data.op_days || 0);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleHidden = useCallback(async (row: BoardRow) => {
    setBusy(row.user_id);
    const next = !row.hidden;
    // Optimistis: perbarui lokal dulu agar terasa cepat.
    setBoard((prev) =>
      prev.map((r) => (r.user_id === row.user_id ? { ...r, hidden: next } : r)),
    );
    try {
      const res = await fetch("/api/admin/leaderboard", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: row.user_id, hidden: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      // Gagal → kembalikan.
      setBoard((prev) =>
        prev.map((r) =>
          r.user_id === row.user_id ? { ...r, hidden: !next } : r,
        ),
      );
    } finally {
      setBusy(null);
    }
  }, []);

  const ranked = useMemo(() => board.filter((r) => !r.hidden), [board]);
  const excluded = useMemo(() => board.filter((r) => r.hidden), [board]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">🏆 Peringkat Kinerja Pegawai</h1>
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
        {opDays > 0 && (
          <span className="ml-auto text-xs text-slate-400">
            {opDays} hari operasional pada rentang ini
          </span>
        )}
      </div>

      <div className="card space-y-1.5 p-4 text-xs text-slate-400">
        <p className="font-semibold text-slate-300">
          Skor Kinerja (0–100) — gabungan tiga penilaian berbasis rasio, jadi
          adil untuk pegawai dengan jumlah hari kerja berbeda:
        </p>
        <ul className="ml-4 list-disc space-y-0.5">
          <li>
            <b className="text-slate-300">Ketepatan Waktu 55%</b> — porsi masuk
            tepat waktu dari total kehadiran.
          </li>
          <li>
            <b className="text-slate-300">Keaktifan 25%</b> — kehadiran dibanding
            hari operasional dapur (maks 100%).
          </li>
          <li>
            <b className="text-slate-300">Kelengkapan Presensi 20%</b> — porsi
            hari yang lengkap sampai clock-out.
          </li>
        </ul>
        <p className="pt-1">
          Pegawai berjadwal khusus (mis. keamanan/admin dengan jam & hari kerja
          berbeda) bisa disembunyikan dari papan lewat tombol 🚫 agar
          perbandingan tetap setara.
        </p>
      </div>

      <BoardTable
        rows={ranked}
        ranked
        loading={loading}
        busy={busy}
        onToggle={toggleHidden}
      />

      {excluded.length > 0 && (
        <details className="card overflow-hidden" open>
          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-medium text-slate-300">
            🚫 Dikecualikan dari peringkat ({excluded.length})
          </summary>
          <BoardTable
            rows={excluded}
            ranked={false}
            loading={false}
            busy={busy}
            onToggle={toggleHidden}
          />
        </details>
      )}
    </div>
  );
}

function BoardTable({
  rows,
  ranked,
  loading,
  busy,
  onToggle,
}: {
  rows: BoardRow[];
  ranked: boolean;
  loading: boolean;
  busy: number | null;
  onToggle: (r: BoardRow) => void;
}) {
  return (
    <div className="card overflow-hidden">
      {ranked && (
        <div className="border-b border-white/5 px-4 py-3 text-sm text-slate-400">
          {rows.length} pegawai dinilai
        </div>
      )}
      {loading ? (
        <p className="p-6 text-center text-slate-400">Memuat…</p>
      ) : rows.length === 0 ? (
        <p className="p-6 text-center text-slate-400">
          {ranked ? "Tidak ada data pada rentang ini." : "—"}
        </p>
      ) : (
        <div className="scroll-x overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="text-left text-xs uppercase text-slate-400">
              <tr className="border-b border-white/5">
                <th className="px-3 py-2.5 text-center">#</th>
                <th className="px-3 py-2.5">Nama</th>
                <th className="px-3 py-2.5 text-right">Hadir</th>
                <th className="px-3 py-2.5 text-right">Tepat</th>
                <th className="px-3 py-2.5 text-right">Telat</th>
                <th className="px-3 py-2.5 text-right">Ketepatan</th>
                <th className="px-3 py-2.5 text-right">Jam/Hari</th>
                <th className="px-3 py-2.5">Skor Kinerja</th>
                <th className="px-3 py-2.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {rows.map((r, i) => {
                const top3 = ranked && i < 3;
                return (
                  <tr
                    key={r.user_id}
                    className={top3 ? "bg-gold-400/10" : undefined}
                  >
                    <td className="px-3 py-2.5 text-center text-base">
                      {ranked ? (
                        top3 ? (
                          <span title={`Peringkat ${i + 1}`}>{MEDALS[i]}</span>
                        ) : (
                          <span className="text-slate-400">{i + 1}</span>
                        )
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium">{r.nama}</div>
                      <div className="text-xs text-slate-400">
                        {r.divisi_nama || "Tanpa divisi"}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right">{r.hadir}</td>
                    <td className="px-3 py-2.5 text-right text-emerald-300">
                      {r.tepat}
                    </td>
                    <td className="px-3 py-2.5 text-right text-amber-300">
                      {r.terlambat}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-300">
                      {r.ketepatan}%
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-300">
                      {r.jam_rata > 0 ? `${r.jam_rata.toFixed(1)}j` : "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full rounded-full ${barColor(r.skor)}`}
                            style={{ width: `${r.skor}%` }}
                          />
                        </div>
                        <span
                          className={`w-8 text-right text-base font-bold ${skorColor(r.skor)}`}
                        >
                          {r.skor}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        onClick={() => onToggle(r)}
                        disabled={busy === r.user_id}
                        title={
                          r.hidden
                            ? "Tampilkan di peringkat"
                            : "Sembunyikan dari peringkat"
                        }
                        className="rounded-md border border-white/10 px-2 py-1 text-xs transition hover:bg-white/5 disabled:opacity-50"
                      >
                        {r.hidden ? "👁 Tampilkan" : "🚫 Sembunyikan"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
