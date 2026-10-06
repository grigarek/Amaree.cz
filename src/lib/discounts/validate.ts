import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { DiscountValidationResult } from "@/lib/discounts/schema";

type DiscountRule = {
  code: string;
  discount_type: "percent" | "fixed" | "free_shipping";
  value: number;
  currency: "CZK" | "EUR" | null;
  minimum_order_minor: number;
  active: boolean;
  valid_from: string | null;
  valid_to: string | null;
  usage_limit: number | null;
  usage_count: number;
  customer_user_id?: string | null;
};

type DiscountLine = { productId: string; quantity: number };
type DiscountLocale = "cs" | "sk" | "en" | "de";

const messages = {
  cs: { inactive: "Tento slevový kód není aktivní.", currency: "Tento kód nelze použít pro zvolenou měnu.", early: "Platnost tohoto kódu ještě nezačala.", expired: "Platnost tohoto kódu již skončila.", exhausted: "Limit použití tohoto kódu byl vyčerpán.", minimum: (value: string) => `Kód lze použít od hodnoty zboží ${value}.`, applied: (code: string) => `Kód ${code} byl použit.`, unavailable: "Některý produkt již není dostupný.", missing: "Slevový kód nebyl nalezen." },
  sk: { inactive: "Tento zľavový kód nie je aktívny.", currency: "Tento kód nemožno použiť pre zvolenú menu.", early: "Platnosť tohto kódu sa ešte nezačala.", expired: "Platnosť tohto kódu sa už skončila.", exhausted: "Limit použitia tohto kódu bol vyčerpaný.", minimum: (value: string) => `Kód možno použiť od hodnoty tovaru ${value}.`, applied: (code: string) => `Kód ${code} bol použitý.`, unavailable: "Niektorý produkt už nie je dostupný.", missing: "Zľavový kód sa nenašiel." },
  en: { inactive: "This discount code is not active.", currency: "This code cannot be used with the selected currency.", early: "This code is not valid yet.", expired: "This code has expired.", exhausted: "This code has reached its usage limit.", minimum: (value: string) => `This code can be used on orders of ${value} or more.`, applied: (code: string) => `Code ${code} has been applied.`, unavailable: "One of the products is no longer available.", missing: "Discount code not found." },
  de: { inactive: "Dieser Rabattcode ist nicht aktiv.", currency: "Dieser Code kann nicht mit der gewählten Währung verwendet werden.", early: "Dieser Code ist noch nicht gültig.", expired: "Dieser Code ist abgelaufen.", exhausted: "Das Nutzungslimit dieses Codes ist erreicht.", minimum: (value: string) => `Dieser Code gilt ab einem Warenwert von ${value}.`, applied: (code: string) => `Code ${code} wurde angewendet.`, unavailable: "Eines der Produkte ist nicht mehr verfügbar.", missing: "Rabattcode wurde nicht gefunden." }
} satisfies Record<DiscountLocale, Record<string, string | ((value: string) => string)>>;

const personalMessages: Record<DiscountLocale, string> = {
  cs: "Tato věrnostní odměna patří k jinému zákaznickému účtu. Přihlaste se ke svému účtu.",
  sk: "Táto vernostná odmena patrí k inému zákazníckemu účtu. Prihláste sa do svojho účtu.",
  en: "This loyalty reward belongs to another customer account. Please sign in.",
  de: "Diese Treueprämie gehört zu einem anderen Kundenkonto. Bitte melden Sie sich an."
};

export function canCustomerUseDiscount(rule: Pick<DiscountRule, "customer_user_id">, customerUserId?: string | null) {
  return !rule.customer_user_id || rule.customer_user_id === customerUserId;
}

export function calculateDiscountFromRule(rule: DiscountRule, subtotalMinor: number, currency: "CZK" | "EUR", now = new Date(), locale: DiscountLocale = "cs"): Omit<DiscountValidationResult, "subtotalMinor"> {
  const code = rule.code.toUpperCase();
  const copy = messages[locale];
  const invalid = (message: string) => ({ valid: false, code, amountMinor: 0, freeShipping: false, currency, message });
  if (!rule.active) return invalid(copy.inactive as string);
  if (rule.currency && rule.currency !== currency) return invalid(copy.currency as string);
  if (rule.valid_from && new Date(rule.valid_from) > now) return invalid(copy.early as string);
  if (rule.valid_to && new Date(rule.valid_to) < now) return invalid(copy.expired as string);
  if (rule.usage_limit !== null && rule.usage_count >= rule.usage_limit) return invalid(copy.exhausted as string);
  if (subtotalMinor < rule.minimum_order_minor) {
    const minimum = new Intl.NumberFormat(locale === "cs" ? "cs-CZ" : locale === "sk" ? "sk-SK" : locale === "de" ? "de-DE" : "en-GB", { style: "currency", currency }).format(rule.minimum_order_minor / 100);
    return invalid((copy.minimum as (value: string) => string)(minimum));
  }
  const amountMinor = rule.discount_type === "percent"
    ? Math.floor(subtotalMinor * rule.value / 100)
    : rule.discount_type === "fixed" ? Math.min(rule.value, subtotalMinor) : 0;
  return { valid: true, code, amountMinor, freeShipping: rule.discount_type === "free_shipping", currency, message: (copy.applied as (value: string) => string)(code) };
}

export async function validateDiscountCode(codeInput: string, currency: "CZK" | "EUR", lines: DiscountLine[], locale: DiscountLocale = "cs", customerUserId?: string | null): Promise<DiscountValidationResult> {
  const code = codeInput.trim().toUpperCase();
  const supabase = createSupabaseAdminClient();
  const ids = [...new Set(lines.map((line) => line.productId))];
  const { data: products, error: productError } = await supabase
    .from("products")
    .select("id,active,archived_at,product_prices!inner(currency,amount_minor)")
    .in("id", ids)
    .eq("active", true)
    .is("archived_at", null)
    .eq("product_prices.currency", currency);
  if (productError) throw new Error(`discount_products_unavailable:${productError.message}`);

  const priceById = new Map<string, number>();
  for (const product of products ?? []) {
    const prices = product.product_prices as unknown as Array<{ currency: string; amount_minor: number }>;
    const price = prices.find((item) => item.currency === currency);
    if (price) priceById.set(product.id as string, price.amount_minor);
  }
  if (priceById.size !== ids.length) return { valid: false, code, amountMinor: 0, freeShipping: false, subtotalMinor: 0, currency, message: messages[locale].unavailable as string };
  const subtotalMinor = lines.reduce((total, line) => total + (priceById.get(line.productId) ?? 0) * line.quantity, 0);

  const { data, error } = await supabase.from("discount_codes")
    .select("code,discount_type,value,currency,minimum_order_minor,active,valid_from,valid_to,usage_limit,usage_count,customer_user_id")
    .eq("code", code)
    .maybeSingle();
  if (error) throw new Error(`discount_lookup_failed:${error.message}`);
  if (!data) return { valid: false, code, amountMinor: 0, freeShipping: false, subtotalMinor, currency, message: messages[locale].missing as string };
  if (!canCustomerUseDiscount(data, customerUserId)) {
    return { valid: false, code, amountMinor: 0, freeShipping: false, subtotalMinor, currency, message: personalMessages[locale] };
  }
  return { ...calculateDiscountFromRule(data as DiscountRule, subtotalMinor, currency, new Date(), locale), subtotalMinor };
}
