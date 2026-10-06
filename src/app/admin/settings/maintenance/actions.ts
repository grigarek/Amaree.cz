"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOrderAdmin } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { pragueDateTimeLocalToIso } from "@/lib/maintenance";

const schema = z.object({
  enabled: z.boolean(),
  countdownEnabled: z.boolean(),
  headlineCs: z.string().trim().min(3, "Doplňte český nadpis.").max(120),
  messageCs: z.string().trim().min(10, "Doplňte české sdělení.").max(500),
  headlineSk: z.string().trim().min(3, "Doplňte slovenský nadpis.").max(120),
  messageSk: z.string().trim().min(10, "Doplňte slovenské sdělení.").max(500),
  expectedBackAt: z.string().trim().max(40)
});

export async function updateMaintenanceSettings(form: FormData) {
  const admin = await requireOrderAdmin();
  const parsed = schema.safeParse({
    enabled: form.get("enabled") === "on",
    countdownEnabled: form.get("countdownEnabled") === "on",
    headlineCs: String(form.get("headlineCs") ?? ""),
    messageCs: String(form.get("messageCs") ?? ""),
    headlineSk: String(form.get("headlineSk") ?? ""),
    messageSk: String(form.get("messageSk") ?? ""),
    expectedBackAt: String(form.get("expectedBackAt") ?? "")
  });
  if (!parsed.success) redirect(`/admin/settings/maintenance?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Neplatné údaje")}`);

  const expectedBackAt = pragueDateTimeLocalToIso(parsed.data.expectedBackAt);
  if (parsed.data.expectedBackAt && !expectedBackAt) redirect("/admin/settings/maintenance?error=Neplatný čas obnovení provozu.");
  if (parsed.data.countdownEnabled && !expectedBackAt) redirect("/admin/settings/maintenance?error=Pro odpočet nastavte datum a čas spuštění e-shopu.");
  if (parsed.data.countdownEnabled && expectedBackAt && Date.parse(expectedBackAt) <= Date.now()) redirect("/admin/settings/maintenance?error=Čas spuštění pro odpočet musí být v budoucnosti.");

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("integration_settings").upsert({
      key: "storefront_maintenance",
      value: {
        enabled: parsed.data.enabled,
        countdownEnabled: parsed.data.countdownEnabled,
        headline: { cs: parsed.data.headlineCs, sk: parsed.data.headlineSk },
        message: { cs: parsed.data.messageCs, sk: parsed.data.messageSk },
        expectedBackAt
      },
      description: "Storefront maintenance mode and public customer message.",
      updated_by: admin.mode === "supabase" ? admin.userId : null
    });
    if (error) throw error;
  } catch (error) {
    redirect(`/admin/settings/maintenance?error=${encodeURIComponent(error instanceof Error ? error.message : "Režim údržby se nepodařilo uložit.")}`);
  }

  revalidatePath("/admin/settings");
  revalidatePath("/admin/settings/maintenance");
  revalidatePath("/maintenance");
  redirect(`/admin/settings/maintenance?saved=1&enabled=${parsed.data.enabled ? "1" : "0"}`);
}
