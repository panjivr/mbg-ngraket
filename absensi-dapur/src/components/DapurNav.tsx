"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Navigasi staf dapur yang dikelompokkan agar ringkas & responsif.
 * "Absen" tetap tombol langsung; sisanya dirapikan ke dropdown per kategori.
 * Memakai `display:contents` (root tanpa kotak) supaya tombol ikut wrap di
 * container <nav> induk — tidak ada scroll horizontal, semua terlihat di HP.
 */
type Item = { href: string; label: string };
type Group = { key: string; label: string; items: Item[] };

const GROUPS: Group[] = [
  {
    key: "kinerja",
    label: "Kinerja",
    items: [
      { href: "/dapur/peringkat", label: "Peringkat" },
      { href: "/dapur/jadwal", label: "Jadwal" },
      { href: "/dapur/sop", label: "SOP" },
    ],
  },
  {
    key: "keuangan",
    label: "Keuangan",
    items: [
      { href: "/dapur/slip", label: "Slip Gaji" },
      { href: "/dapur/finansial", label: "Finansial" },
    ],
  },
  {
    key: "pengajuan",
    label: "Pengajuan",
    items: [
      { href: "/dapur/izin", label: "Izin" },
      { href: "/dapur/pengaduan", label: "Aspirasi" },
    ],
  },
  {
    key: "saya",
    label: "Saya",
    items: [
      { href: "/dapur/riwayat", label: "Riwayat Saya" },
      { href: "/dapur/profil", label: "Kartu Saya" },
    ],
  },
];

export default function DapurNav({
  isDriver,
  gudangKeluar,
}: {
  isDriver: boolean;
  gudangKeluar: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Tutup dropdown saat klik di luar area nav.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Tutup dropdown setiap kali pindah halaman.
  useEffect(() => setOpen(null), [pathname]);

  const groups = [...GROUPS];
  const operasional: Item[] = [
    ...(isDriver ? [{ href: "/dapur/kilometer", label: "Kilometer" }] : []),
    ...(gudangKeluar ? [{ href: "/dapur/gudang", label: "Gudang" }] : []),
  ];
  if (operasional.length)
    groups.push({ key: "operasional", label: "Operasional", items: operasional });

  const itemCls = (active: boolean) =>
    "block whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition " +
    (active ? "bg-gold-500/15 text-gold-400" : "text-slate-300 hover:bg-white/5 hover:text-slate-100");

  const absenActive = pathname === "/dapur";

  return (
    <div ref={ref} className="contents">
      <Link
        href="/dapur"
        className={
          "shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition " +
          (absenActive ? "bg-gold-500/15 text-gold-400" : "text-slate-400 hover:bg-white/5 hover:text-slate-100")
        }
      >
        Absen
      </Link>

      {groups.map((g) => {
        const groupActive = g.items.some((it) => pathname.startsWith(it.href));
        const isOpen = open === g.key;
        return (
          <div key={g.key} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : g.key)}
              aria-expanded={isOpen}
              aria-label={g.label}
              className={
                "flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition " +
                (groupActive || isOpen
                  ? "bg-gold-500/15 text-gold-400"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-100")
              }
            >
              {g.label}
              <span className={"text-[10px] transition-transform " + (isOpen ? "rotate-180" : "")}>▾</span>
            </button>
            {isOpen && (
              <div className="absolute left-0 top-full z-30 mt-1 max-w-[calc(100vw-2rem)] min-w-[11rem] rounded-xl border border-white/10 bg-ink-900 p-1 shadow-xl shadow-black/40">
                {g.items.map((it) => (
                  <Link key={it.href} href={it.href} className={itemCls(pathname.startsWith(it.href))}>
                    {it.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
