"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrderAdmin } from "@/lib/admin-auth";
import { orderEmailSettingsSchema, saveOrderEmailSettings } from "@/lib/admin/email-template-settings";

function value(form: FormData, name: string) {
  return String(form.get(name) ?? "");
}

function template(form: FormData, key: string) {
  return {
    subjectCs: value(form, `${key}SubjectCs`),
    statusCs: value(form, `${key}StatusCs`),
    introCs: value(form, `${key}IntroCs`),
    subjectSk: value(form, `${key}SubjectSk`),
    statusSk: value(form, `${key}StatusSk`),
    introSk: value(form, `${key}IntroSk`)
  };
}

export async function updateOrderEmailSettings(form: FormData) {
  const admin = await requireOrderAdmin();
  const parsed = orderEmailSettingsSchema.safeParse({
    templates: {
      order_received: template(form, "received"),
      order_shipped: template(form, "shipped"),
      order_delivered: template(form, "delivered")
    },
    review: {
      enabled: form.get("reviewEnabled") === "on",
      url: value(form, "reviewUrl"),
      headingCs: value(form, "reviewHeadingCs"),
      textCs: value(form, "reviewTextCs"),
      buttonCs: value(form, "reviewButtonCs"),
      headingSk: value(form, "reviewHeadingSk"),
      textSk: value(form, "reviewTextSk"),
      buttonSk: value(form, "reviewButtonSk")
    }
  });
  if (!parsed.success) redirect(`/admin/settings/emails?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Neplatné údaje")}`);
  if (parsed.data.review.enabled && !parsed.data.review.url) redirect("/admin/settings/emails?error=Pro zapnutí žádosti o hodnocení doplňte Google odkaz.");

  try {
    await saveOrderEmailSettings(parsed.data, admin.mode === "supabase" ? admin.userId : null);
  } catch (error) {
    redirect(`/admin/settings/emails?error=${encodeURIComponent(error instanceof Error ? error.message : "Nastavení se nepodařilo uložit.")}`);
  }
  revalidatePath("/admin/settings/emails");
  redirect("/admin/settings/emails?saved=1");
}
