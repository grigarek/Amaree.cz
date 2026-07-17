import { z } from "zod";

const locales = ["cs", "en", "de"] as const;

const localizedRequiredSchema = z.object(
  Object.fromEntries(locales.map((locale) => [locale, z.string().trim().min(1)])) as Record<
    (typeof locales)[number],
    z.ZodString
  >
);

const localizedSlugSchema = z.object(
  Object.fromEntries(
    locales.map((locale) => [locale, z.string().trim().min(2).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)])
  ) as Record<(typeof locales)[number], z.ZodString>
);

const skuSchema = z.string().trim().min(3).max(64).regex(/^[A-Z0-9-]+$/);
const moneySchema = z.number().int().nonnegative();

const productVariantSchema = z
  .object({
    variantId: z.string().trim().min(2).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    sku: skuSchema,
    name: localizedRequiredSchema,
    priceCzkMinor: moneySchema.nullable(),
    priceEurMinor: moneySchema.nullable(),
    originalPriceCzkMinor: moneySchema.positive().nullable(),
    originalPriceEurMinor: moneySchema.positive().nullable(),
    stockQuantity: z.number().int().nonnegative(),
    material: localizedRequiredSchema.nullable(),
    color: localizedRequiredSchema.nullable(),
    dimensions: localizedRequiredSchema.nullable(),
    active: z.boolean()
  })
  .superRefine((variant, ctx) => {
    const hasCzkPrice = variant.priceCzkMinor !== null;
    const hasEurPrice = variant.priceEurMinor !== null;
    if (hasCzkPrice !== hasEurPrice) {
      ctx.addIssue({
        code: "custom",
        path: ["priceEurMinor"],
        message: "Varianta musí přepsat obě měny, nebo použít obě ceny hlavního produktu."
      });
    }

    if (
      variant.originalPriceCzkMinor !== null &&
      (variant.priceCzkMinor === null || variant.originalPriceCzkMinor <= variant.priceCzkMinor)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["originalPriceCzkMinor"],
        message: "Původní CZK cena varianty musí být vyšší než její aktuální cena."
      });
    }

    if (
      variant.originalPriceEurMinor !== null &&
      (variant.priceEurMinor === null || variant.originalPriceEurMinor <= variant.priceEurMinor)
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["originalPriceEurMinor"],
        message: "Původní EUR cena varianty musí být vyšší než její aktuální cena."
      });
    }
  });

export const productImportSchema = z
  .object({
    internalId: z.string().trim().min(3).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    name: localizedRequiredSchema,
    slug: localizedSlugSchema,
    sku: skuSchema,
    category: z.enum(["earrings", "necklaces", "bracelets"]),
    priceCzkMinor: moneySchema,
    priceEurMinor: moneySchema,
    originalPriceCzkMinor: moneySchema.positive().nullable(),
    originalPriceEurMinor: moneySchema.positive().nullable(),
    stockQuantity: z.number().int().nonnegative(),
    shortDescription: localizedRequiredSchema,
    longDescription: localizedRequiredSchema,
    material: localizedRequiredSchema,
    color: localizedRequiredSchema,
    dimensions: localizedRequiredSchema,
    weightGrams: z.number().positive().max(10000),
    care: localizedRequiredSchema,
    mainImage: z.object({
      path: z.string().trim().min(1),
      alt: localizedRequiredSchema,
      sortOrder: z.literal(0)
    }),
    additionalImages: z.array(
      z.object({
        path: z.string().trim().min(1),
        alt: localizedRequiredSchema,
        sortOrder: z.number().int().positive()
      })
    ),
    active: z.boolean(),
    featured: z.boolean(),
    isNew: z.boolean(),
    variants: z.array(productVariantSchema).default([]),
    seo: z.object({
      title: localizedRequiredSchema,
      description: localizedRequiredSchema
    })
  })
  .superRefine((product, ctx) => {
    if (
      product.originalPriceCzkMinor !== null &&
      product.originalPriceCzkMinor <= product.priceCzkMinor
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["originalPriceCzkMinor"],
        message: "Původní CZK cena musí být vyšší než aktuální cena."
      });
    }

    if (
      product.originalPriceEurMinor !== null &&
      product.originalPriceEurMinor <= product.priceEurMinor
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["originalPriceEurMinor"],
        message: "Původní EUR cena musí být vyšší než aktuální cena."
      });
    }

    if (new Set(Object.values(product.slug)).size !== locales.length) {
      ctx.addIssue({
        code: "custom",
        path: ["slug"],
        message: "Slug musí být pro každý jazyk samostatný."
      });
    }

    const imagePaths = [product.mainImage.path, ...product.additionalImages.map((image) => image.path)];
    if (new Set(imagePaths).size !== imagePaths.length) {
      ctx.addIssue({
        code: "custom",
        path: ["additionalImages"],
        message: "Cesta k fotografii se v jednom produktu nesmí opakovat."
      });
    }

    const sortOrders = product.additionalImages.map((image) => image.sortOrder);
    if (new Set(sortOrders).size !== sortOrders.length) {
      ctx.addIssue({
        code: "custom",
        path: ["additionalImages"],
        message: "Pořadí doplňkových fotografií se nesmí opakovat."
      });
    }

    const variantIds = product.variants.map((variant) => variant.variantId);
    const variantSkus = product.variants.map((variant) => variant.sku);
    if (new Set(variantIds).size !== variantIds.length) {
      ctx.addIssue({ code: "custom", path: ["variants"], message: "ID variant se nesmí opakovat." });
    }
    if (new Set([product.sku, ...variantSkus]).size !== variantSkus.length + 1) {
      ctx.addIssue({ code: "custom", path: ["variants"], message: "SKU produktu a variant musí být unikátní." });
    }

    if (product.variants.length > 0) {
      const variantStock = product.variants.reduce((total, variant) => total + variant.stockQuantity, 0);
      if (product.stockQuantity !== variantStock) {
        ctx.addIssue({
          code: "custom",
          path: ["stockQuantity"],
          message: "Sklad produktu s variantami musí odpovídat součtu skladů aktivních i neaktivních variant."
        });
      }
    }
  });

export const productImportListSchema = z.array(productImportSchema).min(1).superRefine((products, ctx) => {
  const duplicateFields: Array<[string, string[]]> = [
    ["internalId", products.map((product) => product.internalId)],
    ["sku", products.flatMap((product) => [product.sku, ...product.variants.map((variant) => variant.sku)])],
    ["slug", products.flatMap((product) => Object.values(product.slug))]
  ];

  for (const [field, values] of duplicateFields) {
    if (new Set(values).size !== values.length) {
      ctx.addIssue({ code: "custom", path: [], message: `Hodnoty pole ${field} musí být v celém importu unikátní.` });
    }
  }
});

export type ProductImportRecord = z.infer<typeof productImportSchema>;
