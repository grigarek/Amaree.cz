import "server-only";
import type { ProductAiField } from "@/lib/ai/product-assistant";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export class ProductAiRateLimitError extends Error {
  constructor() {
    super("ai_rate_limit");
    this.name = "ProductAiRateLimitError";
  }
}

export async function startProductAiRequest(input: {
  productId: string | null;
  model: string;
  requestedFields: ProductAiField[];
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_start_product_ai_request", {
    p_product_id: input.productId,
    p_model: input.model,
    p_requested_fields: input.requestedFields
  });
  if (error?.message.includes("ai_rate_limit")) throw new ProductAiRateLimitError();
  if (error || typeof data !== "string") throw new Error("ai_logging_unavailable");
  return data;
}

export async function finishProductAiRequest(input: {
  requestId: string;
  status: "success" | "error";
  usage?: { inputTokens: number | null; outputTokens: number | null };
  errorCode?: string;
}) {
  const supabase = await createSupabaseServerClient();
  await supabase.rpc("admin_finish_product_ai_request", {
    p_request_id: input.requestId,
    p_status: input.status,
    p_input_tokens: input.usage?.inputTokens ?? null,
    p_output_tokens: input.usage?.outputTokens ?? null,
    p_error_code: input.errorCode ?? null
  });
}

export async function recordAppliedProductAiFields(requestId: string, fields: ProductAiField[]) {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_record_product_ai_applied_fields", {
    p_request_id: requestId,
    p_applied_fields: fields
  });
  if (error) throw new Error("ai_logging_unavailable");
}
