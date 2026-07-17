import { adminProductSchema, type AdminProductInput } from "@/lib/products/admin-product-schema";

const locales = ["cs", "en", "de"] as const;

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

export function parseAdminProductFormData(formData: FormData) {
  const translations = Object.fromEntries(locales.map((locale) => [locale, {
    slug: text(formData, `${locale}.slug`),
    name: text(formData, `${locale}.name`),
    shortDescription: text(formData, `${locale}.shortDescription`),
    longDescription: text(formData, `${locale}.longDescription`),
    material: text(formData, `${locale}.material`),
    color: text(formData, `${locale}.color`),
    dimensions: text(formData, `${locale}.dimensions`),
    care: text(formData, `${locale}.care`),
    seoTitle: text(formData, `${locale}.seoTitle`),
    seoDescription: text(formData, `${locale}.seoDescription`)
  }])) as AdminProductInput["translations"];

  return adminProductSchema.safeParse({
    internalId: text(formData, "internalId"),
    sku: text(formData, "sku").toUpperCase(),
    category: text(formData, "category"),
    weightGrams: numberValue(formData, "weightGrams"),
    stockQuantity: numberValue(formData, "stockQuantity"),
    lowStockThreshold: numberValue(formData, "lowStockThreshold"),
    active: formData.get("active") === "on",
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
