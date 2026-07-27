"use client";

import { useCallback, useEffect, useState } from "react";

/** Kartu "Ringkasan Harian" siap-tempel: salin atau bagikan ke WhatsApp. */
export default function RingkasanHarian() {
  const [teks, setTeks] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/ringkasan", { cache: "no-store" });
      const d = await r.json();
      setTeks(typeof d.teks === "string" ? d.teks : "");
    } catch {
      setTeks("");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const salin = async () => {
    try {
      await navigator.clipboard.writeText(teks);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard bisa diblokir; abaikan */
    }
  };

  const waUrl = `https://wa.me/?text=${encodeURIComponent(teks)}`;

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/15 text-emerald-300">💬</span>
          <p className="text-sm font-semibold">Ringkasan Harian · siap kirim</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setOpen((v) => !v)} className="btn-ghost px-3 py-1.5 text-xs">
            {open ? "Sembunyikan" : "Lihat teks"}
          </button>
          <button onClick={salin} disabled={loading || !teks} className="btn-ghost px-3 py-1.5 text-xs">
            {copied ? "✓ Tersalin" : "📋 Salin"}
          </button>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={"rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 " + (loading || !teks ? "pointer-events-none opacity-50" : "")}
          >
            Bagikan ke WhatsApp
          </a>
        </div>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Rekap kehadiran, distribusi (porsi &amp; pagu), dan stok hari ini — tinggal salin ke grup.
      </p>
      {open && (
        <pre className="scroll-x mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black/20 p-3 text-xs leading-relaxed text-slate-200">
          {loading ? "Memuat…" : teks || "Belum ada data."}
        </pre>
      )}
    </div>
  );
}
