import type { Currency, PaymentMethodId, ShippingMethodId } from "@/types/domain";

export type EmailLocale = "cs" | "sk";

export type TransactionalEmailAttachment = {
  filename: string;
  content: string;
};

export type TransactionalEmailInput = {
  to: string;
  toName?: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  attachments?: TransactionalEmailAttachment[];
  idempotencyKey: string;
  metadata?: Record<string, string>;
};

export type TransactionalEmailResult = {
  provider: string;
  providerMessageId: string;
  mode: "preview" | "sent";
  actualRecipient: string;
};

export type EmailProviderVerification = {
  ok: boolean;
  provider: string;
  problems: string[];
};

export interface OrderEmailInput {
  to: string;
  orderNumber: string;
  locale: "cs" | "sk" | "en" | "de";
  total: string;
  currency: Currency;
  paymentMethodId: PaymentMethodId;
  shippingMethodId: ShippingMethodId;
  variableSymbol?: string;
  bankTransferDueDate?: string;
}

export interface EmailProvider {
  readonly name: string;
  sendTransactionalEmail(input: TransactionalEmailInput): Promise<TransactionalEmailResult>;
  verifyConfiguration(): EmailProviderVerification;
  renderPreview(input: TransactionalEmailInput): Pick<TransactionalEmailInput, "subject" | "text" | "html">;
}
