"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { enabledLocales, type Locale } from "@/i18n/routing";
import { requireOrderAdmin } from "@/lib/admin-auth";
import { getStorefrontContentSettings } from "@/lib/admin/storefront-content";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const bucket = "product-images";
const maxBytes = 12 * 1024 * 1024;
const localeSchema = z.string().trim().min(1).max(1200);

function field(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}

function safeName(name: string) {
  return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 180);
}

export async function updateStorefrontContent(form: FormData) {
  const admin = await requireOrderAdmin();
  const current = await getStorefrontContentSettings();
  const supabase = createSupabaseAdminClient();
  const locales = enabledLocales as readonly Locale[];
  const heroClaim = Object.fromEntries(locales.map((locale) => [locale, localeSchema.parse(field(form, `heroClaim_${locale}`))])) as Record<Locale, string>;
  const heroIntro = Object.fromEntries(locales.map((locale) => [locale, localeSchema.parse(field(form, `heroIntro_${locale}`))])) as Record<Locale, string>;
  const aboutParagraphs = Object.fromEntries(locales.map((locale) => [locale, field(form, `about_${locale}`).split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean)])) as Record<Locale, string[]>;
  const aboutImageAlt = Object.fromEntries(locales.map((locale) => [locale, localeSchema.parse(field(form, `aboutAlt_${locale}`))])) as Record<Locale, string>;
  const supportHours = Object.fromEntries(locales.map((locale) => [locale, localeSchema.parse(field(form, `supportHours_${locale}`))])) as Record<Locale, string>;
  if (locales.some((locale) => aboutParagraphs[locale].length < 2)) redirect("/admin/settings/content?error=Text+O+nás+musí+mít+alespoň+dva+odstavce.");

  let aboutImagePath = current.aboutImagePath;
  let aboutImageFilename = current.aboutImageFilename;
  let uploadedPath: string | null = null;
  const removeAfterSave: string[] = [];
  try {
    const file = form.get("aboutImage");
    if (file instanceof File && file.size > 0) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Fotografie musí být JPG, PNG nebo WebP.");
      if (file.size > maxBytes) throw new Error("Fotografie může mít nejvýše 12 MB.");
      const ext = file.type.split("/")[1].replace("jpeg", "jpg");
      uploadedPath = `storefront/about/about-${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(uploadedPath, file, { contentType: file.type, cacheControl: "31536000" });
      if (uploadError) throw uploadError;
      if (current.aboutImagePath) removeAfterSave.push(current.aboutImagePath);
      aboutImagePath = uploadedPath;
      aboutImageFilename = safeName(file.name);
    }
    const { error } = await supabase.from("integration_settings").upsert({
      key: "storefront_content",
      value: { aboutContentVersion: 2, heroClaim, heroIntro, aboutParagraphs, aboutImagePath, aboutImageFilename, aboutImageAlt, supportHours },
      description: "Editable storefront copy, About image and customer-support hours.",
      updated_by: admin.mode === "supabase" ? admin.userId : null
    });
    if (error) throw error;
    if (removeAfterSave.length) await supabase.storage.from(bucket).remove(removeAfterSave);
  } catch (error) {
    if (uploadedPath) await supabase.storage.from(bucket).remove([uploadedPath]);
    redirect(`/admin/settings/content?error=${encodeURIComponent(error instanceof Error ? error.message : "Obsah se nepodařilo uložit.")}`);
  }
  revalidatePath("/admin/settings/content");
  for (const locale of enabledLocales) {
    revalidatePath(`/${locale}`);
    revalidatePath(`/${locale}/o-nas`);
    revalidatePath(`/${locale}/kontakt`);
  }
  redirect("/admin/settings/content?saved=1");
}
