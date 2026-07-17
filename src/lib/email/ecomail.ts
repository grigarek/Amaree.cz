import "server-only";
import { getAppEnvironment } from "@/lib/environment";

export type TransactionalEmailInput = {
  to: string;
  toName?: string;
  subject: string;
  text: string;
  html?: string;
  metadata?: Record<string, string>;
};

export type TransactionalEmailResult = { providerMessageId: string; mode: "preview" | "sent" };

export async function sendEcomailTransactional(input: TransactionalEmailInput, fetcher: typeof fetch = fetch): Promise<TransactionalEmailResult> {
  const enabled = process.env.ECOMAIL_SEND_ENABLED === "true";
  if (!enabled) return { providerMessageId: `preview-${Date.now()}`, mode: "preview" };

  const apiKey = process.env.ECOMAIL_API_KEY;
  const fromEmail = process.env.ECOMAIL_FROM_EMAIL;
  const fromName = process.env.ECOMAIL_FROM_NAME ?? "AMARÉE";
  if (!apiKey || !fromEmail) throw new Error("ecomail_configuration_missing");
  if (getAppEnvironment() !== "production" && process.env.ECOMAIL_ENVIRONMENT === "production") throw new Error("production_ecomail_forbidden");

  const endpoint = process.env.ECOMAIL_TRANSACTIONAL_ENDPOINT ?? "https://api2.ecomailapp.cz/transactional/send-message";
  const response = await fetcher(endpoint, {
    method: "POST",
    headers: { key: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        subject: input.subject,
        from_name: fromName,
        from_email: fromEmail,
        reply_to: fromEmail,
        text: input.text,
        html: input.html,
        to: [{ email: input.to, name: input.toName }],
        global_merge_vars: input.metadata
          ? Object.entries(input.metadata).map(([name, content]) => ({ name, content }))
          : undefined,
        options: { click_tracking: false, open_tracking: false }
      }
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) throw new Error(`ecomail_send_failed_${response.status}`);
  const body = await response.json() as { results?: { id?: number | string; total_rejected_recipients?: number } };
  if (!body.results?.id || body.results.total_rejected_recipients) throw new Error("ecomail_response_rejected");
  return { providerMessageId: String(body.results.id), mode: "sent" };
}
