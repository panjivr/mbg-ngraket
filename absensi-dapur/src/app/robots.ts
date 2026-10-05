import type { MetadataRoute } from "next";
import { PRIVATE_PATHS, PUBLIC_INDEXABLE, SITE_URL } from "@/lib/marketing";
export default function robots(): MetadataRoute.Robots {
  if (!PUBLIC_INDEXABLE) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: "OAI-SearchBot", allow: "/", disallow: PRIVATE_PATHS },
    ], sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
