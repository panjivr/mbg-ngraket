import type { MetadataRoute } from "next";
import { PUBLIC_INDEXABLE, PUBLIC_PATHS, SITE_URL } from "@/lib/marketing";
export default function sitemap(): MetadataRoute.Sitemap {
  if (!PUBLIC_INDEXABLE) return [];
  return PUBLIC_PATHS.map(path => ({ url: `${SITE_URL}${path === "/" ? "" : path}` }));
}
