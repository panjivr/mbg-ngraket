import NavLink from "@/components/NavLink";

export default function RekapLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <nav className="scroll-x flex items-center gap-1 overflow-x-auto border-b border-white/5 pb-2">
        <NavLink href="/admin/rekap" label="🗓️ Rekap Absensi" />
        <NavLink href="/admin/gaji" label="💰 Rekap Gaji" />
        <NavLink href="/admin/slip" label="🧾 Slip Gaji" />
      </nav>
      {children}
    </div>
  );
}
