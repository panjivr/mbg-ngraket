"use client";

/**
 * Navigasi admin yang dikelompokkan (dropdown) supaya rapi & profesional.
 * Server layout menghitung flag akses lalu meneruskannya ke sini. Grup dengan
 * satu item tampil sebagai tautan langsung; grup dengan >1 item jadi dropdown.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface Flags {
  fullAdmin: boolean;
  aksesDistribusi: boolean;
  aksesLaporan: boolean;
  isHr: boolean;
  isSuper: boolean;
  /** Fitur yang dibuka paket langganan dapur ini. */
  fitur: string[];
}
interface Item {
  label: string;
  href: string;
  also?: string[];
  exact?: boolean;
  show: boolean;
}
interface Group {
  key: string;
  label: string;
  /** Item tunggal (tautan langsung, tanpa dropdown). */
  solo?: Item;
  items?: Item[];
}

function buildGroups(f: Flags): Group[] {
  const has = (k: string) => f.fitur.includes(k);
  return [
    { key: "dash", label: "Dashboard", solo: { label: "Dashboard", href: "/admin", exact: true, show: f.fullAdmin } },
    {
      key: "ops",
      label: "Operasional",
      items: [
        { label: "🚚 Distribusi", href: "/admin/distribusi", show: f.aksesDistribusi && has("distribusi") },
        { label: "🍱 Menu", href: "/admin/menu", show: f.aksesDistribusi && has("distribusi") },
        { label: "📅 Jadwal & Belanja", href: "/admin/jadwal-menu", also: ["/admin/belanja"], show: f.aksesDistribusi && has("distribusi") },
        { label: "📋 Laporan Harian", href: "/admin/laporan", show: f.aksesLaporan && has("distribusi") },
        { label: "🥗 Ahli Gizi", href: "/admin/ahli-gizi", show: f.fullAdmin && has("ahli_gizi") },
        { label: "📦 Gudang", href: "/admin/gudang", show: (f.fullAdmin || f.aksesLaporan) && has("gudang") },
      ],
    },
    {
      key: "peg",
      label: "Kepegawaian",
      items: [
        { label: "👥 Pegawai", href: "/admin/pegawai", also: ["/admin/divisi", "/admin/leaderboard", "/admin/event", "/admin/sop", "/admin/jadwal", "/admin/izin", "/admin/pengumuman"], show: f.fullAdmin && has("pegawai") },
        { label: "📊 Statistik", href: "/admin/statistik", show: f.fullAdmin && has("pegawai") },
        { label: "🧾 HR / Gaji", href: "/admin/hr", show: f.isHr && has("hr") },
      ],
    },
    {
      key: "keu",
      label: "Keuangan",
      items: [
        { label: "📊 Rekap", href: "/admin/rekap", also: ["/admin/gaji", "/admin/slip"], show: f.fullAdmin },
        { label: "🧮 Akuntan", href: "/admin/akuntan", show: f.fullAdmin && has("akuntan") },
      ],
    },
    {
      key: "sys",
      label: "Sistem",
      items: [
        { label: "🧾 Aktivitas", href: "/admin/audit", show: f.fullAdmin },
        { label: "⚙️ Pengaturan", href: "/admin/pengaturan", show: f.fullAdmin },
      ],
    },
    {
      key: "pusat",
      label: "Semua Dapur",
      items: [
        { label: "📊 Dashboard Dapur", href: "/admin/pusat/dashboard", show: f.isSuper },
        { label: "🗓️ Rekap Absensi", href: "/admin/pusat", exact: true, show: f.isSuper },
        { label: "🏢 Kelola Dapur", href: "/admin/sppg", show: f.isSuper },
      ],
    },
  ];
}

function isActive(pathname: string, it: Item): boolean {
  if (it.exact) return pathname === it.href;
  if (pathname === it.href || pathname.startsWith(it.href + "/")) return true;
  return it.also?.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p)) ?? false;
}

const linkCls = (active: boolean) =>
  "shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition " +
  (active ? "bg-gold-500/15 text-gold-400" : "text-slate-400 hover:bg-white/5 hover:text-slate-100");

export default function AdminNav(flags: Flags) {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);
  useEffect(() => { setOpen(null); }, [pathname]);

  const groups = buildGroups(flags);

  return (
    <nav ref={ref} className="mt-3 flex flex-wrap items-center gap-1">
      {groups.map((g) => {
        // Grup solo (tautan langsung).
        if (g.solo) {
          if (!g.solo.show) return null;
          return (
            <Link key={g.key} href={g.solo.href} className={linkCls(isActive(pathname, g.solo))}>
              {g.solo.label}
            </Link>
          );
        }
        const vis = (g.items || []).filter((it) => it.show);
        if (vis.length === 0) return null;
        // Satu item → tautan langsung, tanpa dropdown.
        if (vis.length === 1) {
          const it = vis[0];
          return (
            <Link key={g.key} href={it.href} className={linkCls(isActive(pathname, it))}>
              {it.label}
            </Link>
          );
        }
        const groupActive = vis.some((it) => isActive(pathname, it));
        const isOpen = open === g.key;
        return (
          <div key={g.key} className="relative">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : g.key)}
              className={linkCls(groupActive) + " inline-flex items-center gap-1"}
            >
              {g.label}
              <span className={"text-[10px] transition-transform " + (isOpen ? "rotate-180" : "")}>▾</span>
            </button>
            {isOpen && (
              <div className="absolute left-0 top-full z-20 mt-1 min-w-[200px] rounded-xl border border-white/10 bg-ink-900 p-1 shadow-xl">
                {vis.map((it) => (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={() => setOpen(null)}
                    className={
                      "block rounded-lg px-3 py-2 text-sm transition " +
                      (isActive(pathname, it) ? "bg-gold-500/15 text-gold-400" : "text-slate-300 hover:bg-white/5 hover:text-slate-100")
                    }
                  >
                    {it.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
