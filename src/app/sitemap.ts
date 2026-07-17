import type { MetadataRoute } from "next";
import { enabledLocales, localizedPaths } from "@/i18n/routing";
import { isIndexingAllowed } from "@/lib/environment";
import { getCatalogCategories, getCatalogProducts } from "@/lib/catalog";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isIndexingAllowed()) return [];

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const urls: MetadataRoute.Sitemap = [];
  const indexableKeys = ["home", "collection", "about", "contact", "terms", "privacy", "returns", "shipping", "care"] as const;
  const categories = await getCatalogCategories();

  for (const locale of enabledLocales) {
    const products = await getCatalogProducts(locale);
    const paths = indexableKeys.map((key) => localizedPaths[locale][key]);
    for (const path of paths) urls.push({ url: `${siteUrl}${path}`, lastModified: new Date() });
    for (const category of categories) {
      urls.push({ url: `${siteUrl}${localizedPaths[locale].collection}/${category.localizedSlug[locale]}`, lastModified: new Date() });
    }
    for (const product of products) urls.push({ url: `${siteUrl}${localizedPaths[locale].product}/${product.slug}`, lastModified: product.updatedAt });
  }

  return urls;
}
