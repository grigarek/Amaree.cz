import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/session";
import { adminProductSchema } from "@/lib/products/admin-product-schema";
import { saveAdminProduct } from "@/lib/admin/products";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Neoprávněný přístup." }, { status: 401 });
  const { id } = await params;
  const parsed = adminProductSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message, issues: parsed.error.flatten() }, { status: 422 });

  try {
    const productId = await saveAdminProduct(parsed.data, id);
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${id}`);
    revalidatePath("/cs");
    return NextResponse.json({ id: productId });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Produkt se nepodařilo uložit." }, { status: 500 });
  }
}
