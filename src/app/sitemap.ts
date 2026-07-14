import type { MetadataRoute } from "next";
import { localizedPaths, locales } from "@/i18n/routing";
import { products } from "@/lib/products";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const urls: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    const paths = Object.values(localizedPaths[locale]).filter((path) => !path.includes("["));
    for (const path of paths) urls.push({ url: `${siteUrl}${path}`, lastModified: new Date() });
    for (const product of products) urls.push({ url: `${siteUrl}${localizedPaths[locale].product}/${product.slug}`, lastModified: product.updatedAt });
  }

  return urls;
}
