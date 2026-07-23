"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Row {
  user_id: number;
  nama: string;
  divisi_nama: string | null;
  hadir: number;
  tepat: number;
  terlambat: number;
  ketepatan: number;
  jam_rata: number;
  skor: number;
}

interface Resp {
  from: string | null;
  to: string | null;
  me: number;
  board: Row[];
}

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

  useEffect(() => {
    let alive = true;
    fetch("/api/leaderboard", { cache: "no-store" })
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
  }, []);

  if (loading) {
    return (
      <div className="card p-4">
        <div className="h-5 w-40 animate-pulse rounded bg-white/10" />
      </div>
    );
  }

  // Belum ada periode yang dipublikasikan admin.
  if (!data || !data.from || !data.to || data.board.length === 0) {
    if (compact) return null; // jangan tampilkan kartu kosong di layar absen
    return (
      <div className="card p-6 text-center text-sm text-slate-400">
        Papan peringkat belum tersedia. Admin belum menetapkan periode.
      </div>
    );
  }

  const me = data.me;
  const full = data.board;
  const rows = compact ? full.slice(0, 5) : full;
  const myIndex = full.findIndex((r) => r.user_id === me);
  const meInList = rows.some((r) => r.user_id === me);

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 px-4 py-3">
        <div>
          <p className="text-sm font-bold">🏆 Peringkat Kinerja</p>
          <p className="text-xs text-slate-400">
            Periode {fmtTanggal(data.from)} – {fmtTanggal(data.to)}
          </p>
        </div>
        {myIndex >= 0 && (
          <span className="rounded-lg bg-gold-500/15 px-2.5 py-1 text-xs font-semibold text-gold-400">
            Peringkat kamu: #{myIndex + 1} · skor {full[myIndex].skor}
          </span>
        )}
      </div>

      <div className="scroll-x overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead className="text-left text-xs uppercase text-slate-400">
            <tr className="border-b border-white/5">
              <th className="px-3 py-2 text-center">#</th>
              <th className="px-3 py-2">Nama</th>
              {!compact && <th className="px-3 py-2 text-right">Hadir</th>}
              {!compact && <th className="px-3 py-2 text-right">Ketepatan</th>}
              {!compact && <th className="px-3 py-2 text-right">Jam/Hari</th>}
              <th className="px-3 py-2">Skor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rows.map((r, i) => (
              <BoardTr key={r.user_id} r={r} i={i} me={me} compact={compact} />
            ))}
            {/* Jika pengguna tak masuk daftar ringkas, tampilkan barisnya di bawah. */}
            {compact && !meInList && myIndex >= 0 && (
              <BoardTr
                r={full[myIndex]}
                i={myIndex}
                me={me}
                compact={compact}
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
}

function BoardTr({
  r,
  i,
  me,
  compact,
  divider,
}: {
  r: Row;
  i: number;
  me: number;
  compact: boolean;
  divider?: boolean;
}) {
  const isMe = r.user_id === me;
  const top3 = i < 3;
  return (
    <tr
      className={
        (isMe ? "bg-gold-500/15 " : top3 ? "bg-gold-400/5 " : "") +
        (divider ? "border-t-2 border-white/10" : "")
      }
    >
      <td className="px-3 py-2.5 text-center text-base">
        {top3 ? <span>{MEDALS[i]}</span> : <span className="text-slate-400">{i + 1}</span>}
      </td>
      <td className="px-3 py-2.5">
        <div className="font-medium">
          {r.nama}
          {isMe && <span className="ml-1 text-xs text-gold-400">(kamu)</span>}
        </div>
        <div className="text-xs text-slate-400">{r.divisi_nama || "Tanpa divisi"}</div>
      </td>
      {!compact && <td className="px-3 py-2.5 text-right">{r.hadir}</td>}
      {!compact && <td className="px-3 py-2.5 text-right text-slate-300">{r.ketepatan}%</td>}
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
          <span className={`w-7 text-right text-base font-bold ${skorColor(r.skor)}`}>{r.skor}</span>
        </div>
      </td>
    </tr>
  );
}
