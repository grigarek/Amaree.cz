import { describe, expect, it } from "vitest";
import { adminProductSchema } from "@/lib/products/admin-product-schema";

const translation = (slug: string, name: string) => ({
  slug,
  name,
  shortDescription: "Jemný šperk pro každodenní nošení.",
  longDescription: "Jemný šperk navržený pro každodenní nošení a snadné kombinování.",
  material: "Stříbro 925/1000",
  color: "Stříbrná",
  dimensions: "Délka 42 cm",
  care: "Uchovávejte v suchu a čistěte měkkým hadříkem.",
  seoTitle: `${name} | AMARÉE šperky`,
  seoDescription: `Objevte ${name.toLocaleLowerCase("cs")} od AMARÉE. Jemné zpracování, kvalitní materiál a elegantní balení.`
});

const product = {
  internalId: "test-necklace-001",
  sku: "AMR-TEST-001",
  category: "necklaces" as const,
  weightGrams: 4.2,
  stockQuantity: 5,
  lowStockThreshold: 2,
  active: false,
  featured: true,
  isNew: true,
  sortOrder: 10,
  translations: {
    cs: translation("testovaci-nahrdelnik", "Testovací náhrdelník"),
    en: translation("test-necklace", "Test necklace"),
    de: translation("test-halskette", "Test Halskette")
  },
  prices: {
    CZK: { amountMinor: 149000, originalAmountMinor: null },
    EUR: { amountMinor: 5990, originalAmountMinor: null }
  }
};

describe("admin product validation", () => {
  it("accepts a complete inactive product ready for database persistence", () => {
    expect(adminProductSchema.safeParse(product).success).toBe(true);
  });

  it("rejects duplicate localized slugs and an invalid original price", () => {
    const invalid = {
      ...structuredClone(product),
      translations: {
        ...structuredClone(product.translations),
        en: { ...product.translations.en, slug: product.translations.cs.slug }
      },
      prices: {
        ...product.prices,
        CZK: { ...product.prices.CZK, originalAmountMinor: 100000 }
      }
    };
    const result = adminProductSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join("."))).toEqual(expect.arrayContaining([
        "translations",
        "prices.CZK.originalAmountMinor"
      ]));
    }
  });
});
