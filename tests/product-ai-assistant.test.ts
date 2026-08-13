import { describe, expect, it } from "vitest";
import {
  canUseProductAiAssistant,
  mergeRequestedIdentityFields,
  productAiOutputSchema,
  productAiRequestSchema,
  selectAppliedProductAiChanges,
  validateGroundedProductAiOutput,
  type ProductAiOutput,
  type ProductAiRequest
} from "@/lib/ai/product-assistant";
import { isProductAiAssistantConfigured } from "@/lib/ai/product-assistant-config";
import { generateProductContentWithOpenAi, ProductAiProviderError } from "@/lib/ai/openai-product-assistant";

const request: ProductAiRequest = {
  productId: null,
  fields: ["shortDescription", "longDescription", "seoTitle", "seoDescription", "imageAltTexts"],
  facts: {
    name: "AMARÉE Rosé náramek",
    sku: "",
    slug: "",
    category: "bracelets",
    material: "",
    color: "Růžová",
    dimensions: "",
    clasp: "",
    stones: "",
    weightGrams: null,
    instructions: "Nevymýšlej materiál.",
    existingText: { shortDescription: "Původní krátký text", longDescription: "Původní dlouhý text", seoTitle: "", seoDescription: "" }
  },
  images: []
};

const output: ProductAiOutput = {
  name: "AMARÉE Rosé náramek",
  shortDescription: "Jemný náramek s růžovým motivem čtyřlístku přináší přirozenou eleganci do každodenních kombinací. Decentní vzhled se snadno nosí samostatně i s dalšími šperky.",
  longDescription: "AMARÉE Rosé zaujme jemným řetízkem a růžovým motivem čtyřlístku, který působí lehce a elegantně. Jeho decentní vzhled přirozeně doplní každodenní outfit i slavnostnější kombinaci.\n\nNáramek můžete nosit samostatně jako nenápadný detail nebo jej vrstvit s dalšími oblíbenými šperky. Čisté linie a měkký barevný akcent se snadno propojí s různými styly.\n\nDíky půvabnému motivu může být také milým dárkem pro někoho blízkého. Materiál a přesné rozměry je před nákupem potřeba doplnit do parametrů produktu.",
  seoTitle: "AMARÉE Rosé náramek | AMARÉE",
  seoDescription: "Objevte jemný náramek AMARÉE Rosé s růžovým motivem čtyřlístku. Elegantní šperk pro každodenní nošení i jako milý dárek od AMARÉE.",
  slug: "amaree-rose-naramek",
  skuSuggestion: "1001",
  categorySuggestion: { categoryId: "bracelets", categoryName: "Náramky", confidence: 0.98 },
  colors: ["růžová", "stříbrný odstín"],
  tags: ["jemný", "romantický"],
  localizedParameters: {
    cs: { dimensions: "", clasp: "" },
    sk: { dimensions: "", clasp: "" },
    en: { dimensions: "", clasp: "" },
    de: { dimensions: "", clasp: "" }
  },
  imageAltTexts: [],
  warnings: [],
  missingInformation: ["materiál", "rozměry"]
};

describe("product AI assistant contracts", () => {
  it("denies unauthenticated users and ordinary customers", () => {
    expect(canUseProductAiAssistant(null)).toBe(false);
    expect(canUseProductAiAssistant({ role: "customer" })).toBe(false);
    expect(canUseProductAiAssistant({ role: "editor" })).toBe(true);
  });

  it("stays unavailable when disabled or missing the server key", () => {
    expect(isProductAiAssistantConfigured({ AI_PRODUCT_ASSISTANT_ENABLED: "false", OPENAI_API_KEY: "secret" })).toBe(false);
    expect(isProductAiAssistantConfigured({ AI_PRODUCT_ASSISTANT_ENABLED: "true" })).toBe(false);
    expect(isProductAiAssistantConfigured({ AI_PRODUCT_ASSISTANT_ENABLED: "true", OPENAI_API_KEY: "secret" })).toBe(true);
  });

  it("rejects invalid input and more than five photos", () => {
    expect(productAiRequestSchema.safeParse({}).success).toBe(false);
    const tooManyImages = { ...request, images: Array.from({ length: 6 }, (_, index) => ({ id: String(index), imageUrl: `data:image/jpeg;base64,${"a".repeat(30)}` })) };
    expect(productAiRequestSchema.safeParse(tooManyImages).success).toBe(false);
  });

  it("adds empty identity fields to a manual request", () => {
    expect(mergeRequestedIdentityFields(request)).toEqual(expect.arrayContaining(["slug", "skuSuggestion"]));
    expect(mergeRequestedIdentityFields(request)).not.toContain("name");
    expect(mergeRequestedIdentityFields({ ...request, facts: { ...request.facts, name: "" } })).toContain("name");
  });

  it("preserves every field that was not explicitly accepted", () => {
    const changes = selectAppliedProductAiChanges(output, ["shortDescription", "seoTitle"]);
    expect(changes).toEqual({ shortDescription: output.shortDescription, seoTitle: output.seoTitle });
    expect(changes).not.toHaveProperty("name");
    expect(changes).not.toHaveProperty("longDescription");
    expect(changes).not.toHaveProperty("category");
  });

  it("applies localized dimensions and clasp only when requested", () => {
    const localizedOutput = {
      ...output,
      localizedParameters: {
        cs: { dimensions: "Délka 16–19 cm", clasp: "Karabinka" },
        sk: { dimensions: "Dĺžka 16–19 cm", clasp: "Karabínka" },
        en: { dimensions: "Length 16–19 cm", clasp: "Lobster clasp" },
        de: { dimensions: "Länge 16–19 cm", clasp: "Karabinerverschluss" }
      }
    };
    expect(selectAppliedProductAiChanges(localizedOutput, ["dimensions", "clasp"])).toEqual({ localizedParameters: localizedOutput.localizedParameters });
  });

  it("blocks unsupported material and product claims", () => {
    const unsafe = { ...output, shortDescription: "Hypoalergenní stříbrný náramek s diamantem je voděodolný." };
    expect(validateGroundedProductAiOutput(unsafe, request).length).toBeGreaterThan(0);
    expect(validateGroundedProductAiOutput(output, request)).toEqual([]);
  });

  it("never accepts AI output containing hallmark or fineness claims", () => {
    const unsafe = { ...output, longDescription: `${output.longDescription}\n\nŠperk je opatřen českým puncem a má ryzost 925/1000.` };
    expect(validateGroundedProductAiOutput(unsafe, request)).toContain("AI návrh nesmí obsahovat údaje o puncu, ryzosti ani kontrole Puncovním úřadem.");
  });

  it("rejects a model response that does not match the strict schema without exposing it", async () => {
    const call = generateProductContentWithOpenAi(request, {
      apiKey: "test-key",
      model: "gpt-5-mini",
      fetchImplementation: async () => new Response(JSON.stringify({ output: [{ content: [{ type: "output_text", text: "{\"name\":\"x\"}" }] }] }), { status: 200 })
    });
    await expect(call).rejects.toMatchObject({ code: "invalid_response" });
    await call.catch((error) => expect(error).toBeInstanceOf(ProductAiProviderError));
  });

  it("distinguishes missing OpenAI credit from a generic provider failure", async () => {
    const call = generateProductContentWithOpenAi(request, {
      apiKey: "test-key",
      model: "gpt-5-mini",
      fetchImplementation: async () => new Response(JSON.stringify({ error: { code: "insufficient_quota", message: "Check your billing details." } }), { status: 429 })
    });
    await expect(call).rejects.toMatchObject({ code: "billing" });
  });

  it("accepts only fully validated structured output", () => {
    expect(productAiOutputSchema.safeParse(output).success).toBe(true);
    expect(productAiOutputSchema.safeParse({ ...output, unexpected: "field" }).success).toBe(false);
  });
});
