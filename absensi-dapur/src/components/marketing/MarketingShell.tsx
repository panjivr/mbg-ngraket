import Link from "next/link";
import Image from "next/image";
import ContactCTA from "./ContactCTA";
import MarketingNav from "./MarketingNav";
import { SITE_NAME } from "@/lib/marketing";
import "./marketing.css";

export function ProductMark({ large = false }: { large?: boolean }) {
  return <Image src="/bgn-logo.webp" alt="Logo Badan Gizi Nasional" width={large ? 80 : 48} height={large ? 80 : 48} sizes={large ? '80px' : '48px'} priority className={`mk-logo ${large ? 'mk-logo-large' : ''}`}/>;
}
export function MarketingHeader() {
  return <header className="mk-header"><nav aria-label="Navigasi website" className="mk-nav">
    <div className="mk-header-row"><Link href="/" className="mk-brand"><ProductMark/><span><strong>{SITE_NAME}</strong><small>Administrasi & operasional SPPG</small></span></Link>
      <div className="mk-header-actions"><Link href="/login" className="mk-login">Masuk<span aria-hidden="true"> ↗</span></Link><ContactCTA placement="header" className="mk-button mk-button-gold">Minta demo<span aria-hidden="true"> →</span></ContactCTA></div></div>
    <MarketingNav/>
  </nav></header>;
}
export function MarketingFooter() {
  return <footer className="mk-footer"><div className="mk-footer-inner"><div className="mk-footer-top"><div><div className="mk-brand"><ProductMark/><strong>{SITE_NAME}</strong></div><p>Aplikasi independen untuk membantu administrasi dan operasional dapur SPPG. Bukan situs resmi Badan Gizi Nasional.</p></div><ContactCTA placement="footer" className="mk-button mk-button-gold"/></div>
    <div className="mk-footer-links"><Link href="/fitur">Fitur</Link><Link href="/panduan">Panduan</Link><Link href="/tentang">Tentang & kontak</Link><a href="https://www.bgn.go.id" target="_blank" rel="noopener noreferrer">Situs resmi BGN ↗</a></div><p className="mk-copyright">© {new Date().getFullYear()} {SITE_NAME} · djati.web.id</p></div></footer>;
}
export default function MarketingShell({ children }: { children: React.ReactNode }) {
  return <div className="marketing-site"><a href="#konten-publik" className="skip-link">Lewati navigasi</a><MarketingHeader/><main id="konten-publik" tabIndex={-1} className="mk-main">{children}</main><MarketingFooter/></div>;
}
