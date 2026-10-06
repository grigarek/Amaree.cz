import "server-only";
import { Buffer } from "node:buffer";
import { localizedPaths } from "@/i18n/routing";
import { getLegalPageContent, type LegalPageContent } from "@/lib/legal-pages";
import type { TransactionalEmailAttachment } from "@/lib/email/provider";
import type { EmailLocale } from "@/lib/email/provider";
import type { OrderTemplateKey } from "@/lib/orders/statuses";

export const ORDER_TERMS_VERSION = "2026-08-01";

export type OrderTermsSnapshot = LegalPageContent & {
  locale: EmailLocale;
  version: string;
  capturedAt: string;
};

const confirmationTemplates = new Set<OrderTemplateKey>([
  "order_received",
  "awaiting_online_payment",
  "awaiting_bank_transfer"
]);

export function shouldAttachOrderTerms(templateKey: OrderTemplateKey | string) {
  return confirmationTemplates.has(templateKey as OrderTemplateKey);
}

export function buildCurrentOrderTermsSnapshot(locale: EmailLocale = "cs", now = new Date()): OrderTermsSnapshot {
  return {
    ...getLegalPageContent(locale, localizedPaths[locale].terms),
    locale,
    version: ORDER_TERMS_VERSION,
    capturedAt: now.toISOString()
  };
}

export function isOrderTermsSnapshot(value: unknown): value is OrderTermsSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<OrderTermsSnapshot>;
  return typeof snapshot.title === "string"
    && typeof snapshot.intro === "string"
    && (snapshot.locale === "cs" || snapshot.locale === "sk")
    && typeof snapshot.version === "string"
    && typeof snapshot.capturedAt === "string"
    && Array.isArray(snapshot.sections);
}

export function buildOrderTermsAttachment(snapshot = buildCurrentOrderTermsSnapshot()): TransactionalEmailAttachment {
  const isSlovak = snapshot.locale === "sk";
  const capturedDate = new Intl.DateTimeFormat(isSlovak ? "sk-SK" : "cs-CZ", { dateStyle: "long", timeZone: "Europe/Prague" }).format(new Date(snapshot.capturedAt));
  const meta = isSlovak
    ? `Verzia ${snapshot.version} · uložené k objednávke ${capturedDate}`
    : `Verze ${snapshot.version} · uloženo k objednávce ${capturedDate}`;
  const sections = snapshot.sections.flatMap((section) => [
    section.title.toUpperCase(),
    "",
    ...(section.paragraphs ?? []).flatMap((paragraph) => [paragraph, ""]),
    ...(section.items ?? []).map((item) => `- ${item}`),
    ""
  ]);
  const text = [
    snapshot.title.toUpperCase(),
    "AMARÉE",
    "",
    snapshot.intro,
    "",
    meta,
    "",
    ...sections,
    "AMARÉE · MEDIANUM s.r.o. · info@amaree.cz"
  ].join("\r\n");

  return {
    filename: `${isSlovak ? "obchodne-podmienky" : "obchodni-podminky"}-amaree-${snapshot.version}.txt`,
    content: Buffer.from(text, "utf8").toString("base64")
  };
}
