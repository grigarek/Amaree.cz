import "server-only";
import { Resend } from "resend";
import type { EmailProvider, OrderEmailInput } from "./provider";
import { buildOrderConfirmationText } from "./order-confirmation";

export class ResendEmailProvider implements EmailProvider {
  private resend: Resend;

  constructor(apiKey = process.env.RESEND_API_KEY) {
    if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");
    this.resend = new Resend(apiKey);
  }

  async sendOrderConfirmation(input: OrderEmailInput): Promise<void> {
    await this.resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "AMARÉE <orders@amaree.cz>",
      to: input.to,
      subject: `AMARÉE - objednávka ${input.orderNumber}`,
      text: buildOrderConfirmationText(input)
    });
  }
}
