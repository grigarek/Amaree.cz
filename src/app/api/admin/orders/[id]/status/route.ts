import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin/session";
import { orderStatuses, templateForOrderStatus } from "@/lib/orders/statuses";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { sendOrderStatusEmail } from "@/lib/email/order-status";

const schema = z.object({
  status: z.enum(orderStatuses),
  note: z.string().trim().max(1000).optional(),
  sendEmail: z.boolean()
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin || admin.role !== "admin") return NextResponse.json({ error: "Tuto akci může provést pouze administrátor." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Neplatná změna stavu." }, { status: 422 });
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: history, error } = await supabase.rpc("admin_change_order_status", {
    p_order_id: id,
    p_new_status: parsed.data.status,
    p_note: parsed.data.note ?? null,
    p_email_requested: parsed.data.sendEmail
  });
  if (error) return NextResponse.json({ error: error.message }, { status: error.message.includes("unchanged") ? 409 : 500 });

  let emailStatus: string | null = null;
  if (parsed.data.sendEmail) {
    const template = templateForOrderStatus(parsed.data.status);
    if (!template) return NextResponse.json({ error: "Pro tento stav není e-mailová šablona.", statusChanged: true }, { status: 422 });
    try {
      const emailResult = await sendOrderStatusEmail(id, template);
      emailStatus = emailResult.status;
      if (emailResult.messageId && history?.id) {
        await supabase.from("order_status_history").update({ email_message_id: emailResult.messageId }).eq("id", history.id);
      }
    } catch (emailError) {
      revalidatePath(`/admin/orders/${id}`);
      return NextResponse.json({ error: emailError instanceof Error ? emailError.message : "E-mail se nepodařilo odeslat.", statusChanged: true }, { status: 502 });
    }
  }
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  return NextResponse.json({ ok: true, emailStatus });
}
