import Link from "next/link";
import MarketingShell from "./MarketingShell";
import ContactCTA from "./ContactCTA";
import StructuredData from "./StructuredData";
import { linkTitle, type MarketingArticle } from "@/lib/marketing";
export default function ArticlePage({ article }: { article: MarketingArticle }) {
  const path = `/${article.category === "Solusi" ? "solusi" : "panduan"}/${article.slug}`;
  return <MarketingShell>
    <StructuredData path={path} title={article.title} description={article.description} section={article.category}/>
    <article className="mx-auto max-w-3xl">
      <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap gap-2 text-xs text-slate-400"><Link href="/">Beranda</Link><span aria-hidden="true">/</span>{article.category === "Panduan" ? <Link href="/panduan">Panduan</Link> : <span>Solusi</span>}</nav>
      <p className="text-sm font-semibold text-gold-400">{article.category} untuk tim SPPG</p>
      <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{article.title}</h1>
      <p className="mt-5 text-lg leading-relaxed text-slate-300">{article.summary}</p>
      <div className="mt-6"><ContactCTA topic={article.title} placement={`article-${article.slug}`}/></div>
      {article.sections.map(s => <section key={s.title} className="mt-10"><h2 className="text-xl font-bold">{s.title}</h2>{s.paragraphs.map(p => <p key={p} className="mt-3 text-base leading-7 text-slate-300">{p}</p>)}{s.bullets && <ul className="mt-4 list-disc space-y-2 pl-5 text-base leading-7 text-slate-300">{s.bullets.map(b => <li key={b}>{b}</li>)}</ul>}</section>)}
      <section className="mt-10"><h2 className="text-xl font-bold">Pertanyaan umum</h2><div className="mt-4 divide-y divide-white/10">{article.faq.map(f => <details key={f.question} className="py-4"><summary className="cursor-pointer font-semibold">{f.question}</summary><p className="mt-3 leading-7 text-slate-300">{f.answer}</p></details>)}</div></section>
      <aside className="card mt-10 p-5"><h2 className="text-lg font-bold">Baca juga</h2><ul className="mt-3 space-y-3">{article.related.map(p => <li key={p}><Link href={p} className="text-gold-400 underline underline-offset-4">{linkTitle(p)}</Link></li>)}</ul></aside>
    </article>
  </MarketingShell>;
}
