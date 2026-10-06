import "server-only";
import type { EmailProvider } from "@/lib/email/provider";
import { ResendProvider } from "@/lib/email/resend";
import { EcomailProvider } from "@/lib/email/ecomail";

export function getTransactionalEmailProvider(): EmailProvider {
  const provider = process.env.TRANSACTIONAL_EMAIL_PROVIDER ?? "resend";
  if (provider === "resend") return new ResendProvider();
  if (provider === "ecomail") return new EcomailProvider();
  throw new Error(`unsupported_transactional_email_provider:${provider}`);
}
