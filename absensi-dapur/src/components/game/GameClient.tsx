"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Pembungkus game "Blok Gizi" untuk aplikasi Absensi.
 *
 * Game aslinya adalah halaman HTML mandiri (canvas + vanilla JS). Agar tidak
 * perlu ditulis ulang dan tetap terisolasi, ia dimuat lewat <iframe> dari
 * /game/blok-gizi.html. Game mengirim skor ke jendela induk via postMessage
 * setiap kali rekor baru tercapai atau permainan selesai; komponen ini yang
 * menyetorkannya ke server (papan peringkat online) dan menyegarkan peringkat.
 */

interface PapanRow {
  user_id: number;
  nama: string;
  username: string;
  sppg_nama: string | null;
  skor: number;
  total_main?: number;
  peringkat: number;
}

interface Turnamen {
  id: number;
  nama: string;
  mulai: string;
  selesai: string;
  hadiah1: string;
  hadiah2: string;
  hadiah3: string;
  catatan: string;
  status: "menunggu" | "berlangsung" | "selesai";
}

interface StatSaya {
  skor_terbaik: number;
  total_main: number;
  peringkat: number | null;
}

interface Data {
  me: number;
  saya: StatSaya;
  global: PapanRow[];
  turnamenAktif: Array<Turnamen & { papan: PapanRow[] }>;
  turnamen: Turnamen[];
}

const MEDALI = ["🥇", "🥈", "🥉"];
const angka = new Intl.NumberFormat("id-ID");

function fmtWaktu(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function GameClient({
  nama,
  isSuper,
}: {
  nama: string;
  isSuper: boolean;
}) {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"global" | "turnamen">("global");
  const [tersimpan, setTersimpan] = useState<number | null>(null);
  const bestRef = useRef(0);
  const kirimTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const muat = useCallback(async () => {
    try {
      const r = await fetch("/api/game/leaderboard", { cache: "no-store" });
      const d: Data = await r.json();
      setData(d);
      if (d.saya?.skor_terbaik > bestRef.current)
        bestRef.current = d.saya.skor_terbaik;
    } catch {
      /* abaikan — coba lagi nanti */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    muat();
  }, [muat]);

  // Setor skor ke server, lalu segarkan papan peringkat.
  const setor = useCallback(
    async (skor: number, reason: "main" | "over") => {
      try {
        const r = await fetch("/api/game/skor", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skor, reason }),
        });
        if (r.ok) {
          setTersimpan(skor);
          muat();
        }
      } catch {
        /* offline — skor lokal tetap tersimpan di game */
      }
    },
    [muat],
  );

  // Terima skor dari iframe game.
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e.data;
      if (!d || d.type !== "blokgizi:score") return;
      const over = d.reason === "over";
      const skor = over ? Number(d.score) || 0 : Number(d.best) || 0;
      // Skor akhir permainan selalu disetor (untuk hitungan main & turnamen);
      // di tengah permainan hanya saat memecahkan rekor.
      if (!over && skor <= bestRef.current) return;
      if (skor > bestRef.current) bestRef.current = skor;
      if (kirimTimer.current) clearTimeout(kirimTimer.current);
      if (over) {
        setor(skor, "over");
      } else {
        // Debounce agar penambahan skor beruntun tidak membanjiri server.
        kirimTimer.current = setTimeout(() => setor(skor, "main"), 1500);
      }
    }
    window.addEventListener("message", onMsg);
    return () => {
      window.removeEventListener("message", onMsg);
      if (kirimTimer.current) clearTimeout(kirimTimer.current);
    };
  }, [setor]);

  const src = `/game/blok-gizi.html?u=${encodeURIComponent(nama)}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">🎮 Blok Gizi</h1>
          <p className="text-xs text-slate-400">
            Susun balok makanan, kumpulkan skor tertinggi — peringkatmu langsung
            tersambung dengan seluruh karyawan.
          </p>
        </div>
        {isSuper && (
          <a
            href="/admin/pusat/turnamen"
            className="btn-ghost shrink-0 px-3 py-1.5 text-xs"
          >
            ⚙️ Kelola Turnamen
          </a>
        )}
      </div>

      {/* Statistik pribadi */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Skor Terbaik" nilai={angka.format(data?.saya.skor_terbaik ?? 0)} emas />
        <Stat
          label="Peringkat"
          nilai={data?.saya.peringkat ? `#${data.saya.peringkat}` : "—"}
        />
        <Stat label="Total Main" nilai={angka.format(data?.saya.total_main ?? 0)} />
      </div>

      {tersimpan != null && (
        <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-center text-xs text-emerald-300">
          ✓ Skor {angka.format(tersimpan)} tersimpan ke papan peringkat online.
        </p>
      )}

      {/* Game */}
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-ink-950 shadow-xl">
        <iframe
          src={src}
          title="Blok Gizi"
          className="block h-[760px] w-full max-h-[85dvh] border-0"
          allow="fullscreen"
        />
      </div>

      {/* Papan peringkat */}
      <div className="card overflow-hidden p-0">
        <div className="flex border-b border-white/10">
          <TabBtn aktif={tab === "global"} onClick={() => setTab("global")}>
            🌐 Peringkat Global
          </TabBtn>
          <TabBtn aktif={tab === "turnamen"} onClick={() => setTab("turnamen")}>
            🏆 Turnamen
            {data && data.turnamenAktif.length > 0 && (
              <span className="ml-1.5 rounded-full bg-gold-500/20 px-1.5 text-[10px] text-gold-300">
                {data.turnamenAktif.length}
              </span>
            )}
          </TabBtn>
        </div>

        <div className="p-4">
          {loading ? (
            <p className="py-6 text-center text-sm text-slate-500">Memuat…</p>
          ) : tab === "global" ? (
            <PapanGlobal rows={data?.global ?? []} me={data?.me ?? 0} />
          ) : (
            <PanelTurnamen
              aktif={data?.turnamenAktif ?? []}
              semua={data?.turnamen ?? []}
              me={data?.me ?? 0}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  nilai,
  emas,
}: {
  label: string;
  nilai: string;
  emas?: boolean;
}) {
  return (
    <div className="card flex flex-col items-center gap-1 p-3 text-center">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span
        className={
          "text-xl font-black tabular-nums " + (emas ? "text-gold-400" : "text-slate-100")
        }
      >
        {nilai}
      </span>
    </div>
  );
}

function TabBtn({
  aktif,
  onClick,
  children,
}: {
  aktif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "flex-1 px-3 py-3 text-sm font-semibold transition " +
        (aktif
          ? "border-b-2 border-gold-400 text-gold-400"
          : "text-slate-400 hover:text-slate-200")
      }
    >
      {children}
    </button>
  );
}

function BarisPeringkat({
  row,
  me,
}: {
  row: PapanRow;
  me: number;
}) {
  const mine = row.user_id === me;
  return (
    <div
      className={
        "flex items-center gap-3 rounded-xl px-3 py-2.5 " +
        (mine ? "bg-gold-500/15 ring-1 ring-gold-500/30" : "odd:bg-white/[0.03]")
      }
    >
      <span className="w-8 shrink-0 text-center text-sm font-bold tabular-nums">
        {row.peringkat <= 3 ? MEDALI[row.peringkat - 1] : row.peringkat}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-100">
          {row.nama}
          {mine && <span className="ml-1.5 text-[10px] text-gold-300">(kamu)</span>}
        </p>
        <p className="truncate text-[11px] text-slate-500">
          @{row.username}
          {row.sppg_nama ? ` · ${row.sppg_nama}` : ""}
        </p>
      </div>
      <span className="shrink-0 text-right text-sm font-black tabular-nums text-gold-400">
        {angka.format(row.skor)}
      </span>
    </div>
  );
}

function PapanGlobal({ rows, me }: { rows: PapanRow[]; me: number }) {
  if (!rows.length)
    return (
      <p className="py-6 text-center text-sm text-slate-500">
        Belum ada skor. Jadilah yang pertama di papan peringkat! 🚀
      </p>
    );
  return (
    <div className="space-y-1">
      {rows.map((r) => (
        <BarisPeringkat key={r.user_id} row={r} me={me} />
      ))}
    </div>
  );
}

function PanelTurnamen({
  aktif,
  semua,
  me,
}: {
  aktif: Array<Turnamen & { papan: PapanRow[] }>;
  semua: Turnamen[];
  me: number;
}) {
  const mendatang = semua.filter((t) => t.status === "menunggu");
  const selesai = semua.filter((t) => t.status === "selesai").slice(0, 5);

  return (
    <div className="space-y-5">
      {aktif.length === 0 && mendatang.length === 0 && selesai.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-500">
          Belum ada turnamen. Nantikan turnamen berhadiah dari admin pusat! 🎁
        </p>
      )}

      {aktif.map((t) => (
        <div key={t.id} className="rounded-xl border border-gold-500/30 bg-gold-500/[0.06] p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-gold-300">{t.nama}</p>
              <p className="text-[11px] text-slate-400">
                Berlangsung · sampai {fmtWaktu(t.selesai)}
              </p>
            </div>
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
              LIVE
            </span>
          </div>
          <Hadiah t={t} />
          {t.catatan && (
            <p className="mt-2 rounded-lg bg-black/20 px-2.5 py-1.5 text-[11px] text-slate-300">
              {t.catatan}
            </p>
          )}
          <div className="mt-3 space-y-1">
            {t.papan.length ? (
              t.papan.slice(0, 10).map((r) => <BarisPeringkat key={r.user_id} row={r} me={me} />)
            ) : (
              <p className="py-3 text-center text-xs text-slate-500">
                Belum ada peserta. Main sekarang untuk memimpin!
              </p>
            )}
          </div>
        </div>
      ))}

      {mendatang.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            🔜 Akan Datang
          </p>
          <div className="space-y-2">
            {mendatang.map((t) => (
              <div key={t.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-sm font-bold text-slate-100">{t.nama}</p>
                <p className="text-[11px] text-slate-400">
                  {fmtWaktu(t.mulai)} — {fmtWaktu(t.selesai)}
                </p>
                <Hadiah t={t} />
              </div>
            ))}
          </div>
        </div>
      )}

      {selesai.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            ✅ Selesai
          </p>
          <div className="space-y-2">
            {selesai.map((t) => (
              <div key={t.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3 opacity-80">
                <p className="text-sm font-semibold text-slate-200">{t.nama}</p>
                <p className="text-[11px] text-slate-500">Selesai {fmtWaktu(t.selesai)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Hadiah({ t }: { t: Turnamen }) {
  const hadiah = [t.hadiah1, t.hadiah2, t.hadiah3];
  if (!hadiah.some(Boolean)) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {hadiah.map((h, i) =>
        h ? (
          <span
            key={i}
            className="rounded-lg bg-black/25 px-2 py-1 text-[11px] text-slate-200"
          >
            {MEDALI[i]} {h}
          </span>
        ) : null,
      )}
    </div>
  );
}
