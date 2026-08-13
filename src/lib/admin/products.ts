import "server-only";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { AdminProductInput } from "@/lib/products/admin-product-schema";
import { formatSku, toSeoSlug } from "@/lib/products/product-identifiers";

type ProductPriceRow = { currency: "CZK" | "EUR"; amount_minor: number; original_amount_minor: number | null };

type AdminProductRow = {
  id: string;
  internal_id: string;
  sku: string;
  category_id: string;
  weight_grams: number | string | null;
  active: boolean;
  publication_status: AdminProductInput["publicationStatus"];
  featured: boolean;
  is_new: boolean;
  sort_order: number;
  low_stock_threshold: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  categories: { internal_slug: AdminProductInput["category"] } | null;
  product_translations: Array<{
    locale: "cs" | "sk" | "en" | "de";
    slug: string;
    name: string;
    short_description: string;
    long_description: string;
    material: string;
    color: string;
    dimensions: string;
    clasp_type: string;
    stones: string;
    care: string;
    seo_title: string;
    seo_description: string;
  }>;
  product_prices: ProductPriceRow[];
  inventory_items: Array<{ quantity: number; variant_id: string | null }>;
};

const productSelect = `
  id, internal_id, sku, category_id, weight_grams, active, publication_status, featured, is_new,
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
  publicationStatus: AdminProductInput["publicationStatus"];
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
  alt: { cs: string; sk: string; en: string; de: string };
};

export type AdminProductDetail = {
  input: AdminProductInput;
  internalId: string;
};

export async function listAdminProducts(search = "", state = "all"): Promise<AdminProductListItem[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("products").select(productSelect).order("updated_at", { ascending: false });
  if (["draft", "active", "hidden", "archived"].includes(state)) query = query.eq("publication_status", state);
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
    publicationStatus: row.publication_status,
    updatedAt: row.updated_at
  })).filter((product) => !normalizedSearch || [product.name, product.sku, product.internalId]
    .some((value) => value.toLocaleLowerCase("cs").includes(normalizedSearch)));
}

export async function getAdminProduct(id: string): Promise<AdminProductDetail | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("products").select(productSelect).eq("id", id).maybeSingle();
  if (error) throw new Error(`Product could not be loaded: ${error.message}`);
  if (!data) return null;

  const row = data as unknown as AdminProductRow;
  const { data: styleTagRow } = await supabase.from("products").select("style_tags").eq("id", id).maybeSingle();
  const styleTags = Array.isArray(styleTagRow?.style_tags) ? styleTagRow.style_tags.filter((tag): tag is string => typeof tag === "string") : [];
  const translations = Object.fromEntries(row.product_translations.map((translation) => [translation.locale, {
    slug: translation.slug,
    name: translation.name,
    shortDescription: translation.short_description,
    longDescription: translation.long_description,
    material: translation.material,
    color: translation.color,
    dimensions: translation.dimensions,
    clasp: translation.clasp_type ?? "",
    stones: translation.stones ?? "",
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
    input: {
      sku: row.sku,
      category: row.categories?.internal_slug ?? "necklaces",
      weightGrams: row.weight_grams == null ? null : Number(row.weight_grams),
      stockQuantity: row.inventory_items.find((inventory) => inventory.variant_id === null)?.quantity ?? 0,
      lowStockThreshold: row.low_stock_threshold,
      styleTags,
      publicationStatus: row.publication_status,
      featured: row.featured,
      isNew: row.is_new,
      sortOrder: row.sort_order,
      translations,
      prices
    }
  };
}

export async function setAdminProductStatus(id: string, status: AdminProductInput["publicationStatus"]) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_set_product_status", {
    p_product_id: id,
    p_status: status
  });
  if (error) throw new Error(`Stav produktu se nepodařilo změnit: ${error.message}`);
  return (data ?? []) as string[];
}

export async function saveAdminProduct(input: AdminProductInput, id?: string) {
  const supabase = await createSupabaseServerClient();
  const requestedStatus = input.publicationStatus;
  const { data, error } = await supabase.rpc("admin_upsert_product", {
    p_product_id: id ?? null,
    p_payload: { ...input, publicationStatus: "draft" }
  });
  if (error) throw new Error(`Product could not be saved: ${error.message}`);
  const productId = data as string;
  const { error: tagsError } = await supabase.from("products").update({ style_tags: input.styleTags }).eq("id", productId);
  if (tagsError && !isPendingProductAiMigrationError(tagsError.message)) throw new Error(`Stylové štítky se nepodařilo uložit: ${tagsError.message}`);
  for (const locale of ["cs", "sk", "en", "de"] as const) {
    const translation = input.translations[locale];
    const { error: parametersError } = await supabase.from("product_translations").update({
      clasp_type: translation.clasp,
      stones: translation.stones
    }).eq("product_id", productId).eq("locale", locale);
    if (parametersError && !isPendingProductAiMigrationError(parametersError.message)) throw new Error(`Doplňující parametry se nepodařilo uložit: ${parametersError.message}`);
  }
  if (requestedStatus !== "draft") {
    const issues = await setAdminProductStatus(productId, requestedStatus);
    if (issues.length) throw new Error(`Produkt nelze publikovat. Chybí nebo vyžaduje kontrolu: ${issues.join(", ")}.`);
  }
  return productId;
}

function isPendingProductAiMigrationError(message: string) {
  return /style_tags|clasp_type|stones|schema cache/iu.test(message);
}

export async function suggestAdminProductIdentifiers(name: string, productId?: string) {
  const normalizedName = name.trim();
  const slugBase = toSeoSlug(normalizedName) || "produkt";
  if (!isSupabaseConfigured()) return { sku: formatSku(1001), slug: slugBase };

  const supabase = await createSupabaseServerClient();
  let skuQuery = supabase.from("products").select("id,sku");
  let slugQuery = supabase.from("product_translations").select("product_id,slug").eq("locale", "cs").like("slug", `${slugBase}%`);
  if (productId) {
    skuQuery = skuQuery.neq("id", productId);
    slugQuery = slugQuery.neq("product_id", productId);
  }
  const [{ data: skuRows, error: skuError }, { data: slugRows, error: slugError }] = await Promise.all([skuQuery, slugQuery]);
  if (skuError) throw new Error(`SKU návrh se nepodařilo načíst: ${skuError.message}`);
  if (slugError) throw new Error(`Slug návrh se nepodařilo načíst: ${slugError.message}`);

  const existingSkus = new Set((skuRows ?? []).map((row) => row.sku));
  let sequence = 1001;
  while (existingSkus.has(formatSku(sequence))) sequence += 1;

  const existingSlugs = new Set((slugRows ?? []).map((row) => row.slug));
  let slug = slugBase;
  let suffix = 2;
  while (existingSlugs.has(slug)) {
    slug = `${slugBase}-${suffix}`;
    suffix += 1;
  }
  return { sku: formatSku(sequence), slug };
}

export async function checkAdminProductIdentifiers(sku: string, slug: string, productId?: string) {
  if (!isSupabaseConfigured()) return { skuAvailable: true, slugAvailable: true };
  const supabase = await createSupabaseServerClient();
  let skuQuery = supabase.from("products").select("id", { count: "exact", head: true }).eq("sku", sku.toUpperCase());
  let slugQuery = supabase.from("product_translations").select("product_id", { count: "exact", head: true }).eq("locale", "cs").eq("slug", slug);
  if (productId) {
    skuQuery = skuQuery.neq("id", productId);
    slugQuery = slugQuery.neq("product_id", productId);
  }
  const [{ count: skuCount, error: skuError }, { count: slugCount, error: slugError }] = await Promise.all([skuQuery, slugQuery]);
  if (skuError) throw new Error(`SKU se nepodařilo ověřit: ${skuError.message}`);
  if (slugError) throw new Error(`Slug se nepodařilo ověřit: ${slugError.message}`);
  return { skuAvailable: (skuCount ?? 0) === 0, slugAvailable: (slugCount ?? 0) === 0 };
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
    const translations = row.product_image_translations as Array<{ locale: "cs" | "sk" | "en" | "de"; alt_text: string }>;
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
