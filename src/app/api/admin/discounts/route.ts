import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { saveAdminDiscount } from "@/lib/admin/discounts";
import { discountCodeInputSchema } from "@/lib/discounts/schema";

export async function POST(request: Request) {
  const admin = await getAdminSession();
  if (!admin || admin.role !== "admin") return NextResponse.json({ error: "Přístup je povolen pouze správci." }, { status: 403 });
  const parsed = discountCodeInputSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 422 });
  try {
    const id = await saveAdminDiscount(parsed.data);
    revalidatePath("/admin/discounts");
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Slevový kód se nepodařilo uložit." }, { status: 500 }); }
}
