import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { query } from "@/lib/db";
import NavLink from "@/components/NavLink";
import LogoutButton from "@/components/LogoutButton";
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
    await query<{ is_driver: boolean; akses_distribusi: boolean; akses_laporan: boolean; akses_gudang_keluar: boolean }>(
      `SELECT is_driver, akses_distribusi, akses_laporan, akses_gudang_keluar FROM users WHERE id = $1`,
      [session.uid],
    )
  )[0];
  const isDriver = !!me?.is_driver;
  const aksesDistribusi = !!me?.akses_distribusi;
  const aksesLaporan = !!me?.akses_laporan;
  const gudangKeluar = !!me?.akses_gudang_keluar;

  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-4 pb-12">
      <header className="sticky top-0 z-10 -mx-4 mb-6 border-b border-white/5 bg-ink-950/80 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BgnLogo size={38} />
            <div className="leading-tight">
              <p className="text-sm font-bold">Absensi Dapur</p>
              <p className="text-xs text-slate-400">Halo, {session.nama}</p>
            </div>
          </div>
          <LogoutButton className="btn-ghost px-3 py-1.5 text-xs" />
        </div>
        <nav className="scroll-x mt-3 flex items-center gap-1 overflow-x-auto">
          <NavLink href="/dapur" label="Absen" exact />
          <NavLink href="/dapur/peringkat" label="🏆 Peringkat" />
          <NavLink href="/dapur/jadwal" label="🗓️ Jadwal" />
          <NavLink href="/dapur/izin" label="📝 Izin" />
          <NavLink href="/dapur/slip" label="🧾 Slip Gaji" />
          <NavLink href="/dapur/riwayat" label="Riwayat Saya" />
          <NavLink href="/dapur/sop" label="📋 SOP" />
          <NavLink href="/dapur/profil" label="Kartu Saya" />
          {isDriver && <NavLink href="/dapur/kilometer" label="🚗 Kilometer" />}
          {gudangKeluar && <NavLink href="/dapur/gudang" label="🗄️ Kartu Stok" />}
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
            </span>
          )}
        </nav>
      </header>
      <BirthdayGreeting />
      {children}
    </div>
  );
}
