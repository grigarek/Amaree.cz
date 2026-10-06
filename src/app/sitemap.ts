import type { MetadataRoute } from "next";
import { enabledLocales, localizedPaths } from "@/i18n/routing";
import { isIndexingAllowed } from "@/lib/environment";
import { getCatalogCategories, getCatalogProducts } from "@/lib/catalog";
import { getHallmarkSettings, isPublicHallmarkPageReady } from "@/lib/admin/hallmark-settings";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!isIndexingAllowed()) return [];

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const urls: MetadataRoute.Sitemap = [];
  const indexableKeys = ["home", "collection", "about", "faq", "contact", "terms", "privacy", "returns", "shipping", "care", "club"] as const;
  const [categories, hallmarkSettings] = await Promise.all([getCatalogCategories(), getHallmarkSettings()]);

  for (const locale of enabledLocales) {
    const products = await getCatalogProducts(locale);
    const paths = indexableKeys.map((key) => localizedPaths[locale][key]);
    for (const path of paths) urls.push({ url: `${siteUrl}${path}`, changeFrequency: path === localizedPaths[locale].home ? "weekly" : "monthly", priority: path === localizedPaths[locale].home ? 1 : 0.6 });
    if (isPublicHallmarkPageReady(hallmarkSettings)) urls.push({ url: `${siteUrl}${localizedPaths[locale].hallmark}`, changeFrequency: "yearly", priority: 0.4 });
    for (const category of categories) {
      urls.push({ url: `${siteUrl}${localizedPaths[locale].collection}/${category.localizedSlug[locale]}`, changeFrequency: "weekly", priority: 0.8 });
    }
    for (const product of products) urls.push({ url: `${siteUrl}${localizedPaths[locale].product}/${product.slug}`, lastModified: product.updatedAt, changeFrequency: "weekly", priority: 0.9 });
  }

  return urls;
}
