"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

/**
 * Floating bottom navigation untuk staf dapur — hanya mobile (md:hidden).
 * Pola: pill mengambang, aksi utama "Absen" terangkat di tengah, tombol
 * "Menu" membuka bottom sheet berisi seluruh menu lain. Ikon SVG (bukan emoji)
 * agar tampil profesional & konsisten di semua platform. Hormati safe-area.
 */

type IconProps = { className?: string };

function Icon({ path, className }: { path: ReactNode } & IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}

const PinIcon = (p: IconProps) => (
  <Icon
    {...p}
    path={
      <>
        <path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    }
  />
);
const TrophyIcon = (p: IconProps) => (
  <Icon
    {...p}
    path={
      <>
        <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z" />
        <path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
      </>
    }
  />
);
const ReceiptIcon = (p: IconProps) => (
  <Icon
    {...p}
    path={
      <>
        <path d="M5 3v18l2-1.2L9 21l2-1.2L13 21l2-1.2L17 21l2-1.2V3l-2 1.2L15 3l-2 1.2L11 3 9 4.2 7 3 5 4.2 5 3z" />
        <path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4" />
      </>
    }
  />
);
const HistoryIcon = (p: IconProps) => (
  <Icon
    {...p}
    path={
      <>
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
        <path d="M3 4v4h4M12 8v4l3 2" />
      </>
    }
  />
);
const MenuIcon = (p: IconProps) => (
  <Icon
    {...p}
    path={
      <>
        <rect x="4" y="4" width="6.5" height="6.5" rx="1.6" />
        <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" />
        <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" />
        <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" />
      </>
    }
  />
);

type Tab = { href: string; label: string; Icon: (p: IconProps) => ReactNode };

const LEFT: Tab[] = [
  { href: "/dapur/peringkat", label: "Peringkat", Icon: TrophyIcon },
  { href: "/dapur/slip", label: "Slip", Icon: ReceiptIcon },
];
const RIGHT: Tab[] = [
  { href: "/dapur/riwayat", label: "Riwayat", Icon: HistoryIcon },
];

type SheetLink = { href: string; label: string };
type SheetGroup = { title: string; links: SheetLink[] };

export default function DapurBottomNav({
  isDriver,
  gudangKeluar,
  role,
  aksesDistribusi,
  aksesLaporan,
  aksesKeuangan,
  aksesGizi,
}: {
  isDriver: boolean;
  gudangKeluar: boolean;
  role: string;
  aksesDistribusi: boolean;
  aksesLaporan: boolean;
  aksesKeuangan: boolean;
  aksesGizi: boolean;
}) {
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Tutup sheet tiap pindah halaman.
  useEffect(() => setSheetOpen(false), [pathname]);

  // Kunci scroll body saat sheet terbuka.
  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sheetOpen]);

  const absenActive = pathname === "/dapur";

  const groups: SheetGroup[] = [
    { title: "🏆 Kinerja", links: [
      { href: "/dapur/peringkat", label: "🏆 Peringkat" },
      { href: "/dapur/jadwal", label: "🗓️ Jadwal" },
      { href: "/dapur/sop", label: "📋 SOP" },
    ] },
    { title: "💰 Keuangan", links: [
      { href: "/dapur/slip", label: "🧾 Slip Gaji" },
      { href: "/dapur/finansial", label: "💰 Finansial" },
    ] },
    { title: "📝 Pengajuan", links: [
      { href: "/dapur/izin", label: "📝 Izin" },
      { href: "/dapur/pengaduan", label: "📮 Aspirasi" },
    ] },
    { title: "👤 Saya", links: [
      { href: "/dapur/riwayat", label: "🕘 Riwayat Saya" },
      { href: "/dapur/profil", label: "🪪 Kartu Saya" },
    ] },
  ];
  const operasional: SheetLink[] = [
    ...(isDriver ? [{ href: "/dapur/kilometer", label: "🚗 Kilometer" }] : []),
    ...(gudangKeluar ? [{ href: "/dapur/gudang", label: "🗄️ Gudang" }] : []),
  ];
  if (operasional.length) groups.push({ title: "🛠️ Operasional", links: operasional });
  const pintasan: SheetLink[] =
    role === "admin"
      ? [{ href: "/admin", label: "🛡️ Panel Admin" }]
      : [
          ...(aksesDistribusi ? [{ href: "/admin/distribusi", label: "🚚 Distribusi" }] : []),
          ...(aksesLaporan ? [{ href: "/admin/laporan", label: "📋 Laporan" }] : []),
          ...(aksesKeuangan ? [{ href: "/admin/akuntan", label: "🧮 Akuntan" }] : []),
          ...(aksesGizi ? [{ href: "/admin/ahli-gizi", label: "🥗 Ahli Gizi" }] : []),
        ];
  if (pintasan.length) groups.push({ title: "🔗 Pintasan", links: pintasan });

  const tabCls = (active: boolean) =>
    "flex min-w-[3.25rem] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-medium transition-colors " +
    (active ? "text-gold-400" : "text-slate-400 hover:text-slate-200");

  const renderTab = (t: Tab) => {
    const active = pathname.startsWith(t.href);
    return (
      <Link key={t.href} href={t.href} className={tabCls(active)} aria-current={active ? "page" : undefined}>
        <t.Icon className="h-[22px] w-[22px]" />
        <span>{t.label}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Bilah mengambang — mobile saja */}
      <nav
        aria-label="Navigasi utama"
        className="fixed inset-x-0 bottom-0 z-40 px-4 md:hidden"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex max-w-md items-end justify-between gap-1 rounded-[1.65rem] border border-white/10 bg-ink-900/85 px-3 py-2 shadow-[0_12px_32px_-10px_rgba(0,0,0,0.6)] backdrop-blur-lg">
          {LEFT.map(renderTab)}

          {/* Aksi utama: Absen (terangkat di tengah) */}
          <Link
            href="/dapur"
            aria-label="Absen"
            aria-current={absenActive ? "page" : undefined}
            className="relative -mt-7 flex flex-col items-center gap-1"
          >
            <span
              className={
                "grid h-14 w-14 place-items-center rounded-full text-white ring-4 ring-ink-950 transition-transform active:scale-95 " +
                (absenActive
                  ? "bg-gradient-to-br from-gold-400 to-ember-400 shadow-[0_10px_24px_-6px_rgba(52,100,230,0.85)]"
                  : "bg-gradient-to-br from-gold-500 to-gold-400 shadow-[0_8px_20px_-8px_rgba(52,100,230,0.7)]")
              }
            >
              <PinIcon className="h-6 w-6" />
            </span>
            <span className={"text-[10px] font-semibold " + (absenActive ? "text-gold-400" : "text-slate-300")}>
              Absen
            </span>
          </Link>

          {RIGHT.map(renderTab)}

          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            aria-label="Menu lainnya"
            aria-expanded={sheetOpen}
            className={tabCls(false) + " cursor-pointer"}
          >
            <MenuIcon className="h-[22px] w-[22px]" />
            <span>Menu</span>
          </button>
        </div>
      </nav>

      {/* Bottom sheet: seluruh menu lain */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu lainnya">
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setSheetOpen(false)}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
          />
          <div
            className="absolute inset-x-0 bottom-0 max-h-[80dvh] overflow-y-auto rounded-t-3xl border-t border-white/10 bg-ink-900 px-5 pt-3 shadow-2xl"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
          >
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-white/20" />
            <div className="space-y-5">
              {groups.map((g) => (
                <div key={g.title}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{g.title}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {g.links.map((l) => {
                      const active = pathname.startsWith(l.href);
                      return (
                        <Link
                          key={l.href}
                          href={l.href}
                          className={
                            "rounded-xl border px-3 py-3 text-sm font-medium transition-colors " +
                            (active
                              ? "border-gold-500/40 bg-gold-500/15 text-gold-400"
                              : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10")
                          }
                        >
                          {l.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
