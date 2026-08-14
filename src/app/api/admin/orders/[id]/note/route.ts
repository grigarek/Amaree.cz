import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({ note: z.string().trim().max(4000) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin || admin.role !== "admin") return NextResponse.json({ error: "admin_required" }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "internal_note_invalid" }, { status: 422 });
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("orders").update({ internal_note: parsed.data.note || null }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath(`/admin/orders/${id}`);
  return NextResponse.json({ ok: true });
}
