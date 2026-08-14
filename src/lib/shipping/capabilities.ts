import type { DeliveryCountryCode } from "@/lib/commerce/config";
import type { ShippingMethodId } from "@/types/domain";

export type PacketaPointType = "pickup-point" | "zbox";

export type PacketaCodCapabilities = Record<DeliveryCountryCode, {
  pickup: boolean;
  zbox: boolean;
  home: boolean;
}>;

export const disabledPacketaCodCapabilities: PacketaCodCapabilities = {
  CZ: { pickup: false, zbox: false, home: false },
  SK: { pickup: false, zbox: false, home: false }
};

export function isPacketaCodSupported(
  capabilities: PacketaCodCapabilities,
  country: DeliveryCountryCode,
  shippingMethod: ShippingMethodId,
  pointType?: PacketaPointType | null
) {
  if (shippingMethod === "packeta_home") return capabilities[country].home;
  if (shippingMethod !== "packeta_pickup") return false;
  if (pointType === "zbox") return capabilities[country].zbox;
  if (pointType === "pickup-point") return capabilities[country].pickup;
  return capabilities[country].pickup || capabilities[country].zbox;
}
