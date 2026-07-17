import "server-only";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { AdminProductInput } from "@/lib/products/admin-product-schema";

type ProductPriceRow = { currency: "CZK" | "EUR"; amount_minor: number; original_amount_minor: number | null };

type AdminProductRow = {
  id: string;
  internal_id: string;
  sku: string;
  category_id: string;
  weight_grams: number | string;
  active: boolean;
  featured: boolean;
  is_new: boolean;
  sort_order: number;
  low_stock_threshold: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  categories: { internal_slug: AdminProductInput["category"] } | null;
  product_translations: Array<{
    locale: "cs" | "en" | "de";
    slug: string;
    name: string;
    short_description: string;
    long_description: string;
    material: string;
    color: string;
    dimensions: string;
    care: string;
    seo_title: string;
    seo_description: string;
  }>;
  product_prices: ProductPriceRow[];
  inventory_items: Array<{ quantity: number; variant_id: string | null }>;
};

const productSelect = `
  id, internal_id, sku, category_id, weight_grams, active, featured, is_new,
  sort_order, low_stock_threshold, archived_at, created_at, updated_at,
  categories!inner(internal_slug),
  product_translations(*),
  product_prices(*),
  inventory_items(quantity, variant_id)
`;

export type AdminProductListItem = {
  id: string;
  internalId: string;
  name: string;
  sku: string;
  category: string;
  priceCzkMinor: number;
  stockQuantity: number;
  active: boolean;
  archived: boolean;
  updatedAt: string;
};

export type AdminProductImage = {
  id: string;
  url: string;
  storagePath: string;
  filename: string;
  width: number;
  height: number;
  sizeBytes: number;
  sortOrder: number;
  isPrimary: boolean;
  alt: { cs: string; en: string; de: string };
};

export async function listAdminProducts(search = "", state = "all"): Promise<AdminProductListItem[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("products").select(productSelect).order("updated_at", { ascending: false });
  if (state === "active") query = query.eq("active", true).is("archived_at", null);
  if (state === "inactive") query = query.eq("active", false).is("archived_at", null);
  if (state === "archived") query = query.not("archived_at", "is", null);
  const { data, error } = await query;
  if (error) throw new Error(`Products could not be loaded: ${error.message}`);

  const normalizedSearch = search.trim().toLocaleLowerCase("cs");
  return ((data ?? []) as unknown as AdminProductRow[]).map((row) => ({
    id: row.id,
    internalId: row.internal_id,
    name: row.product_translations.find((translation) => translation.locale === "cs")?.name ?? row.internal_id,
    sku: row.sku,
    category: row.categories?.internal_slug ?? "",
    priceCzkMinor: row.product_prices.find((price) => price.currency === "CZK")?.amount_minor ?? 0,
    stockQuantity: row.inventory_items.find((inventory) => inventory.variant_id === null)?.quantity ?? 0,
    active: row.active,
    archived: Boolean(row.archived_at),
    updatedAt: row.updated_at
  })).filter((product) => !normalizedSearch || [product.name, product.sku, product.internalId]
    .some((value) => value.toLocaleLowerCase("cs").includes(normalizedSearch)));
}

export async function getAdminProduct(id: string): Promise<AdminProductInput | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("products").select(productSelect).eq("id", id).maybeSingle();
  if (error) throw new Error(`Product could not be loaded: ${error.message}`);
  if (!data) return null;

  const row = data as unknown as AdminProductRow;
  const translations = Object.fromEntries(row.product_translations.map((translation) => [translation.locale, {
    slug: translation.slug,
    name: translation.name,
    shortDescription: translation.short_description,
    longDescription: translation.long_description,
    material: translation.material,
    color: translation.color,
    dimensions: translation.dimensions,
    care: translation.care,
    seoTitle: translation.seo_title,
    seoDescription: translation.seo_description
  }])) as AdminProductInput["translations"];
  const prices = Object.fromEntries(row.product_prices.map((price) => [price.currency, {
    amountMinor: price.amount_minor,
    originalAmountMinor: price.original_amount_minor
  }])) as AdminProductInput["prices"];

  return {
    internalId: row.internal_id,
    sku: row.sku,
    category: row.categories?.internal_slug ?? "necklaces",
    weightGrams: Number(row.weight_grams),
    stockQuantity: row.inventory_items.find((inventory) => inventory.variant_id === null)?.quantity ?? 0,
    lowStockThreshold: row.low_stock_threshold,
    active: row.active,
    featured: row.featured,
    isNew: row.is_new,
    sortOrder: row.sort_order,
    translations,
    prices
  };
}

export async function saveAdminProduct(input: AdminProductInput, id?: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_upsert_product", {
    p_product_id: id ?? null,
    p_payload: input
  });
  if (error) throw new Error(`Product could not be saved: ${error.message}`);
  return data as string;
}

export async function listAdminProductImages(productId: string): Promise<AdminProductImage[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("product_images")
    .select("id,storage_path,original_filename,width,height,size_bytes,sort_order,is_primary,product_image_translations(locale,alt_text)")
    .eq("product_id", productId)
    .is("archived_at", null)
    .order("sort_order");
  if (error) throw new Error(`Images could not be loaded: ${error.message}`);

  return (data ?? []).map((row) => {
    const translations = row.product_image_translations as Array<{ locale: "cs" | "en" | "de"; alt_text: string }>;
    const alt = Object.fromEntries(translations.map((translation) => [translation.locale, translation.alt_text])) as AdminProductImage["alt"];
    const { data: publicUrl } = supabase.storage.from("product-images").getPublicUrl(row.storage_path);
    return {
      id: row.id,
      url: publicUrl.publicUrl,
      storagePath: row.storage_path,
      filename: row.original_filename,
      width: row.width,
      height: row.height,
      sizeBytes: row.size_bytes,
      sortOrder: row.sort_order,
      isPrimary: row.is_primary,
      alt
    };
  });
}
