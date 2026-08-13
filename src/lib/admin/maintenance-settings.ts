import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { defaultMaintenanceSettings, parseMaintenanceSettings, type MaintenanceSettings } from "@/lib/maintenance";

export async function getMaintenanceSettings(): Promise<MaintenanceSettings> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return defaultMaintenanceSettings;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("integration_settings").select("value").eq("key", "storefront_maintenance").maybeSingle();
  if (error || !data) return defaultMaintenanceSettings;
  return parseMaintenanceSettings(data.value);
}
