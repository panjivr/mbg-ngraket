"use client";

/**
 * Orkestrator Audit Dapur. Auditor memilih tanggal → sesi di-bootstrap (getSesi,
 * atau buatSesi bila belum ada) → panel-panel audit dirender dalam tab. Semua panel
 * anak menerima sesiId; RingkasanPanel menerima objek sesi penuh + callback update.
 */
import { useEffect, useState } from "react";
import { getSesi, buatSesi } from "@/lib/audit-client";
import type { AuditSesi, SesiMode } from "@/lib/audit-types";
import ObservasiPanel from "./ObservasiPanel";
import TimelinePanel from "./TimelinePanel";
import TemuanPanel from "./TemuanPanel";
import WastePanel from "./WastePanel";
import CrossCheckPanel from "./CrossCheckPanel";
import RingkasanPanel from "./RingkasanPanel";

type TabKey = "observasi" | "timeline" | "temuan" | "waste" | "cross_check" | "ringkasan";

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
      <header className="rounded-2xl border border-ink-700 bg-ink-850 p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold text-gold-300">Audit Dapur</h1>
            <p className="text-xs text-slate-500">Auditor: {auditorNama}</p>
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
        {msg && <p className="mt-2 text-xs text-red-300">{msg}</p>}
      </header>

      {loading ? (
        <p className="py-16 text-center text-sm text-slate-500">Memuat sesi…</p>
      ) : !sesi ? (
        <div className="rounded-2xl border border-dashed border-ink-700 bg-ink-850/50 p-10 text-center">
          <p className="text-sm text-slate-400">Belum ada sesi audit untuk tanggal ini.</p>
          <button
            type="button"
            onClick={mulaiSesi}
            disabled={creating}
            className="mt-4 rounded-lg bg-gold-500/15 px-5 py-2.5 text-sm font-semibold text-gold-300 ring-1 ring-gold-500/30 transition hover:bg-gold-500/25 disabled:opacity-50"
          >
            {creating ? "Membuat…" : "Mulai audit sesi ini"}
          </button>
        </div>
      ) : (
        <>
          {/* Tab navigasi */}
          <nav className="flex flex-wrap gap-1.5 rounded-xl border border-ink-700 bg-ink-850 p-1.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition " +
                  (tab === t.key ? "bg-gold-500/15 text-gold-300 ring-1 ring-gold-500/30" : "text-slate-400 hover:bg-white/5")
                }
              >
                {t.label}
              </button>
            ))}
          </nav>

          {/* Panel aktif */}
          {tab === "observasi" && <ObservasiPanel sesiId={sesi.id} />}
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
