import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type LoyaltySettings = {
  enabled: boolean;
  rewardPercent: number;
  thresholdCzkMinor: number;
  thresholdEurMinor: number;
  minimumOrderCzkMinor: number;
  minimumOrderEurMinor: number;
  rewardValidDays: number;
  confirmationDelayDays: number;
  birthdayRewardEnabled: boolean;
  birthdayRewardPercent: number;
  birthdayRewardValidDays: number;
};

export const defaultLoyaltySettings: LoyaltySettings = {
  enabled: false,
  rewardPercent: 10,
  thresholdCzkMinor: 300_000,
  thresholdEurMinor: 12_000,
  minimumOrderCzkMinor: 120_000,
  minimumOrderEurMinor: 5_000,
  rewardValidDays: 90,
  confirmationDelayDays: 30,
  birthdayRewardEnabled: false,
  birthdayRewardPercent: 10,
  birthdayRewardValidDays: 30
};

export async function getLoyaltySettings(): Promise<LoyaltySettings> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return defaultLoyaltySettings;
  const { data, error } = await createSupabaseAdminClient().from("loyalty_program_settings").select("*").eq("id", true).maybeSingle();
  if (error || !data) return defaultLoyaltySettings;
  return {
    enabled: Boolean(data.enabled),
    rewardPercent: Number(data.reward_percent),
    thresholdCzkMinor: Number(data.threshold_czk_minor),
    thresholdEurMinor: Number(data.threshold_eur_minor),
    minimumOrderCzkMinor: Number(data.minimum_order_czk_minor),
    minimumOrderEurMinor: Number(data.minimum_order_eur_minor),
    rewardValidDays: Number(data.reward_valid_days),
    confirmationDelayDays: Number(data.confirmation_delay_days),
    birthdayRewardEnabled: Boolean(data.birthday_reward_enabled),
    birthdayRewardPercent: Number(data.birthday_reward_percent ?? 10),
    birthdayRewardValidDays: Number(data.birthday_reward_valid_days ?? 30)
  };
}
