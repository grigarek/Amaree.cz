import { describe, expect, it } from "vitest";
import { checkoutSchema } from "@/lib/checkout/validation";
import { createVariableSymbol, getOrderInitialStatus } from "@/lib/commerce/config";
import { products } from "@/lib/products";
import { mockPacketaPoint } from "@/lib/shipping/packeta";

const base = {
  idempotencyKey: "11111111-1111-4111-8111-111111111111",
  locale: "cs",
  email: "info@amaree.cz",
  phone: "+420777705682",
  name: "AMARÉE zákazník",
  countryCode: "CZ",
  shippingMethodId: "packeta_pickup",
  paymentMethodId: "gopay",
  termsAccepted: true,
  billingAddress: { street: "Příčná 129/3", city: "Olomouc", postalCode: "779 00" },
  packetaPoint: mockPacketaPoint,
  lines: [{ productId: products[0].id, quantity: 1 }]
};

describe("checkout validation", () => {
  it("accepts GoPay with a validated Packeta pickup point", () => expect(checkoutSchema.safeParse(base).success).toBe(true));
  it("accepts a known gift-card design", () => expect(checkoutSchema.safeParse({ ...base, giftCardDesignId: "dekuji-red" }).success).toBe(true));
  it("rejects an unknown gift-card design", () => expect(checkoutSchema.safeParse({ ...base, giftCardDesignId: "custom-price-card" }).success).toBe(false));
  it("accepts bank transfer and assigns its initial status", () => {
    expect(checkoutSchema.safeParse({ ...base, paymentMethodId: "bank_transfer" }).success).toBe(true);
    expect(getOrderInitialStatus("bank_transfer")).toBe("awaiting_payment");
    expect(createVariableSymbol("AMR-2026-0001")).toBe("20260001");
  });
  it("requires a pickup point", () => expect(checkoutSchema.safeParse({ ...base, packetaPoint: undefined }).success).toBe(false));
  it("requires both first and last name", () => expect(checkoutSchema.safeParse({ ...base, name: "David" }).success).toBe(false));
  it("rejects an invalid phone number", () => expect(checkoutSchema.safeParse({ ...base, phone: "12345" }).success).toBe(false));
  it("accepts a formatted Czech phone number", () => expect(checkoutSchema.safeParse({ ...base, phone: "+420 777 705 682" }).success).toBe(true));
  it("requires a house number in the address", () => expect(checkoutSchema.safeParse({ ...base, billingAddress: { ...base.billingAddress, street: "Příčná" } }).success).toBe(false));
  it("rejects an invalid postal code", () => expect(checkoutSchema.safeParse({ ...base, billingAddress: { ...base.billingAddress, postalCode: "779" } }).success).toBe(false));
  it("requires an address for home delivery", () => expect(checkoutSchema.safeParse({ ...base, shippingMethodId: "packeta_home", packetaPoint: undefined }).success).toBe(false));
  it("accepts a complete home-delivery address", () => expect(checkoutSchema.safeParse({ ...base, shippingMethodId: "packeta_home", paymentMethodId: "cash_on_delivery", packetaPoint: undefined, shippingAddress: { street: "Příčná 129/3", city: "Olomouc", postalCode: "779 00" } }).success).toBe(true));
  it("rejects personal pickup", () => expect(checkoutSchema.safeParse({ ...base, shippingMethodId: "personal_pickup", paymentMethodId: "bank_transfer", packetaPoint: undefined }).success).toBe(false));
  it("rejects cash payment for Packeta delivery", () => expect(checkoutSchema.safeParse({ ...base, paymentMethodId: "cash_on_pickup" }).success).toBe(false));
  it("accepts cash on delivery for Slovak Packeta home delivery", () => expect(checkoutSchema.safeParse({ ...base, locale: "sk", countryCode: "SK", shippingMethodId: "packeta_home", paymentMethodId: "cash_on_delivery", packetaPoint: undefined, shippingAddress: { street: "Hlavné námestie 1", city: "Bratislava", postalCode: "811 01" } }).success).toBe(true));
  it("rejects a delivery country that does not match the storefront", () => expect(checkoutSchema.safeParse({ ...base, countryCode: "SK" }).success).toBe(false));
  it("rejects EUR bank transfer until a verified IBAN is configured", () => expect(checkoutSchema.safeParse({ ...base, locale: "sk", countryCode: "SK", paymentMethodId: "bank_transfer" }).success).toBe(false));
  it("rejects countries outside Czechia and Slovakia", () => expect(checkoutSchema.safeParse({ ...base, countryCode: "DE" }).success).toBe(false));
  it("rejects an empty cart", () => expect(checkoutSchema.safeParse({ ...base, lines: [] }).success).toBe(false));
  it("rejects an order without accepted terms", () => expect(checkoutSchema.safeParse({ ...base, termsAccepted: false }).success).toBe(false));
});
