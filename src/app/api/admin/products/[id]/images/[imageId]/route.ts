import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminSession } from "@/lib/admin/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const updateSchema = z.object({
  alt: z.object({ cs: z.string().trim().min(3), sk: z.string().trim().min(3), en: z.string().trim().min(3), de: z.string().trim().min(3) }).optional(),
  action: z.enum(["archive", "delete"]).optional()
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; imageId: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Neoprávněný přístup." }, { status: 401 });
  const { id: productId, imageId } = await params;
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Neplatná data fotografie." }, { status: 422 });
  const supabase = await createSupabaseServerClient();

  try {
    if (parsed.data.alt) {
      const rows = (["cs", "sk", "en", "de"] as const).map((locale) => ({ image_id: imageId, locale, alt_text: parsed.data.alt?.[locale] ?? "" }));
      const { error } = await supabase.from("product_image_translations").upsert(rows, { onConflict: "image_id,locale" });
      if (error) throw error;
    }
    if (parsed.data.action) {
      const { data: image, error: readError } = await supabase.from("product_images").select("storage_path,is_primary").eq("id", imageId).eq("product_id", productId).single();
      if (readError) throw readError;
      if (parsed.data.action === "archive") {
        const { error } = await supabase.from("product_images").update({ archived_at: new Date().toISOString(), is_primary: false }).eq("id", imageId);
        if (error) throw error;
      } else {
        const { error: storageError } = await supabase.storage.from("product-images").remove([image.storage_path]);
        if (storageError) throw storageError;
        const { error } = await supabase.from("product_images").delete().eq("id", imageId);
        if (error) throw error;
      }
      if (image.is_primary) {
        const { data: replacement } = await supabase.from("product_images").select("id").eq("product_id", productId).is("archived_at", null).neq("id", imageId).order("sort_order").limit(1).maybeSingle();
        if (replacement) {
          const { error: primaryError } = await supabase.from("product_images").update({ is_primary: true }).eq("id", replacement.id);
          if (primaryError) throw primaryError;
        } else {
          await supabase.rpc("admin_set_product_status", { p_product_id: productId, p_status: "draft" });
        }
      }
    }
    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/cs");
    revalidatePath("/sk");
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Fotografii se nepodařilo upravit." }, { status: 500 });
  }
}
