import "server-only";
import { getAdminOrder } from "@/lib/admin/orders";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createPacketaPacket } from "@/lib/shipping/packeta-client";

type ShipmentClaim = {
  claimed?: boolean;
  shipmentId?: string;
  providerPacketId?: string;
  status?: string;
};

export type AutomaticShipmentResult = {
  status: "created" | "duplicate_ignored" | "not_eligible";
  packetId?: string | null;
  trackingNumber?: string | null;
  reason?: string;
};

export function automaticShipmentEligibility(order: {
  shippingMethod: string;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
}) {
  if (!order.shippingMethod.startsWith("packeta_")) return { eligible: false, reason: "order_is_not_packeta" } as const;
  if (["cancelled", "refunded", "archived"].includes(order.status)) return { eligible: false, reason: "order_not_fulfillable" } as const;
  if (order.paymentMethod === "cash_on_delivery") return { eligible: true } as const;
  if (order.paymentMethod === "gopay" && order.paymentStatus === "paid") return { eligible: true } as const;
  if (order.paymentMethod === "bank_transfer" && ["paid", "processing"].includes(order.status)) return { eligible: true } as const;
  return { eligible: false, reason: "order_payment_not_confirmed" } as const;
}

export async function createAutomaticPacketaShipment(orderId: string): Promise<AutomaticShipmentResult> {
  const order = await getAdminOrder(orderId, { service: true });
  if (!order) throw new Error("order_not_found");
  const eligibility = automaticShipmentEligibility(order);
  if (!eligibility.eligible) return { status: "not_eligible", reason: eligibility.reason };

  const supabase = createSupabaseAdminClient();
  const { data: claim, error: claimError } = await supabase.rpc("claim_packeta_shipment_creation", { p_order_id: orderId });
  if (claimError) throw new Error(`packeta_shipment_claim_failed:${claimError.message}`);
  const claimed = claim as ShipmentClaim;
  if (!claimed.claimed) {
    return { status: "duplicate_ignored", packetId: claimed.providerPacketId ?? null };
  }
  if (!claimed.shipmentId) throw new Error("packeta_shipment_claim_incomplete");

  try {
    const packet = await createPacketaPacket({
      orderNumber: order.orderNumber,
      firstName: order.firstName,
      lastName: order.lastName,
      email: order.email,
      phone: order.phone ?? "",
      currency: order.currency,
      valueMinor: order.totalMinor,
      cashOnDeliveryMinor: order.paymentMethod === "cash_on_delivery" ? order.totalMinor : 0,
      country: order.shippingCountry,
      shippingMethod: order.shippingMethod,
      pickupPointId: order.packetaPoint.id,
      shippingAddress: order.shippingAddress
    });
    const { error: updateError } = await supabase.from("shipments").update({
      status: "created",
      provider_packet_id: packet.packetId,
      tracking_number: packet.barcode,
      tracking_url: packet.trackingUrl,
      provider_payload: { barcode: packet.barcode, automaticallyCreatedAt: new Date().toISOString() }
    }).eq("id", claimed.shipmentId);
    if (updateError) throw new Error(updateError.message);
    return { status: "created", packetId: packet.packetId, trackingNumber: packet.barcode };
  } catch (error) {
    const message = error instanceof Error ? error.message : "packeta_create_failed";
    await supabase.from("shipments").update({
      status: "draft",
      provider_payload: { last_error: message.slice(0, 400), automaticAttemptAt: new Date().toISOString() }
    }).eq("id", claimed.shipmentId);
    throw error;
  }
}
