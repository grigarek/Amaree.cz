import "server-only";

export function isProductAiAssistantConfigured(environment: Record<string, string | undefined> = process.env) {
  return environment.AI_PRODUCT_ASSISTANT_ENABLED === "true" && Boolean(environment.OPENAI_API_KEY);
}
