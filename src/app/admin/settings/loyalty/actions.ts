"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireOrderAdmin } from "@/lib/admin-auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  enabled: z.boolean(),
  rewardPercent: z.coerce.number().int().min(1).max(50),
  thresholdCzk: z.coerce.number().positive(),
  thresholdEur: z.coerce.number().positive(),
  minimumOrderCzk: z.coerce.number().min(0),
  minimumOrderEur: z.coerce.number().min(0),
  rewardValidDays: z.coerce.number().int().min(1).max(730),
  confirmationDelayDays: z.coerce.number().int().min(0).max(120),
  birthdayRewardEnabled: z.boolean(),
  birthdayRewardPercent: z.coerce.number().int().min(1).max(50),
  birthdayRewardValidDays: z.coerce.number().int().min(1).max(365)
});

export async function updateLoyaltySettings(form: FormData) {
  const admin = await requireOrderAdmin();
  const parsed = schema.safeParse({
    enabled: form.get("enabled") === "on",
    rewardPercent: form.get("rewardPercent"),
    thresholdCzk: form.get("thresholdCzk"),
    thresholdEur: form.get("thresholdEur"),
    minimumOrderCzk: form.get("minimumOrderCzk"),
    minimumOrderEur: form.get("minimumOrderEur"),
    rewardValidDays: form.get("rewardValidDays"),
    confirmationDelayDays: form.get("confirmationDelayDays"),
    birthdayRewardEnabled: form.get("birthdayRewardEnabled") === "on",
    birthdayRewardPercent: form.get("birthdayRewardPercent"),
    birthdayRewardValidDays: form.get("birthdayRewardValidDays")
  });
  if (!parsed.success) redirect(`/admin/settings/loyalty?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Neplatné nastavení")}`);
  const { error } = await createSupabaseAdminClient().from("loyalty_program_settings").upsert({
    id: true,
    enabled: parsed.data.enabled,
    reward_percent: parsed.data.rewardPercent,
    threshold_czk_minor: Math.round(parsed.data.thresholdCzk * 100),
    threshold_eur_minor: Math.round(parsed.data.thresholdEur * 100),
    minimum_order_czk_minor: Math.round(parsed.data.minimumOrderCzk * 100),
    minimum_order_eur_minor: Math.round(parsed.data.minimumOrderEur * 100),
    reward_valid_days: parsed.data.rewardValidDays,
    confirmation_delay_days: parsed.data.confirmationDelayDays,
    birthday_reward_enabled: parsed.data.birthdayRewardEnabled,
    birthday_reward_percent: parsed.data.birthdayRewardPercent,
    birthday_reward_valid_days: parsed.data.birthdayRewardValidDays,
    birthday_issue_days_before: 0,
    updated_at: new Date().toISOString(),
    updated_by: admin.mode === "supabase" ? admin.userId : null
  });
  if (error) redirect(`/admin/settings/loyalty?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin/settings");
  revalidatePath("/admin/settings/loyalty");
  redirect("/admin/settings/loyalty?saved=1");
}
