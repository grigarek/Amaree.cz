import { describe, expect, it } from "vitest";
import { sanitizePersistedCartState } from "@/lib/cart-persistence";
import type { CartLine, Product } from "@/types/domain";

function line(currency: "CZK" | "EUR"): CartLine {
  return {
    productId: `product-${currency}`,
    quantity: 1,
    product: { id: `product-${currency}`, currency } as Product
  };
}

describe("sanitizePersistedCartState", () => {
  it("keeps only products available in the active market and resets its discount", () => {
    const result = sanitizePersistedCartState({
      lines: [line("CZK"), line("EUR")],
      discountCode: "TEST10",
      discountAmount: 100,
      discountMessage: "Platný kód",
      discountValid: true,
      giftCardDesignId: "dekuji-red"
    }, "EUR");

    expect(result.lines).toEqual([line("EUR")]);
    expect(result.discountCode).toBe("");
    expect(result.discountAmount).toBe(0);
    expect(result.discountValid).toBe(false);
    expect(result.giftCardDesignId).toBe("dekuji-red");
  });

  it("removes an unknown gift-card selection from persisted data", () => {
    const result = sanitizePersistedCartState({ lines: [line("CZK")], giftCardDesignId: "not-a-design" }, "CZK");
    expect(result.giftCardDesignId).toBeNull();
  });

  it("preserves a compatible cart but requires a fresh coupon validation", () => {
    const result = sanitizePersistedCartState({ lines: [line("CZK")], discountCode: "TEST10", discountAmount: 10, discountMessage: "staré ověření", discountValid: true }, "CZK");

    expect(result.lines).toEqual([line("CZK")]);
    expect(result.discountCode).toBe("TEST10");
    expect(result.discountAmount).toBe(0);
    expect(result.discountMessage).toBe("");
    expect(result.discountValid).toBe(false);
  });
});
