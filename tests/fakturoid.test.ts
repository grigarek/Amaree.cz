import { describe, expect, it, vi } from "vitest";
import { FakturoidClient, fakturoidCustomerId } from "@/lib/accounting/fakturoid-client";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

describe("Fakturoid API client", () => {
  it("uses a stable non-PII customer identifier", () => {
    expect(fakturoidCustomerId(" Jana@Example.cz ")).toBe(fakturoidCustomerId("jana@example.cz"));
    expect(fakturoidCustomerId("jana@example.cz")).not.toContain("jana@example.cz");
  });

  it("reuses an invoice found by the shop order UUID", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(json({ access_token: "token", token_type: "Bearer", expires_in: 7200 }))
      .mockResolvedValueOnce(json([{ id: 529, custom_id: "order-uuid", number: "2026-001", variable_symbol: "2026001", status: "open", html_url: "https://example.test/admin", public_html_url: "https://example.test/public", pdf_url: "https://example.test/pdf" }]));
    const client = new FakturoidClient({ accountSlug: "amaree", clientId: "client", clientSecret: "secret" }, fetcher as typeof fetch);
    const invoice = await client.findInvoice("order-uuid");
    expect(invoice?.id).toBe(529);
    expect(fetcher.mock.calls[1][0]).toContain("custom_id=order-uuid");
    expect(fetcher.mock.calls[1][1]?.headers).toMatchObject({ Authorization: "Bearer token", "User-Agent": "AMAREE e-shop (info@amaree.cz)" });
  });

  it("checks the connected account without creating accounting data", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(json({ access_token: "token", token_type: "Bearer", expires_in: 7200 }))
      .mockResolvedValueOnce(json({ subdomain: "medianum", plan: "Na každý den", api_calls_limit: 3000, api_calls_used: 12, name: "MEDIANUM s.r.o.", registration_no: "25882384", vat_mode: "non_vat_payer", currency: "CZK" }));
    const client = new FakturoidClient({ accountSlug: "medianum", clientId: "client", clientSecret: "secret" }, fetcher as typeof fetch);
    const account = await client.getAccountStatus();
    expect(account).toMatchObject({ name: "MEDIANUM s.r.o.", vat_mode: "non_vat_payer", currency: "CZK" });
    expect(fetcher.mock.calls[1][0]).toContain("/accounts/medianum/account.json");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("creates a payment without asking Fakturoid to send a second thank-you email", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(json({ access_token: "token", token_type: "Bearer", expires_in: 7200 }))
      .mockResolvedValueOnce(json({ id: 8 }, 201));
    const client = new FakturoidClient({ accountSlug: "amaree", clientId: "client", clientSecret: "secret" }, fetcher as typeof fetch);
    await client.markInvoicePaid(529, "2026-08-03", "261003");
    expect(fetcher.mock.calls[1][0]).toContain("/invoices/529/payments.json");
    expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toEqual({ paid_on: "2026-08-03", variable_symbol: "261003", send_thank_you_email: false });
  });
});
