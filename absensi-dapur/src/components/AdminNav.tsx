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
  aksesAudit: boolean;
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
  /** Sub-kelompok di dalam dropdown (untuk merapikan grup panjang). */
  section?: string;
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
    { key: "dash", label: "Dasbor", icon: "gauge", solo: { label: "Dasbor", href: "/admin", icon: "gauge", exact: true, show: f.fullAdmin } },
    {
      key: "ops",
      label: "Operasional",
      icon: "truck",
      items: [
        { label: "Distribusi", href: "/admin/distribusi", icon: "truck", section: "Distribusi & Laporan", show: f.aksesDistribusi && has("distribusi") },
        { label: "Asisten Lapangan", href: "/admin/aslap", icon: "truck", section: "Distribusi & Laporan", show: (f.fullAdmin || f.aksesDistribusi) && has("distribusi") },
        { label: "Laporan Harian", href: "/admin/laporan", icon: "clipboard", section: "Distribusi & Laporan", show: f.aksesLaporan && has("distribusi") },
        { label: "Menu", href: "/admin/menu", icon: "utensils", section: "Dapur & Menu", show: (f.aksesDistribusi && has("distribusi")) || (f.aksesGizi && has("ahli_gizi")) },
        { label: "Ahli Gizi", href: "/admin/ahli-gizi", icon: "leaf", section: "Dapur & Menu", show: (f.fullAdmin || f.aksesGizi) && has("ahli_gizi") },
        { label: "Chef Produksi", href: "/admin/chef", icon: "utensils", section: "Dapur & Menu", show: (f.fullAdmin || f.aksesGizi || f.aksesLaporan) && (has("ahli_gizi") || has("distribusi")) },
        { label: "Info Gizi Publik (QR)", href: "/admin/info-gizi", icon: "leaf", section: "Dapur & Menu", show: (f.fullAdmin || f.aksesGizi) && has("ahli_gizi") },
        { label: "Jadwal & Belanja", href: "/admin/jadwal-menu", icon: "calendar", also: ["/admin/belanja"], section: "Belanja & Stok", show: (f.aksesDistribusi && has("distribusi")) || (f.aksesGizi && has("ahli_gizi")) },
        { label: "Kebutuhan Bahan", href: "/admin/purchasing", icon: "coins", section: "Belanja & Stok", show: f.fullAdmin || f.aksesDistribusi || f.aksesGizi },
        { label: "Gudang", href: "/admin/gudang", icon: "box", section: "Belanja & Stok", show: (f.fullAdmin || f.aksesLaporan) && has("gudang") },
        { label: "Kepala Dapur", href: "/admin/kepala-dapur", icon: "clipboard", section: "Pengawasan", show: f.fullAdmin || f.aksesAudit },
        { label: "Audit Dapur", href: "/admin/audit-dapur", icon: "shield", section: "Pengawasan", show: f.fullAdmin || f.aksesAudit },
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
        { label: "Pemasok · PO & Faktur", href: "/admin/supplier", icon: "receipt", show: (f.fullAdmin || f.aksesKeuangan) && has("akuntan") },
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
        { label: "Dasbor Dapur", href: "/admin/pusat/dashboard", icon: "gauge", show: f.isSuper },
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
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);
  useEffect(() => { setOpen(null); }, [pathname]);

  const groups = buildGroups(flags);

  return (
    <nav ref={ref} aria-label="Navigasi administrasi" className="mt-3 flex flex-wrap items-center gap-1">
      {groups.map((g) => {
        // Grup solo (tautan langsung).
        if (g.solo) {
          if (!g.solo.show) return null;
          return (
            <Link key={g.key} href={g.solo.href} aria-current={isActive(pathname, g.solo) ? "page" : undefined} className={linkCls(isActive(pathname, g.solo)) + " inline-flex items-center gap-1.5"}>
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
            <Link key={g.key} href={it.href} aria-current={isActive(pathname, it) ? "page" : undefined} className={linkCls(isActive(pathname, it)) + " inline-flex items-center gap-1.5"}>
              <DapurIcon name={it.icon} className="h-[18px] w-[18px] shrink-0" />
              {it.label}
            </Link>
          );
        }
        const groupActive = vis.some((it) => isActive(pathname, it));
        const isOpen = open === g.key;
        return (
          <div key={g.key} className="static sm:relative">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : g.key)}
              className={linkCls(groupActive) + " inline-flex items-center gap-1.5"}
              aria-expanded={isOpen}
              aria-controls={`admin-nav-${g.key}`}
            >
              <DapurIcon name={g.icon} className="h-[18px] w-[18px] shrink-0" />
              {g.label}
              <ChevronIcon open={isOpen} />
            </button>
            {isOpen && (
              <div id={`admin-nav-${g.key}`} className="absolute inset-x-4 top-full z-20 mt-1 max-h-[60dvh] overflow-y-auto rounded-xl border border-white/10 bg-ink-900 p-1 shadow-xl sm:inset-x-auto sm:left-0 sm:w-64">
                {vis.map((it, i) => {
                  // Sisipkan header sub-kelompok saat section berganti (rapikan grup panjang).
                  const showHeader = it.section && it.section !== vis[i - 1]?.section;
                  return (
                    <div key={it.href}>
                      {showHeader && (
                        <p className={"px-3 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 " + (i === 0 ? "pt-1" : "mt-1 border-t border-white/5 pt-1.5")}>{it.section}</p>
                      )}
                      <Link
                        href={it.href}
                        aria-current={isActive(pathname, it) ? "page" : undefined}
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
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
