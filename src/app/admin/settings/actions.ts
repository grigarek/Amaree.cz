"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireOrderAdmin } from "@/lib/admin-auth";
import { saveFakturoidOperationalSettings, savePacketaOperationalSettings } from "@/lib/admin/integration-settings";

function checked(form: FormData, name: string) {
  return form.get(name) === "on";
}

export async function updatePacketaSettings(form: FormData) {
  const admin = await requireOrderAdmin();
  await savePacketaOperationalSettings({
    senderLabel: String(form.get("senderLabel") ?? "").trim(),
    defaultHandoverPoint: String(form.get("defaultHandoverPoint") ?? "").trim(),
    defaultWeightKg: Number(form.get("defaultWeightKg") ?? "0.5"),
    homeCarrierIdCz: String(form.get("homeCarrierIdCz") ?? "").trim(),
    homeCarrierIdSk: String(form.get("homeCarrierIdSk") ?? "").trim(),
    cod: {
      CZ: { pickup: checked(form, "codCzPickup"), zbox: checked(form, "codCzZbox"), home: checked(form, "codCzHome") },
      SK: { pickup: checked(form, "codSkPickup"), zbox: checked(form, "codSkZbox"), home: checked(form, "codSkHome") }
    }
  }, admin.mode === "supabase" ? admin.userId : null);
  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=1");
}

export async function updateFakturoidSettings(form: FormData) {
  const admin = await requireOrderAdmin();
  await saveFakturoidOperationalSettings({
    enabled: checked(form, "enabled"),
    automaticTrigger: String(form.get("automaticTrigger") ?? "delivered") as "manual" | "paid" | "delivered",
    sendAutomatically: checked(form, "sendAutomatically"),
    dueDays: Number(form.get("dueDays") ?? "0")
  }, admin.mode === "supabase" ? admin.userId : null);
  revalidatePath("/admin/settings/fakturoid");
  revalidatePath("/admin/settings");
  redirect("/admin/settings/fakturoid?saved=1");
}
