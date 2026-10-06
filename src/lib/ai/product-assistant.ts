import { z } from "zod";

export const productAiFieldSchema = z.enum([
  "name",
  "shortDescription",
  "longDescription",
  "seoTitle",
  "seoDescription",
  "slug",
  "skuSuggestion",
  "imageAltTexts",
  "categorySuggestion",
  "colors",
  "tags",
  "dimensions",
  "clasp"
]);

export type ProductAiField = z.infer<typeof productAiFieldSchema>;

export const defaultProductAiFields: ProductAiField[] = [
  "shortDescription",
  "longDescription",
  "seoTitle",
  "seoDescription",
  "dimensions",
  "clasp",
  "imageAltTexts"
];

export const productAiFieldLabels: Record<ProductAiField, string> = {
  name: "Název produktu",
  shortDescription: "Krátký popis",
  longDescription: "Dlouhý popis",
  seoTitle: "SEO title",
  seoDescription: "SEO description",
  slug: "Slug",
  skuSuggestion: "SKU",
  imageAltTexts: "ALT texty fotografií",
  categorySuggestion: "Kategorie",
  colors: "Barvy",
  tags: "Stylové štítky",
  dimensions: "Rozměry a délka (CS/SK/EN/DE)",
  clasp: "Typ zapínání (CS/SK/EN/DE)"
};

const existingTextSchema = z.object({
  shortDescription: z.string().trim().max(500),
  longDescription: z.string().trim().max(10000),
  seoTitle: z.string().trim().max(70),
  seoDescription: z.string().trim().max(170)
}).strict();

export const productAiImageSchema = z.object({
  id: z.string().trim().min(1).max(100),
  imageUrl: z.string().trim().min(20).max(950_000)
}).strict();

export const productAiRequestSchema = z.object({
  productId: z.string().uuid().nullable(),
  fields: z.array(productAiFieldSchema).min(1).max(13).refine((items) => new Set(items).size === items.length, "Pole se nesmí opakovat."),
  facts: z.object({
    name: z.string().trim().max(160),
    sku: z.string().trim().max(64),
    slug: z.string().trim().max(120),
    category: z.enum(["necklaces", "earrings", "bracelets"]),
    material: z.string().trim().max(500),
    color: z.string().trim().max(300),
    dimensions: z.string().trim().max(500),
    clasp: z.string().trim().max(300),
    stones: z.string().trim().max(500),
    weightGrams: z.number().positive().max(10000).nullable(),
    instructions: z.string().trim().max(1500),
    existingText: existingTextSchema
  }).strict(),
  images: z.array(productAiImageSchema).max(5)
}).strict().superRefine((value, ctx) => {
  const totalImageCharacters = value.images.reduce((sum, image) => sum + image.imageUrl.length, 0);
  if (totalImageCharacters > 4_750_000) {
    ctx.addIssue({ code: "custom", path: ["images"], message: "Fotografie jsou pro jeden AI požadavek příliš velké." });
  }
  value.images.forEach((image, index) => {
    if (!image.imageUrl.startsWith("data:image/jpeg;base64,") && !image.imageUrl.startsWith("data:image/webp;base64,")) {
      ctx.addIssue({ code: "custom", path: ["images", index, "imageUrl"], message: "Fotografie musí být bezpečně zmenšený JPEG nebo WebP." });
    }
  });
});

export const productAiOutputSchema = z.object({
  name: z.string().trim().max(160),
  shortDescription: z.string().trim().max(500),
  longDescription: z.string().trim().max(2000),
  seoTitle: z.string().trim().max(70),
  seoDescription: z.string().trim().max(170),
  slug: z.string().trim().max(120),
  skuSuggestion: z.string().trim().max(12),
  categorySuggestion: z.object({
    categoryId: z.enum(["necklaces", "earrings", "bracelets"]).nullable(),
    categoryName: z.string().trim().max(80),
    confidence: z.number().min(0).max(1)
  }).strict(),
  colors: z.array(z.string().trim().min(1).max(60)).max(6),
  tags: z.array(z.string().trim().min(1).max(60)).max(8),
  localizedParameters: z.object({
    cs: z.object({ dimensions: z.string().trim().max(500), clasp: z.string().trim().max(300) }).strict(),
    sk: z.object({ dimensions: z.string().trim().max(500), clasp: z.string().trim().max(300) }).strict(),
    en: z.object({ dimensions: z.string().trim().max(500), clasp: z.string().trim().max(300) }).strict(),
    de: z.object({ dimensions: z.string().trim().max(500), clasp: z.string().trim().max(300) }).strict()
  }).strict(),
  imageAltTexts: z.array(z.object({
    imageId: z.string().trim().min(1).max(100),
    altText: z.string().trim().min(3).max(180)
  }).strict()).max(5),
  warnings: z.array(z.string().trim().min(1).max(300)).max(12),
  missingInformation: z.array(z.string().trim().min(1).max(160)).max(12)
}).strict();

export type ProductAiRequest = z.infer<typeof productAiRequestSchema>;
export type ProductAiOutput = z.infer<typeof productAiOutputSchema>;

export type AppliedProductAiChanges = Partial<{
  name: string;
  shortDescription: string;
  longDescription: string;
  seoTitle: string;
  seoDescription: string;
  slug: string;
  skuSuggestion: string;
  category: "necklaces" | "earrings" | "bracelets";
  color: string;
  styleTags: string[];
  localizedParameters: ProductAiOutput["localizedParameters"];
  imageAltTexts: ProductAiOutput["imageAltTexts"];
}>;

export const productAiJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["name", "shortDescription", "longDescription", "seoTitle", "seoDescription", "slug", "skuSuggestion", "categorySuggestion", "colors", "tags", "localizedParameters", "imageAltTexts", "warnings", "missingInformation"],
  properties: {
    name: { type: "string", maxLength: 160 },
    shortDescription: { type: "string", maxLength: 500 },
    longDescription: { type: "string", maxLength: 2000 },
    seoTitle: { type: "string", maxLength: 70 },
    seoDescription: { type: "string", maxLength: 170 },
    slug: { type: "string", maxLength: 120 },
    skuSuggestion: { type: "string", maxLength: 12, pattern: "^[0-9]*$" },
    categorySuggestion: {
      type: "object",
      additionalProperties: false,
      required: ["categoryId", "categoryName", "confidence"],
      properties: {
        categoryId: { type: ["string", "null"], enum: ["necklaces", "earrings", "bracelets", null] },
        categoryName: { type: "string", maxLength: 80 },
        confidence: { type: "number", minimum: 0, maximum: 1 }
      }
    },
    colors: { type: "array", maxItems: 6, items: { type: "string", maxLength: 60 } },
    tags: { type: "array", maxItems: 8, items: { type: "string", maxLength: 60 } },
    localizedParameters: {
      type: "object",
      additionalProperties: false,
      required: ["cs", "sk", "en", "de"],
      properties: Object.fromEntries(["cs", "sk", "en", "de"].map((locale) => [locale, {
        type: "object",
        additionalProperties: false,
        required: ["dimensions", "clasp"],
        properties: {
          dimensions: { type: "string", maxLength: 500 },
          clasp: { type: "string", maxLength: 300 }
        }
      }]))
    },
    imageAltTexts: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["imageId", "altText"],
        properties: {
          imageId: { type: "string", maxLength: 100 },
          altText: { type: "string", maxLength: 180 }
        }
      }
    },
    warnings: { type: "array", maxItems: 12, items: { type: "string", maxLength: 300 } },
    missingInformation: { type: "array", maxItems: 12, items: { type: "string", maxLength: 160 } }
  }
} as const;

const prohibitedMarketingPhrases = ["revoluční", "bezkonkurenční", "nejlepší na trhu", "luxus za každou cenu", "magické účinky"];
const prohibitedHallmarkClaims = /punc|puncovní úřad|ryzost|\b(?:925|585)\s*(?:\/\s*1000)?\b/iu;
const factualClaimRules = [
  { pattern: /hypoalerg/iu, source: "" },
  { pattern: /voděodol|vodotěs/iu, source: "" },
  { pattern: /certifik/iu, source: "" },
  { pattern: /zdravotn|léčiv/iu, source: "" },
  { pattern: /ručně vyráb|ruční výro/iu, source: "" },
  { pattern: /záruk[ay]|garanc/iu, source: "" },
  { pattern: /stříbr(?:o|ný|ná|né)|925\/1000/iu, source: "material" },
  { pattern: /zlato|zlatý|zlatá|zlaté|14k|18k/iu, source: "material" },
  { pattern: /chirurgická ocel|nerezová ocel/iu, source: "material" },
  { pattern: /diamant|zirkon|krystal|perla/iu, source: "material" }
] as const;

export function validateGroundedProductAiOutput(output: ProductAiOutput, request: ProductAiRequest) {
  const text = [output.name, output.shortDescription, output.longDescription, output.seoTitle, output.seoDescription, ...output.imageAltTexts.map((item) => item.altText)].join(" ");
  const claimText = text
    .replace(/ve stříbrném odstínu|stříbrně působící/giu, "")
    .replace(/ve zlatém odstínu|zlatě působící/giu, "");
  const confirmedMaterial = `${request.facts.material} ${request.facts.stones}`.toLocaleLowerCase("cs");
  const violations: string[] = [];

  prohibitedMarketingPhrases.forEach((phrase) => {
    if (claimText.toLocaleLowerCase("cs").includes(phrase)) violations.push(`Zakázaná marketingová formulace: ${phrase}`);
  });
  if (prohibitedHallmarkClaims.test(claimText)) violations.push("AI návrh nesmí obsahovat údaje o puncu, ryzosti ani kontrole Puncovním úřadem.");
  factualClaimRules.forEach((rule) => {
    if (!rule.pattern.test(claimText)) return;
    if (rule.source === "material" && rule.pattern.test(confirmedMaterial)) return;
    violations.push("Návrh obsahuje neověřený technický nebo materiálový údaj.");
  });
  const measurements = claimText.match(/\b\d+(?:[,.]\d+)?\s*(?:mm|cm)\b/giu) ?? [];
  measurements.forEach((measurement) => {
    const normalizedMeasurement = measurement.toLocaleLowerCase("cs").replace(/\s+/g, "").replace(",", ".");
    const normalizedDimensions = `${request.facts.dimensions} ${request.facts.instructions}`.toLocaleLowerCase("cs").replace(/\s+/g, "").replace(/,/g, ".");
    if (!normalizedDimensions.includes(normalizedMeasurement)) violations.push("Návrh obsahuje nepotvrzený rozměr nebo délku.");
  });
  const weights = claimText.match(/\b\d+(?:[,.]\d+)?\s*g\b/giu) ?? [];
  weights.forEach((weight) => {
    const numeric = Number(weight.replace(/\s*g/iu, "").replace(",", "."));
    if (request.facts.weightGrams === null || Math.abs(numeric - request.facts.weightGrams) > 0.001) {
      violations.push("Návrh obsahuje nepotvrzenou hmotnost.");
    }
  });
  if (request.fields.includes("dimensions")) {
    const source = `${request.facts.dimensions} ${request.facts.instructions}`.toLocaleLowerCase("cs").replace(/\s+/g, "").replace(/,/g, ".");
    const parameterMeasurements = Object.values(output.localizedParameters).flatMap((translation) => translation.dimensions.match(/\b\d+(?:[,.]\d+)?\s*(?:mm|cm)\b/giu) ?? []);
    parameterMeasurements.forEach((measurement) => {
      const normalized = measurement.toLocaleLowerCase("cs").replace(/\s+/g, "").replace(/,/g, ".");
      if (!source.includes(normalized)) violations.push("AI návrh parametrů obsahuje nepotvrzený rozměr nebo délku.");
    });
  }

  return [...new Set(violations)];
}

export function mergeRequestedIdentityFields(request: ProductAiRequest) {
  const fields = new Set(request.fields);
  if (!request.facts.name) fields.add("name");
  if (!request.facts.slug) fields.add("slug");
  if (!request.facts.sku) fields.add("skuSuggestion");
  return [...fields] as ProductAiField[];
}

export function selectAppliedProductAiChanges(output: ProductAiOutput, fields: ProductAiField[]): AppliedProductAiChanges {
  const selected = new Set(fields);
  return {
    ...(selected.has("name") ? { name: output.name } : {}),
    ...(selected.has("shortDescription") ? { shortDescription: output.shortDescription } : {}),
    ...(selected.has("longDescription") ? { longDescription: output.longDescription } : {}),
    ...(selected.has("seoTitle") ? { seoTitle: output.seoTitle } : {}),
    ...(selected.has("seoDescription") ? { seoDescription: output.seoDescription } : {}),
    ...(selected.has("slug") ? { slug: output.slug } : {}),
    ...(selected.has("skuSuggestion") ? { skuSuggestion: output.skuSuggestion } : {}),
    ...(selected.has("categorySuggestion") && output.categorySuggestion.categoryId ? { category: output.categorySuggestion.categoryId } : {}),
    ...(selected.has("colors") ? { color: output.colors.join(", ") } : {}),
    ...(selected.has("tags") ? { styleTags: output.tags } : {}),
    ...(selected.has("dimensions") || selected.has("clasp") ? { localizedParameters: output.localizedParameters } : {}),
    ...(selected.has("imageAltTexts") ? { imageAltTexts: output.imageAltTexts } : {})
  };
}

export function canUseProductAiAssistant(session: { role?: string } | null | undefined) {
  return session?.role === "admin" || session?.role === "editor";
}
