import { z } from "zod";

const localizedProductSchema = z.object({
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  name: z.string().trim().min(2).max(160),
  shortDescription: z.string().trim().min(10).max(500),
  longDescription: z.string().trim().min(20).max(10000),
  material: z.string().trim().min(2).max(500),
  color: z.string().trim().min(2).max(300),
  dimensions: z.string().trim().min(2).max(500),
  care: z.string().trim().min(10).max(3000),
  seoTitle: z.string().trim().min(10).max(70),
  seoDescription: z.string().trim().min(40).max(170)
});

const priceSchema = z.object({
  amountMinor: z.number().int().nonnegative(),
  originalAmountMinor: z.number().int().positive().nullable()
}).superRefine((price, ctx) => {
  if (price.originalAmountMinor !== null && price.originalAmountMinor <= price.amountMinor) {
    ctx.addIssue({ code: "custom", path: ["originalAmountMinor"], message: "Původní cena musí být vyšší než aktuální." });
  }
});

export const adminProductSchema = z.object({
  internalId: z.string().trim().min(3).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  sku: z.string().trim().min(3).max(64).regex(/^[A-Z0-9-]+$/),
  category: z.enum(["necklaces", "earrings", "bracelets"]),
  weightGrams: z.number().positive().max(10000),
  stockQuantity: z.number().int().nonnegative(),
  lowStockThreshold: z.number().int().nonnegative().max(100000),
  active: z.boolean(),
  featured: z.boolean(),
  isNew: z.boolean(),
  sortOrder: z.number().int().min(-100000).max(100000),
  translations: z.object({
    cs: localizedProductSchema,
    en: localizedProductSchema,
    de: localizedProductSchema
  }),
  prices: z.object({
    CZK: priceSchema,
    EUR: priceSchema
  })
}).superRefine((product, ctx) => {
  const slugs = Object.values(product.translations).map((translation) => translation.slug);
  if (new Set(slugs).size !== slugs.length) {
    ctx.addIssue({ code: "custom", path: ["translations"], message: "Každý jazyk musí mít vlastní unikátní slug." });
  }
});

export type AdminProductInput = z.infer<typeof adminProductSchema>;

export function createEmptyAdminProduct(): AdminProductInput {
  const translation = {
    slug: "",
    name: "",
    shortDescription: "",
    longDescription: "",
    material: "",
    color: "",
    dimensions: "",
    care: "",
    seoTitle: "",
    seoDescription: ""
  };

  return {
    internalId: "",
    sku: "",
    category: "necklaces",
    weightGrams: 1,
    stockQuantity: 0,
    lowStockThreshold: 2,
    active: false,
    featured: false,
    isNew: false,
    sortOrder: 0,
    translations: {
      cs: { ...translation },
      en: { ...translation },
      de: { ...translation }
    },
    prices: {
      CZK: { amountMinor: 0, originalAmountMinor: null },
      EUR: { amountMinor: 0, originalAmountMinor: null }
    }
  };
}
