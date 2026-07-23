"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { BoardRow } from "@/lib/leaderboard";
import SkorRincian from "@/components/SkorRincian";

interface LeaderboardResponse {
  from: string;
  to: string;
  board: BoardRow[];
  op_days: number;
  periode: { from: string | null; to: string | null };
}

function jakartaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}
function dow(iso: string): number {
  return parseISO(iso).getDay();
}
// Minggu (awal pekan) dari sebuah tanggal.
function sundayOf(iso: string): string {
  return addDays(iso, -dow(iso));
}
function fmtTgl(iso: string): string {
  return parseISO(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

  // Periode papan yang dipublikasikan ke karyawan.
  const [pFrom, setPFrom] = useState("");
  const [pTo, setPTo] = useState("");
  const [savedP, setSavedP] = useState<{ from: string | null; to: string | null }>({
    from: null,
    to: null,
  });
  const [savingP, setSavingP] = useState(false);
  const pInit = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/leaderboard?from=${from}&to=${to}`, {
        cache: "no-store",
      });
      const data: LeaderboardResponse = await res.json();
      setBoard(data.board || []);
      setOpDays(data.op_days || 0);
      if (data.periode) {
        setSavedP(data.periode);
        // Prefill input periode sekali saja agar edit admin tidak tertimpa.
        if (!pInit.current) {
          pInit.current = true;
          setPFrom(data.periode.from || "");
          setPTo(data.periode.to || "");
        }
      }
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  // Set Mulai (disnap ke Minggu) & otomatis isi Selesai = +13 hari (Sabtu pekan ke-2).
  const setMulai = useCallback((iso: string) => {
    if (!iso) {
      setPFrom("");
      return;
    }
    const minggu = sundayOf(iso);
    setPFrom(minggu);
    setPTo(addDays(minggu, 13));
  }, []);

  const periodeBerjalan = useCallback(() => {
    setMulai(jakartaToday());
  }, [setMulai]);

  const simpanPeriode = useCallback(
    async (clear = false) => {
      setSavingP(true);
      try {
        const body = clear ? { from: "", to: "" } : { from: pFrom, to: pTo };
        const res = await fetch("/api/admin/leaderboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          alert(data?.error || "Gagal menyimpan periode.");
          return;
        }
        setSavedP({ from: data.from, to: data.to });
        if (clear) {
          setPFrom("");
          setPTo("");
        }
      } finally {
        setSavingP(false);
      }
    },
    [pFrom, pTo],
  );

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

      {/* Periode yang dipublikasikan ke karyawan (papan di layar absen). */}
      <div className="card space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-200">
            📢 Periode yang ditampilkan ke karyawan
          </p>
          {savedP.from && savedP.to ? (
            <span className="rounded-lg bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
              Aktif: {fmtTgl(savedP.from)} – {fmtTgl(savedP.to)}
            </span>
          ) : (
            <span className="rounded-lg bg-white/5 px-2.5 py-1 text-xs text-slate-400">
              Belum ditampilkan
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400">
          Satu periode = 2 minggu (Minggu–Sabtu pekan ke-2). Pilih tanggal Mulai
          (otomatis disnap ke hari Minggu); Selesai terisi otomatis +13 hari.
          Ganti kapan saja saat pindah periode.
        </p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label">Mulai (Minggu)</label>
            <input
              type="date"
              className="input"
              value={pFrom}
              onChange={(e) => setMulai(e.target.value)}
            />
            {pFrom && (
              <p className="mt-1 text-[11px] text-slate-500">{HARI[dow(pFrom)]}</p>
            )}
          </div>
          <div>
            <label className="label">Selesai (Sabtu)</label>
            <input
              type="date"
              className="input"
              value={pTo}
              min={pFrom}
              onChange={(e) => setPTo(e.target.value)}
            />
            {pTo && (
              <p className="mt-1 text-[11px] text-slate-500">{HARI[dow(pTo)]}</p>
            )}
          </div>
          <button onClick={periodeBerjalan} type="button" className="btn-ghost">
            Periode Berjalan
          </button>
          <button
            onClick={() => simpanPeriode(false)}
            type="button"
            className="btn-primary"
            disabled={savingP || !pFrom || !pTo}
          >
            {savingP ? "Menyimpan…" : "Simpan & Tampilkan"}
          </button>
          {savedP.from && (
            <button
              onClick={() => simpanPeriode(true)}
              type="button"
              className="btn-ghost text-rose-300"
              disabled={savingP}
            >
              Kosongkan
            </button>
          )}
        </div>
      </div>

      <div className="card flex flex-wrap items-end gap-3 p-4">
        <p className="w-full text-xs font-medium text-slate-400">
          🔎 Lihat data (khusus admin — tidak memengaruhi papan karyawan)
        </p>
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
          Skor Kinerja (0–100, presisi 1 desimal) — jumlah poin dari tiga
          penilaian berbasis rasio, jadi adil untuk beda jumlah hari kerja:
        </p>
        <ul className="ml-4 list-disc space-y-0.5">
          <li>
            <b className="text-slate-300">Ketepatan Waktu — 55 poin</b>: tepat
            waktu ÷ hadir.
          </li>
          <li>
            <b className="text-slate-300">Keaktifan — 25 poin</b>: hadir ÷ hari
            operasional dapur (maks 100%).
          </li>
          <li>
            <b className="text-slate-300">Kelengkapan Presensi — 20 poin</b>:
            hari lengkap sampai clock-out ÷ hadir.
          </li>
        </ul>
        <p className="pt-1">
          Klik baris untuk melihat <b className="text-slate-300">rincian angka
          &amp; persen tiap komponen</b> — poinnya selalu dijumlahkan persis
          sama dengan skor, jadi transparan dan tidak ada yang perlu iri.
          Pegawai berjadwal khusus (keamanan/admin) bisa disembunyikan lewat
          tombol 🚫 agar perbandingan setara.
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
  const [open, setOpen] = useState<Set<number>>(new Set());
  const toggleOpen = (id: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="card overflow-hidden">
      {ranked && (
        <div className="border-b border-white/5 px-4 py-3 text-sm text-slate-400">
          {rows.length} pegawai dinilai · klik baris untuk rincian
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
          <table className="w-full min-w-[860px] text-sm">
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
                const isOpen = open.has(r.user_id);
                return (
                  <Fragment key={r.user_id}>
                    <tr
                      onClick={() => toggleOpen(r.user_id)}
                      className={
                        "cursor-pointer transition hover:bg-white/[0.03] " +
                        (top3 ? "bg-gold-400/10" : "")
                      }
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
                        <div className="flex items-center gap-1.5 font-medium">
                          <span className="text-[10px] text-slate-500">
                            {isOpen ? "▾" : "▸"}
                          </span>
                          {r.nama}
                        </div>
                        <div className="pl-3.5 text-xs text-slate-400">
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
                        {r.ketepatan.pct}%
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
                            className={`w-10 text-right text-base font-bold ${skorColor(r.skor)}`}
                          >
                            {r.skor.toFixed(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggle(r);
                          }}
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
                    {isOpen && (
                      <tr className="bg-ink-900/40">
                        <td colSpan={9} className="px-4 py-3">
                          <SkorRincian r={r} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
