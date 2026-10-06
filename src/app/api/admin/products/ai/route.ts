import { NextResponse } from "next/server";
import { z } from "zod";
import {
  canUseProductAiAssistant,
  mergeRequestedIdentityFields,
  productAiFieldSchema,
  productAiRequestSchema
} from "@/lib/ai/product-assistant";
import { isProductAiAssistantConfigured } from "@/lib/ai/product-assistant-config";
import { generateProductContentWithOpenAi, ProductAiProviderError } from "@/lib/ai/openai-product-assistant";
import { getAdminSession } from "@/lib/admin/session";
import {
  finishProductAiRequest,
  ProductAiRateLimitError,
  recordAppliedProductAiFields,
  startProductAiRequest
} from "@/lib/admin/product-ai-requests";
import { checkAdminProductIdentifiers, suggestAdminProductIdentifiers } from "@/lib/admin/products";
import { defaultSku, toSeoSlug } from "@/lib/products/product-identifiers";

const unavailableMessage = "AI pomocník momentálně není dostupný.";
const applySchema = z.object({
  requestId: z.string().uuid(),
  fields: z.array(productAiFieldSchema).max(11)
}).strict();

function safeError(message: string, status: number, code: string) {
  return NextResponse.json({ error: message, code }, { status });
}

export async function GET() {
  const admin = await getAdminSession();
  if (!canUseProductAiAssistant(admin)) return safeError("Neoprávněný přístup.", 401, "unauthorized");
  return NextResponse.json({ available: isProductAiAssistantConfigured(), message: unavailableMessage });
}

export async function POST(request: Request) {
  const admin = await getAdminSession();
  if (!canUseProductAiAssistant(admin)) return safeError("Neoprávněný přístup.", 401, "unauthorized");
  if (!isProductAiAssistantConfigured()) return safeError(unavailableMessage, 503, "unavailable");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return safeError("Zadané údaje nejsou platné.", 422, "invalid_input");
  }
  const parsed = productAiRequestSchema.safeParse(body);
  if (!parsed.success) return safeError("Zadané údaje nejsou platné.", 422, "invalid_input");
  const input = { ...parsed.data, fields: mergeRequestedIdentityFields(parsed.data) };
  const model = process.env.OPENAI_PRODUCT_ASSISTANT_MODEL ?? "gpt-5-mini";
  let requestId: string;

  try {
    requestId = await startProductAiRequest({ productId: input.productId, model, requestedFields: input.fields });
  } catch (error) {
    if (error instanceof ProductAiRateLimitError) return safeError("Limit AI návrhů byl dočasně vyčerpán. Zkuste to později.", 429, "rate_limit");
    return safeError(unavailableMessage, 503, "logging_unavailable");
  }

  try {
    const generated = await generateProductContentWithOpenAi(input, { model });
    const output = { ...generated.output, warnings: [...generated.output.warnings] };
    if (input.fields.includes("slug") && output.slug) output.slug = toSeoSlug(output.slug);
    if (input.fields.includes("skuSuggestion") && output.skuSuggestion) output.skuSuggestion = output.skuSuggestion.replace(/\D/g, "");

    if ((output.slug || output.skuSuggestion) && (output.name || input.facts.name)) {
      const fallback = await suggestAdminProductIdentifiers(output.name || input.facts.name, input.productId ?? undefined);
      const suggestedSku = output.skuSuggestion && /^\d{4,12}$/.test(output.skuSuggestion) ? output.skuSuggestion : fallback.sku;
      if (input.fields.includes("skuSuggestion")) output.skuSuggestion = suggestedSku;
      const candidateSku = suggestedSku || input.facts.sku || defaultSku(output.name || input.facts.name);
      const candidateSlug = output.slug || input.facts.slug || toSeoSlug(output.name || input.facts.name);
      const available = await checkAdminProductIdentifiers(candidateSku, candidateSlug, input.productId ?? undefined);
      if (output.skuSuggestion && !available.skuAvailable) {
        output.skuSuggestion = fallback.sku;
        output.warnings.push("Navržené SKU již existovalo, proto server připravil další dostupnou variantu.");
      }
      if (output.slug && !available.slugAvailable) {
        output.slug = fallback.slug;
        output.warnings.push("Navržený slug již existoval, proto server připravil další dostupnou variantu.");
      }
    }

    await finishProductAiRequest({ requestId, status: "success", usage: generated.usage });
    return NextResponse.json({ requestId, output });
  } catch (error) {
    const code = error instanceof ProductAiProviderError ? error.code : "internal";
    await finishProductAiRequest({ requestId, status: "error", errorCode: code }).catch(() => undefined);
    if (code === "timeout") return safeError("Příprava návrhu trvala příliš dlouho. Zkuste to znovu později.", 504, "timeout");
    if (code === "authentication") return safeError("OpenAI API klíč nebyl přijat. Zkontrolujte staging secret OPENAI_API_KEY.", 502, "authentication");
    if (code === "billing") return safeError("OpenAI API účet nemá aktivní kredit. Doplňte kredit v OpenAI Billing a zkuste návrh znovu.", 402, "billing");
    if (code === "model_unavailable") return safeError("Nastavený AI model není pro tento OpenAI projekt dostupný.", 502, "model_unavailable");
    if (code === "unsafe_output") return safeError("Návrh obsahoval neověřené údaje, proto nebyl použit.", 422, "unsafe_output");
    return safeError("Obsah se nepodařilo vygenerovat. Vaše rozpracované údaje zůstaly zachovány.", 502, "generation_failed");
  }
}

export async function PATCH(request: Request) {
  const admin = await getAdminSession();
  if (!canUseProductAiAssistant(admin)) return safeError("Neoprávněný přístup.", 401, "unauthorized");
  const parsed = applySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return safeError("Zadané údaje nejsou platné.", 422, "invalid_input");
  try {
    await recordAppliedProductAiFields(parsed.data.requestId, parsed.data.fields);
    return NextResponse.json({ ok: true });
  } catch {
    return safeError("Použití návrhu se nepodařilo zaznamenat.", 503, "logging_unavailable");
  }
}
