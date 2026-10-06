import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLoyaltySettings } from "@/lib/loyalty/settings";

export async function getCustomerLoyaltyOverview() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [settings, profileResult, accountsResult, rewardsResult, ordersResult] = await Promise.all([
    getLoyaltySettings(),
    supabase.from("customer_profiles").select("email,first_name,last_name,phone,locale,birthday_month,birthday_day,marketing_consent").eq("user_id", user.id).maybeSingle(),
    supabase.from("loyalty_accounts").select("currency,progress_minor,lifetime_eligible_minor,rewards_issued").eq("customer_user_id", user.id),
    supabase.from("loyalty_rewards").select("id,currency,reward_percent,reward_type,status,expires_at,discount_codes(code,minimum_order_minor)").eq("customer_user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("orders").select("id,order_number,status,currency,total_minor,created_at").eq("customer_user_id", user.id).order("created_at", { ascending: false }).limit(20)
  ]);
  return {
    user,
    settings,
    profile: profileResult.data,
    accounts: accountsResult.data ?? [],
    rewards: rewardsResult.data ?? [],
    orders: ordersResult.data ?? []
  };
}
