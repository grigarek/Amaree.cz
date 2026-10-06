import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin/session";
import { sendOrderStatusEmail } from "@/lib/email/order-status";
import { retryRecordedEmail } from "@/lib/email/delivery";
import { orderTemplateKeys } from "@/lib/orders/statuses";

const schema = z.union([
  z.object({ template: z.enum(orderTemplateKeys), messageId: z.never().optional() }),
  z.object({ messageId: z.string().uuid(), template: z.never().optional() })
]);

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin || admin.role !== "admin") return NextResponse.json({ error: "Tuto akci může provést pouze administrátor." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Neplatná šablona." }, { status: 422 });
  const { id } = await params;
  try {
    const result = "messageId" in parsed.data && parsed.data.messageId
      ? await retryRecordedEmail(id, parsed.data.messageId, admin.userId)
      : "template" in parsed.data && parsed.data.template
        ? await sendOrderStatusEmail(id, parsed.data.template, { manualResend: true, triggeredBy: admin.userId, triggerSource: "admin_manual" })
        : null;
    if (!result) return NextResponse.json({ error: "Neplatná žádost o odeslání." }, { status: 422 });
    revalidatePath(`/admin/orders/${id}`);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "E-mail se nepodařilo odeslat." }, { status: 502 });
  }
}
