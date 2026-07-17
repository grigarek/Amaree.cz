import { describe, expect, it } from "vitest";
import {
  calculateCheckoutCharges,
  calculateDiscount,
  calculateOrderTotal,
  calculatePaymentFee,
  calculateShipping,
  priceCartLines,
  validateStock
} from "@/lib/cart";
import { getCheckoutCurrency, isPaymentAllowed } from "@/lib/commerce/config";
import { products } from "@/lib/products";
import { formatMoney } from "@/lib/money";

describe("cart pricing", () => {
  it("prices products from server-side catalog data", () => {
    const line = priceCartLines([{ productId: products[0].id, quantity: 2 }])[0];
    expect(line.unitPrice).toBe(products[0].price);
    expect(line.lineTotal).toBe(products[0].price * 2);
  });

  it("clamps quantity to available stock", () => {
    expect(priceCartLines([{ productId: products[0].id, quantity: 999 }])[0].quantity).toBe(products[0].stockQuantity);
  });

  it("calculates discount codes", () => {
    expect(calculateDiscount(200_000, "AMAREE10")).toBe(20_000);
    expect(calculateDiscount(50_000, "AMAREE10")).toBe(0);
  });

  it("uses confirmed Czech shipping prices", () => {
    expect(calculateShipping(100_000, "packeta_home", "CZ")).toBe(11_900);
    expect(calculateShipping(100_000, "packeta_pickup", "CZ")).toBe(9_500);
    expect(calculateShipping(100_000, "personal_pickup", "CZ")).toBe(0);
  });

  it("grants free Czech shipping at exactly CZK 1,500 after discount", () => {
    expect(calculateShipping(149_999, "packeta_pickup", "CZ")).toBe(9_500);
    expect(calculateShipping(150_000, "packeta_pickup", "CZ")).toBe(0);
    expect(calculateShipping(160_000, "packeta_home", "CZ")).toBe(0);
  });

  it("keeps the CZK 39 cash-on-delivery fee when shipping is free", () => {
    const charges = calculateCheckoutCharges({ subtotalAfterDiscount: 160_000, countryCode: "CZ", shippingMethodId: "packeta_pickup", paymentMethodId: "cash_on_delivery" });
    expect(charges).toEqual({ shipping: 0, paymentFee: 3_900, currency: "CZK" });
    expect(160_000 + charges.shipping + charges.paymentFee).toBe(163_900);
  });

  it("uses the Slovak Packeta pickup price without free shipping", () => {
    expect(calculateShipping(999_999, "packeta_pickup", "SK")).toBe(390);
    expect(getCheckoutCurrency("SK")).toBe("EUR");
    expect(getCheckoutCurrency("CZ")).toBe("CZK");
    expect(formatMoney(1_450, "de", "EUR")).toContain("14,50");
  });

  it("enforces the shipping/payment matrix", () => {
    expect(isPaymentAllowed("packeta_home", "cash_on_delivery")).toBe(true);
    expect(isPaymentAllowed("packeta_pickup", "cash_on_delivery")).toBe(true);
    expect(isPaymentAllowed("personal_pickup", "cash_on_delivery")).toBe(false);
    expect(isPaymentAllowed("personal_pickup", "bank_transfer")).toBe(true);
    expect(isPaymentAllowed("eu_delivery", "cash_on_delivery")).toBe(false);
    expect(isPaymentAllowed("eu_delivery", "bank_transfer")).toBe(false);
    expect(() => calculatePaymentFee("cash_on_delivery", "personal_pickup")).toThrow("payment_method_not_available");
  });

  it("calculates goods, shipping and payment fee in minor units", () => {
    const total = calculateOrderTotal([{ productId: products[0].id, quantity: 1 }], undefined, { countryCode: "CZ", shippingMethodId: "packeta_home", paymentMethodId: "cash_on_delivery" });
    expect(total.total).toBe(total.subtotal - total.discount + total.shipping + total.paymentFee);
    expect(total.shipping).toBe(11_900);
    expect(total.paymentFee).toBe(3_900);
  });

  it("does not charge shipping or payment fees for an empty cart", () => {
    expect(calculateOrderTotal([], undefined, { countryCode: "CZ", shippingMethodId: "packeta_pickup", paymentMethodId: "cash_on_delivery" })).toMatchObject({ subtotal: 0, shipping: 0, paymentFee: 0, total: 0 });
  });

  it("validates stock availability", () => {
    expect(validateStock([{ productId: products[0].id, quantity: products[0].stockQuantity + 1 }])).toEqual({ ok: false, productId: products[0].id, available: products[0].stockQuantity });
  });
});
