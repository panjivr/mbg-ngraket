import { notFound } from "next/navigation";
import ArticlePage from "@/components/marketing/ArticlePage";
import { SOLUTIONS, publicMetadata } from "@/lib/marketing";
export const dynamicParams = false;
export function generateStaticParams() { return SOLUTIONS.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = SOLUTIONS.find(a => a.slug === slug);
  if (!article) return {};
  return publicMetadata(`/solusi/${slug}`, article.title, article.description);
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = SOLUTIONS.find(a => a.slug === slug);
  if (!article) notFound();
  return <ArticlePage article={article}/>;
}
