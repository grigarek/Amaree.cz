import { afterEach, describe, expect, it, vi } from "vitest";
import { mockPacketaPoint, validatePacketaPickupPoint } from "@/lib/shipping/packeta";

describe("Packeta pickup point validation", () => {
  afterEach(() => {
    delete process.env.PACKETA_VALIDATION_MODE;
    delete process.env.NEXT_PUBLIC_PACKETA_WIDGET_API_KEY;
  });

  it("accepts only the known local point in mock mode", async () => {
    await expect(validatePacketaPickupPoint(mockPacketaPoint, "cs")).resolves.toMatchObject({ valid: true, mode: "mock" });
    await expect(validatePacketaPickupPoint({ ...mockPacketaPoint, id: "unknown" }, "cs")).resolves.toMatchObject({ valid: false });
  });

  it("uses the official validation response as canonical data in remote mode", async () => {
    process.env.PACKETA_VALIDATION_MODE = "remote";
    process.env.NEXT_PUBLIC_PACKETA_WIDGET_API_KEY = "1234567890123456";
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          isValid: true,
          point: {
            name: "Z-BOX Olomouc",
            group: "zbox",
            address: { street: "Hlavní 1", city: "Olomouc", zip: "779 00", country: "cz" }
          },
          errors: []
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    const result = await validatePacketaPickupPoint({ ...mockPacketaPoint, id: "79" }, "cs", fetcher);
    expect(result).toMatchObject({ valid: true, mode: "remote", point: { id: "79", type: "zbox" } });
    expect(fetcher).toHaveBeenCalledWith(
      "https://widget.packeta.com/v6/pps/api/widget/v1/validate",
      expect.objectContaining({ method: "POST" })
    );
  });
});
