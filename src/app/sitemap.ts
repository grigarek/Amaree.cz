import type { MetadataRoute } from "next";
import { localizedPaths, locales } from "@/i18n/routing";
import { categories, products } from "@/lib/products";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const urls: MetadataRoute.Sitemap = [];
  const indexableKeys = ["home", "collection", "about", "inspiration", "contact", "terms", "privacy", "returns", "shipping", "care"] as const;

  for (const locale of locales) {
    const paths = indexableKeys.map((key) => localizedPaths[locale][key]);
    for (const path of paths) urls.push({ url: `${siteUrl}${path}`, lastModified: new Date() });
    for (const category of categories) {
      urls.push({ url: `${siteUrl}${localizedPaths[locale].collection}/${category.localizedSlug[locale]}`, lastModified: new Date() });
    }
    for (const product of products) urls.push({ url: `${siteUrl}${localizedPaths[locale].product}/${product.slug}`, lastModified: product.updatedAt });
  }

  return urls;
}
