"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type NotifLevel = "danger" | "warning" | "info";
interface Notif {
  id: string;
  level: NotifLevel;
  icon: string;
  judul: string;
  detail: string;
  href: string;
}

const STYLE: Record<NotifLevel, { dot: string; ring: string }> = {
  danger: { dot: "bg-red-400", ring: "hover:border-red-400/40" },
  warning: { dot: "bg-amber-400", ring: "hover:border-amber-400/40" },
  info: { dot: "bg-sky-400", ring: "hover:border-sky-400/40" },
};

/** Lonceng notifikasi di header admin: pengingat operasional harian. */
export default function NotifBell() {
  const [items, setItems] = useState<Notif[]>([]);
  const [perluAksi, setPerluAksi] = useState(0);
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/notifikasi", { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      setItems(Array.isArray(d.notif) ? d.notif : []);
      setPerluAksi(d.perluAksi ?? 0);
    } catch {
      /* diamkan — jaringan sesekali gagal */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  // Tutup saat klik di luar.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const badge = perluAksi > 0 ? perluAksi : items.length;

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-300 hover:bg-white/5"
        title="Notifikasi & pengingat"
        aria-label="Notifikasi"
      >
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {loaded && badge > 0 && (
          <span className={"absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold text-ink-950 " + (perluAksi > 0 ? "bg-red-400" : "bg-sky-400")}>
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-white/10 bg-ink-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/5 px-3 py-2.5">
            <p className="text-sm font-semibold">Notifikasi</p>
            <button onClick={load} className="text-xs text-slate-400 hover:text-slate-200">Segarkan</button>
          </div>
          <div className="scroll-x max-h-[60vh] overflow-y-auto">
            {!loaded ? (
              <p className="px-3 py-6 text-center text-sm text-slate-500">Memuat…</p>
            ) : items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-slate-500">🎉 Semua beres. Tidak ada pengingat.</p>
            ) : (
              items.map((n) => (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className={"flex items-start gap-2.5 border-b border-white/5 border-l-2 px-3 py-2.5 last:border-b-0 hover:bg-white/[0.03] " +
                    (n.level === "danger" ? "border-l-red-400" : n.level === "warning" ? "border-l-amber-400" : "border-l-sky-400")}
                >
                  <span className="mt-0.5 text-base leading-none">{n.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className={"h-1.5 w-1.5 shrink-0 rounded-full " + STYLE[n.level].dot} />
                      <span className="text-sm font-medium">{n.judul}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-400">{n.detail}</span>
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
