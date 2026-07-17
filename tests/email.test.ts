import { describe, expect, it } from "vitest";
import { buildOrderConfirmationText } from "@/lib/email/order-confirmation";

describe("order confirmation", () => {
  it("includes confirmed operator and bank-transfer details", () => {
    const text = buildOrderConfirmationText({
      to: "customer@example.test",
      orderNumber: "AMR-2026-0001",
      locale: "cs",
      total: "1 600",
      currency: "CZK",
      paymentMethodId: "bank_transfer",
      shippingMethodId: "personal_pickup",
      variableSymbol: "20260001",
      bankTransferDueDate: "18. 7. 2026"
    });
    expect(text).toContain("3361675015/3030");
    expect(text).toContain("Příčná 129/3");
    expect(text).toContain("IČO 25882384");
    expect(text).toContain("20260001");
  });

  it("refuses an incomplete bank-transfer confirmation", () => {
    expect(() => buildOrderConfirmationText({
      to: "customer@example.test",
      orderNumber: "AMR-2026-0001",
      locale: "cs",
      total: "1 600",
      currency: "CZK",
      paymentMethodId: "bank_transfer",
      shippingMethodId: "personal_pickup"
    })).toThrow("bank_transfer_details_missing");
  });
});
