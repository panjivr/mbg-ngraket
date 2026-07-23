import NavLink from "@/components/NavLink";

export default function KelolaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <nav className="scroll-x flex items-center gap-1 overflow-x-auto border-b border-white/5 pb-2">
        <NavLink href="/admin/pegawai" label="👤 Data Pegawai" />
        <NavLink href="/admin/divisi" label="Divisi" />
        <NavLink href="/admin/leaderboard" label="🏆 Leaderboard" />
        <NavLink href="/admin/event" label="Event" />
        <NavLink href="/admin/sop" label="📋 SOP" />
      </nav>
      {children}
    </div>
  );
}
