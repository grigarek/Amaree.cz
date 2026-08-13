import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { sendOrderStatusEmail } from "@/lib/email/order-status";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin || admin.role !== "admin") return NextResponse.json({ error: "admin_required" }, { status: 403 });
  const { id } = await params;
  try {
    const result = await sendOrderStatusEmail(id, "order_shipped", { triggeredBy: admin.userId, triggerSource: "shipment" });
    revalidatePath(`/admin/orders/${id}`);
    return NextResponse.json({ status: result.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "tracking_email_failed" }, { status: 502 });
  }
}
