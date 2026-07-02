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
  if (session.role !== "admin") redirect("/dapur");

  const me = (
    await query<{ is_super: boolean; sppg_nama: string | null }>(
      `SELECT u.is_super, s.nama AS sppg_nama
         FROM users u LEFT JOIN sppg s ON s.id = u.sppg_id
        WHERE u.id = $1`,
      [session.uid],
    )
  )[0];
  const isSuper = !!me?.is_super;
  const dapurNama = me?.sppg_nama || "Dapur";

  return (
    <div className="mx-auto min-h-dvh max-w-6xl px-4 pb-12">
      <header className="sticky top-0 z-10 -mx-4 mb-6 border-b border-white/5 bg-ink-950/80 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BgnLogo size={38} />
            <div className="leading-tight">
              <p className="text-sm font-bold">Panel Admin · {dapurNama}</p>
              <p className="text-xs text-slate-400">
                {session.nama}
                {isSuper && (
                  <span className="ml-1.5 rounded bg-emas-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emas-300">
                    Super Admin
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
          <NavLink href="/admin" label="Dashboard" exact />
          <NavLink href="/admin/rekap" label="Rekap Absensi" />
          <NavLink href="/admin/gaji" label="Rekap Gaji" />
          <NavLink href="/admin/pegawai" label="Pegawai" />
          <NavLink href="/admin/divisi" label="Divisi" />
          <NavLink href="/admin/event" label="Event" />
          <NavLink href="/admin/pengaturan" label="Pengaturan" />
          {isSuper && <NavLink href="/admin/pusat" label="🌐 Semua Dapur" />}
          {isSuper && <NavLink href="/admin/sppg" label="🏢 Kelola Dapur" />}
        </nav>
      </header>
      <BirthdayGreeting />
      {children}
    </div>
  );
}
