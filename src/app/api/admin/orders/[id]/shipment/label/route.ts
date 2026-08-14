import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPacketaCourierLabelPdf, getPacketaCourierNumber, getPacketaLabelPdf } from "@/lib/shipping/packeta-client";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin || admin.role !== "admin") return NextResponse.json({ error: "admin_required" }, { status: 403 });
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: order } = await supabase.from("orders").select("shipping_method").eq("id", id).maybeSingle();
  const { data: shipment, error } = await supabase.from("shipments").select("id,provider_packet_id,provider_payload").eq("order_id", id).eq("provider", "packeta").maybeSingle();
  if (error || !shipment?.provider_packet_id) return NextResponse.json({ error: "shipment_not_found" }, { status: 404 });
  try {
    let pdf: Buffer;
    if (order?.shipping_method === "packeta_home") {
      const payload = (shipment.provider_payload ?? {}) as { courier_number?: string };
      const courierNumber = payload.courier_number ?? await getPacketaCourierNumber(shipment.provider_packet_id);
      if (!payload.courier_number) {
        const { error: updateError } = await supabase.from("shipments").update({
          tracking_number: courierNumber,
          provider_payload: { ...payload, courier_number: courierNumber }
        }).eq("id", shipment.id);
        if (updateError) throw new Error(updateError.message);
      }
      pdf = await getPacketaCourierLabelPdf(shipment.provider_packet_id, courierNumber);
    } else {
      pdf = await getPacketaLabelPdf(shipment.provider_packet_id);
    }
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="amaree-packeta-${shipment.provider_packet_id}.pdf"`,
        "Cache-Control": "private, no-store"
      }
    });
  } catch (labelError) {
    return NextResponse.json({ error: labelError instanceof Error ? labelError.message : "packeta_label_failed" }, { status: 502 });
  }
}
