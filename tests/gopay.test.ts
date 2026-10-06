import { describe, expect, it, vi } from "vitest";
import { GoPayPaymentProvider, mapGoPayStatus } from "@/lib/payments/gopay";

const config = { environment: "sandbox" as const, goId: "1234567890", clientId: "client", clientSecret: "secret" };

describe("GoPay provider", () => {
  it.each([
    ["CREATED", "pending"],
    ["PAYMENT_METHOD_CHOSEN", "pending"],
    ["PAID", "paid"],
    ["CANCELED", "cancelled"],
    ["TIMEOUTED", "expired"],
    ["REFUNDED", "refunded"]
  ])("maps %s to %s", (raw, expected) => {
    expect(mapGoPayStatus(raw)).toBe(expected);
  });

  it("creates a sandbox redirect using server-provided totals", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "token" }), { status: 200 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 987654, gw_url: "https://gw.sandbox.gopay.com/gw/v3/987654", state: "CREATED" }), { status: 200 })
      );
    const provider = new GoPayPaymentProvider(config, fetcher);

    const result = await provider.createCheckoutSession({
      orderId: "order-id",
      orderNumber: "AMR-2026-0001",
      customerEmail: "customer@example.test",
      currency: "CZK",
      total: 149000,
      successUrl: "https://amaree.cz/api/payments/gopay/return?locale=cs",
      cancelUrl: "https://example.test/cs/objednavka",
      notificationUrl: "https://test.amaree.cz/api/payments/gopay/notification",
      locale: "cs"
    });

    expect(result).toEqual({
      provider: "gopay",
      providerReference: "987654",
      redirectUrl: "https://gw.sandbox.gopay.com/gw/v3/987654"
    });
    const createOptions = fetcher.mock.calls[1][1] as RequestInit;
    expect(JSON.parse(String(createOptions.body))).toMatchObject({ amount: 149000, currency: "CZK" });
  });

  it("verifies status by querying GoPay instead of trusting notification data", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "token" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 987654, state: "PAID" }), { status: 200 }));
    const provider = new GoPayPaymentProvider(config, fetcher);
    await expect(provider.getPaymentStatus("987654")).resolves.toMatchObject({ status: "paid", rawStatus: "PAID" });
  });
});
