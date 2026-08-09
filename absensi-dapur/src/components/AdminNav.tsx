"use client";

/**
 * Navigasi admin yang dikelompokkan (dropdown) supaya rapi & profesional.
 * Server layout menghitung flag akses lalu meneruskannya ke sini. Grup dengan
 * satu item tampil sebagai tautan langsung; grup dengan >1 item jadi dropdown.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import DapurIcon, { type IconName } from "@/components/DapurIcons";

interface Flags {
  fullAdmin: boolean;
  aksesDistribusi: boolean;
  aksesLaporan: boolean;
  aksesKeuangan: boolean;
  aksesGizi: boolean;
  isHr: boolean;
  isSuper: boolean;
  /** Fitur yang dibuka paket langganan dapur ini. */
  fitur: string[];
}
interface Item {
  label: string;
  href: string;
  icon: IconName;
  also?: string[];
  exact?: boolean;
  show: boolean;
}
interface Group {
  key: string;
  label: string;
  /** Ikon grup (dipakai pada tombol dropdown). */
  icon: IconName;
  /** Item tunggal (tautan langsung, tanpa dropdown). */
  solo?: Item;
  items?: Item[];
}

function buildGroups(f: Flags): Group[] {
  const has = (k: string) => f.fitur.includes(k);
  return [
    { key: "dash", label: "Dashboard", icon: "gauge", solo: { label: "Dashboard", href: "/admin", icon: "gauge", exact: true, show: f.fullAdmin } },
    {
      key: "ops",
      label: "Operasional",
      icon: "truck",
      items: [
        { label: "Distribusi", href: "/admin/distribusi", icon: "truck", show: f.aksesDistribusi && has("distribusi") },
        { label: "Menu", href: "/admin/menu", icon: "utensils", show: (f.aksesDistribusi && has("distribusi")) || (f.aksesGizi && has("ahli_gizi")) },
        { label: "Jadwal & Belanja", href: "/admin/jadwal-menu", icon: "calendar", also: ["/admin/belanja"], show: (f.aksesDistribusi && has("distribusi")) || (f.aksesGizi && has("ahli_gizi")) },
        { label: "Laporan Harian", href: "/admin/laporan", icon: "clipboard", show: f.aksesLaporan && has("distribusi") },
        { label: "Ahli Gizi", href: "/admin/ahli-gizi", icon: "leaf", show: (f.fullAdmin || f.aksesGizi) && has("ahli_gizi") },
        { label: "Gudang", href: "/admin/gudang", icon: "box", show: (f.fullAdmin || f.aksesLaporan) && has("gudang") },
      ],
    },
    {
      key: "peg",
      label: "Kepegawaian",
      icon: "users",
      items: [
        { label: "Pegawai", href: "/admin/pegawai", icon: "users", also: ["/admin/divisi", "/admin/leaderboard", "/admin/event", "/admin/sop", "/admin/jadwal", "/admin/izin", "/admin/pengumuman"], show: f.fullAdmin && has("pegawai") },
        { label: "Statistik", href: "/admin/statistik", icon: "chart", show: f.fullAdmin && has("pegawai") },
        { label: "HR / Gaji", href: "/admin/hr", icon: "receipt", show: f.isHr && has("hr") },
      ],
    },
    {
      key: "keu",
      label: "Keuangan",
      icon: "coins",
      items: [
        { label: "Rekap", href: "/admin/rekap", icon: "wallet", also: ["/admin/gaji", "/admin/slip"], show: f.fullAdmin },
        { label: "Akuntan", href: "/admin/akuntan", icon: "coins", show: (f.fullAdmin || f.aksesKeuangan) && has("akuntan") },
      ],
    },
    {
      key: "sys",
      label: "Sistem",
      icon: "settings",
      items: [
        { label: "Aktivitas", href: "/admin/audit", icon: "history", show: f.fullAdmin },
        { label: "Pengaturan", href: "/admin/pengaturan", icon: "settings", show: f.fullAdmin },
      ],
    },
    {
      key: "pusat",
      label: "Semua Dapur",
      icon: "building",
      items: [
        { label: "Dashboard Dapur", href: "/admin/pusat/dashboard", icon: "gauge", show: f.isSuper },
        { label: "Rekap Absensi", href: "/admin/pusat", icon: "calendar", exact: true, show: f.isSuper },
        { label: "Kelola Dapur", href: "/admin/sppg", icon: "building", show: f.isSuper },
      ],
    },
  ];
}

function isActive(pathname: string, it: Item): boolean {
  if (it.exact) return pathname === it.href;
  if (pathname === it.href || pathname.startsWith(it.href + "/")) return true;
  return it.also?.some((p) => pathname === p || pathname.startsWith(p + "/")) ?? false;
}

const linkCls = (active: boolean) =>
  "shrink-0 cursor-pointer whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition " +
  "focus-visible:outline-none " +
  (active ? "bg-gold-500/15 text-gold-400" : "text-slate-400 hover:bg-white/5 hover:text-slate-100");

// Ikon chevron SVG (bukan glyph teks) agar konsisten dengan set ikon lain &
// tajam di semua platform. Berputar 180° saat dropdown terbuka.
const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={"h-3.5 w-3.5 transition-transform duration-200 " + (open ? "rotate-180" : "")}
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

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
            <Link key={g.key} href={g.solo.href} className={linkCls(isActive(pathname, g.solo)) + " inline-flex items-center gap-1.5"}>
              <DapurIcon name={g.solo.icon} className="h-[18px] w-[18px] shrink-0" />
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
            <Link key={g.key} href={it.href} className={linkCls(isActive(pathname, it)) + " inline-flex items-center gap-1.5"}>
              <DapurIcon name={it.icon} className="h-[18px] w-[18px] shrink-0" />
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
              className={linkCls(groupActive) + " inline-flex items-center gap-1.5"}
              aria-expanded={isOpen}
              aria-haspopup="menu"
            >
              <DapurIcon name={g.icon} className="h-[18px] w-[18px] shrink-0" />
              {g.label}
              <ChevronIcon open={isOpen} />
            </button>
            {isOpen && (
              <div role="menu" className="absolute left-0 top-full z-20 mt-1 min-w-[200px] rounded-xl border border-white/10 bg-ink-900 p-1 shadow-xl">
                {vis.map((it) => (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={() => setOpen(null)}
                    className={
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition " +
                      (isActive(pathname, it) ? "bg-gold-500/15 text-gold-400" : "text-slate-300 hover:bg-white/5 hover:text-slate-100")
                    }
                  >
                    <DapurIcon
                      name={it.icon}
                      className={"h-[18px] w-[18px] shrink-0 " + (isActive(pathname, it) ? "text-gold-400" : "text-slate-400")}
                    />
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
