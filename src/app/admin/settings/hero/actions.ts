"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { enabledLocales } from "@/i18n/routing";
import { requireOrderAdmin } from "@/lib/admin-auth";
import { getStorefrontHeroSettings } from "@/lib/admin/storefront-hero";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const bucket = "product-images";
const maxBytes = 12 * 1024 * 1024;

const heroSchema = z.object({
  activeFrom: z.string().trim().regex(/^$|^\d{4}-\d{2}-\d{2}$/, "Začátek kampaně nemá platné datum."),
  activeUntil: z.string().trim().regex(/^$|^\d{4}-\d{2}-\d{2}$/, "Konec kampaně nemá platné datum."),
  altCs: z.string().trim().max(300),
  altSk: z.string().trim().max(300),
  altEn: z.string().trim().max(300),
  altDe: z.string().trim().max(300)
}).superRefine((value, context) => {
  if (value.activeFrom && value.activeUntil && value.activeUntil < value.activeFrom) context.addIssue({ code: z.ZodIssueCode.custom, message: "Konec kampaně nesmí být před jejím začátkem." });
});

function safeName(name: string) {
  return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 180);
}

function checked(form: FormData, name: string) {
  return form.get(name) === "on";
}

export async function updateStorefrontHero(form: FormData) {
  const admin = await requireOrderAdmin();
  const parsed = heroSchema.safeParse({
    activeFrom: String(form.get("activeFrom") ?? ""),
    activeUntil: String(form.get("activeUntil") ?? ""),
    altCs: String(form.get("altCs") ?? ""),
    altSk: String(form.get("altSk") ?? ""),
    altEn: String(form.get("altEn") ?? ""),
    altDe: String(form.get("altDe") ?? "")
  });
  if (!parsed.success) redirect(`/admin/settings/hero?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Neplatné údaje")}`);

  const current = await getStorefrontHeroSettings();
  const supabase = createSupabaseAdminClient();
  let imagePath = current.imagePath;
  let imageFilename = current.imageFilename;
  let uploadedPath: string | null = null;
  const removeAfterSave: string[] = [];

  try {
    if (checked(form, "removeHeroImage")) {
      if (current.imagePath) removeAfterSave.push(current.imagePath);
      imagePath = null;
      imageFilename = null;
    }

    const file = form.get("heroImage");
    if (file instanceof File && file.size > 0) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Fotografie musí být JPG, PNG nebo WebP.");
      if (file.size > maxBytes) throw new Error("Fotografie může mít nejvýše 12 MB.");
      const ext = file.type.split("/")[1].replace("jpeg", "jpg");
      uploadedPath = `storefront/hero/hero-${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(uploadedPath, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
      if (uploadError) throw uploadError;
      if (current.imagePath) removeAfterSave.push(current.imagePath);
      imagePath = uploadedPath;
      imageFilename = safeName(file.name);
    }

    const value = {
      imagePath,
      imageFilename,
      enabled: checked(form, "enabled") && Boolean(imagePath),
      activeFrom: parsed.data.activeFrom,
      activeUntil: parsed.data.activeUntil,
      alt: { cs: parsed.data.altCs, sk: parsed.data.altSk, en: parsed.data.altEn, de: parsed.data.altDe }
    };
    const { error } = await supabase.from("integration_settings").upsert({
      key: "storefront_hero",
      value,
      description: "Admin-managed homepage hero image and optional campaign schedule.",
      updated_by: admin.mode === "supabase" ? admin.userId : null
    });
    if (error) throw error;
    if (removeAfterSave.length) await supabase.storage.from(bucket).remove([...new Set(removeAfterSave)]);
  } catch (error) {
    if (uploadedPath) await supabase.storage.from(bucket).remove([uploadedPath]);
    redirect(`/admin/settings/hero?error=${encodeURIComponent(error instanceof Error ? error.message : "Fotografii se nepodařilo uložit.")}`);
  }

  revalidatePath("/admin/settings/hero");
  for (const locale of enabledLocales) revalidatePath(`/${locale}`);
  redirect("/admin/settings/hero?saved=1");
}
