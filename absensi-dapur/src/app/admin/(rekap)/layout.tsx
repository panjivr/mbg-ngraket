import NavLink from "@/components/NavLink";
import { getSession } from "@/lib/session";
import { getUserAccess } from "@/lib/user-access";

export default async function RekapLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const me = session ? await getUserAccess(session.uid) : null;
  // Perusahaan/kantor: rekap distribusi (porsi & pagu) khas dapur disembunyikan.
  const perusahaan = me?.sppg_jenis === "perusahaan";

  return (
    <div className="space-y-4">
      <nav className="scroll-x flex items-center gap-1 overflow-x-auto border-b border-white/5 pb-2">
        <NavLink href="/admin/rekap" label="Rekap Absensi" />
        <NavLink href="/admin/gaji" label="Rekap Gaji" />
        {!perusahaan && <NavLink href="/admin/distribusi-bulanan" label="Rekap Distribusi" />}
      </nav>
      {children}
    </div>
  );
}
