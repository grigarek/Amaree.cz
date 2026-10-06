import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { getAdminOrder } from "@/lib/admin/orders";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createPacketaPacket } from "@/lib/shipping/packeta-client";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin || admin.role !== "admin") return NextResponse.json({ error: "admin_required" }, { status: 403 });
  const { id } = await params;
  const order = await getAdminOrder(id);
  if (!order) return NextResponse.json({ error: "order_not_found" }, { status: 404 });
  if (!order.shippingMethod.startsWith("packeta_")) return NextResponse.json({ error: "order_is_not_packeta" }, { status: 422 });
  const supabase = await createSupabaseServerClient();
  const { data: claim, error: claimError } = await supabase.rpc("admin_claim_packeta_shipment", { p_order_id: id });
  if (claimError) return NextResponse.json({ error: claimError.message }, { status: 500 });
  const claimed = claim as { claimed?: boolean; shipmentId?: string; providerPacketId?: string };
  if (!claimed.claimed) return NextResponse.json({ status: "duplicate_ignored", packetId: claimed.providerPacketId ?? null }, { status: 200 });

  try {
    const packet = await createPacketaPacket({
      orderNumber: order.orderNumber,
      firstName: order.customer.split(" ").slice(0, -1).join(" ") || order.customer,
      lastName: order.customer.split(" ").at(-1) ?? "-",
      email: order.email,
      phone: order.phone,
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
      provider_payload: { barcode: packet.barcode }
    }).eq("id", claimed.shipmentId);
    if (updateError) throw new Error(updateError.message);
    revalidatePath(`/admin/orders/${id}`);
    return NextResponse.json({ status: "created", ...packet }, { status: 201 });
  } catch (error) {
    await supabase.from("shipments").update({ status: "draft", provider_payload: { last_error: error instanceof Error ? error.message : "packeta_create_failed" } }).eq("id", claimed.shipmentId);
    return NextResponse.json({ error: error instanceof Error ? error.message : "packeta_create_failed" }, { status: 502 });
  }
}
