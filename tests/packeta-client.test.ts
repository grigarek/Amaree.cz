import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createPacketaPacket,
  getPacketaCourierLabelPdf,
  getPacketaCourierNumber
} from "@/lib/shipping/packeta-client";

beforeEach(() => {
  process.env.APP_ENV = "staging";
  process.env.PACKETA_ENVIRONMENT = "test";
  process.env.PACKETA_API_ENABLED = "true";
  process.env.PACKETA_API_PASSWORD = "test-password-not-a-real-secret";
  process.env.PACKETA_SENDER = "AMAREE-TEST";
  process.env.PACKETA_HOME_CARRIER_ID_CZ = "106";
});

afterEach(() => {
  delete process.env.PACKETA_API_ENABLED;
  delete process.env.PACKETA_API_PASSWORD;
  delete process.env.PACKETA_SENDER;
  delete process.env.PACKETA_HOME_CARRIER_ID_CZ;
});

describe("Packeta server adapter", () => {
  it("creates a pickup packet from server-side order data", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(
      "<response><status>ok</status><result><id>123456</id><barcode>Z123456</barcode></result></response>",
      { status: 200 }
    ));
    const result = await createPacketaPacket({
      orderNumber: "AMR-2026-001001",
      firstName: "Anna",
      lastName: "Nováková",
      email: "anna@example.test",
      phone: "+420700000000",
      currency: "CZK",
      valueMinor: 149000,
      cashOnDeliveryMinor: 0,
      country: "CZ",
      shippingMethod: "packeta_pickup",
      pickupPointId: "79",
      shippingAddress: {}
    }, fetcher);
    expect(result).toMatchObject({ packetId: "123456", barcode: "Z123456" });
    const body = String((fetcher.mock.calls[0][1] as RequestInit).body);
    expect(body).toContain("<addressId>79</addressId>");
    expect(body).toContain("<value>1490.00</value>");
  });

  it("obtains the carrier number before creating a home-delivery label", async () => {
    const courierFetcher = vi.fn().mockResolvedValue(new Response(
      "<response><status>ok</status><result>0286929453</result></response>",
      { status: 200 }
    ));
    await expect(getPacketaCourierNumber("123456", courierFetcher)).resolves.toBe("0286929453");

    const labelFetcher = vi.fn().mockResolvedValue(new Response(
      `<response><status>ok</status><result>${Buffer.from("%PDF-1.4").toString("base64")}</result></response>`,
      { status: 200 }
    ));
    const label = await getPacketaCourierLabelPdf("123456", "0286929453", labelFetcher);
    expect(label.subarray(0, 4).toString("ascii")).toBe("%PDF");
    expect(String((labelFetcher.mock.calls[0][1] as RequestInit).body)).toContain("<courierNumber>0286929453</courierNumber>");
  });
});
