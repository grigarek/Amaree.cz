import type { Locale } from "@/i18n/routing";

const localeMap: Record<Locale, string> = {
  cs: "cs-CZ",
  en: "en-GB",
  de: "de-DE"
};

export function formatMoney(amount: number, locale: Locale = "cs", currency = "CZK"): string {
  return new Intl.NumberFormat(localeMap[locale], {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount / 100);
}

export function clampQuantity(quantity: number, stockQuantity: number): number {
  if (!Number.isInteger(quantity) || quantity < 1) return 1;
  return Math.min(quantity, Math.max(stockQuantity, 0));
}
