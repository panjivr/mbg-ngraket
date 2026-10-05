import Link from "next/link";
import ContactCTA from "./ContactCTA";
import { SITE_NAME } from "@/lib/marketing";

export function ProductMark({ large = false }: { large?: boolean }) {
  return <span aria-hidden="true" className={`inline-grid shrink-0 place-items-center rounded-2xl bg-gold-500 font-bold text-white ${large ? "h-16 w-16 text-3xl" : "h-10 w-10 text-xl"}`}>D</span>;
}
export function MarketingHeader() {
  return <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-950/95 backdrop-blur">
    <nav aria-label="Navigasi website" className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
      <Link href="/" className="flex min-w-0 items-center gap-2"><ProductMark/><span className="text-sm font-bold">{SITE_NAME}</span></Link>
      <div className="flex items-center gap-2"><Link href="/login" className="btn-ghost px-3">Masuk</Link><ContactCTA placement="header" className="btn-gold hidden sm:inline-flex">Minta demo</ContactCTA></div>
      <div className="scroll-x flex w-full gap-1 overflow-x-auto border-t border-white/5 pt-2 text-sm">
        {[['/fitur','Fitur'],['/solusi/absensi-sppg','Absensi'],['/solusi/rekap-gaji','Rekap & Gaji'],['/solusi/distribusi','Distribusi'],['/panduan','Panduan'],['/#paket','Paket'],['/tentang','Tentang']].map(([href,label]) => <Link key={href} href={href} className="shrink-0 rounded-lg px-3 py-2 text-slate-300 hover:bg-white/5">{label}</Link>)}
      </div>
    </nav>
  </header>;
}
export function MarketingFooter() {
  return <footer className="mx-auto mt-14 max-w-6xl border-t border-white/10 px-5 py-8 text-sm text-slate-400">
    <div className="flex flex-wrap items-start justify-between gap-5"><div><p className="font-semibold text-slate-200">{SITE_NAME}</p><p className="mt-2 max-w-xl leading-relaxed">Aplikasi independen untuk membantu administrasi dan operasional dapur SPPG. Bukan situs resmi Badan Gizi Nasional.</p></div><ContactCTA placement="footer"/></div>
    <div className="mt-5 flex flex-wrap gap-4"><Link href="/fitur">Fitur</Link><Link href="/panduan">Panduan</Link><Link href="/tentang">Tentang & kontak</Link><a href="https://www.bgn.go.id" target="_blank" rel="noopener noreferrer">Situs resmi BGN</a></div>
    <p className="mt-5 text-xs">© {new Date().getFullYear()} {SITE_NAME}</p>
  </footer>;
}
export default function MarketingShell({ children }: { children: React.ReactNode }) {
  return <><a href="#konten-publik" className="skip-link">Lewati navigasi</a><MarketingHeader/><main id="konten-publik" tabIndex={-1} className="mx-auto max-w-6xl px-5 py-10 sm:py-14">{children}</main><MarketingFooter/></>;
}
