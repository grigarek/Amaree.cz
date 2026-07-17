import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getAdminSession } from "@/lib/admin/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { inspectImage } from "@/lib/images/inspect-image";
import { validateProductImageBatch } from "@/lib/images/upload-limits";

function safeOriginalName(name: string) {
  return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 180);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Neoprávněný přístup." }, { status: 401 });
  const { id: productId } = await params;
  const formData = await request.formData();
  const files = formData.getAll("files").filter((value): value is File => value instanceof File);
  if (!files.length) return NextResponse.json({ error: "Vyberte alespoň jednu fotografii." }, { status: 422 });
  if (files.length > 12) return NextResponse.json({ error: "Najednou lze nahrát nejvýše 12 fotografií." }, { status: 422 });
  try {
    validateProductImageBatch(files);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Neplatná dávka fotografií." }, { status: 422 });
  }

  const alt = {
    cs: String(formData.get("altCs") ?? "").trim(),
    en: String(formData.get("altEn") ?? "").trim(),
    de: String(formData.get("altDe") ?? "").trim()
  };
  if (Object.values(alt).some((value) => value.length < 3)) return NextResponse.json({ error: "Doplňte ALT text ve všech jazycích." }, { status: 422 });

  const supabase = await createSupabaseServerClient();
  const { count } = await supabase.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", productId).is("archived_at", null);
  let nextOrder = count ?? 0;
  const created: Array<{ id: string; storagePath: string }> = [];

  try {
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const inspected = inspectImage(buffer);
      const storagePath = `products/${productId}/${randomUUID()}.${inspected.extension}`;
      const { error: uploadError } = await supabase.storage.from("product-images").upload(storagePath, buffer, {
        contentType: inspected.mimeType,
        upsert: false,
        cacheControl: "31536000"
      });
      if (uploadError) throw uploadError;

      const { data: image, error: imageError } = await supabase.from("product_images").insert({
        product_id: productId,
        storage_path: storagePath,
        original_filename: safeOriginalName(file.name),
        mime_type: inspected.mimeType,
        size_bytes: file.size,
        width: inspected.width,
        height: inspected.height,
        sort_order: nextOrder,
        is_primary: nextOrder === 0
      }).select("id").single();
      if (imageError) {
        await supabase.storage.from("product-images").remove([storagePath]);
        throw imageError;
      }

      const { error: translationsError } = await supabase.from("product_image_translations").insert([
        { image_id: image.id, locale: "cs", alt_text: alt.cs },
        { image_id: image.id, locale: "en", alt_text: alt.en },
        { image_id: image.id, locale: "de", alt_text: alt.de }
      ]);
      if (translationsError) {
        await supabase.from("product_images").delete().eq("id", image.id);
        await supabase.storage.from("product-images").remove([storagePath]);
        throw translationsError;
      }
      created.push({ id: image.id, storagePath });
      nextOrder += 1;
    }

    revalidatePath(`/admin/products/${productId}`);
    revalidatePath("/cs");
    return NextResponse.json({ ids: created.map((image) => image.id) }, { status: 201 });
  } catch (error) {
    if (created.length) {
      await supabase.from("product_images").delete().in("id", created.map((image) => image.id));
      await supabase.storage.from("product-images").remove(created.map((image) => image.storagePath));
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Fotografie se nepodařilo nahrát." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Neoprávněný přístup." }, { status: 401 });
  const { id: productId } = await params;
  const body = await request.json() as { imageIds?: string[]; primaryId?: string };
  if (!Array.isArray(body.imageIds) || !body.imageIds.length || !body.primaryId) return NextResponse.json({ error: "Neplatné pořadí fotografií." }, { status: 422 });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_reorder_product_images", {
    p_product_id: productId,
    p_image_ids: body.imageIds,
    p_primary_id: body.primaryId
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath("/cs");
  return NextResponse.json({ ok: true });
}
