import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin/session";
import { sendOrderLifecycleTestEmails } from "@/lib/email/order-status";

const schema = z.object({ orderId: z.string().uuid(), recipient: z.string().email() });

export async function POST(request: Request) {
  const admin = await getAdminSession();
  if (!admin || admin.role !== "admin") return NextResponse.json({ error: "Tuto akci může provést pouze administrátor." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Vyberte objednávku a zadejte platný e-mail." }, { status: 422 });
  try {
    return NextResponse.json(await sendOrderLifecycleTestEmails(parsed.data.orderId, parsed.data.recipient, admin.userId));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Testovací e-maily se nepodařilo odeslat." }, { status: 502 });
  }
}
