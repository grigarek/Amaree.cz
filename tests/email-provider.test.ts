import { afterEach, describe, expect, it, vi } from "vitest";
import { sendEcomailTransactional } from "@/lib/email/ecomail";
import { buildOrderStatusEmail } from "@/lib/email/order-status";
import type { AdminOrderDetail } from "@/lib/admin/orders";

afterEach(() => {
  delete process.env.ECOMAIL_SEND_ENABLED;
  delete process.env.ECOMAIL_API_KEY;
  delete process.env.ECOMAIL_FROM_EMAIL;
});

describe("transactional e-mail", () => {
  it("never contacts Ecomail while sending is disabled", async () => {
    const fetcher = vi.fn();

    await expect(sendEcomailTransactional({
      to: "customer@example.test",
      subject: "Test",
      text: "Test message"
    }, fetcher)).resolves.toMatchObject({ mode: "preview" });

    expect(fetcher).not.toHaveBeenCalled();
  });

  it("uses the documented Ecomail message fields", async () => {
    process.env.ECOMAIL_SEND_ENABLED = "true";
    process.env.ECOMAIL_ENVIRONMENT = "test";
    process.env.ECOMAIL_API_KEY = "test-key";
    process.env.ECOMAIL_FROM_EMAIL = "test@amaree.cz";
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      results: { total_rejected_recipients: 0, total_accepted_recipients: 1, id: 123 }
    }), { status: 200 }));

    await expect(sendEcomailTransactional({
      to: "customer@example.test",
      subject: "Test",
      text: "Test message",
      metadata: { order_id: "order-1" }
    }, fetcher)).resolves.toEqual({ providerMessageId: "123", mode: "sent" });

    const payload = JSON.parse(String((fetcher.mock.calls[0][1] as RequestInit).body));
    expect(payload.message.global_merge_vars).toEqual([{ name: "order_id", content: "order-1" }]);
    expect(payload.message).not.toHaveProperty("metadata");
  });

  it("requires tracking data in the shipped-order message", () => {
    const order = {
      id: "order-1",
      orderNumber: "AMR-2026-001001",
      locale: "cs",
      currency: "CZK",
      totalMinor: 149000,
      lines: [{ quantity: 1, name: "Náhrdelník", lineTotalMinor: 149000 }],
      shipment: { trackingNumber: "Z123456", trackingUrl: "https://tracking.packeta.com/cs/?id=Z123456" }
    } as unknown as AdminOrderDetail;
    const message = buildOrderStatusEmail(order, "order_shipped");
    expect(message.text).toContain("Dopravce: Packeta");
    expect(message.text).toContain("Z123456");
    expect(() => buildOrderStatusEmail({ ...order, shipment: null }, "order_shipped")).toThrow("shipment_tracking_missing");
  });
});
