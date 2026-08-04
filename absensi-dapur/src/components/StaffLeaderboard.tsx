"use client";

import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import type { BoardRow } from "@/lib/leaderboard";
import SkorRincian from "@/components/SkorRincian";

interface Resp {
  from: string | null;
  to: string | null;
  me: number;
  myDapur?: string | null;
  board: BoardRow[];
}

type Scope = "lokal" | "global";

const MEDALS = ["🥇", "🥈", "🥉"];

function fmtTanggal(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function barColor(s: number): string {
  if (s >= 85) return "bg-emerald-400";
  if (s >= 70) return "bg-gold-400";
  if (s >= 50) return "bg-amber-400";
  return "bg-rose-400";
}
function skorColor(s: number): string {
  if (s >= 85) return "text-emerald-300";
  if (s >= 70) return "text-gold-400";
  if (s >= 50) return "text-amber-300";
  return "text-rose-300";
}

export default function StaffLeaderboard({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [scope, setScope] = useState<Scope>("lokal");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    const url =
      scope === "global" ? "/api/leaderboard/global" : "/api/leaderboard";
    fetch(url, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: Resp) => {
        if (alive) setData(d);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [scope]);

  const toggleOpen = (id: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const isGlobal = scope === "global";

  // Toggle Lokal/Global — hanya di papan lengkap (bukan ringkasan layar absen).
  const tabs = !compact && (
    <div className="flex gap-2">
      {(["lokal", "global"] as const).map((s) => (
        <button
          key={s}
          onClick={() => setScope(s)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${
            scope === s
              ? "border-gold-400/60 bg-gold-400/10 text-gold-300"
              : "border-white/10 text-slate-300"
          }`}
        >
          {s === "lokal" ? "🏠 Dapur ini" : "🌐 Global"}
        </button>
      ))}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-3">
        {tabs}
        <div className="card p-4">
          <div className="h-5 w-40 animate-pulse rounded bg-white/10" />
        </div>
      </div>
    );
  }

  // Papan kosong: lokal butuh periode terpublikasi; global butuh minimal 1 baris.
  const noData = isGlobal
    ? !data || data.board.length === 0
    : !data || !data.from || !data.to || data.board.length === 0;
  if (noData) {
    if (compact) return null; // jangan tampilkan kartu kosong di layar absen
    return (
      <div className="space-y-3">
        {tabs}
        <div className="card p-6 text-center text-sm text-slate-400">
          {isGlobal
            ? "Papan global belum tersedia. Belum ada dapur yang menetapkan periode."
            : "Papan peringkat belum tersedia. Admin belum menetapkan periode."}
        </div>
      </div>
    );
  }

  const me = data!.me;
  const myDapur = data!.myDapur ?? null;
  const isMeRow = (r: BoardRow): boolean =>
    r.user_id === me && (!isGlobal || r.dapur === myDapur);
  const full = data!.board;
  const rows = compact ? full.slice(0, 5) : full;
  const myIndex = full.findIndex(isMeRow);
  const meInList = rows.some(isMeRow);
  const colSpan = compact ? 3 : isGlobal ? 7 : 6;
  const rowKey = (r: BoardRow): string => `${r.dapur ?? ""}#${r.user_id}`;

  const board = (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 px-4 py-3">
        <div>
          <p className="text-sm font-bold">
            {isGlobal ? "🌐 Peringkat Global" : "🏆 Peringkat Kinerja"}
          </p>
          <p className="text-xs text-slate-400">
            {isGlobal
              ? "Gabungan semua dapur yang telah menetapkan periode"
              : `Periode ${fmtTanggal(data!.from!)} – ${fmtTanggal(data!.to!)}`}
          </p>
        </div>
        {myIndex >= 0 && (
          <span className="rounded-lg bg-gold-500/15 px-2.5 py-1 text-xs font-semibold text-gold-400">
            Peringkat kamu: #{myIndex + 1} · skor {full[myIndex].skor.toFixed(1)}
          </span>
        )}
      </div>

      <div className="scroll-x overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead className="text-left text-xs uppercase text-slate-400">
            <tr className="border-b border-white/5">
              <th className="px-3 py-2 text-center">#</th>
              <th className="px-3 py-2">Nama</th>
              {!compact && isGlobal && <th className="px-3 py-2">Dapur</th>}
              {!compact && <th className="px-3 py-2 text-right">Hadir</th>}
              {!compact && <th className="px-3 py-2 text-right">Ketepatan</th>}
              {!compact && <th className="px-3 py-2 text-right">Jam/Hari</th>}
              <th className="px-3 py-2">Skor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((r, i) => (
              <BoardTr
                key={rowKey(r)}
                r={r}
                i={i}
                isMe={isMeRow(r)}
                compact={compact}
                showDapur={isGlobal}
                colSpan={colSpan}
                isOpen={open.has(r.user_id)}
                onToggle={() => toggleOpen(r.user_id)}
              />
            ))}
            {/* Jika pengguna tak masuk daftar ringkas, tampilkan barisnya di bawah. */}
            {compact && !meInList && myIndex >= 0 && (
              <BoardTr
                r={full[myIndex]}
                i={myIndex}
                isMe
                compact={compact}
                showDapur={isGlobal}
                colSpan={colSpan}
                isOpen={open.has(full[myIndex].user_id)}
                onToggle={() => toggleOpen(full[myIndex].user_id)}
                divider
              />
            )}
          </tbody>
        </table>
      </div>

      {compact && full.length > rows.length && (
        <Link
          href="/dapur/peringkat"
          className="block border-t border-white/5 px-4 py-2.5 text-center text-xs font-medium text-gold-400 hover:bg-white/5"
        >
          Lihat papan lengkap ({full.length} pegawai) →
        </Link>
      )}
    </div>
  );

  if (compact) return board;
  return (
    <div className="space-y-3">
      {tabs}
      {myIndex >= 0 && (
        <MyScoreCard r={full[myIndex]} rank={myIndex + 1} total={full.length} />
      )}
      <StatStrip board={full} />
      {board}
    </div>
  );
}

/** Ringkasan statistik papan: jumlah peserta, rata-rata & skor tertinggi. */
function StatStrip({ board }: { board: BoardRow[] }) {
  const aktif = board.filter((r) => r.hadir > 0);
  const n = aktif.length;
  const avg = n > 0 ? aktif.reduce((s, r) => s + r.skor, 0) / n : 0;
  const top = board[0]?.skor ?? 0;
  const avgHadir =
    n > 0
      ? aktif.reduce((s, r) => s + (r.op_days > 0 ? r.hadir / r.op_days : 0), 0) /
        n
      : 0;
  const Cell = ({ label, value, tone }: { label: string; value: string; tone: string }) => (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2.5 text-center">
      <p className={`text-lg font-bold ${tone}`}>{value}</p>
      <p className="text-[11px] text-slate-400">{label}</p>
    </div>
  );
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Cell label="Peserta" value={String(board.length)} tone="text-slate-100" />
      <Cell label="Rata-rata skor" value={avg.toFixed(1)} tone={skorColor(avg)} />
      <Cell label="Skor tertinggi" value={top.toFixed(1)} tone={skorColor(top)} />
      <Cell label="Rata kehadiran" value={`${Math.round(avgHadir * 100)}%`} tone="text-slate-100" />
    </div>
  );
}

/** Kartu skor pribadi: posisi, skor, rincian 3 komponen, & saran perbaikan. */
function MyScoreCard({ r, rank, total }: { r: BoardRow; rank: number; total: number }) {
  const komp = [
    { label: "Ketepatan waktu", bobot: 55, k: r.ketepatan, tip: "datang lebih tepat waktu" },
    { label: "Keaktifan hadir", bobot: 25, k: r.keaktifan, tip: "kurangi bolos di hari kerja" },
    { label: "Kelengkapan presensi", bobot: 20, k: r.kelengkapan, tip: "jangan lupa clock-out" },
  ];
  // Saran: komponen dengan capaian persen terendah (yang paling menahan skor).
  const weakest = [...komp].sort((a, b) => a.k.pct - b.k.pct)[0];
  const belumSempurna = weakest.k.pct < 100;
  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs text-slate-400">Kinerja kamu periode ini</p>
          <p className="text-sm font-semibold text-slate-100">
            Peringkat <span className={skorColor(r.skor)}>#{rank}</span>
            <span className="text-slate-500"> dari {total}</span>
          </p>
        </div>
        <div className="text-right">
          <p className={`text-3xl font-extrabold leading-none ${skorColor(r.skor)}`}>
            {r.skor.toFixed(1)}
          </p>
          <p className="text-[11px] text-slate-400">dari 100</p>
        </div>
      </div>

      <div className="space-y-2">
        {komp.map((c) => (
          <div key={c.label}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300">
                {c.label} <span className="text-slate-500">(maks {c.bobot})</span>
              </span>
              <span className="text-slate-400">
                <b className="text-slate-200">{c.k.pct}%</b> ·{" "}
                <b className="text-gold-400">{c.k.poin} poin</b>
              </span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <div className={`h-full rounded-full ${barColor(c.k.pct)}`} style={{ width: `${c.k.pct}%` }} />
            </div>
          </div>
        ))}
      </div>

      {belumSempurna ? (
        <p className="rounded-lg bg-gold-500/10 px-3 py-2 text-xs text-gold-200">
          💡 Ingin naik peringkat? Fokus <b>{weakest.tip}</b> — komponen{" "}
          <b>{weakest.label.toLowerCase()}</b> masih {weakest.k.pct}%.
        </p>
      ) : (
        <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          🎉 Semua komponen sempurna. Pertahankan kedisiplinanmu!
        </p>
      )}
    </div>
  );
}

function BoardTr({
  r,
  i,
  isMe,
  compact,
  showDapur,
  colSpan,
  isOpen,
  onToggle,
  divider,
}: {
  r: BoardRow;
  i: number;
  isMe: boolean;
  compact: boolean;
  showDapur: boolean;
  colSpan: number;
  isOpen: boolean;
  onToggle: () => void;
  divider?: boolean;
}) {
  const top3 = i < 3;
  return (
    <Fragment>
      <tr
        onClick={onToggle}
        className={
          "cursor-pointer transition hover:bg-white/[0.03] " +
          (isMe ? "bg-gold-500/15 " : top3 ? "bg-gold-400/5 " : "") +
          (divider ? "border-t-2 border-white/10" : "")
        }
      >
        <td className="px-3 py-2.5 text-center text-base">
          {top3 ? <span>{MEDALS[i]}</span> : <span className="text-slate-400">{i + 1}</span>}
        </td>
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="text-[10px] text-slate-500">{isOpen ? "▾" : "▸"}</span>
            {r.nama}
            {isMe && <span className="text-xs text-gold-400">(kamu)</span>}
          </div>
          <div className="pl-3.5 text-xs text-slate-400">{r.divisi_nama || "Tanpa divisi"}</div>
        </td>
        {!compact && showDapur && (
          <td className="px-3 py-2.5 text-xs text-slate-300">{r.dapur || "—"}</td>
        )}
        {!compact && <td className="px-3 py-2.5 text-right">{r.hadir}</td>}
        {!compact && <td className="px-3 py-2.5 text-right text-slate-300">{r.ketepatan.pct}%</td>}
        {!compact && (
          <td className="px-3 py-2.5 text-right text-slate-300">
            {r.jam_rata > 0 ? `${r.jam_rata.toFixed(1)}j` : "—"}
          </td>
        )}
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-14 shrink-0 overflow-hidden rounded-full bg-white/10">
              <div className={`h-full rounded-full ${barColor(r.skor)}`} style={{ width: `${r.skor}%` }} />
            </div>
            <span className={`w-9 text-right text-base font-bold ${skorColor(r.skor)}`}>
              {r.skor.toFixed(1)}
            </span>
          </div>
        </td>
      </tr>
      {isOpen && (
        <tr className="bg-ink-900/40">
          <td colSpan={colSpan} className="px-4 py-3">
            <SkorRincian r={r} />
          </td>
        </tr>
      )}
    </Fragment>
  );
}
