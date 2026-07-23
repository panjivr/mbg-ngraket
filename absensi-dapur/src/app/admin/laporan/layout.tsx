import NavLink from "@/components/NavLink";

export default function LaporanLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <nav className="scroll-x flex items-center gap-1 overflow-x-auto border-b border-white/5 pb-2">
        <NavLink href="/admin/laporan" label="📋 Laporan Kegiatan Harian" exact />
        <NavLink href="/admin/laporan/dokumentasi" label="📷 Dokumentasi Foto Kegiatan" />
      </nav>
      {children}
    </div>
  );
}
