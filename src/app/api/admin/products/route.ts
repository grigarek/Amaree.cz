import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { adminProductSchema } from "@/lib/products/admin-product-schema";
import { saveAdminProduct } from "@/lib/admin/products";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Neoprávněný přístup." }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Vývojový Supabase není připojen." }, { status: 503 });

  const parsed = adminProductSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message, issues: parsed.error.flatten() }, { status: 422 });

  try {
    const id = await saveAdminProduct(parsed.data);
    revalidatePath("/admin/products");
    revalidatePath("/cs");
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Produkt se nepodařilo uložit." }, { status: 500 });
  }
}
