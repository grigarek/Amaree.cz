import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminProduct, saveAdminProduct } from "@/lib/admin/products";

const actionSchema = z.object({ action: z.enum(["duplicate", "archive", "activate", "deactivate"]) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Neoprávněný přístup." }, { status: 401 });
  const parsed = actionSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Neplatná akce." }, { status: 422 });
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  try {
    if (parsed.data.action === "duplicate") {
      const source = await getAdminProduct(id);
      if (!source) return NextResponse.json({ error: "Produkt nebyl nalezen." }, { status: 404 });
      const suffix = Date.now().toString().slice(-6);
      const copy = {
        ...source,
        internalId: `${source.internalId}-copy-${suffix}`,
        sku: `${source.sku}-COPY-${suffix}`,
        active: false,
        translations: {
          cs: { ...source.translations.cs, name: `${source.translations.cs.name} – kopie`, slug: `${source.translations.cs.slug}-kopie-${suffix}` },
          en: { ...source.translations.en, name: `${source.translations.en.name} – copy`, slug: `${source.translations.en.slug}-copy-${suffix}` },
          de: { ...source.translations.de, name: `${source.translations.de.name} – Kopie`, slug: `${source.translations.de.slug}-kopie-${suffix}` }
        }
      };
      const newId = await saveAdminProduct(copy);
      revalidatePath("/admin/products");
      return NextResponse.json({ id: newId });
    }

    const { error } = parsed.data.action === "archive"
      ? await supabase.from("products").update({ active: false, archived_at: new Date().toISOString() }).eq("id", id)
      : await supabase.rpc("admin_set_product_active", { p_product_id: id, p_active: parsed.data.action === "activate" });
    if (error) throw error;
    revalidatePath("/admin/products");
    revalidatePath("/cs");
    return NextResponse.json({ id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Akci se nepodařilo provést." }, { status: 500 });
  }
}
