import type { MetadataRoute } from "next";
import { isIndexingAllowed } from "@/lib/environment";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  if (!isIndexingAllowed()) {
    return {
      rules: { userAgent: "*", disallow: "/" }
    };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api"]
    },
    sitemap: `${siteUrl}/sitemap.xml`
  };
}
