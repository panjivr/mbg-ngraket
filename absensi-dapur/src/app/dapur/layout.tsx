import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
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
        <nav className="mt-3 flex items-center gap-1">
          <NavLink href="/dapur" label="Absen" exact />
          <NavLink href="/dapur/riwayat" label="Riwayat Saya" />
          <NavLink href="/dapur/profil" label="Kartu Saya" />
          {session.role === "admin" && (
            <Link
              href="/admin"
              className="ml-auto rounded-lg px-3 py-2 text-sm font-medium text-gold-400 hover:bg-white/5"
            >
              Panel Admin →
            </Link>
          )}
        </nav>
      </header>
      <BirthdayGreeting />
      {children}
    </div>
  );
}
