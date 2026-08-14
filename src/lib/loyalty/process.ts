import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function processLoyaltyRewards(limit = 100) {
  const { data, error } = await createSupabaseAdminClient().rpc("process_loyalty_rewards", { p_limit: Math.min(Math.max(limit, 1), 500) });
  if (error) throw new Error(`loyalty_processing_failed:${error.message}`);
  return data;
}
