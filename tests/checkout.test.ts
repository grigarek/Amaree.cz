import { describe, expect, it } from "vitest";
import { checkoutSchema } from "@/lib/checkout/validation";
import { products } from "@/lib/products";

describe("checkout validation", () => {
  it("accepts valid checkout details", () => {
    const result = checkoutSchema.safeParse({
      locale: "cs",
      email: "info@amaree.cz",
      phone: "+420737076249",
      name: "AMARÉE zákazník",
      shippingMethodId: "zasilkovna",
      lines: [{ productId: products[0].id, quantity: 1 }]
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid customer e-mail", () => {
    const result = checkoutSchema.safeParse({
      locale: "cs",
      email: "bad",
      phone: "+420737076249",
      name: "AMARÉE zákazník",
      shippingMethodId: "zasilkovna",
      lines: [{ productId: products[0].id, quantity: 1 }]
    });
    expect(result.success).toBe(false);
  });
});
