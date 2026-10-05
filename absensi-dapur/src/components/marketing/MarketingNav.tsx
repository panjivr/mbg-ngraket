"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
export default function MarketingNav() {
  const pathname = usePathname();
  return <div className="mk-nav-links" aria-label="Topik website">{[['/fitur','Fitur'],['/solusi/absensi-sppg','Absensi'],['/solusi/rekap-gaji','Rekap & Gaji'],['/solusi/distribusi','Distribusi'],['/panduan','Panduan'],['/#paket','Paket'],['/tentang','Tentang']].map(([href,label]) => {
    const active = !href.includes('#') && (pathname === href || (href === '/panduan' && pathname.startsWith('/panduan/')));
    return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={active ? 'active' : undefined}>{label}</Link>;
  })}</div>;
}
