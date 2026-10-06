"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOrderAdmin } from "@/lib/admin-auth";
import { getHallmarkSettings } from "@/lib/admin/hallmark-settings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const bucket = "public-compliance-assets";
const maxBytes = 10 * 1024 * 1024;
const settingsSchema = z.object({
  registrationNote: z.string().trim().max(2000),
  registrationDate: z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/),
  registryUrl: z.union([z.literal(""), z.string().url().refine((value) => value.startsWith("https://"), "Odkaz musí používat HTTPS.")]),
  publicText: z.string().trim().max(12000)
});

function safeName(name: string) {
  return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 180);
}

function checked(form: FormData, name: string) {
  return form.get(name) === "on";
}

function validateFile(file: File, type: "image" | "pdf") {
  const allowed = type === "image" ? ["image/jpeg", "image/png", "image/webp"] : ["application/pdf"];
  if (!allowed.includes(file.type)) throw new Error(type === "image" ? "Vyobrazení musí být JPG, PNG nebo WebP." : "Veřejný dokument musí být PDF.");
  if (file.size > maxBytes) throw new Error("Soubor může mít nejvýše 10 MB.");
}

export async function updateHallmarkSettings(form: FormData) {
  const admin = await requireOrderAdmin();
  const parsed = settingsSchema.safeParse({
    registrationNote: String(form.get("registrationNote") ?? ""),
    registrationDate: String(form.get("registrationDate") ?? ""),
    registryUrl: String(form.get("registryUrl") ?? ""),
    publicText: String(form.get("publicText") ?? "")
  });
  if (!parsed.success) redirect(`/admin/settings/legal/hallmarks?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Neplatné údaje")}`);

  const current = await getHallmarkSettings();
  const supabase = createSupabaseAdminClient();
  const updates: Record<string, string | boolean | null> = {
    trades_precious_metals: checked(form, "tradesPreciousMetals"),
    assay_office_registered: checked(form, "assayOfficeRegistered"),
    registration_note: parsed.data.registrationNote,
    registration_date: parsed.data.registrationDate || null,
    registry_url: parsed.data.registryUrl,
    public_text: parsed.data.publicText,
    public_page_enabled: checked(form, "publicPageEnabled"),
    footer_link_enabled: checked(form, "footerLinkEnabled"),
    updated_by: admin.mode === "supabase" ? admin.userId : null
  };
  const uploaded: string[] = [];
  const removeAfterSave: string[] = [];

  try {
    for (const asset of [
      { key: "hallmarkImage", type: "image" as const, oldPath: current.hallmarkImagePath, pathColumn: "hallmark_image_path", filenameColumn: "hallmark_image_filename", removeKey: "removeHallmarkImage" },
      { key: "publicDocument", type: "pdf" as const, oldPath: current.publicDocumentPath, pathColumn: "public_document_path", filenameColumn: "public_document_filename", removeKey: "removePublicDocument" }
    ]) {
      if (checked(form, asset.removeKey)) {
        updates[asset.pathColumn] = null;
        updates[asset.filenameColumn] = null;
        if (asset.oldPath) removeAfterSave.push(asset.oldPath);
      }
      const file = form.get(asset.key);
      if (!(file instanceof File) || file.size === 0) continue;
      validateFile(file, asset.type);
      const ext = asset.type === "pdf" ? "pdf" : file.type.split("/")[1].replace("jpeg", "jpg");
      const path = `hallmarks/${asset.key}-${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, file, { contentType: file.type, upsert: false, cacheControl: "3600" });
      if (uploadError) throw uploadError;
      uploaded.push(path);
      updates[asset.pathColumn] = path;
      updates[asset.filenameColumn] = safeName(file.name);
      if (asset.oldPath) removeAfterSave.push(asset.oldPath);
    }

    const { error } = await supabase.from("hallmark_settings").update(updates).eq("singleton_key", true);
    if (error) throw error;
    if (removeAfterSave.length) await supabase.storage.from(bucket).remove([...new Set(removeAfterSave)]);
  } catch (error) {
    if (uploaded.length) await supabase.storage.from(bucket).remove(uploaded);
    redirect(`/admin/settings/legal/hallmarks?error=${encodeURIComponent(error instanceof Error ? error.message : "Nastavení se nepodařilo uložit.")}`);
  }

  revalidatePath("/admin/settings/legal/hallmarks");
  revalidatePath("/cs/puncovni-informace");
  revalidatePath("/cs");
  redirect("/admin/settings/legal/hallmarks?saved=1");
}
