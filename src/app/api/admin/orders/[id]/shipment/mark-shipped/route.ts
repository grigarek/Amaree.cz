import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin || admin.role !== "admin") return NextResponse.json({ error: "admin_required" }, { status: 403 });
  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { note?: string };
  const supabase = await createSupabaseServerClient();
  const { data: changed, error } = await supabase.rpc("admin_mark_order_shipped", { p_order_id: id, p_note: body.note?.slice(0, 1000) ?? null });
  if (error) return NextResponse.json({ error: error.message }, { status: 422 });
  revalidatePath(`/admin/orders/${id}`);
  revalidatePath("/admin/orders");
  return NextResponse.json({ status: changed ? "shipped" : "unchanged" });
}
