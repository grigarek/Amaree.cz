import { paymentLabels, shippingLabels } from "@/lib/commerce/config";
import { orderStatusLabels, orderTemplateLabels, type OrderTemplateKey } from "@/lib/orders/statuses";
import type { PaymentMethodId, ShippingMethodId } from "@/types/domain";

export { orderStatusLabels };

const paymentStatusLabels: Record<string, string> = {
  pending: "Čeká na platbu",
  paid: "Zaplaceno",
  failed: "Platba se nezdařila",
  cancelled: "Platba zrušena",
  expired: "Platnost platby vypršela",
  refunded: "Platba vrácena"
};

const emailStatusLabels: Record<string, string> = {
  queued: "Čeká na odeslání",
  sent: "Odesláno",
  failed: "Odeslání se nezdařilo",
  suppressed: "Odeslání potlačeno",
  preview: "Pouze náhled",
  processed: "Zpracováno"
};

const emailSourceLabels: Record<string, string> = {
  checkout: "automaticky po objednávce",
  payment_webhook: "automaticky po změně platby",
  admin_status: "při změně stavu v administraci",
  admin_manual: "ručně z administrace",
  shipment: "automaticky podle zásilky",
  complaint: "při vyřízení reklamace",
  system: "automaticky systémem"
};

const auditActionLabels: Record<string, string> = {
  order_status_changed: "Změna stavu objednávky",
  order_internal_note_updated: "Úprava interní poznámky",
  shipment_created: "Vytvoření zásilky",
  shipment_marked_shipped: "Označení zásilky jako odeslané",
  email_resent: "Opětovné odeslání e-mailu"
};

export function paymentMethodLabel(value: string): string {
  return value in paymentLabels ? paymentLabels[value as PaymentMethodId].cs : humanize(value);
}

export function shippingMethodLabel(value: string): string {
  return value in shippingLabels ? shippingLabels[value as ShippingMethodId].cs : humanize(value);
}

export function paymentStatusLabel(value: string): string {
  return paymentStatusLabels[value] ?? humanize(value);
}

export function emailStatusLabel(value: string): string {
  return emailStatusLabels[value] ?? humanize(value);
}

export function emailTemplateLabel(value: string): string {
  return value in orderTemplateLabels ? orderTemplateLabels[value as OrderTemplateKey] : humanize(value);
}

export function emailSourceLabel(value: string): string {
  return emailSourceLabels[value] ?? humanize(value);
}

export function auditActionLabel(value: string): string {
  return auditActionLabels[value] ?? humanize(value);
}

function humanize(value: string): string {
  const text = value.replaceAll("_", " ").trim();
  return text ? `${text.charAt(0).toLocaleUpperCase("cs")}${text.slice(1)}` : "Neuvedeno";
}
