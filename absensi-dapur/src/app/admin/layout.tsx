import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { query } from "@/lib/db";
import NavLink from "@/components/NavLink";
import LogoutButton from "@/components/LogoutButton";
import BirthdayGreeting from "@/components/BirthdayGreeting";
import BgnLogo from "@/components/BgnLogo";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const me = (
    await query<{ is_super: boolean; sppg_nama: string | null; akses_distribusi: boolean; akses_laporan: boolean }>(
      `SELECT u.is_super, u.akses_distribusi, u.akses_laporan, s.nama AS sppg_nama
         FROM users u LEFT JOIN sppg s ON s.id = u.sppg_id
        WHERE u.id = $1`,
      [session.uid],
    )
  )[0];
  const fullAdmin = session.role === "admin";
  const aksesDistribusi = fullAdmin || !!me?.akses_distribusi;
  const aksesLaporan = fullAdmin || !!me?.akses_laporan;
  // Sub-admin scoped harus punya minimal satu akses; selain itu tolak.
  if (!fullAdmin && !aksesDistribusi && !aksesLaporan) redirect("/dapur");
  const isSuper = fullAdmin && !!me?.is_super;
  const dapurNama = me?.sppg_nama || "Dapur";

  return (
    <div className="mx-auto min-h-dvh max-w-6xl px-4 pb-12">
      <header className="sticky top-0 z-10 -mx-4 mb-6 border-b border-white/5 bg-ink-950/80 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BgnLogo size={38} />
            <div className="leading-tight">
              <p className="text-sm font-bold">Panel {fullAdmin ? "Admin" : "Sub-Admin"} · {dapurNama}</p>
              <p className="text-xs text-slate-400">
                {session.nama}
                {isSuper && (
                  <span className="ml-1.5 rounded bg-emas-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emas-300">
                    Super Admin
                  </span>
                )}
                {!fullAdmin && (
                  <span className="ml-1.5 rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300">
                    {aksesDistribusi ? "Admin Distribusi" : "Admin Penerimaan"}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dapur" className="btn-ghost px-3 py-1.5 text-xs">
              Mode Absen
            </Link>
            <LogoutButton className="btn-ghost px-3 py-1.5 text-xs" />
          </div>
        </div>
        <nav className="scroll-x mt-3 flex items-center gap-1 overflow-x-auto">
          {fullAdmin && <NavLink href="/admin" label="Dashboard" exact />}
          {fullAdmin && <NavLink href="/admin/rekap" label="Rekap Absensi" />}
          {fullAdmin && <NavLink href="/admin/leaderboard" label="🏆 Leaderboard" />}
          {fullAdmin && <NavLink href="/admin/gaji" label="Rekap Gaji" />}
          {fullAdmin && <NavLink href="/admin/pegawai" label="Pegawai" />}
          {fullAdmin && <NavLink href="/admin/divisi" label="Divisi" />}
          {fullAdmin && <NavLink href="/admin/event" label="Event" />}
          {fullAdmin && <NavLink href="/admin/sop" label="📋 SOP" />}
          {aksesDistribusi && <NavLink href="/admin/distribusi" label="🚚 Distribusi" />}
          {aksesLaporan && <NavLink href="/admin/laporan" label="📋 Laporan Harian" />}
          {fullAdmin && <NavLink href="/admin/gudang" label="📦 Gudang" />}
          {fullAdmin && <NavLink href="/admin/pengaturan" label="Pengaturan" />}
          {isSuper && <NavLink href="/admin/pusat" label="🌐 Semua Dapur" />}
          {isSuper && <NavLink href="/admin/sppg" label="🏢 Kelola Dapur" />}
        </nav>
      </header>
      <BirthdayGreeting />
      {children}
    </div>
  );
}
