import "server-only";
import { Resend } from "resend";
import { getAppEnvironment } from "@/lib/environment";
import type {
  EmailProvider,
  EmailProviderVerification,
  TransactionalEmailInput,
  TransactionalEmailResult
} from "@/lib/email/provider";

type ResendClient = Pick<Resend, "emails">;

export class ResendProvider implements EmailProvider {
  readonly name = "resend";
  private readonly client: ResendClient | null;

  constructor(apiKey = process.env.RESEND_API_KEY, client?: ResendClient) {
    this.client = client ?? (apiKey ? new Resend(apiKey) : null);
  }

  verifyConfiguration(): EmailProviderVerification {
    const problems: string[] = [];
    if (!process.env.RESEND_API_KEY && !this.client) problems.push("RESEND_API_KEY is missing");
    if (!process.env.RESEND_FROM_EMAIL) problems.push("RESEND_FROM_EMAIL is missing");
    if (getAppEnvironment() === "staging" && !process.env.TRANSACTIONAL_EMAIL_TEST_RECIPIENT) {
      problems.push("TRANSACTIONAL_EMAIL_TEST_RECIPIENT is missing for staging");
    }
    return { ok: problems.length === 0, provider: this.name, problems };
  }

  renderPreview(input: TransactionalEmailInput) {
    return { subject: input.subject, text: input.text, html: input.html };
  }

  async sendTransactionalEmail(input: TransactionalEmailInput): Promise<TransactionalEmailResult> {
    if (process.env.TRANSACTIONAL_EMAIL_SEND_ENABLED !== "true") {
      return { provider: this.name, providerMessageId: `preview-${Date.now()}`, mode: "preview", actualRecipient: input.to };
    }

    const verification = this.verifyConfiguration();
    if (!verification.ok || !this.client) throw new Error(`resend_configuration_missing:${verification.problems.join(",")}`);

    const environment = getAppEnvironment();
    const stagingRecipient = process.env.TRANSACTIONAL_EMAIL_TEST_RECIPIENT?.trim();
    const actualRecipient = environment === "production" ? input.to : stagingRecipient;
    if (!actualRecipient) throw new Error("resend_staging_recipient_missing");

    const subject = environment === "production" ? input.subject : `[STAGING pro ${input.to}] ${input.subject}`;
    const configuredReplyTo = input.replyTo ?? process.env.TRANSACTIONAL_EMAIL_REPLY_TO ?? "info@amaree.cz";
    const replyTo = configuredReplyTo.trim().toLowerCase() === actualRecipient.trim().toLowerCase()
      ? undefined
      : configuredReplyTo;
    const { data, error } = await this.client.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "AMARÉE <objednavky@notify.amaree.cz>",
      to: actualRecipient,
      replyTo,
      subject,
      text: input.text,
      html: input.html,
      attachments: input.attachments,
      headers: { "X-Auto-Response-Suppress": "OOF, AutoReply" },
      tags: input.metadata
        ? Object.entries(input.metadata).slice(0, 8).map(([name, value]) => ({ name: name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 32), value: value.slice(0, 256) }))
        : undefined
    }, { idempotencyKey: input.idempotencyKey.slice(0, 256) });

    if (error || !data?.id) throw new Error(`resend_send_failed:${error?.message ?? "missing_message_id"}`);
    return { provider: this.name, providerMessageId: data.id, mode: "sent", actualRecipient };
  }
}

export const ResendEmailProvider = ResendProvider;
