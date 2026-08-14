import { adminProductSchema, type AdminProductInput } from "@/lib/products/admin-product-schema";
import { defaultSeoDescription, defaultSeoTitle, defaultSku, toSeoSlug } from "@/lib/products/product-identifiers";

const locales = ["cs", "sk", "en", "de"] as const;
type ProductTranslation = AdminProductInput["translations"]["cs"];

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function numberValue(formData: FormData, key: string) {
  const value = Number(text(formData, key).replace(",", "."));
  return Number.isFinite(value) ? value : Number.NaN;
}

function moneyMinor(formData: FormData, key: string) {
  return Math.round(numberValue(formData, key) * 100);
}

function optionalMoneyMinor(formData: FormData, key: string) {
  if (!text(formData, key)) return null;
  return moneyMinor(formData, key);
}

function optionalNumber(formData: FormData, key: string) {
  if (!text(formData, key)) return null;
  return numberValue(formData, key);
}

export function parseAdminProductFormData(formData: FormData) {
  const enteredTranslations = Object.fromEntries(locales.map((locale) => [locale, {
    slug: text(formData, `${locale}.slug`),
    name: text(formData, `${locale}.name`),
    shortDescription: text(formData, `${locale}.shortDescription`),
    longDescription: text(formData, `${locale}.longDescription`),
    material: text(formData, `${locale}.material`),
    color: text(formData, `${locale}.color`),
    dimensions: text(formData, `${locale}.dimensions`),
    clasp: text(formData, `${locale}.clasp`),
    stones: text(formData, `${locale}.stones`),
    care: text(formData, `${locale}.care`),
    seoTitle: text(formData, `${locale}.seoTitle`),
    seoDescription: text(formData, `${locale}.seoDescription`)
  }])) as Record<(typeof locales)[number], ProductTranslation>;

  const enteredCs = enteredTranslations.cs;
  const cs: ProductTranslation = {
    ...enteredCs,
    slug: enteredCs.slug || toSeoSlug(enteredCs.name),
    seoTitle: enteredCs.seoTitle || defaultSeoTitle(enteredCs.name),
    seoDescription: enteredCs.seoDescription || defaultSeoDescription(enteredCs.shortDescription)
  };
  const localizedTranslation = (locale: "sk" | "en" | "de"): ProductTranslation => {
    const translation = enteredTranslations[locale];
    return {
      ...translation,
      slug: translation.slug || toSeoSlug(translation.name) || `${cs.slug}-${locale}`,
      seoTitle: translation.seoTitle || defaultSeoTitle(translation.name),
      seoDescription: translation.seoDescription || defaultSeoDescription(translation.shortDescription)
    };
  };

  const translations: AdminProductInput["translations"] = {
    cs,
    sk: localizedTranslation("sk"),
    en: localizedTranslation("en"),
    de: localizedTranslation("de")
  };

  return adminProductSchema.safeParse({
    sku: (text(formData, "sku") || defaultSku(cs.name)).toUpperCase(),
    category: text(formData, "category"),
    weightGrams: optionalNumber(formData, "weightGrams"),
    stockQuantity: numberValue(formData, "stockQuantity"),
    lowStockThreshold: numberValue(formData, "lowStockThreshold"),
    styleTags: text(formData, "styleTags").split(",").map((item) => item.trim()).filter(Boolean),
    publicationStatus: text(formData, "publicationStatus") || "draft",
    featured: formData.get("featured") === "on",
    isNew: formData.get("isNew") === "on",
    sortOrder: numberValue(formData, "sortOrder"),
    translations,
    prices: {
      CZK: {
        amountMinor: moneyMinor(formData, "priceCzk"),
        originalAmountMinor: optionalMoneyMinor(formData, "originalPriceCzk")
      },
      EUR: {
        amountMinor: moneyMinor(formData, "priceEur"),
        originalAmountMinor: optionalMoneyMinor(formData, "originalPriceEur")
      }
    }
  });
}
