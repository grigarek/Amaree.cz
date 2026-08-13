import { afterEach, describe, expect, it, vi } from "vitest";
import { ResendProvider } from "@/lib/email/resend";
import { buildOrderStatusEmail } from "@/lib/email/order-status";
import { defaultOrderEmailSettings } from "@/lib/admin/email-template-settings";
import type { AdminOrderDetail } from "@/lib/admin/orders";
import { buildMerchantNewOrderEmail } from "@/lib/email/merchant-order";

afterEach(() => {
  delete process.env.TRANSACTIONAL_EMAIL_SEND_ENABLED;
  delete process.env.TRANSACTIONAL_EMAIL_TEST_RECIPIENT;
  delete process.env.RESEND_API_KEY;
  delete process.env.RESEND_FROM_EMAIL;
  delete process.env.APP_ENV;
});

describe("transactional e-mail", () => {
  it("never contacts Resend while transactional sending is disabled", async () => {
    const send = vi.fn();
    const provider = new ResendProvider("test-key", { emails: { send } } as never);
    await expect(provider.sendTransactionalEmail({
      to: "customer@example.test",
      subject: "Test",
      text: "Test message",
      html: "<p>Test message</p>",
      idempotencyKey: "test-1"
    })).resolves.toMatchObject({ mode: "preview", provider: "resend" });

    expect(send).not.toHaveBeenCalled();
  });

  it("restricts staging delivery and uses a Resend idempotency key", async () => {
    process.env.APP_ENV = "staging";
    process.env.TRANSACTIONAL_EMAIL_SEND_ENABLED = "true";
    process.env.TRANSACTIONAL_EMAIL_TEST_RECIPIENT = "staging@example.test";
    process.env.RESEND_API_KEY = "test-key";
    process.env.RESEND_FROM_EMAIL = "AMARÉE <objednavky@notify.amaree.cz>";
    const send = vi.fn().mockResolvedValue({ data: { id: "resend-123" }, error: null });
    const provider = new ResendProvider("test-key", { emails: { send } } as never);
    await expect(provider.sendTransactionalEmail({
      to: "customer@example.test",
      subject: "Test",
      text: "Test message",
      html: "<p>Test message</p>",
      attachments: [{ filename: "obchodni-podminky.html", content: "PGh0bWw+PC9odG1sPg==" }],
      idempotencyKey: "order/order-1/test",
      metadata: { order_id: "order-1" }
    })).resolves.toMatchObject({ providerMessageId: "resend-123", mode: "sent", actualRecipient: "staging@example.test" });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      to: "staging@example.test",
      subject: "[STAGING pro customer@example.test] Test",
      attachments: [{ filename: "obchodni-podminky.html", content: "PGh0bWw+PC9odG1sPg==" }]
    }), { idempotencyKey: "order/order-1/test" });
  });

  it("omits Reply-To when it matches the actual test recipient", async () => {
    process.env.APP_ENV = "staging";
    process.env.TRANSACTIONAL_EMAIL_SEND_ENABLED = "true";
    process.env.TRANSACTIONAL_EMAIL_TEST_RECIPIENT = "info@amaree.cz";
    process.env.RESEND_API_KEY = "test-key";
    process.env.RESEND_FROM_EMAIL = "AMARÉE <objednavky@notify.amaree.cz>";
    const send = vi.fn().mockResolvedValue({ data: { id: "resend-456" }, error: null });
    const provider = new ResendProvider("test-key", { emails: { send } } as never);

    await provider.sendTransactionalEmail({
      to: "info@amaree.cz",
      replyTo: "info@amaree.cz",
      subject: "Test",
      text: "Test message",
      html: "<p>Test message</p>",
      idempotencyKey: "test-same-recipient"
    });

    expect(send).toHaveBeenCalledWith(expect.objectContaining({
      to: "info@amaree.cz",
      replyTo: undefined
    }), { idempotencyKey: "test-same-recipient" });
  });

  it("requires tracking data in the shipped-order message", () => {
    const order = {
      id: "order-1",
      orderNumber: "AMR-2026-001001",
      firstName: "Anna",
      lastName: "Nováková",
      locale: "cs",
      shippingCountry: "CZ",
      currency: "CZK",
      totalMinor: 149000,
      subtotalMinor: 149000,
      discountMinor: 0,
      shippingMinor: 0,
      paymentFeeMinor: 0,
      paymentMethod: "gopay",
      shippingMethod: "packeta_pickup",
      shippingAddress: { street: "Testovací 1", postalCode: "779 00", city: "Olomouc", countryCode: "CZ" },
      packetaPoint: { id: "79", name: "Testovací místo", type: "pickup-point", address: null },
      payments: [],
      lines: [{
        quantity: 1,
        name: "Náhrdelník",
        sku: "AMA-NHR-001",
        variant: null,
        imageUrl: "https://example.test/product.jpg",
        lineTotalMinor: 149000
      }],
      shipment: { trackingNumber: "Z123456", trackingUrl: "https://tracking.packeta.com/cs/?id=Z123456" }
    } as unknown as AdminOrderDetail;
    const message = buildOrderStatusEmail(order, "order_shipped");
    expect(message.text).toContain("Dopravce: Zásilkovna");
    expect(message.text).toContain("Z123456");
    expect(message.html).toContain('src="https://example.test/product.jpg"');
    expect(message.html).toContain("AMA-NHR-001");
    expect(message.html).toContain("#bc2227");
    expect(() => buildOrderStatusEmail({ ...order, shipment: null }, "order_shipped")).toThrow("shipment_tracking_missing");
  });

  it("omits unsafe product image URLs from order e-mails", () => {
    const order = {
      id: "order-2",
      orderNumber: "AMR-2026-001002",
      firstName: "Anna",
      lastName: "Nováková",
      locale: "cs",
      shippingCountry: "CZ",
      currency: "CZK",
      totalMinor: 139900,
      subtotalMinor: 139900,
      discountMinor: 0,
      shippingMinor: 0,
      paymentFeeMinor: 0,
      paymentMethod: "bank_transfer",
      shippingMethod: "packeta_home",
      shippingAddress: { street: "Testovací 1", postalCode: "779 00", city: "Olomouc", countryCode: "CZ" },
      packetaPoint: { id: null, name: null, type: null, address: null },
      payments: [],
      lines: [{ quantity: 1, name: "Náramek", sku: "AMA-NAR-001", variant: null, imageUrl: "javascript:alert(1)", lineTotalMinor: 139900 }],
      shipment: null
    } as unknown as AdminOrderDetail;

    const message = buildOrderStatusEmail(order, "order_received");
    expect(message.html).not.toContain("javascript:");
    expect(message.html).toContain("Náramek");
    expect(message.attachments).toHaveLength(1);
    expect(message.attachments?.[0].filename).toContain("obchodni-podminky-amaree");
    expect(message.attachments?.[0].filename).toMatch(/\.txt$/);
  });

  it("uses polished payment capitalization and a delivery-only message", () => {
    const order = {
      id: "order-3", orderNumber: "A26-1003", firstName: "Anna", lastName: "Nováková", locale: "cs", shippingCountry: "CZ",
      currency: "CZK", totalMinor: 151800, subtotalMinor: 139900, discountMinor: 0, shippingMinor: 11900, paymentFeeMinor: 0,
      paymentMethod: "bank_transfer", shippingMethod: "packeta_home", shippingAddress: { street: "Testovací 1", postalCode: "779 00", city: "Olomouc", countryCode: "CZ" },
      packetaPoint: { id: null, name: null, type: null, address: null }, payments: [],
      lines: [{ quantity: 1, name: "Náramek", sku: "AMA-NAR-001", variant: null, imageUrl: null, lineTotalMinor: 139900 }],
      shipment: { trackingNumber: "Z123", trackingUrl: "https://tracking.packeta.com/cs/?id=Z123" }
    } as unknown as AdminOrderDetail;
    const message = buildOrderStatusEmail(order, "order_delivered");
    expect(message.subject).toContain("Objednávka byla doručena");
    expect(message.text).toContain("Platba: Bankovní převod");
    expect(message.text).not.toContain("vyzvednuta");
  });

  it("adds the review request only when an HTTPS review URL is enabled", () => {
    const order = {
      id: "order-4", orderNumber: "A26-1004", firstName: "Anna", lastName: "Nováková", locale: "cs", shippingCountry: "CZ",
      currency: "CZK", totalMinor: 139900, subtotalMinor: 139900, discountMinor: 0, shippingMinor: 0, paymentFeeMinor: 0,
      paymentMethod: "gopay", shippingMethod: "packeta_pickup", shippingAddress: { street: "Testovací 1", postalCode: "779 00", city: "Olomouc", countryCode: "CZ" },
      packetaPoint: { id: "79", name: "Test", type: "pickup-point", address: null }, payments: [],
      lines: [{ quantity: 1, name: "Náramek", sku: "AMA-NAR-001", variant: null, imageUrl: null, lineTotalMinor: 139900 }],
      shipment: { trackingNumber: "Z124", trackingUrl: "https://tracking.packeta.com/cs/?id=Z124" }
    } as unknown as AdminOrderDetail;
    const settings = { ...defaultOrderEmailSettings, review: { ...defaultOrderEmailSettings.review, enabled: true, url: "https://example.test/review" } };
    const message = buildOrderStatusEmail(order, "order_delivered", settings);
    expect(message.html).toContain("https://example.test/review");
    expect(message.text).toContain("Podělte se o svou zkušenost");
  });

  it("offers a safe return link while an online payment is still pending", () => {
    const order = {
      id: "order-5", orderNumber: "A26-1005", firstName: "Anna", lastName: "Nováková", locale: "cs", shippingCountry: "CZ",
      currency: "CZK", totalMinor: 139900, subtotalMinor: 139900, discountMinor: 0, shippingMinor: 0, paymentFeeMinor: 0,
      paymentMethod: "gopay", shippingMethod: "packeta_pickup", shippingAddress: { street: "Testovací 1", postalCode: "779 00", city: "Olomouc", countryCode: "CZ" },
      packetaPoint: { id: "79", name: "Test", type: "pickup-point", address: null },
      payments: [{ provider: "gopay", status: "pending", checkoutUrl: "https://gate.gopay.cz/gw/test" }],
      lines: [{ quantity: 1, name: "Náramek", sku: "1005", variant: null, imageUrl: null, lineTotalMinor: 139900 }],
      shipment: null
    } as unknown as AdminOrderDetail;
    const message = buildOrderStatusEmail(order, "awaiting_online_payment");
    expect(message.subject).toContain("Dokončete prosím online platbu");
    expect(message.text).toContain("https://gate.gopay.cz/gw/test");
    expect(message.html).toContain("Dokončit platbu");
  });

  it("builds a concise merchant notification with an admin link", () => {
    const order = {
      id: "order-6", orderNumber: "A26-1006", customer: "Anna Nováková", firstName: "Anna", lastName: "Nováková", email: "anna@example.test", phone: "+420700000000",
      locale: "cs", shippingCountry: "CZ", currency: "CZK", totalMinor: 151800, subtotalMinor: 139900, discountMinor: 0, shippingMinor: 11900, paymentFeeMinor: 0,
      paymentMethod: "gopay", shippingMethod: "packeta_home", shippingAddress: { street: "Testovací 1", postalCode: "779 00", city: "Olomouc", countryCode: "CZ" },
      packetaPoint: { id: null, name: null, type: null, address: null }, payments: [],
      lines: [{ quantity: 1, name: "Náramek", sku: "1006", variant: null, imageUrl: null, lineTotalMinor: 139900 }], shipment: null
    } as unknown as AdminOrderDetail;
    const message = buildMerchantNewOrderEmail(order, "https://amaree.cz");
    expect(message.subject).toBe("Nová objednávka – A26-1006");
    expect(message.text).toContain("anna@example.test");
    expect(message.adminUrl).toBe("https://amaree.cz/admin/orders/order-6");
  });
});
