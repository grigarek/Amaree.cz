import type { Currency, LocalizedText, PaymentMethodId, ShippingMethodId } from "@/types/domain";

export const DELIVERY_COUNTRY_CODES = ["CZ", "SK"] as const;

export type DeliveryCountryCode = (typeof DELIVERY_COUNTRY_CODES)[number];

export const commerceConfig = {
  domesticCountry: "CZ" as const,
  internationalCheckoutEnabled: true,
  currencies: { domestic: "CZK" as Currency, eu: "EUR" as Currency },
  freeShipping: { country: "CZ" as const, threshold: 150_000 },
  shippingPrices: {
    packeta_home: { amount: 11_900, currency: "CZK" as Currency },
    packeta_pickup: { amount: 9_500, currency: "CZK" as Currency },
    personal_pickup: { amount: 0, currency: "CZK" as Currency },
    eu_delivery: { amount: 1_450, currency: "EUR" as Currency }
  },
  shippingPricesByCountry: {
    CZ: {
      packeta_home: { amount: 11_900, currency: "CZK" as Currency },
      packeta_pickup: { amount: 9_500, currency: "CZK" as Currency },
      personal_pickup: { amount: 0, currency: "CZK" as Currency }
    },
    SK: {
      packeta_home: { amount: 490, currency: "EUR" as Currency },
      packeta_pickup: { amount: 390, currency: "EUR" as Currency }
    }
  },
  paymentFees: {
    gopay: { amount: 0, currency: "CZK" as Currency },
    cash_on_delivery: { amount: 3_900, currency: "CZK" as Currency },
    bank_transfer: { amount: 0, currency: "CZK" as Currency }
  },
  paymentFeesByCountry: {
    CZ: {
      gopay: { amount: 0, currency: "CZK" as Currency },
      cash_on_delivery: { amount: 3_900, currency: "CZK" as Currency },
      bank_transfer: { amount: 0, currency: "CZK" as Currency }
    },
    SK: {
      gopay: { amount: 0, currency: "EUR" as Currency },
      cash_on_delivery: { amount: 190, currency: "EUR" as Currency },
      bank_transfer: { amount: 0, currency: "EUR" as Currency }
    }
  },
  reservationMinutes: {
    gopay: 30,
    bank_transfer: 3 * 24 * 60,
    cash_on_delivery: 0
  },
  bankTransferDueDays: 3,
  allowedPayments: {
    packeta_home: ["gopay", "cash_on_delivery", "bank_transfer"],
    packeta_pickup: ["gopay", "cash_on_delivery", "bank_transfer"],
    personal_pickup: ["gopay", "bank_transfer"],
    eu_delivery: ["gopay"]
  } satisfies Record<ShippingMethodId, PaymentMethodId[]>
} as const;

export const shippingLabels: Record<ShippingMethodId, LocalizedText> = {
  packeta_home: { cs: "Zásilkovna – doručení na adresu", en: "Packeta home delivery", de: "Packeta Hauszustellung" },
  packeta_pickup: { cs: "Zásilkovna – výdejní místo nebo Z-BOX", en: "Packeta pickup point or Z-BOX", de: "Packeta Abholstelle oder Z-BOX" },
  personal_pickup: { cs: "Osobní odběr", en: "Personal pickup", de: "Persönliche Abholung" },
  eu_delivery: { cs: "Doručení do EU", en: "EU delivery", de: "EU-Lieferung" }
};

export const paymentLabels: Record<PaymentMethodId, LocalizedText> = {
  gopay: { cs: "Online platba přes GoPay", en: "Online payment via GoPay", de: "Online-Zahlung über GoPay" },
  cash_on_delivery: { cs: "Platba na dobírku", en: "Cash on delivery", de: "Nachnahme" },
  bank_transfer: { cs: "Bankovní převod", en: "Bank transfer", de: "Banküberweisung" }
};

export function isDeliveryCountryCode(value: string): value is DeliveryCountryCode {
  return (DELIVERY_COUNTRY_CODES as readonly string[]).includes(value);
}

export function isDomesticCountry(countryCode: DeliveryCountryCode): boolean {
  return countryCode === commerceConfig.domesticCountry;
}

export function getCheckoutCurrency(countryCode: DeliveryCountryCode): Currency {
  return isDomesticCountry(countryCode) ? commerceConfig.currencies.domestic : commerceConfig.currencies.eu;
}

export function getShippingMethods(countryCode: DeliveryCountryCode): ShippingMethodId[] {
  return isDomesticCountry(countryCode)
    ? ["packeta_home", "packeta_pickup", "personal_pickup"]
    : ["packeta_home", "packeta_pickup"];
}

export function getShippingQuote(shippingMethodId: ShippingMethodId, countryCode: DeliveryCountryCode) {
  const countryQuotes = commerceConfig.shippingPricesByCountry[countryCode] as Partial<Record<ShippingMethodId, { amount: number; currency: Currency }>>;
  const quote = countryQuotes[shippingMethodId];
  if (!quote) throw new Error("shipping_method_not_available");
  return quote;
}

export function getPaymentQuote(paymentMethodId: PaymentMethodId, countryCode: DeliveryCountryCode) {
  return commerceConfig.paymentFeesByCountry[countryCode][paymentMethodId];
}

export function getAllowedPaymentMethods(shippingMethodId: ShippingMethodId): readonly PaymentMethodId[] {
  return commerceConfig.allowedPayments[shippingMethodId];
}

export function isPaymentAllowed(shippingMethodId: ShippingMethodId, paymentMethodId: PaymentMethodId): boolean {
  return getAllowedPaymentMethods(shippingMethodId).includes(paymentMethodId);
}

export function getOrderInitialStatus(paymentMethodId: PaymentMethodId) {
  if (paymentMethodId === "cash_on_delivery") return "new" as const;
  return "awaiting_payment" as const;
}

export function createVariableSymbol(orderNumber: string): string {
  const digits = orderNumber.replace(/\D/g, "").slice(-10);
  if (!digits) throw new Error("order_number_has_no_digits");
  return digits;
}
