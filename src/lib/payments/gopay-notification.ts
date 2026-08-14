import "server-only";
import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { sendOrderStatusEmail } from "@/lib/email/order-status";
import type { OrderTemplateKey } from "@/lib/orders/statuses";
import { syncFakturoidInvoice } from "@/lib/accounting/fakturoid";
import { createAutomaticPacketaShipment } from "@/lib/shipping/packeta-create";

const paymentEmailTemplates: Partial<Record<string, OrderTemplateKey>> = {
  paid: "payment_confirmed",
  failed: "payment_failed",
  cancelled: "order_cancelled",
  expired: "payment_failed",
  refunded: "payment_refunded"
};

export async function handleGoPayNotification(request: Request) {
  const paymentId = new URL(request.url).searchParams.get("id");
  if (!paymentId || !/^\d+$/.test(paymentId)) {
    return NextResponse.json({ error: "invalid_payment_id" }, { status: 400 });
  }

  try {
    const verified = await getPaymentProvider("gopay").getPaymentStatus(paymentId);
    const eventId = `${verified.providerReference}:${verified.rawStatus}`;
    const payloadHash = createHash("sha256").update(JSON.stringify(verified)).digest("hex");
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc("process_gopay_payment_status", {
      p_provider_payment_id: verified.providerReference,
      p_new_status: verified.status,
      p_event_id: eventId,
      p_payload_hash: payloadHash
    });
    if (error) throw new Error(error.message);
    const result = data as { duplicate?: boolean; orderId?: string };
    if (result.duplicate) return NextResponse.json({ status: "duplicate_ignored" });

    let accountingStatus: string | null = null;
    let shipmentStatus: string | null = null;
    if (verified.status === "paid" && result.orderId) {
      try {
        accountingStatus = (await syncFakturoidInvoice(result.orderId, { source: "payment_webhook" })).status;
      } catch {
        accountingStatus = "failed_recorded";
      }
    }
    let emailStatus: string | null = null;
    const template = paymentEmailTemplates[verified.status];
    if (template && result.orderId) {
      try {
        emailStatus = (await sendOrderStatusEmail(result.orderId, template, { triggerSource: "payment_webhook" })).status;
      } catch {
        emailStatus = "failed_recorded";
      }
    }
    if (verified.status === "paid" && result.orderId) {
      try {
        shipmentStatus = (await createAutomaticPacketaShipment(result.orderId)).status;
      } catch {
        shipmentStatus = "failed_recorded";
      }
    }
    return NextResponse.json({ status: "accepted", paymentStatus: verified.status, emailStatus, accountingStatus, shipmentStatus });
  } catch {
    return NextResponse.json({ error: "payment_status_verification_failed" }, { status: 503 });
  }
}
