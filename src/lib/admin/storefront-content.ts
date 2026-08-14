import "server-only";
import type { Locale } from "@/i18n/routing";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type LocalizedText = Record<Locale, string>;

export type StorefrontContentSettings = {
  heroClaim: LocalizedText;
  heroIntro: LocalizedText;
  aboutParagraphs: Record<Locale, string[]>;
  aboutImagePath: string | null;
  aboutImageFilename: string | null;
  aboutImageUrl: string | null;
  aboutImageAlt: LocalizedText;
  supportHours: LocalizedText;
};

type StoredContentValue = {
  aboutContentVersion?: unknown;
  heroClaim?: Partial<Record<Locale, unknown>>;
  heroIntro?: Partial<Record<Locale, unknown>>;
  aboutParagraphs?: Partial<Record<Locale, unknown>>;
  aboutImagePath?: unknown;
  aboutImageFilename?: unknown;
  aboutImageAlt?: Partial<Record<Locale, unknown>>;
  supportHours?: Partial<Record<Locale, unknown>>;
};

const defaults: StorefrontContentSettings = {
  heroClaim: {
    cs: "Stříbrné šperky pro příběhy, které zůstávají.",
    sk: "Strieborné šperky pre príbehy, ktoré zostávajú.",
    en: "Silver jewelry for stories that last.",
    de: "Silberschmuck für Geschichten, die bleiben."
  },
  heroIntro: {
    cs: "Minimalistická elegance, která podtrhne váš styl. Kvalitní materiály. Nadčasový design.",
    sk: "Minimalistická elegancia, ktorá podčiarkne váš štýl. Kvalitné materiály. Nadčasový dizajn.",
    en: "Minimalist elegance that complements your style. Quality materials. Timeless design.",
    de: "Minimalistische Eleganz, die Ihren Stil unterstreicht. Hochwertige Materialien. Zeitloses Design."
  },
  aboutParagraphs: {
    cs: [
      "Jmenuji se Anette a za značkou AMARÉE stojím od jejího úplného začátku. Vznikla v Olomouci z mé blízkosti ke světu šperků, citu pro detail a přání nabídnout ženám kousky, které se přirozeně stanou součástí jejich každého dne.",
      "Šperk pro mě není jen doplněk pro výjimečnou příležitost. Dokáže podtrhnout osobnost, uchovat vzpomínku a dodat pocit výjimečnosti i obyčejnému okamžiku. Proto vybírám jemné stříbrné šperky s nadčasovým charakterem, které lze nosit znovu a znovu.",
      "Každý kousek vybírám s důrazem na design, kvalitu a pohodlné nošení. Stejnou péči věnuji také balení objednávek a komunikaci se zákaznicemi, aby byl celý zážitek s AMARÉE osobní a spolehlivý.",
      "Anette, zakladatelka AMARÉE"
    ],
    sk: [
      "Volám sa Anette a za značkou AMARÉE stojím od jej úplného začiatku. Vznikla v Olomouci z mojej blízkosti k svetu šperkov, citu pre detail a želania ponúknuť ženám kúsky, ktoré sa prirodzene stanú súčasťou ich každého dňa.",
      "Šperk pre mňa nie je iba doplnkom na výnimočnú príležitosť. Dokáže podčiarknuť osobnosť, uchovať spomienku a dodať pocit výnimočnosti aj obyčajnému okamihu. Preto vyberám jemné strieborné šperky s nadčasovým charakterom, ktoré možno nosiť znova a znova.",
      "Každý kúsok vyberám s dôrazom na dizajn, kvalitu a pohodlné nosenie. Rovnakú starostlivosť venujem aj baleniu objednávok a komunikácii so zákazníčkami, aby bol celý zážitok s AMARÉE osobný a spoľahlivý.",
      "Anette, zakladateľka AMARÉE"
    ],
    en: [
      "My name is Anette, and I have been the person behind AMARÉE from the very beginning. The brand was born in Olomouc from my closeness to the world of jewelry, my eye for detail and my wish to offer women pieces that naturally become part of every day.",
      "To me, jewelry is not reserved for special occasions. It can express personality, preserve a memory and make an ordinary moment feel exceptional. That is why I select refined silver jewelry with a timeless character, designed to be worn again and again.",
      "I choose every piece with careful attention to design, quality and comfortable wear. I bring the same care to packaging each order and communicating with customers, so that every AMARÉE experience feels personal and dependable.",
      "Anette, founder of AMARÉE"
    ],
    de: [
      "Ich heiße Anette und stehe seit dem ersten Tag hinter AMARÉE. Die Marke entstand in Olomouc aus meiner Nähe zur Welt des Schmucks, meinem Blick für Details und dem Wunsch, Frauen Schmuckstücke anzubieten, die ganz selbstverständlich Teil ihres Alltags werden.",
      "Für mich ist Schmuck nicht nur besonderen Anlässen vorbehalten. Er kann Persönlichkeit unterstreichen, Erinnerungen bewahren und selbst einem alltäglichen Moment etwas Besonderes verleihen. Deshalb wähle ich feinen Silberschmuck mit zeitlosem Charakter aus, der immer wieder getragen werden kann.",
      "Jedes Stück wähle ich mit besonderem Augenmerk auf Design, Qualität und angenehmen Tragekomfort aus. Mit derselben Sorgfalt verpacke ich Bestellungen und kommuniziere mit Kundinnen, damit sich das gesamte Erlebnis mit AMARÉE persönlich und verlässlich anfühlt.",
      "Anette, Gründerin von AMARÉE"
    ]
  },
  aboutImagePath: null,
  aboutImageFilename: null,
  aboutImageUrl: null,
  aboutImageAlt: {
    cs: "Anette, zakladatelka značky AMARÉE",
    sk: "Anette, zakladateľka značky AMARÉE",
    en: "Anette, founder of AMARÉE",
    de: "Anette, Gründerin von AMARÉE"
  },
  supportHours: {
    cs: "Po–Pá 8:00–17:00",
    sk: "Po–Pi 8:00–17:00",
    en: "Mon–Fri 8:00–17:00 CET",
    de: "Mo–Fr 8:00–17:00 Uhr"
  }
};

function text(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function paragraphs(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) return fallback;
  const result = value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim());
  return result.length ? result : fallback;
}

export async function getStorefrontContentSettings(): Promise<StorefrontContentSettings> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return defaults;
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("integration_settings").select("value").eq("key", "storefront_content").maybeSingle();
  if (error || !data) return defaults;
  const value = (data.value ?? {}) as StoredContentValue;
  const usesCurrentAboutContent = value.aboutContentVersion === 2;
  const aboutImagePath = text(value.aboutImagePath, "") || null;
  return {
    heroClaim: Object.fromEntries(Object.keys(defaults.heroClaim).map((locale) => [locale, text(value.heroClaim?.[locale as Locale], defaults.heroClaim[locale as Locale])])) as LocalizedText,
    heroIntro: Object.fromEntries(Object.keys(defaults.heroIntro).map((locale) => [locale, text(value.heroIntro?.[locale as Locale], defaults.heroIntro[locale as Locale])])) as LocalizedText,
    aboutParagraphs: Object.fromEntries(Object.keys(defaults.aboutParagraphs).map((locale) => [locale, usesCurrentAboutContent ? paragraphs(value.aboutParagraphs?.[locale as Locale], defaults.aboutParagraphs[locale as Locale]) : defaults.aboutParagraphs[locale as Locale]])) as Record<Locale, string[]>,
    aboutImagePath,
    aboutImageFilename: text(value.aboutImageFilename, "") || null,
    aboutImageUrl: aboutImagePath ? supabase.storage.from("product-images").getPublicUrl(aboutImagePath).data.publicUrl : null,
    aboutImageAlt: Object.fromEntries(Object.keys(defaults.aboutImageAlt).map((locale) => [locale, usesCurrentAboutContent ? text(value.aboutImageAlt?.[locale as Locale], defaults.aboutImageAlt[locale as Locale]) : defaults.aboutImageAlt[locale as Locale]])) as LocalizedText,
    supportHours: Object.fromEntries(Object.keys(defaults.supportHours).map((locale) => [locale, text(value.supportHours?.[locale as Locale], defaults.supportHours[locale as Locale])])) as LocalizedText
  };
}

export { defaults as defaultStorefrontContentSettings };
