import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendOrderStatusEmail } from "@/lib/email/order-status";
import { getPacketaPacketStatus } from "@/lib/shipping/packeta-client";
import { syncFakturoidInvoice } from "@/lib/accounting/fakturoid";

type ShipmentRow = {
  id: string;
  order_id: string;
  provider_packet_id: string;
  status: string;
  provider_payload: Record<string, unknown> | null;
};

export async function syncPacketaDeliveryStatuses(limit = 100) {
  if (process.env.PACKETA_API_ENABLED !== "true") return { skipped: true, reason: "packeta_api_disabled", checked: 0, delivered: 0, failed: 0 };
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("shipments")
    .select("id,order_id,provider_packet_id,status,provider_payload")
    .eq("provider", "packeta")
    .not("provider_packet_id", "is", null)
    .neq("status", "delivered")
    .neq("status", "cancelled")
    .order("updated_at", { ascending: true })
    .limit(Math.min(Math.max(limit, 1), 100));
  if (error) throw new Error(`packeta_sync_load_failed:${error.message}`);

  let delivered = 0;
  let failed = 0;
  for (const shipment of (data ?? []) as ShipmentRow[]) {
    try {
      const status = await getPacketaPacketStatus(shipment.provider_packet_id);
      const checkedAt = new Date().toISOString();
      const providerPayload = { ...(shipment.provider_payload ?? {}), latestStatus: status, statusCheckedAt: checkedAt };
      await supabase.from("shipments").update({ provider_payload: providerPayload }).eq("id", shipment.id);
      if (status.statusCode !== 7) continue;

      const { data: claimed, error: claimError } = await supabase
        .from("shipments")
        .update({ status: "delivered", provider_payload: providerPayload })
        .eq("id", shipment.id)
        .neq("status", "delivered")
        .neq("status", "cancelled")
        .select("order_id")
        .maybeSingle();
      if (claimError) throw new Error(`packeta_delivery_claim_failed:${claimError.message}`);
      if (!claimed) continue;

      const { data: order, error: orderError } = await supabase.from("orders").select("status").eq("id", shipment.order_id).single();
      if (orderError) throw new Error(`packeta_delivery_order_failed:${orderError.message}`);
      if (["cancelled", "refunded", "archived", "delivered"].includes(order.status)) continue;
      const previousStatus = order.status;
      const { error: updateError } = await supabase.from("orders").update({ status: "delivered" }).eq("id", shipment.order_id).eq("status", previousStatus);
      if (updateError) throw new Error(`packeta_delivery_update_failed:${updateError.message}`);
      const { data: history, error: historyError } = await supabase.from("order_status_history").insert({
        order_id: shipment.order_id,
        previous_status: previousStatus,
        new_status: "delivered",
        note: "Automatická synchronizace Packeta: delivered (7).",
        email_requested: true
      }).select("id").single();
      if (historyError) throw new Error(`packeta_delivery_history_failed:${historyError.message}`);
      const email = await sendOrderStatusEmail(shipment.order_id, "order_delivered", { triggerSource: "shipment" });
      if (email.messageId) await supabase.from("order_status_history").update({ email_message_id: email.messageId }).eq("id", history.id);
      try {
        await syncFakturoidInvoice(shipment.order_id, { source: "shipment" });
      } catch {
        // Accounting failures are stored separately and must not block shipment synchronization.
      }
      delivered += 1;
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "packeta_status_sync_failed";
      await supabase.from("shipments").update({ provider_payload: { ...(shipment.provider_payload ?? {}), statusSyncError: message.slice(0, 400), statusCheckedAt: new Date().toISOString() } }).eq("id", shipment.id);
    }
  }
  return { skipped: false, checked: data?.length ?? 0, delivered, failed };
}
