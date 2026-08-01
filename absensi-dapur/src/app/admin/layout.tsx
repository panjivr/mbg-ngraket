import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { query } from "@/lib/db";
import AdminNav from "@/components/AdminNav";
import PaketGuard from "@/components/PaketGuard";
import LogoutButton from "@/components/LogoutButton";
import BirthdayGreeting from "@/components/BirthdayGreeting";
import BgnLogo from "@/components/BgnLogo";
import NotifBell from "@/components/NotifBell";
import { paketEfektif, paketExpired, fiturAktif, SEMUA_FITUR, PAKET_LABEL } from "@/lib/paket";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const me = (
    await query<{ is_super: boolean; sppg_nama: string | null; akses_distribusi: boolean; akses_laporan: boolean; is_hr: boolean; paket: string | null; paket_until: string | null }>(
      `SELECT u.is_super, u.akses_distribusi, u.akses_laporan, u.is_hr, s.nama AS sppg_nama, s.paket, s.paket_until
         FROM users u LEFT JOIN sppg s ON s.id = u.sppg_id
        WHERE u.id = $1`,
      [session.uid],
    )
  )[0];
  const fullAdmin = session.role === "admin";
  const aksesDistribusi = fullAdmin || !!me?.akses_distribusi;
  const aksesLaporan = fullAdmin || !!me?.akses_laporan;
  const isHr = !!me?.is_hr;
  // Sub-admin/HR scoped harus punya minimal satu akses; selain itu tolak.
  if (!fullAdmin && !aksesDistribusi && !aksesLaporan && !isHr) redirect("/dapur");
  const isSuper = fullAdmin && !!me?.is_super;
  const dapurNama = me?.sppg_nama || "Dapur";
  // Paket langganan → fitur aktif. Super admin (pemilik) selalu penuh.
  const paket = paketEfektif(me?.paket, me?.paket_until);
  const paketExp = paketExpired(me?.paket_until);
  const fitur: string[] = isSuper ? SEMUA_FITUR : fiturAktif(paket);

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
                    {me?.akses_distribusi
                      ? "Admin Distribusi"
                      : me?.akses_laporan
                        ? "Admin Penerimaan"
                        : "HR"}
                  </span>
                )}
                <span
                  className={
                    "ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-semibold " +
                    (paketExp ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-slate-300")
                  }
                  title={paketExp ? "Masa aktif langganan berakhir" : "Paket langganan"}
                >
                  {PAKET_LABEL[paket]}
                  {paketExp ? " · berakhir" : ""}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotifBell />
            <Link href="/dapur" className="btn-ghost px-3 py-1.5 text-xs">
              Mode Absen
            </Link>
            <LogoutButton className="btn-ghost px-3 py-1.5 text-xs" />
          </div>
        </div>
        <AdminNav
          fullAdmin={fullAdmin}
          aksesDistribusi={aksesDistribusi}
          aksesLaporan={aksesLaporan}
          isHr={isHr}
          isSuper={isSuper}
          fitur={fitur}
        />
      </header>
      <BirthdayGreeting />
      <PaketGuard fitur={fitur} />
      {paketExp && (
        <div className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          ⏳ Masa aktif langganan dapur ini sudah berakhir — sebagian fitur terkunci sampai diperpanjang.
        </div>
      )}
      {children}
    </div>
  );
}
