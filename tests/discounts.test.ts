import { describe, expect, it } from "vitest";
import { calculateDiscountFromRule, canCustomerUseDiscount } from "@/lib/discounts/validate";

const rule = {
  code: "VITEJ10", discount_type: "percent" as const, value: 10, currency: "CZK" as const,
  minimum_order_minor: 100_000, active: true, valid_from: null, valid_to: null,
  usage_limit: 100, usage_count: 2
};

describe("discount rules", () => {
  it("calculates an eligible percentage code", () => expect(calculateDiscountFromRule(rule, 200_000, "CZK").amountMinor).toBe(20_000));
  it("rejects a code below the minimum order", () => expect(calculateDiscountFromRule(rule, 50_000, "CZK").valid).toBe(false));
  it("rejects an exhausted code", () => expect(calculateDiscountFromRule({ ...rule, usage_count: 100 }, 200_000, "CZK").valid).toBe(false));
  it("caps a fixed discount at the subtotal", () => expect(calculateDiscountFromRule({ ...rule, discount_type: "fixed", value: 300_000 }, 200_000, "CZK").amountMinor).toBe(200_000));
  it("applies a fixed 95 CZK discount as 9,500 minor units", () => expect(calculateDiscountFromRule({ ...rule, discount_type: "fixed", value: 9_500 }, 139_900, "CZK").amountMinor).toBe(9_500));
  it("marks a free-shipping code without discounting the goods", () => {
    expect(calculateDiscountFromRule({ ...rule, discount_type: "free_shipping", value: 1 }, 139_900, "CZK")).toMatchObject({
      valid: true,
      amountMinor: 0,
      freeShipping: true
    });
  });
  it("allows a public code without a customer account", () => expect(canCustomerUseDiscount({ customer_user_id: null })).toBe(true));
  it("allows a personal reward only to its owner", () => {
    expect(canCustomerUseDiscount({ customer_user_id: "customer-a" }, "customer-a")).toBe(true);
    expect(canCustomerUseDiscount({ customer_user_id: "customer-a" }, "customer-b")).toBe(false);
    expect(canCustomerUseDiscount({ customer_user_id: "customer-a" })).toBe(false);
  });
});
