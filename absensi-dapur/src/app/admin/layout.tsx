import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { query } from "@/lib/db";
import AdminNav from "@/components/AdminNav";
import CommandPalette from "@/components/CommandPalette";
import CommandPaletteTrigger from "@/components/CommandPaletteTrigger";
import PaketGuard from "@/components/PaketGuard";
import LogoutButton from "@/components/LogoutButton";
import BirthdayGreeting from "@/components/BirthdayGreeting";
import BgnLogo from "@/components/BgnLogo";
import NotifBell from "@/components/NotifBell";
import SettingsMenu from "@/components/SettingsMenu";
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
    await query<{ is_super: boolean; sppg_nama: string | null; akses_distribusi: boolean; akses_laporan: boolean; akses_keuangan: boolean; akses_gizi: boolean; akses_audit: boolean; is_hr: boolean; paket: string | null; paket_until: string | null }>(
      `SELECT u.is_super, u.akses_distribusi, u.akses_laporan, u.akses_keuangan, u.akses_gizi, u.akses_audit, u.is_hr, s.nama AS sppg_nama, s.paket, s.paket_until
         FROM users u LEFT JOIN sppg s ON s.id = u.sppg_id
        WHERE u.id = $1`,
      [session.uid],
    )
  )[0];
  const fullAdmin = session.role === "admin";
  const aksesDistribusi = fullAdmin || !!me?.akses_distribusi;
  const aksesLaporan = fullAdmin || !!me?.akses_laporan;
  const aksesKeuangan = fullAdmin || !!me?.akses_keuangan;
  const aksesGizi = fullAdmin || !!me?.akses_gizi;
  const aksesAudit = fullAdmin || !!me?.akses_audit;
  const isHr = !!me?.is_hr;
  // Sub-admin/HR scoped harus punya minimal satu akses; selain itu tolak.
  if (!fullAdmin && !aksesDistribusi && !aksesLaporan && !aksesKeuangan && !aksesGizi && !aksesAudit && !isHr) redirect("/dapur");
  const isSuper = fullAdmin && !!me?.is_super;
  const dapurNama = me?.sppg_nama || "Dapur";
  // Paket langganan → fitur aktif. Super admin (pemilik) selalu penuh.
  const paket = paketEfektif(me?.paket, me?.paket_until);
  const paketExp = paketExpired(me?.paket_until);
  const fitur: string[] = isSuper ? SEMUA_FITUR : fiturAktif(paket);

  return (
    <div className="mx-auto min-h-dvh w-full max-w-[1920px] px-4 pb-12 sm:px-6 lg:px-8 xl:px-10">
      <header className="sticky top-0 z-10 -mx-4 mb-6 border-b border-white/10 bg-ink-950/85 px-4 py-3 shadow-appbar backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 xl:-mx-10 xl:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <BgnLogo size={38} />
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-tight">Panel {fullAdmin ? "Admin" : "Sub-Admin"} · {dapurNama}</p>
              <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                <span className="font-medium text-slate-300">{session.nama}</span>
                {isSuper && (
                  <span className="rounded-md bg-emas-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emas-300 ring-1 ring-inset ring-emas-500/25">
                    Super Admin
                  </span>
                )}
                {!fullAdmin && (
                  <span className="rounded-md bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-300 ring-1 ring-inset ring-sky-500/25">
                    {me?.akses_distribusi
                      ? "Admin Distribusi"
                      : me?.akses_laporan
                        ? "Admin Penerimaan"
                        : me?.akses_keuangan
                          ? "Admin Keuangan"
                          : me?.akses_gizi
                            ? "Admin Gizi"
                            : me?.akses_audit
                              ? "Auditor QC"
                              : "HR"}
                  </span>
                )}
                <span
                  className={
                    "rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset " +
                    (paketExp
                      ? "bg-amber-500/15 text-amber-300 ring-amber-500/25"
                      : "bg-white/[0.06] text-slate-300 ring-white/10")
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
            <CommandPaletteTrigger />
            <SettingsMenu />
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
          aksesKeuangan={aksesKeuangan}
          aksesGizi={aksesGizi}
          aksesAudit={aksesAudit}
          isHr={isHr}
          isSuper={isSuper}
          fitur={fitur}
        />
      </header>
      <CommandPalette
        fullAdmin={fullAdmin}
        aksesDistribusi={aksesDistribusi}
        aksesLaporan={aksesLaporan}
        aksesKeuangan={aksesKeuangan}
        aksesGizi={aksesGizi}
        aksesAudit={aksesAudit}
        isHr={isHr}
        isSuper={isSuper}
        fitur={fitur}
      />
      <BirthdayGreeting />
      <PaketGuard fitur={fitur} />
      {paketExp && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-4 w-4 shrink-0">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          <span>Masa aktif langganan dapur ini sudah berakhir — sebagian fitur terkunci sampai diperpanjang.</span>
        </div>
      )}
      {children}
    </div>
  );
}
