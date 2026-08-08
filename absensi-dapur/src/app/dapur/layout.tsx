import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { query } from "@/lib/db";
import DapurNav from "@/components/DapurNav";
import DapurBottomNav from "@/components/DapurBottomNav";
import LogoutButton from "@/components/LogoutButton";
import SettingsMenu from "@/components/SettingsMenu";
import BirthdayGreeting from "@/components/BirthdayGreeting";
import BgnLogo from "@/components/BgnLogo";

export const dynamic = "force-dynamic";

export default async function DapurLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const me = (
    await query<{ is_driver: boolean; akses_distribusi: boolean; akses_laporan: boolean; akses_keuangan: boolean; akses_gizi: boolean; akses_gudang_keluar: boolean }>(
      `SELECT is_driver, akses_distribusi, akses_laporan, akses_keuangan, akses_gizi, akses_gudang_keluar FROM users WHERE id = $1`,
      [session.uid],
    )
  )[0];
  const isDriver = !!me?.is_driver;
  const aksesDistribusi = !!me?.akses_distribusi;
  const aksesLaporan = !!me?.akses_laporan;
  const aksesKeuangan = !!me?.akses_keuangan;
  const aksesGizi = !!me?.akses_gizi;
  const gudangKeluar = !!me?.akses_gudang_keluar;

  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-4 pb-28 md:pb-12">
      <header className="sticky top-0 z-10 -mx-4 mb-6 border-b border-white/5 bg-ink-950/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BgnLogo size={38} />
            <div className="leading-tight">
              <p className="text-sm font-bold">Absensi Dapur</p>
              <p className="text-xs text-slate-400">Halo, {session.nama}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SettingsMenu />
            <LogoutButton className="btn-ghost px-3 py-1.5 text-xs" />
          </div>
        </div>
        <nav className="mt-3 hidden flex-wrap items-center gap-1 md:flex">
          <DapurNav isDriver={isDriver} gudangKeluar={gudangKeluar} />
          {session.role === "admin" ? (
            <Link href="/admin" className="ml-auto shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-gold-400 hover:bg-white/5">
              Panel Admin →
            </Link>
          ) : (
            <span className="ml-auto flex shrink-0 items-center gap-1">
              {aksesDistribusi && (
                <Link href="/admin/distribusi" className="shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-sky-300 hover:bg-white/5">
                  🚚 Distribusi →
                </Link>
              )}
              {aksesLaporan && (
                <Link href="/admin/laporan" className="shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-sky-300 hover:bg-white/5">
                  📋 Laporan →
                </Link>
              )}
              {aksesKeuangan && (
                <Link href="/admin/akuntan" className="shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-sky-300 hover:bg-white/5">
                  🧮 Akuntan →
                </Link>
              )}
              {aksesGizi && (
                <Link href="/admin/ahli-gizi" className="shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-sky-300 hover:bg-white/5">
                  🥗 Ahli Gizi →
                </Link>
              )}
            </span>
          )}
        </nav>
      </header>
      <BirthdayGreeting />
      {children}
      <DapurBottomNav
        isDriver={isDriver}
        gudangKeluar={gudangKeluar}
        role={session.role}
        aksesDistribusi={aksesDistribusi}
        aksesLaporan={aksesLaporan}
        aksesKeuangan={aksesKeuangan}
        aksesGizi={aksesGizi}
      />
    </div>
  );
}
