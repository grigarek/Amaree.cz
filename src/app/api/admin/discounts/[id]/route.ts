import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { deleteAdminDiscount, saveAdminDiscount } from "@/lib/admin/discounts";
import { discountCodeInputSchema } from "@/lib/discounts/schema";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin || admin.role !== "admin") return NextResponse.json({ error: "Přístup je povolen pouze správci." }, { status: 403 });
  const parsed = discountCodeInputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
  const { id } = await params;
  try {
    await saveAdminDiscount(parsed.data, id);
    revalidatePath("/admin/discounts"); revalidatePath(`/admin/discounts/${id}`);
    return NextResponse.json({ id });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Slevový kód se nepodařilo uložit." }, { status: 500 }); }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin || admin.role !== "admin") return NextResponse.json({ error: "Přístup je povolen pouze správci." }, { status: 403 });
  const { id } = await params;
  try {
    await deleteAdminDiscount(id);
    revalidatePath("/admin/discounts");
    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Slevový kód se nepodařilo smazat." }, { status: 422 });
  }
}
