import { describe, expect, it } from "vitest";
import { parseAdminProductFormData } from "@/lib/products/admin-product-form";
import { adminProductSchema } from "@/lib/products/admin-product-schema";
import { defaultSeoDescription, defaultSeoTitle, defaultSku, productInitials, toSeoSlug } from "@/lib/products/product-identifiers";

const translation = (slug: string, name: string, locale: "cs" | "sk" | "en" | "de" = "cs") => ({
  slug,
  name,
  ...(locale === "cs" ? { shortDescription: "Jemný šperk pro každodenní nošení.", longDescription: "Jemný šperk navržený pro každodenní nošení.", material: "Stříbro 925/1000", color: "Stříbrná", dimensions: "Délka 42 cm", clasp: "Karabinka", stones: "Bez kamenů", care: "Uchovávejte v suchu a čistěte měkkým hadříkem." }
    : locale === "sk" ? { shortDescription: "Jemný šperk na každodenné nosenie.", longDescription: "Jemný šperk navrhnutý na každodenné nosenie.", material: "Striebro 925/1000", color: "Strieborná", dimensions: "Dĺžka 42 cm", clasp: "Karabínkové zapínanie", stones: "Bez kameňov", care: "Uchovávajte v suchu a čistite mäkkou handričkou." }
      : locale === "en" ? { shortDescription: "Fine jewelry for everyday wear.", longDescription: "Fine jewelry designed for everyday wear.", material: "Silver 925/1000", color: "Silver", dimensions: "Length 42 cm", clasp: "Lobster clasp", stones: "No stones", care: "Keep dry and clean with a soft cloth." }
        : { shortDescription: "Feiner Schmuck für jeden Tag.", longDescription: "Feiner Schmuck für den Alltag.", material: "Silber 925/1000", color: "Silber", dimensions: "Länge 42 cm", clasp: "Karabinerverschluss", stones: "Ohne Steine", care: "Trocken aufbewahren und mit einem weichen Tuch reinigen." }),
  seoTitle: `${name} | AMARÉE`,
  seoDescription: locale === "cs" ? `Objevte ${name.toLocaleLowerCase("cs")} od AMARÉE.` : `${name} by AMARÉE.`
});

const product = {
  sku: "1001",
  category: "necklaces" as const,
  weightGrams: 4.2,
  stockQuantity: 5,
  lowStockThreshold: 2,
  styleTags: ["jemný", "minimalistický"],
  publicationStatus: "draft" as const,
  featured: true,
  isNew: true,
  sortOrder: 10,
  translations: {
    cs: translation("testovaci-nahrdelnik", "Testovací náhrdelník"),
    sk: translation("testovaci-nahrdelnik-sk", "Testovací náhrdelník", "sk"),
    en: translation("test-necklace", "Test necklace", "en"),
    de: translation("test-halskette", "Test Halskette", "de")
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

  it("rejects an invalid original price", () => {
    const invalid = {
      ...structuredClone(product),
      prices: {
        ...product.prices,
        CZK: { ...product.prices.CZK, originalAmountMinor: 100000 }
      }
    };
    const result = adminProductSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.path.join("."))).toEqual(expect.arrayContaining([
        "prices.CZK.originalAmountMinor"
      ]));
    }
  });

  it("allows a Czech-only draft without copying Czech content into other locales", () => {
    const formData = new FormData();
    formData.set("sku", product.sku);
    formData.set("category", product.category);
    formData.set("weightGrams", String(product.weightGrams));
    formData.set("stockQuantity", String(product.stockQuantity));
    formData.set("lowStockThreshold", String(product.lowStockThreshold));
    formData.set("sortOrder", String(product.sortOrder));
    formData.set("priceCzk", "1490");
    formData.set("priceEur", "59.90");
    Object.entries(product.translations.cs).forEach(([key, value]) => formData.set(`cs.${key}`, value));

    const result = parseAdminProductFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.translations.sk.name).toBe("");
      expect(result.data.translations.sk.clasp).toBe("");
      expect(result.data.translations.en.name).toBe("");
      expect(result.data.translations.de.name).toBe("");
      expect(result.data.translations.en.slug).toBe(`${result.data.translations.cs.slug}-en`);
      expect(result.data.translations.de.slug).toBe(`${result.data.translations.cs.slug}-de`);
    }
  });

  it("rejects obvious Czech product data in a foreign locale", () => {
    const invalid = structuredClone(product);
    invalid.translations.en.clasp = "Karabinkové zapínání";
    const result = adminProductSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.map((issue) => issue.path.join("."))).toContain("translations.en.clasp");
  });

  it("allows editing a legacy product whose weight has not been entered yet", () => {
    const formData = new FormData();
    formData.set("sku", product.sku);
    formData.set("category", product.category);
    formData.set("stockQuantity", String(product.stockQuantity));
    formData.set("lowStockThreshold", String(product.lowStockThreshold));
    formData.set("sortOrder", String(product.sortOrder));
    formData.set("priceCzk", "1599");
    formData.set("priceEur", "63.90");
    Object.entries(product.translations.cs).forEach(([key, value]) => formData.set(`cs.${key}`, value));

    const result = parseAdminProductFormData(formData);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.weightGrams).toBeNull();
      expect(result.data.prices.CZK.amountMinor).toBe(159900);
    }
  });

  it("generates readable SKU, SEO and diacritic-free slug defaults", () => {
    expect(productInitials("AMARÉE Rosé Bracelet")).toBe("ARB");
    expect(defaultSku("AMARÉE Rosé Bracelet")).toBe("1001");
    expect(toSeoSlug("AMARÉE Rosé Bracelet")).toBe("amaree-rose-bracelet");
    expect(defaultSeoTitle("AMARÉE Rosé Bracelet")).toBe("AMARÉE Rosé Bracelet | AMARÉE");
    expect(defaultSeoDescription("  Jemný   náramek pro každý den. ")).toBe("Jemný náramek pro každý den.");
  });

  it("keeps an empty SEO title empty until the product has a name", () => {
    expect(defaultSeoTitle("")).toBe("");
  });
});
