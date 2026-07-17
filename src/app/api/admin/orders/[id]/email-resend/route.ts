import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin/session";
import { sendOrderStatusEmail } from "@/lib/email/order-status";

const schema = z.object({ template: z.enum([
  "order_received", "awaiting_bank_transfer", "payment_confirmed", "payment_failed",
  "order_processing", "ready_for_pickup", "order_shipped", "order_cancelled", "payment_refunded"
]) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin || admin.role !== "admin") return NextResponse.json({ error: "Tuto akci může provést pouze administrátor." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Neplatná šablona." }, { status: 422 });
  const { id } = await params;
  try {
    const result = await sendOrderStatusEmail(id, parsed.data.template, { manualResend: true });
    revalidatePath(`/admin/orders/${id}`);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "E-mail se nepodařilo odeslat." }, { status: 502 });
  }
}
