import { describe, expect, it } from "vitest";
import { checkoutSchema } from "@/lib/checkout/validation";
import { createVariableSymbol, getOrderInitialStatus } from "@/lib/commerce/config";
import { products } from "@/lib/products";
import { mockPacketaPoint } from "@/lib/shipping/packeta";

const base = {
  idempotencyKey: "11111111-1111-4111-8111-111111111111",
  locale: "cs",
  email: "info@amaree.cz",
  phone: "+420737076249",
  name: "AMARÉE zákazník",
  countryCode: "CZ",
  shippingMethodId: "packeta_pickup",
  paymentMethodId: "gopay",
  billingAddress: { street: "Příčná 129/3", city: "Olomouc", postalCode: "779 00" },
  packetaPoint: mockPacketaPoint,
  lines: [{ productId: products[0].id, quantity: 1 }]
};

describe("checkout validation", () => {
  it("accepts GoPay with a validated Packeta pickup point", () => expect(checkoutSchema.safeParse(base).success).toBe(true));
  it("accepts bank transfer and assigns its initial status", () => {
    expect(checkoutSchema.safeParse({ ...base, paymentMethodId: "bank_transfer" }).success).toBe(true);
    expect(getOrderInitialStatus("bank_transfer")).toBe("awaiting_payment");
    expect(createVariableSymbol("AMR-2026-0001")).toBe("20260001");
  });
  it("requires a pickup point", () => expect(checkoutSchema.safeParse({ ...base, packetaPoint: undefined }).success).toBe(false));
  it("requires an address for home delivery", () => expect(checkoutSchema.safeParse({ ...base, shippingMethodId: "packeta_home", packetaPoint: undefined }).success).toBe(false));
  it("accepts a complete home-delivery address", () => expect(checkoutSchema.safeParse({ ...base, shippingMethodId: "packeta_home", paymentMethodId: "cash_on_delivery", packetaPoint: undefined, shippingAddress: { street: "Příčná 129/3", city: "Olomouc", postalCode: "779 00" } }).success).toBe(true));
  it("rejects cash on delivery for personal pickup", () => expect(checkoutSchema.safeParse({ ...base, shippingMethodId: "personal_pickup", paymentMethodId: "cash_on_delivery", packetaPoint: undefined }).success).toBe(false));
  it("rejects cash on delivery in Slovakia", () => expect(checkoutSchema.safeParse({ ...base, countryCode: "SK", shippingMethodId: "eu_delivery", paymentMethodId: "cash_on_delivery", packetaPoint: undefined, shippingAddress: { street: "Hlavné námestie 1", city: "Bratislava", postalCode: "811 01" } }).success).toBe(false));
  it("rejects countries outside Czechia and Slovakia", () => expect(checkoutSchema.safeParse({ ...base, countryCode: "DE" }).success).toBe(false));
  it("rejects an empty cart", () => expect(checkoutSchema.safeParse({ ...base, lines: [] }).success).toBe(false));
});
