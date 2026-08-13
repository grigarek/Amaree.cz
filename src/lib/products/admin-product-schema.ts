import { z } from "zod";
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const localizedProductSchema = z.object({
  slug: z.string().trim().max(120).refine((value) => !value || slugPattern.test(value), "Slug může obsahovat jen malá písmena, čísla a pomlčky."),
  name: z.string().trim().max(160),
  shortDescription: z.string().trim().max(500),
  longDescription: z.string().trim().max(10000),
  material: z.string().trim().max(500),
  color: z.string().trim().max(300),
  dimensions: z.string().trim().max(500),
  clasp: z.string().trim().max(300),
  stones: z.string().trim().max(500),
  care: z.string().trim().max(3000),
  seoTitle: z.string().trim().max(70),
  seoDescription: z.string().trim().max(170)
});

const priceSchema = z.object({
  amountMinor: z.number().int().positive("Prodejní cena musí být vyšší než 0."),
  originalAmountMinor: z.number().int().positive("Původní cena musí být vyšší než 0.").nullable()
}).superRefine((price, ctx) => {
  if (price.originalAmountMinor !== null && price.originalAmountMinor <= price.amountMinor) {
    ctx.addIssue({ code: "custom", path: ["originalAmountMinor"], message: "Původní cena musí být vyšší než aktuální." });
  }
});

const czechProductWords = /(?:[ěřů]|délka|zapínání|karabinka|karabinkové|kloubové|stříbrná|růžová|černá|kamínky|náramek|chraňte|řetízek|uchovávejte|měkkým|hadříkem)/iu;

export const adminProductSchema = z.object({
  sku: z.string().trim().min(4).max(12).regex(/^\d+$/, "Kód produktu může obsahovat pouze číslice."),
  category: z.enum(["necklaces", "earrings", "bracelets"]),
  weightGrams: z.number().positive("Hmotnost produktu musí být vyšší než 0.").max(10000).nullable(),
  stockQuantity: z.number().int().nonnegative(),
  lowStockThreshold: z.number().int().nonnegative().max(100000),
  styleTags: z.array(z.string().trim().min(1).max(60)).max(8),
  publicationStatus: z.enum(["draft", "active", "hidden", "archived"]),
  featured: z.boolean(),
  isNew: z.boolean(),
  sortOrder: z.number().int().min(-100000).max(100000),
  translations: z.object({
    cs: localizedProductSchema,
    sk: localizedProductSchema,
    en: localizedProductSchema,
    de: localizedProductSchema
  }),
  prices: z.object({
    CZK: priceSchema,
    EUR: priceSchema
  })
}).superRefine((product, context) => {
  const requiredLocales: Array<"cs" | "sk"> = product.publicationStatus === "active" ? ["cs", "sk"] : ["cs"];
  for (const locale of requiredLocales) {
    const translation = product.translations[locale];
    if (translation.name.length < 2) context.addIssue({ code: "custom", path: ["translations", locale, "name"], message: `Doplňte název pro ${locale.toUpperCase()}.` });
    if (!slugPattern.test(translation.slug)) context.addIssue({ code: "custom", path: ["translations", locale, "slug"], message: `Doplňte platný slug pro ${locale.toUpperCase()}.` });
  }

  for (const locale of ["sk", "en", "de"] as const) {
    const translation = product.translations[locale];
    for (const field of ["name", "shortDescription", "longDescription", "material", "color", "dimensions", "clasp", "stones", "care", "seoTitle", "seoDescription"] as const) {
      if (translation[field] && czechProductWords.test(translation[field])) {
        context.addIssue({ code: "custom", path: ["translations", locale, field], message: `Text pro ${locale.toUpperCase()} vypadá jako čeština. Přeložte jej nebo použijte AI pomocníka.` });
      }
    }
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
    clasp: "",
    stones: "",
    care: "",
    seoTitle: "",
    seoDescription: ""
  };

  return {
    sku: "",
    category: "necklaces",
    weightGrams: null,
    stockQuantity: 0,
    lowStockThreshold: 2,
    styleTags: [],
    publicationStatus: "draft",
    featured: false,
    isNew: false,
    sortOrder: 0,
    translations: {
      cs: { ...translation },
      sk: { ...translation },
      en: { ...translation },
      de: { ...translation }
    },
    prices: {
      CZK: { amountMinor: 0, originalAmountMinor: null },
      EUR: { amountMinor: 0, originalAmountMinor: null }
    }
  };
}
