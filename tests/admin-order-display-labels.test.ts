import { describe, expect, it } from "vitest";
import {
  emailSourceLabel,
  emailStatusLabel,
  emailTemplateLabel,
  paymentMethodLabel,
  paymentStatusLabel,
  shippingMethodLabel
} from "@/lib/admin/order-display-labels";

describe("české popisky objednávek v administraci", () => {
  it("překládá platbu a dopravu", () => {
    expect(paymentMethodLabel("bank_transfer")).toBe("Bankovní převod");
    expect(paymentStatusLabel("pending")).toBe("Čeká na platbu");
    expect(shippingMethodLabel("packeta_pickup")).toBe("Zásilkovna – výdejní místo nebo Z-BOX");
  });

  it("překládá stav, typ a zdroj e-mailu", () => {
    expect(emailStatusLabel("queued")).toBe("Čeká na odeslání");
    expect(emailStatusLabel("sent")).toBe("Odesláno");
    expect(emailTemplateLabel("order_shipped")).toBe("Zásilka byla předána dopravci");
    expect(emailSourceLabel("admin_manual")).toBe("ručně z administrace");
  });

  it("zobrazí neznámou budoucí hodnotu čitelně", () => {
    expect(emailStatusLabel("future_status")).toBe("Future status");
  });
});
