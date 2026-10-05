import Link from "next/link";
import MarketingShell from "@/components/marketing/MarketingShell";
import StructuredData from "@/components/marketing/StructuredData";
import { GUIDES, publicMetadata } from "@/lib/marketing";
const title = "Panduan Administrasi dan Aplikasi untuk Admin SPPG";
const description = "Panduan praktis memilih aplikasi SPPG dan memeriksa rekap absensi shift malam untuk staf, kepala, serta admin dapur MBG.";
export const metadata = publicMetadata('/panduan', title, description);
export default function Page() { return <MarketingShell><StructuredData path="/panduan" title={title} description={description}/><h1 className="text-3xl font-bold sm:text-4xl">Panduan untuk admin dan tim SPPG</h1><p className="mt-4 max-w-3xl text-lg leading-relaxed text-slate-300">Materi praktis untuk meninjau alur administrasi dapur dan menentukan fitur yang perlu diuji sebelum penerapan.</p><div className="mt-8 grid gap-5 md:grid-cols-2">{GUIDES.map(a => <Link key={a.slug} href={`/panduan/${a.slug}`} className="card-interactive p-6"><h2 className="text-xl font-bold">{a.title}</h2><p className="mt-4 leading-7 text-slate-300">{a.summary}</p><span className="mt-5 block font-semibold text-gold-400">Baca panduan →</span></Link>)}</div></MarketingShell>; }
