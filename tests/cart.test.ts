import { describe, expect, it } from "vitest";
import { calculateDiscount, calculateOrderTotal, calculateShipping, priceCartLines, validateStock } from "@/lib/cart";
import { products } from "@/lib/products";

describe("cart pricing", () => {
  it("prices products from server-side catalog data", () => {
    const line = priceCartLines([{ productId: products[0].id, quantity: 2 }])[0];
    expect(line.unitPrice).toBe(products[0].price);
    expect(line.lineTotal).toBe(products[0].price * 2);
  });

  it("clamps quantity to available stock", () => {
    const line = priceCartLines([{ productId: products[0].id, quantity: 999 }])[0];
    expect(line.quantity).toBe(products[0].stockQuantity);
  });

  it("calculates discount codes", () => {
    expect(calculateDiscount(200000, "AMAREE10")).toBe(20000);
    expect(calculateDiscount(50000, "AMAREE10")).toBe(0);
  });

  it("calculates free shipping threshold", () => {
    expect(calculateShipping(260000, "zasilkovna")).toBe(0);
    expect(calculateShipping(120000, "zasilkovna")).toBe(7900);
  });

  it("validates stock availability", () => {
    expect(validateStock([{ productId: products[0].id, quantity: products[0].stockQuantity + 1 }])).toEqual({
      ok: false,
      productId: products[0].id,
      available: products[0].stockQuantity
    });
  });

  it("calculates order total", () => {
    const total = calculateOrderTotal([{ productId: products[0].id, quantity: 1 }], "AMAREE10", "pickup");
    expect(total.total).toBe(total.subtotal - total.discount);
  });
});
