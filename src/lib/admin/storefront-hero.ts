import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Locale } from "@/i18n/routing";

export const defaultStorefrontHeroImage = "/images/amaree-hero-anette-jewelry.jpeg";

type HeroAltText = Record<Locale, string>;

export type StorefrontHeroSettings = {
  imagePath: string | null;
  imageFilename: string | null;
  imageUrl: string | null;
  enabled: boolean;
  activeFrom: string;
  activeUntil: string;
  alt: HeroAltText;
  isActive: boolean;
  activeImageUrl: string;
};

type StoredHeroValue = {
  imagePath?: unknown;
  imageFilename?: unknown;
  enabled?: unknown;
  activeFrom?: unknown;
  activeUntil?: unknown;
  alt?: Partial<Record<Locale, unknown>>;
};

const emptyAlt: HeroAltText = { cs: "", sk: "", en: "", de: "" };

const defaults: StorefrontHeroSettings = {
  imagePath: null,
  imageFilename: null,
  imageUrl: null,
  enabled: false,
  activeFrom: "",
  activeUntil: "",
  alt: emptyAlt,
  isActive: false,
  activeImageUrl: defaultStorefrontHeroImage
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function isWithinSchedule(activeFrom: string, activeUntil: string, now: Date) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Prague",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
  return (!activeFrom || today >= activeFrom) && (!activeUntil || today <= activeUntil);
}

export async function getStorefrontHeroSettings(now = new Date()): Promise<StorefrontHeroSettings> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return defaults;

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("integration_settings").select("value").eq("key", "storefront_hero").maybeSingle();
  if (error || !data) return defaults;

  const value = (data.value ?? {}) as StoredHeroValue;
  const imagePath = stringValue(value.imagePath) || null;
  const imageFilename = stringValue(value.imageFilename) || null;
  const enabled = value.enabled === true;
  const activeFrom = stringValue(value.activeFrom);
  const activeUntil = stringValue(value.activeUntil);
  const imageUrl = imagePath
    ? supabase.storage.from("product-images").getPublicUrl(imagePath).data.publicUrl
    : null;
  const isActive = Boolean(imageUrl && enabled && isWithinSchedule(activeFrom, activeUntil, now));

  return {
    imagePath,
    imageFilename,
    imageUrl,
    enabled,
    activeFrom,
    activeUntil,
    alt: {
      cs: stringValue(value.alt?.cs),
      sk: stringValue(value.alt?.sk),
      en: stringValue(value.alt?.en),
      de: stringValue(value.alt?.de)
    },
    isActive,
    activeImageUrl: isActive && imageUrl ? imageUrl : defaultStorefrontHeroImage
  };
}
