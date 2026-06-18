import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import NavLink from "@/components/NavLink";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "admin") redirect("/dapur");

  return (
    <div className="mx-auto min-h-dvh max-w-6xl px-4 pb-12">
      <header className="sticky top-0 z-10 -mx-4 mb-6 border-b border-white/5 bg-ink-950/80 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-emas-500 text-[11px] font-black tracking-tight text-ink-950">
              MBG
            </span>
            <div className="leading-tight">
              <p className="text-sm font-bold">Panel Admin · Absensi Dapur</p>
              <p className="text-xs text-slate-400">{session.nama}</p>
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
          <NavLink href="/admin/pegawai" label="Pegawai" />
          <NavLink href="/admin/divisi" label="Divisi" />
          <NavLink href="/admin/pengaturan" label="Pengaturan" />
        </nav>
      </header>
      {children}
    </div>
  );
}
