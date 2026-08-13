"use client";

/**
 * Orkestrator Audit Dapur. Auditor memilih tanggal → sesi di-bootstrap (getSesi,
 * atau buatSesi bila belum ada) → panel-panel audit dirender dalam tab. Semua panel
 * anak menerima sesiId; RingkasanPanel menerima objek sesi penuh + callback update.
 */
import { useEffect, useState, type ReactNode } from "react";
import { getSesi, buatSesi } from "@/lib/audit-client";
import type { AuditSesi, SesiMode, AuditObservasi } from "@/lib/audit-types";
import ObservasiPanel from "./ObservasiPanel";
import TimelinePanel from "./TimelinePanel";
import TemuanPanel from "./TemuanPanel";
import WastePanel from "./WastePanel";
import CrossCheckPanel from "./CrossCheckPanel";
import RingkasanPanel from "./RingkasanPanel";

type TabKey = "observasi" | "timeline" | "temuan" | "waste" | "cross_check" | "ringkasan";

function Ico({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {children}
    </svg>
  );
}
const TAB_ICON: Record<TabKey, ReactNode> = {
  observasi: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1M8.5 12l2 2 4-4" /></>,
  timeline: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  temuan: <><path d="M12 3 2.5 20h19L12 3z" /><path d="M12 10v4M12 17v.01" /></>,
  waste: <><path d="M4 7h16M9 7V5h6v2M6.5 7l1 13h9l1-13" /></>,
  cross_check: <><path d="M4 7h9M4 7l2.5-2.5M4 7l2.5 2.5M20 17h-9M20 17l-2.5-2.5M20 17l-2.5 2.5" /></>,
  ringkasan: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
};

const TABS: { key: TabKey; label: string }[] = [
  { key: "observasi", label: "Observasi" },
  { key: "timeline", label: "Timeline" },
  { key: "temuan", label: "Temuan" },
  { key: "waste", label: "Food Waste" },
  { key: "cross_check", label: "Cross-check" },
  { key: "ringkasan", label: "Ringkasan" },
];

const MODE: { key: SesiMode; label: string }[] = [
  { key: "lapangan", label: "Lapangan" },
  { key: "dokumen", label: "Dokumen" },
];

/** Tanggal hari ini dalam format YYYY-MM-DD (zona lokal). */
function hariIni(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

export default function AuditWorkspace({ auditorNama }: { auditorNama: string }) {
  const [tanggal, setTanggal] = useState(hariIni());
  const [mode, setMode] = useState<SesiMode>("lapangan");
  const [sesi, setSesi] = useState<AuditSesi | null>(null);
  const [initObs, setInitObs] = useState<AuditObservasi[] | undefined>(undefined);
  const [tab, setTab] = useState<TabKey>("observasi");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setMsg(null);
    getSesi(tanggal)
      .then((r) => {
        if (!alive) return;
        setSesi(r.sesi);
        setInitObs(r.observasi);
        if (r.sesi) setMode(r.sesi.mode);
      })
      .catch((e) => alive && setMsg(e.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [tanggal]);

  async function mulaiSesi() {
    setCreating(true);
    setMsg(null);
    try {
      const r = await buatSesi({ tanggal, mode });
      setSesi(r.sesi);
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header: identitas + pemilih tanggal */}
      <header className="relative overflow-hidden rounded-2xl border border-ink-700 bg-gradient-to-br from-ink-850 to-ink-900 p-4 shadow-soft sm:p-5">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emas-500 via-gold-500 to-ember-400" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full opacity-30 blur-2xl" style={{ background: "radial-gradient(circle, rgba(224,169,46,0.35), transparent 70%)" }} />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-emas-500/25 to-gold-500/15 text-emas-300 ring-1 ring-inset ring-emas-500/30">
              <Ico className="h-6 w-6"><path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3z" /><path d="M9 12l2 2 4-4" /></Ico>
            </span>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-100">Audit Mutu Dapur</h1>
              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                <span className="text-slate-300">Auditor · {auditorNama}</span>
                {sesi && (
                  <span
                    className={
                      "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset " +
                      (sesi.dikirim_at
                        ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30"
                        : "bg-amber-500/15 text-amber-300 ring-amber-500/30")
                    }
                  >
                    {sesi.dikirim_at ? "Terkirim" : "Draf"}
                  </span>
                )}
                <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300 ring-1 ring-inset ring-white/10">
                  {sesi ? (sesi.mode === "dokumen" ? "Mode Dokumen" : "Mode Lapangan") : "Sesi baru"}
                </span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-400">Tanggal audit</span>
              <input
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-slate-100 focus:border-gold-500/40 focus:outline-none"
              />
            </label>
            {!sesi && (
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-400">Mode</span>
                <div className="flex gap-1">
                  {MODE.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setMode(m.key)}
                      className={
                        "rounded-md px-3 py-2 text-sm font-medium ring-1 ring-inset transition " +
                        (mode === m.key
                          ? "bg-gold-500/20 text-gold-300 ring-gold-500/40"
                          : "text-slate-400 ring-white/10 hover:bg-white/5")
                      }
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </label>
            )}
          </div>
        </div>
        {msg && <p className="relative mt-2 text-xs text-red-300">{msg}</p>}
      </header>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <div className="hidden space-y-2 lg:block">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-2xl bg-white/5" />
        </div>
      ) : !sesi ? (
        <div className="rounded-2xl border border-dashed border-ink-700 bg-ink-850/50 p-10 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gold-500/10 text-gold-300 ring-1 ring-inset ring-gold-500/20">
            <Ico className="h-7 w-7"><path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3z" /><path d="M9 12l2 2 4-4" /></Ico>
          </span>
          <p className="mt-4 text-sm font-medium text-slate-200">Belum ada sesi audit untuk tanggal ini</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500">Mulai sesi untuk mengisi observasi 10 area, timeline proses, temuan, food waste, dan cross-check bahan.</p>
          <button
            type="button"
            onClick={mulaiSesi}
            disabled={creating}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-gold-500/15 px-5 py-2.5 text-sm font-semibold text-gold-300 ring-1 ring-gold-500/30 transition hover:bg-gold-500/25 disabled:opacity-50"
          >
            {creating ? "Membuat…" : "Mulai audit sesi ini"}
          </button>
        </div>
      ) : (
        <>
          {/* Tab navigasi */}
          <nav className="scroll-x flex gap-1 overflow-x-auto rounded-xl border border-ink-700 bg-ink-850 p-1.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition " +
                  (tab === t.key
                    ? "bg-gold-500/15 text-gold-300 ring-1 ring-inset ring-gold-500/30"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200")
                }
              >
                <Ico className="h-4 w-4">{TAB_ICON[t.key]}</Ico>
                {t.label}
              </button>
            ))}
          </nav>

          {/* Panel aktif */}
          {tab === "observasi" && <ObservasiPanel key={sesi.id} sesiId={sesi.id} initial={initObs} />}
          {tab === "timeline" && <TimelinePanel sesiId={sesi.id} />}
          {tab === "temuan" && <TemuanPanel sesiId={sesi.id} />}
          {tab === "waste" && <WastePanel sesiId={sesi.id} />}
          {tab === "cross_check" && <CrossCheckPanel sesiId={sesi.id} />}
          {tab === "ringkasan" && <RingkasanPanel sesi={sesi} onUpdated={setSesi} />}
        </>
      )}
    </div>
  );
}
