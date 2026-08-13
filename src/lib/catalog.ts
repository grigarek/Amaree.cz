import "server-only";
import { cache } from "react";
import { categories as demoCategories, products as demoProducts } from "@/lib/products";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getAppEnvironment } from "@/lib/environment";
import { containsProtectedHallmarkClaim } from "@/lib/products/hallmark-safety";
import { locales, localizedPaths } from "@/i18n/routing";
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
  clasp_type?: string;
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
  publication_status?: "draft" | "active" | "hidden" | "archived";
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
    archived_at: string | null;
    product_image_translations: Array<{ locale: Locale; alt_text: string }>;
  }>;
};

type ProductSlugAliasRow = {
  product_id: string;
  locale: Locale;
  slug: string;
};

type CatalogSnapshot = {
  categories: Category[];
  productsByLocale: Record<Locale, Product[]>;
  productAliases: Record<Locale, Record<string, string>>;
};

function localized<T>(translations: TranslationRow[], field: keyof TranslationRow, fallback = "") {
  return Object.fromEntries(locales.map((locale) => [
    locale,
    String(translations.find((translation) => translation.locale === locale)?.[field] ?? fallback)
  ])) as Record<Locale, string>;
}

function demoSnapshot(): CatalogSnapshot {
  const euroProducts = demoProducts.map((product) => ({
    ...product,
    currency: "EUR" as const,
    price: Math.round(product.price / 25),
    originalPrice: product.originalPrice ? Math.round(product.originalPrice / 25) : undefined
  }));
  return {
    categories: demoCategories,
    productsByLocale: { cs: demoProducts, sk: euroProducts, en: euroProducts, de: euroProducts },
    productAliases: { cs: {}, sk: {}, en: {}, de: {} }
  };
}

const productRelations = `
  product_translations(locale,slug,name,short_description,long_description,material,color,dimensions,clasp_type,care),
  product_prices(currency,amount_minor,original_amount_minor),
  inventory_items(quantity,variant_id),
  product_images(id,storage_path,sort_order,archived_at,product_image_translations(locale,alt_text))
`;

function isMissingPublicationStatusError(error: { code?: string; message?: string } | null) {
  return error?.code === "42703" || error?.message?.includes("publication_status") === true;
}

function isMissingSlugAliasTableError(error: { code?: string; message?: string } | null) {
  return error?.code === "42P01"
    || error?.code === "PGRST205"
    || error?.message?.includes("product_slug_aliases") === true;
}

export const getCatalogSnapshot = cache(async (): Promise<CatalogSnapshot> => {
  if (!isSupabaseConfigured()) {
    return getAppEnvironment() === "development"
      ? demoSnapshot()
      : { categories: [], productsByLocale: { cs: [], sk: [], en: [], de: [] }, productAliases: { cs: {}, sk: {}, en: {}, de: {} } };
  }

  const supabase = await createSupabaseServerClient();
  const [categoryResult, initialProductResult] = await Promise.all([
    supabase.from("categories").select("id,internal_slug,active,category_translations(locale,slug,name,description)").eq("active", true).order("sort_order"),
    supabase.from("products").select(`
      id,sku,category_id,weight_grams,active,publication_status,featured,is_new,created_at,updated_at,
      ${productRelations}
    `).eq("publication_status", "active").eq("active", true).is("archived_at", null).order("sort_order")
  ]);
  if (categoryResult.error) throw new Error(`Catalog categories failed: ${categoryResult.error.message}`);
  const productResult = isMissingPublicationStatusError(initialProductResult.error)
    ? await supabase.from("products").select(`
      id,sku,category_id,weight_grams,active,featured,is_new,created_at,updated_at,
      ${productRelations}
    `).eq("active", true).is("archived_at", null).order("sort_order")
    : initialProductResult;
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
  let aliasRows: ProductSlugAliasRow[] = [];
  if (rows.length) {
    const aliasResult = await supabase
      .from("product_slug_aliases")
      .select("product_id,locale,slug")
      .in("product_id", rows.map((row) => row.id));
    if (aliasResult.error && !isMissingSlugAliasTableError(aliasResult.error)) {
      throw new Error(`Catalog product aliases failed: ${aliasResult.error.message}`);
    }
    aliasRows = (aliasResult.data ?? []) as ProductSlugAliasRow[];
  }
  const productAliases = Object.fromEntries(locales.map((locale) => [
    locale,
    Object.fromEntries(aliasRows
      .filter((alias) => alias.locale === locale)
      .map((alias) => [alias.slug, alias.product_id]))
  ])) as Record<Locale, Record<string, string>>;
  const verifiedCompliance = new Map<string, Product["materialCompliance"]>();
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && rows.length) {
    const { data: complianceRows } = await createSupabaseAdminClient()
      .from("product_material_compliance")
      .select("product_id,material_type,precious_metal_kind,fineness,precious_metal_weight_grams,hallmark_status,fineness_mark_status,exemption_reason,country_of_origin,public_customer_information")
      .in("product_id", rows.map((row) => row.id))
      .eq("details_verified", true);
    (complianceRows ?? []).forEach((item) => verifiedCompliance.set(item.product_id, {
      materialType: item.material_type,
      preciousMetalKind: item.precious_metal_kind ?? undefined,
      fineness: item.fineness || undefined,
      preciousMetalWeightGrams: item.precious_metal_weight_grams == null ? undefined : Number(item.precious_metal_weight_grams),
      hallmarkStatus: item.hallmark_status,
      finenessMarkStatus: item.fineness_mark_status,
      exemptionReason: item.exemption_reason || undefined,
      countryOfOrigin: item.country_of_origin || undefined,
      publicCustomerInformation: item.public_customer_information || undefined
    }));
  }
  const productsByLocale = Object.fromEntries(locales.map((locale) => [locale, rows.flatMap<Product>((row) => {
    const translation = row.product_translations.find((item) => item.locale === locale);
    if (!translation) return [];
    if (!verifiedCompliance.has(row.id) && containsProtectedHallmarkClaim(row.product_translations.flatMap((item) => [
      item.name,
      item.short_description,
      item.long_description,
      item.material,
      item.dimensions,
      item.care
    ]))) return [];
    const currency = locale === "cs" ? "CZK" : "EUR";
    const price = row.product_prices.find((item) => item.currency === currency);
    if (!price || price.amount_minor <= 0) return [];
    const images = row.product_images.filter((image) => image.archived_at === null).sort((a, b) => a.sort_order - b.sort_order).map((image) => {
      const { data } = supabase.storage.from("product-images").getPublicUrl(image.storage_path);
      return {
        id: image.id,
        url: data.publicUrl,
        alt: Object.fromEntries(locales.map((imageLocale) => [
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
      clasp: localized(row.product_translations, "clasp_type"),
      weightGrams: row.weight_grams === null ? undefined : Number(row.weight_grams),
      care: localized(row.product_translations, "care"),
      materialCompliance: verifiedCompliance.get(row.id),
      active: row.active,
      featured: row.featured,
      bestseller: false,
      images,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    } satisfies Product];
  })])) as Record<Locale, Product[]>;

  return { categories, productsByLocale, productAliases };
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

export async function resolveCatalogProductByLocalizedSlug(locale: Locale, slug?: string) {
  if (!slug) return undefined;
  const snapshot = await getCatalogSnapshot();
  const exact = snapshot.productsByLocale[locale].find((product) => product.slug === slug && product.active);
  if (exact) return exact;

  const source = locales
    .flatMap((sourceLocale) => snapshot.productsByLocale[sourceLocale])
    .find((product) => product.slug === slug && product.active);
  const productId = source?.id ?? snapshot.productAliases[locale][slug];
  if (!productId) return undefined;
  return snapshot.productsByLocale[locale].find((product) => product.id === productId && product.active);
}

export async function getCatalogProductAlternatePaths(productId: string) {
  const snapshot = await getCatalogSnapshot();
  return Object.fromEntries(locales.map((locale) => {
    const product = snapshot.productsByLocale[locale].find((item) => item.id === productId && item.active);
    return [locale, product ? `${localizedPaths[locale].product}/${product.slug}` : localizedPaths[locale].collection];
  })) as Record<Locale, string>;
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
