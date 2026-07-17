import "server-only";
import { cache } from "react";
import { categories as demoCategories, products as demoProducts } from "@/lib/products";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { getAppEnvironment } from "@/lib/environment";
import type { Category, CategorySlug, Locale, Product } from "@/types/domain";

type TranslationRow = {
  locale: Locale;
  slug: string;
  name: string;
  description?: string;
  short_description?: string;
  long_description?: string;
  material?: string;
  color?: string;
  dimensions?: string;
  care?: string;
};

type CategoryRow = {
  id: string;
  internal_slug: CategorySlug;
  active: boolean;
  category_translations: TranslationRow[];
};

type ProductRow = {
  id: string;
  sku: string;
  category_id: string;
  weight_grams: number | string | null;
  active: boolean;
  featured: boolean;
  is_new: boolean;
  created_at: string;
  updated_at: string;
  product_translations: TranslationRow[];
  product_prices: Array<{ currency: "CZK" | "EUR"; amount_minor: number; original_amount_minor: number | null }>;
  inventory_items: Array<{ quantity: number; variant_id: string | null }>;
  product_images: Array<{
    id: string;
    storage_path: string;
    sort_order: number;
    product_image_translations: Array<{ locale: Locale; alt_text: string }>;
  }>;
};

type CatalogSnapshot = { categories: Category[]; productsByLocale: Record<Locale, Product[]> };

function localized<T>(translations: TranslationRow[], field: keyof TranslationRow, fallback = "") {
  return Object.fromEntries((["cs", "en", "de"] as const).map((locale) => [
    locale,
    String(translations.find((translation) => translation.locale === locale)?.[field] ?? fallback)
  ])) as Record<Locale, string>;
}

function demoSnapshot(): CatalogSnapshot {
  return { categories: demoCategories, productsByLocale: { cs: demoProducts, en: demoProducts, de: demoProducts } };
}

export const getCatalogSnapshot = cache(async (): Promise<CatalogSnapshot> => {
  if (!isSupabaseConfigured()) {
    return getAppEnvironment() === "development" ? demoSnapshot() : { categories: [], productsByLocale: { cs: [], en: [], de: [] } };
  }

  const supabase = await createSupabaseServerClient();
  const [categoryResult, productResult] = await Promise.all([
    supabase.from("categories").select("id,internal_slug,active,category_translations(locale,slug,name,description)").eq("active", true).order("sort_order"),
    supabase.from("products").select(`
      id,sku,category_id,weight_grams,active,featured,is_new,created_at,updated_at,
      product_translations(locale,slug,name,short_description,long_description,material,color,dimensions,care),
      product_prices(currency,amount_minor,original_amount_minor),
      inventory_items(quantity,variant_id),
      product_images(id,storage_path,sort_order,product_image_translations(locale,alt_text))
    `).eq("active", true).is("archived_at", null).order("sort_order")
  ]);
  if (categoryResult.error) throw new Error(`Catalog categories failed: ${categoryResult.error.message}`);
  if (productResult.error) throw new Error(`Catalog products failed: ${productResult.error.message}`);

  const categoryRows = (categoryResult.data ?? []) as unknown as CategoryRow[];
  const categories: Category[] = categoryRows.map((row) => ({
    id: row.id,
    slug: row.internal_slug,
    localizedSlug: localized(row.category_translations, "slug"),
    name: localized(row.category_translations, "name"),
    description: localized(row.category_translations, "description"),
    active: row.active
  }));
  const categoryById = new Map(categoryRows.map((category) => [category.id, category.internal_slug]));
  const rows = (productResult.data ?? []) as unknown as ProductRow[];
  const productsByLocale = Object.fromEntries((["cs", "en", "de"] as const).map((locale) => [locale, rows.flatMap<Product>((row) => {
    const translation = row.product_translations.find((item) => item.locale === locale);
    if (!translation) return [];
    const currency = locale === "cs" ? "CZK" : "EUR";
    const price = row.product_prices.find((item) => item.currency === currency);
    if (!price) return [];
    const images = [...row.product_images].sort((a, b) => a.sort_order - b.sort_order).map((image) => {
      const { data } = supabase.storage.from("product-images").getPublicUrl(image.storage_path);
      return {
        id: image.id,
        url: data.publicUrl,
        alt: Object.fromEntries((["cs", "en", "de"] as const).map((imageLocale) => [
          imageLocale,
          image.product_image_translations.find((item) => item.locale === imageLocale)?.alt_text ?? translation.name
        ])) as Record<Locale, string>,
        sortOrder: image.sort_order
      };
    });
    return [{
      id: row.id,
      slug: translation.slug,
      name: localized(row.product_translations, "name"),
      shortDescription: localized(row.product_translations, "short_description"),
      longDescription: localized(row.product_translations, "long_description"),
      category: categoryById.get(row.category_id) ?? "necklaces",
      price: price.amount_minor,
      originalPrice: price.original_amount_minor ?? undefined,
      currency,
      sku: row.sku,
      stockQuantity: row.inventory_items.filter((item) => item.variant_id === null).reduce((sum, item) => sum + item.quantity, 0),
      material: localized(row.product_translations, "material"),
      color: localized(row.product_translations, "color"),
      dimensions: localized(row.product_translations, "dimensions"),
      weightGrams: row.weight_grams === null ? undefined : Number(row.weight_grams),
      care: localized(row.product_translations, "care"),
      active: row.active,
      featured: row.featured,
      bestseller: false,
      images,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    } satisfies Product];
  })])) as Record<Locale, Product[]>;

  return { categories, productsByLocale };
});

export async function getCatalogCategories() {
  return (await getCatalogSnapshot()).categories;
}

export async function getCatalogProducts(locale: Locale, category?: CategorySlug) {
  return (await getCatalogSnapshot()).productsByLocale[locale].filter((product) => !category || product.category === category);
}

export async function getCatalogProductBySlug(locale: Locale, slug?: string) {
  if (!slug) return undefined;
  return (await getCatalogSnapshot()).productsByLocale[locale].find((product) => product.slug === slug && product.active);
}

export async function getCatalogCategoryByLocalizedSlug(locale: Locale, slug?: string) {
  if (!slug) return undefined;
  return (await getCatalogSnapshot()).categories.find((category) => category.localizedSlug[locale] === slug);
}

export async function getCatalogCategoryBySlug(slug: CategorySlug) {
  return (await getCatalogSnapshot()).categories.find((category) => category.slug === slug);
}

export async function getRecommendedCatalogProducts(locale: Locale, productId?: string) {
  return (await getCatalogProducts(locale)).filter((product) => product.id !== productId).slice(0, 3);
}
