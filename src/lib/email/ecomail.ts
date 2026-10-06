import "server-only";
import type { EmailProvider, EmailProviderVerification, TransactionalEmailInput, TransactionalEmailResult } from "@/lib/email/provider";

export class EcomailProvider implements EmailProvider {
  readonly name = "ecomail";

  verifyConfiguration(): EmailProviderVerification {
    return { ok: false, provider: this.name, problems: ["Ecomail transactional sending is intentionally inactive; it is reserved for a future newsletter integration."] };
  }

  renderPreview(input: TransactionalEmailInput) {
    return { subject: input.subject, text: input.text, html: input.html };
  }

  async sendTransactionalEmail(input: TransactionalEmailInput): Promise<TransactionalEmailResult> {
    return { provider: this.name, providerMessageId: `preview-${Date.now()}`, mode: "preview", actualRecipient: input.to };
  }
}
