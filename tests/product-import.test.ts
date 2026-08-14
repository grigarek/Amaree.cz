import { describe, expect, it } from "vitest";
import { productImportListSchema, productImportSchema } from "@/lib/products/import-schema";

const baseProduct = {
  internalId: "prod-test-001",
  name: { cs: "Test", sk: "Test", en: "Test", de: "Test" },
  slug: { cs: "test-cs", sk: "test-sk", en: "test-en", de: "test-de" },
  sku: "1001",
  category: "earrings" as const,
  priceCzkMinor: 100000,
  priceEurMinor: 4000,
  originalPriceCzkMinor: 120000,
  originalPriceEurMinor: 4800,
  stockQuantity: 1,
  shortDescription: { cs: "Krátký popis", sk: "Krátky popis", en: "Short copy", de: "Kurztext" },
  longDescription: { cs: "Dlouhý popis", sk: "Dlhý popis", en: "Long copy", de: "Langtext" },
  material: { cs: "Ocel", sk: "Oceľ", en: "Steel", de: "Stahl" },
  color: { cs: "Zlatá", sk: "Zlatá", en: "Gold", de: "Gold" },
  dimensions: { cs: "10 mm", sk: "10 mm", en: "10 mm", de: "10 mm" },
  weightGrams: 2.5,
  care: { cs: "V suchu", sk: "V suchu", en: "Keep dry", de: "Trocken lagern" },
  mainImage: {
    path: "products/test/main.webp",
    alt: { cs: "Test CS", sk: "Test SK", en: "Test EN", de: "Test DE" },
    sortOrder: 0 as const
  },
  additionalImages: [],
  active: false,
  featured: false,
  isNew: false,
  variants: [],
  seo: {
    title: { cs: "Test CS", sk: "Test SK", en: "Test EN", de: "Test DE" },
    description: { cs: "SEO CS", sk: "SEO SK", en: "SEO EN", de: "SEO DE" }
  }
};

describe("product import schema", () => {
  it("accepts a complete localized product with both currencies", () => {
    expect(productImportSchema.safeParse(baseProduct).success).toBe(true);
  });

  it("rejects a price presented as an invalid discount", () => {
    expect(
      productImportSchema.safeParse({ ...baseProduct, originalPriceCzkMinor: 90000 }).success
    ).toBe(false);
  });

  it("requires a distinct slug for each locale", () => {
    expect(
      productImportSchema.safeParse({ ...baseProduct, slug: { cs: "same", sk: "same", en: "same", de: "same" } }).success
    ).toBe(false);
  });

  it("requires variant stock to match the product total", () => {
    const variant = {
      variantId: "gold",
      sku: "1002",
      name: { cs: "Zlatá", sk: "Zlatá", en: "Gold", de: "Gold" },
      priceCzkMinor: null,
      priceEurMinor: null,
      originalPriceCzkMinor: null,
      originalPriceEurMinor: null,
      stockQuantity: 2,
      material: null,
      color: { cs: "Zlatá", sk: "Zlatá", en: "Gold", de: "Gold" },
      dimensions: null,
      active: true
    };

    expect(productImportSchema.safeParse({ ...baseProduct, variants: [variant] }).success).toBe(false);
    expect(
      productImportSchema.safeParse({ ...baseProduct, stockQuantity: 2, variants: [variant] }).success
    ).toBe(true);
  });

  it("rejects duplicate identifiers across the whole import", () => {
    expect(productImportListSchema.safeParse([baseProduct, baseProduct]).success).toBe(false);
  });
});
