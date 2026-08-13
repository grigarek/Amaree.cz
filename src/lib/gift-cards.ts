import type { Currency } from "@/types/domain";
import type { Locale } from "@/i18n/routing";

export const giftCardDesigns = [
  { id: "dekuji-red", imageUrl: "/images/gift-cards/dekuji-red.png", message: "Děkuju", color: "red" },
  { id: "dekuji-white", imageUrl: "/images/gift-cards/dekuji-white.png", message: "Děkuju", color: "white" },
  { id: "jsi-muj-domov-white", imageUrl: "/images/gift-cards/jsi-muj-domov-white.png", message: "Jsi můj domov", color: "white" },
  { id: "jsi-to-nejlepsi-red", imageUrl: "/images/gift-cards/jsi-to-nejlepsi-red.png", message: "Jsi to nejlepší, co mě potkalo", color: "red" },
  { id: "jsi-to-nejlepsi-white", imageUrl: "/images/gift-cards/jsi-to-nejlepsi-white.png", message: "Jsi to nejlepší, co mě potkalo", color: "white" },
  { id: "jsi-vyjimecny-red", imageUrl: "/images/gift-cards/jsi-vyjimecny-red.png", message: "Jsi výjimečný/á", color: "red" },
  { id: "miluji-te-red", imageUrl: "/images/gift-cards/miluji-te-red.png", message: "Miluji Tě", color: "red" },
  { id: "miluji-te-white", imageUrl: "/images/gift-cards/miluji-te-white.png", message: "Miluji Tě", color: "white" },
  { id: "vsechno-nejlepsi-red", imageUrl: "/images/gift-cards/vsechno-nejlepsi-red.png", message: "Všechno nejlepší k narozeninám", color: "red" },
  { id: "vsechno-nejlepsi-white", imageUrl: "/images/gift-cards/vsechno-nejlepsi-white.png", message: "Všechno nejlepší k narozeninám", color: "white" }
] as const;

export type GiftCardDesignId = (typeof giftCardDesigns)[number]["id"];

export function isGiftCardDesignId(value: unknown): value is GiftCardDesignId {
  return typeof value === "string" && giftCardDesigns.some((design) => design.id === value);
}

export function getGiftCardDesign(id: GiftCardDesignId | null | undefined) {
  return giftCardDesigns.find((design) => design.id === id) ?? null;
}

export function getGiftCardPrice(currency: Currency) {
  return currency === "CZK" ? 3_000 : 120;
}

export function getGiftCardColor(color: "red" | "white", locale: Locale) {
  const labels = {
    cs: { red: "červená", white: "bílá" },
    sk: { red: "červená", white: "biela" },
    en: { red: "red", white: "white" },
    de: { red: "rot", white: "weiß" }
  } as const;
  return labels[locale][color];
}

export function getGiftCardLineName(id: GiftCardDesignId, locale: Locale) {
  const design = getGiftCardDesign(id);
  if (!design) return "";
  const prefix = { cs: "Kartička s věnováním", sk: "Kartička s venovaním", en: "Gift message card", de: "Grußkarte" }[locale];
  return `${prefix} – ${design.message}`;
}
