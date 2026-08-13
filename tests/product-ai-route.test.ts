import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminSession: vi.fn(),
  generate: vi.fn(),
  start: vi.fn(),
  finish: vi.fn(),
  record: vi.fn(),
  check: vi.fn(),
  suggest: vi.fn()
}));

vi.mock("@/lib/admin/session", () => ({ getAdminSession: mocks.getAdminSession }));
vi.mock("@/lib/ai/openai-product-assistant", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/openai-product-assistant")>("@/lib/ai/openai-product-assistant");
  return { ...actual, generateProductContentWithOpenAi: mocks.generate };
});
vi.mock("@/lib/admin/product-ai-requests", async () => {
  const actual = await vi.importActual<typeof import("@/lib/admin/product-ai-requests")>("@/lib/admin/product-ai-requests");
  return {
    ...actual,
    startProductAiRequest: mocks.start,
    finishProductAiRequest: mocks.finish,
    recordAppliedProductAiFields: mocks.record
  };
});
vi.mock("@/lib/admin/products", () => ({
  checkAdminProductIdentifiers: mocks.check,
  suggestAdminProductIdentifiers: mocks.suggest
}));

import { GET, PATCH, POST } from "@/app/api/admin/products/ai/route";
import { ProductAiProviderError } from "@/lib/ai/openai-product-assistant";

const validInput = {
  productId: null,
  fields: ["slug", "skuSuggestion"],
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
    instructions: "",
    existingText: { shortDescription: "", longDescription: "", seoTitle: "", seoDescription: "" }
  },
  images: []
};

const generatedOutput = {
  name: "",
  shortDescription: "",
  longDescription: "",
  seoTitle: "",
  seoDescription: "",
  slug: "amaree-rose-naramek",
  skuSuggestion: "1001",
  categorySuggestion: { categoryId: null, categoryName: "", confidence: 0 },
  colors: [],
  tags: [],
  localizedParameters: {
    cs: { dimensions: "", clasp: "" },
    sk: { dimensions: "", clasp: "" },
    en: { dimensions: "", clasp: "" },
    de: { dimensions: "", clasp: "" }
  },
  imageAltTexts: [],
  warnings: [],
  missingInformation: []
};

function post(body: unknown) {
  return POST(new Request("http://localhost/api/admin/products/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }));
}

describe("product AI admin endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AI_PRODUCT_ASSISTANT_ENABLED = "true";
    process.env.OPENAI_API_KEY = "server-test-key";
    mocks.getAdminSession.mockResolvedValue({ userId: "admin", role: "admin", email: "admin@example.test", mode: "supabase" });
    mocks.start.mockResolvedValue("a25aa8d8-35f4-4bd7-9e1b-0bce2b3198c2");
    mocks.finish.mockResolvedValue(undefined);
    mocks.record.mockResolvedValue(undefined);
    mocks.generate.mockResolvedValue({ output: generatedOutput, usage: { inputTokens: 120, outputTokens: 80 } });
    mocks.check.mockResolvedValue({ skuAvailable: true, slugAvailable: true });
    mocks.suggest.mockResolvedValue({ sku: "1002", slug: "amaree-rose-naramek-2" });
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_PRODUCT_ASSISTANT_ENABLED;
  });

  it("rejects unauthenticated and non-admin sessions", async () => {
    mocks.getAdminSession.mockResolvedValueOnce(null);
    expect((await GET()).status).toBe(401);
    mocks.getAdminSession.mockResolvedValueOnce({ role: "customer" });
    expect((await post(validInput)).status).toBe(401);
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("returns the same safe unavailable state when disabled or missing a key", async () => {
    process.env.AI_PRODUCT_ASSISTANT_ENABLED = "false";
    const disabled = await post(validInput);
    expect(disabled.status).toBe(503);
    expect(await disabled.json()).toMatchObject({ error: "AI pomocník momentálně není dostupný." });

    process.env.AI_PRODUCT_ASSISTANT_ENABLED = "true";
    delete process.env.OPENAI_API_KEY;
    const missingKey = await post(validInput);
    expect(missingKey.status).toBe(503);
  });

  it("rejects invalid input before starting a billable request", async () => {
    const response = await post({ fields: [] });
    expect(response.status).toBe(422);
    expect(mocks.start).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
  });

  it("replaces duplicate SKU and slug with server-checked suggestions", async () => {
    mocks.check.mockResolvedValue({ skuAvailable: false, slugAvailable: false });
    const response = await post(validInput);
    const body = await response.json() as { output: typeof generatedOutput };
    expect(response.status).toBe(200);
    expect(body.output.skuSuggestion).toBe("1002");
    expect(body.output.slug).toBe("amaree-rose-naramek-2");
    expect(mocks.finish).toHaveBeenCalledWith(expect.objectContaining({ status: "success" }));
  });

  it("records only fields explicitly accepted by the administrator", async () => {
    const response = await PATCH(new Request("http://localhost/api/admin/products/ai", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: "a25aa8d8-35f4-4bd7-9e1b-0bce2b3198c2", fields: ["seoTitle"] })
    }));
    expect(response.status).toBe(200);
    expect(mocks.record).toHaveBeenCalledWith("a25aa8d8-35f4-4bd7-9e1b-0bce2b3198c2", ["seoTitle"]);
  });

  it("returns an actionable message when the OpenAI account has no credit", async () => {
    mocks.generate.mockRejectedValue(new ProductAiProviderError("billing"));
    const response = await post(validInput);
    expect(response.status).toBe(402);
    expect(await response.json()).toMatchObject({ code: "billing", error: expect.stringContaining("kredit") });
    expect(mocks.finish).toHaveBeenCalledWith(expect.objectContaining({ status: "error", errorCode: "billing" }));
  });
});
