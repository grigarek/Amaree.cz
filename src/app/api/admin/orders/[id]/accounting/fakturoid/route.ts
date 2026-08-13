import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { syncFakturoidInvoice } from "@/lib/accounting/fakturoid";
import { getAdminSession } from "@/lib/admin/session";

const schema = z.object({ send: z.boolean().default(false) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin || admin.role !== "admin") return NextResponse.json({ error: "Tuto akci může provést pouze administrátor." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Neplatná fakturační akce." }, { status: 422 });
  const { id } = await params;
  try {
    const result = await syncFakturoidInvoice(id, { source: "admin_manual", send: parsed.data.send });
    revalidatePath(`/admin/orders/${id}`);
    return NextResponse.json(result);
  } catch (error) {
    revalidatePath(`/admin/orders/${id}`);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Fakturaci se nepodařilo dokončit." }, { status: 502 });
  }
}
