import "server-only";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { disabledPacketaCodCapabilities, type PacketaCodCapabilities } from "@/lib/shipping/capabilities";

const codSchema = z.object({
  CZ: z.object({ pickup: z.boolean(), zbox: z.boolean(), home: z.boolean() }),
  SK: z.object({ pickup: z.boolean(), zbox: z.boolean(), home: z.boolean() })
});

const packetaSettingsSchema = z.object({
  senderLabel: z.string().max(120).default(""),
  defaultHandoverPoint: z.string().max(240).default(""),
  defaultWeightKg: z.number().positive().max(30).default(0.5),
  homeCarrierIdCz: z.string().regex(/^\d*$/).default(""),
  homeCarrierIdSk: z.string().regex(/^\d*$/).default(""),
  cod: codSchema.default(disabledPacketaCodCapabilities)
});

export type PacketaOperationalSettings = z.infer<typeof packetaSettingsSchema>;

export const defaultPacketaOperationalSettings: PacketaOperationalSettings = {
  senderLabel: "",
  defaultHandoverPoint: "",
  defaultWeightKg: 0.5,
  homeCarrierIdCz: "",
  homeCarrierIdSk: "",
  cod: disabledPacketaCodCapabilities
};

export async function getPacketaOperationalSettings(): Promise<PacketaOperationalSettings> {
  if (process.env.NODE_ENV === "test" || !isSupabaseConfigured()) return {
    ...defaultPacketaOperationalSettings,
    senderLabel: process.env.PACKETA_SENDER ?? "",
    defaultWeightKg: Number(process.env.PACKETA_DEFAULT_WEIGHT_KG ?? "0.5"),
    homeCarrierIdCz: process.env.PACKETA_HOME_CARRIER_ID_CZ ?? "",
    homeCarrierIdSk: process.env.PACKETA_HOME_CARRIER_ID_SK ?? ""
  };

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("integration_settings").select("value").eq("key", "packeta").maybeSingle();
  if (error || !data?.value) return defaultPacketaOperationalSettings;
  const parsed = packetaSettingsSchema.safeParse(data.value);
  return parsed.success ? parsed.data : defaultPacketaOperationalSettings;
}

export async function savePacketaOperationalSettings(value: PacketaOperationalSettings, updatedBy: string | null) {
  const parsed = packetaSettingsSchema.parse(value);
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("integration_settings").upsert({
    key: "packeta",
    value: parsed,
    updated_by: updatedBy,
    description: "Packeta operational settings. API password remains a server-only secret."
  });
  if (error) throw new Error(error.message);
}

export async function getPacketaCodCapabilities(): Promise<PacketaCodCapabilities> {
  return (await getPacketaOperationalSettings()).cod;
}

const fakturoidSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  automaticTrigger: z.enum(["manual", "paid", "delivered"]).default("delivered"),
  sendAutomatically: z.boolean().default(true),
  dueDays: z.number().int().min(0).max(365).default(0)
});

export type FakturoidOperationalSettings = z.infer<typeof fakturoidSettingsSchema>;

export const defaultFakturoidOperationalSettings: FakturoidOperationalSettings = {
  enabled: false,
  automaticTrigger: "delivered",
  sendAutomatically: true,
  dueDays: 0
};

export async function getFakturoidOperationalSettings(): Promise<FakturoidOperationalSettings> {
  if (process.env.NODE_ENV === "test" || !isSupabaseConfigured()) return defaultFakturoidOperationalSettings;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("integration_settings").select("value").eq("key", "fakturoid").maybeSingle();
  if (error || !data?.value) return defaultFakturoidOperationalSettings;
  const parsed = fakturoidSettingsSchema.safeParse(data.value);
  return parsed.success ? parsed.data : defaultFakturoidOperationalSettings;
}

export async function saveFakturoidOperationalSettings(value: FakturoidOperationalSettings, updatedBy: string | null) {
  const parsed = fakturoidSettingsSchema.parse(value);
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("integration_settings").upsert({
    key: "fakturoid",
    value: parsed,
    updated_by: updatedBy,
    description: "Fakturoid operational settings. API credentials remain server-only secrets."
  });
  if (error) throw new Error(error.message);
}

const transactionalEmailSettingsSchema = z.object({
  provider: z.enum(["resend", "ecomail"]).default("resend"),
  dailyWarningLimit: z.number().int().positive().max(100).default(80),
  monthlyWarningLimit: z.number().int().positive().max(3000).default(2400)
});

export type TransactionalEmailSettings = z.infer<typeof transactionalEmailSettingsSchema>;

export async function getTransactionalEmailSettings(): Promise<TransactionalEmailSettings> {
  const fallback: TransactionalEmailSettings = {
    provider: (process.env.TRANSACTIONAL_EMAIL_PROVIDER === "ecomail" ? "ecomail" : "resend"),
    dailyWarningLimit: Number(process.env.TRANSACTIONAL_EMAIL_DAILY_WARNING_LIMIT ?? "80"),
    monthlyWarningLimit: Number(process.env.TRANSACTIONAL_EMAIL_MONTHLY_WARNING_LIMIT ?? "2400")
  };
  if (process.env.NODE_ENV === "test" || !isSupabaseConfigured()) return fallback;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("integration_settings").select("value").eq("key", "transactional_email").maybeSingle();
  if (error || !data?.value) return fallback;
  const parsed = transactionalEmailSettingsSchema.safeParse(data.value);
  return parsed.success ? parsed.data : fallback;
}
