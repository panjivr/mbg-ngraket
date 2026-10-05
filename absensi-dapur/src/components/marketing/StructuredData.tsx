import { SITE_NAME, SITE_URL } from "@/lib/marketing";
export default function StructuredData({ path, title, description, section }: { path: string; title: string; description: string; section?: "Solusi" | "Panduan" }) {
  const url = `${SITE_URL}${path === "/" ? "" : path}`;
  const trail = [{ "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL }];
  if (path !== "/") {
    if (section === "Panduan" && path !== "/panduan") trail.push({ "@type": "ListItem", position: 2, name: "Panduan", item: `${SITE_URL}/panduan` });
    trail.push({ "@type": "ListItem", position: trail.length + 1, name: title, item: url });
  }
  const data = { "@context": "https://schema.org", "@graph": [
    { "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: SITE_NAME, url: SITE_URL, inLanguage: "id-ID" },
    { "@type": "WebPage", "@id": `${url}#webpage`, url, name: title, description, inLanguage: "id-ID", isPartOf: { "@id": `${SITE_URL}/#website` } },
    { "@type": "BreadcrumbList", itemListElement: trail },
  ] };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}/>;
}
