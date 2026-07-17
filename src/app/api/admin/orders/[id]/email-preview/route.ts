import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin/session";
import { getAdminOrder } from "@/lib/admin/orders";
import { buildOrderStatusEmail } from "@/lib/email/order-status";

const templateSchema = z.enum([
  "order_received", "awaiting_bank_transfer", "payment_confirmed", "payment_failed",
  "order_processing", "ready_for_pickup", "order_shipped", "order_cancelled", "payment_refunded"
]);

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin || admin.role !== "admin") return NextResponse.json({ error: "Tuto akci může provést pouze administrátor." }, { status: 403 });
  const template = templateSchema.safeParse(new URL(request.url).searchParams.get("template"));
  if (!template.success) return NextResponse.json({ error: "Neplatná šablona." }, { status: 422 });
  const { id } = await params;
  const order = await getAdminOrder(id);
  if (!order) return NextResponse.json({ error: "Objednávka nebyla nalezena." }, { status: 404 });
  try {
    return NextResponse.json({ recipient: order.email, ...buildOrderStatusEmail(order, template.data) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Náhled nelze sestavit." }, { status: 422 });
  }
}
