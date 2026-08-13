import { describe, expect, it } from "vitest";
import { disabledPacketaCodCapabilities, isPacketaCodSupported, type PacketaCodCapabilities } from "@/lib/shipping/capabilities";

describe("Packeta COD capabilities", () => {
  it("keeps every service disabled until it is explicitly verified", () => {
    expect(isPacketaCodSupported(disabledPacketaCodCapabilities, "SK", "packeta_home")).toBe(false);
    expect(isPacketaCodSupported(disabledPacketaCodCapabilities, "SK", "packeta_pickup", "pickup-point")).toBe(false);
    expect(isPacketaCodSupported(disabledPacketaCodCapabilities, "SK", "packeta_pickup", "zbox")).toBe(false);
  });

  it("distinguishes pickup points, Z-BOXes and home delivery", () => {
    const capabilities: PacketaCodCapabilities = {
      CZ: { pickup: false, zbox: false, home: false },
      SK: { pickup: true, zbox: false, home: true }
    };

    expect(isPacketaCodSupported(capabilities, "SK", "packeta_pickup", "pickup-point")).toBe(true);
    expect(isPacketaCodSupported(capabilities, "SK", "packeta_pickup", "zbox")).toBe(false);
    expect(isPacketaCodSupported(capabilities, "SK", "packeta_home")).toBe(true);
    expect(isPacketaCodSupported(capabilities, "SK", "personal_pickup")).toBe(false);
  });
});
