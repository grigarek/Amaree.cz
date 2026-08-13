import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type HallmarkSettings = {
  id: string | null;
  tradesPreciousMetals: boolean;
  assayOfficeRegistered: boolean;
  registrationNote: string;
  registrationDate: string;
  registryUrl: string;
  hallmarkImagePath: string | null;
  hallmarkImageFilename: string | null;
  hallmarkImageUrl: string | null;
  publicDocumentPath: string | null;
  publicDocumentFilename: string | null;
  publicDocumentUrl: string | null;
  publicText: string;
  publicPageEnabled: boolean;
  footerLinkEnabled: boolean;
};

const defaults: HallmarkSettings = {
  id: null,
  tradesPreciousMetals: false,
  assayOfficeRegistered: false,
  registrationNote: "",
  registrationDate: "",
  registryUrl: "",
  hallmarkImagePath: null,
  hallmarkImageFilename: null,
  hallmarkImageUrl: null,
  publicDocumentPath: null,
  publicDocumentFilename: null,
  publicDocumentUrl: null,
  publicText: "",
  publicPageEnabled: false,
  footerLinkEnabled: false
};

type HallmarkSettingsRow = {
  id: string;
  trades_precious_metals: boolean;
  assay_office_registered: boolean;
  registration_note: string;
  registration_date: string | null;
  registry_url: string;
  hallmark_image_path: string | null;
  hallmark_image_filename: string | null;
  public_document_path: string | null;
  public_document_filename: string | null;
  public_text: string;
  public_page_enabled: boolean;
  footer_link_enabled: boolean;
};

function publicUrl(path: string | null) {
  if (!path) return null;
  return createSupabaseAdminClient().storage.from("public-compliance-assets").getPublicUrl(path).data.publicUrl;
}

export function isPublicHallmarkPageReady(settings: HallmarkSettings) {
  return settings.publicPageEnabled
    && settings.tradesPreciousMetals
    && settings.publicText.trim().length >= 20
    && (!settings.assayOfficeRegistered || Boolean(settings.registrationNote.trim() || settings.registryUrl));
}

export async function getHallmarkSettings(): Promise<HallmarkSettings> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return defaults;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("hallmark_settings")
    .select("id,trades_precious_metals,assay_office_registered,registration_note,registration_date,registry_url,hallmark_image_path,hallmark_image_filename,public_document_path,public_document_filename,public_text,public_page_enabled,footer_link_enabled")
    .eq("singleton_key", true)
    .maybeSingle();
  if (error || !data) return defaults;
  const row = data as HallmarkSettingsRow;
  return {
    id: row.id,
    tradesPreciousMetals: row.trades_precious_metals,
    assayOfficeRegistered: row.assay_office_registered,
    registrationNote: row.registration_note,
    registrationDate: row.registration_date ?? "",
    registryUrl: row.registry_url,
    hallmarkImagePath: row.hallmark_image_path,
    hallmarkImageFilename: row.hallmark_image_filename,
    hallmarkImageUrl: publicUrl(row.hallmark_image_path),
    publicDocumentPath: row.public_document_path,
    publicDocumentFilename: row.public_document_filename,
    publicDocumentUrl: publicUrl(row.public_document_path),
    publicText: row.public_text,
    publicPageEnabled: row.public_page_enabled,
    footerLinkEnabled: row.footer_link_enabled
  };
}
