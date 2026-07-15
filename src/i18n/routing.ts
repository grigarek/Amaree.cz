export const locales = ["cs", "en", "de"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "cs";

export const localeNames: Record<Locale, string> = {
  cs: "Česky",
  en: "English",
  de: "Deutsch"
};

const localizedCategorySlugs = [
  { cs: "nausnice", en: "earrings", de: "ohrringe" },
  { cs: "nahrdelniky", en: "necklaces", de: "halsketten" },
  { cs: "naramky", en: "bracelets", de: "armbaender" }
] as const;

export const localizedPaths = {
  cs: {
    home: "/cs",
    collection: "/cs/kolekce",
    category: "/cs/kolekce",
    product: "/cs/produkt",
    about: "/cs/o-nas",
    inspiration: "/cs/inspirace",
    contact: "/cs/kontakt",
    cart: "/cs/kosik",
    checkout: "/cs/objednavka",
    thankYou: "/cs/objednavka/dekujeme",
    terms: "/cs/obchodni-podminky",
    privacy: "/cs/ochrana-osobnich-udaju",
    returns: "/cs/reklamacni-rad",
    shipping: "/cs/doprava-a-platba",
    care: "/cs/pece-o-sperky"
  },
  en: {
    home: "/en",
    collection: "/en/collection",
    category: "/en/collection",
    product: "/en/product",
    about: "/en/about-us",
    inspiration: "/en/inspiration",
    contact: "/en/contact",
    cart: "/en/cart",
    checkout: "/en/checkout",
    thankYou: "/en/checkout/thank-you",
    terms: "/en/terms-and-conditions",
    privacy: "/en/privacy-policy",
    returns: "/en/returns-and-complaints",
    shipping: "/en/shipping-and-payment",
    care: "/en/jewelry-care"
  },
  de: {
    home: "/de",
    collection: "/de/kollektion",
    category: "/de/kollektion",
    product: "/de/produkt",
    about: "/de/ueber-uns",
    inspiration: "/de/inspiration",
    contact: "/de/kontakt",
    cart: "/de/warenkorb",
    checkout: "/de/bestellung",
    thankYou: "/de/bestellung/danke",
    terms: "/de/geschaeftsbedingungen",
    privacy: "/de/datenschutz",
    returns: "/de/reklamation-und-rueckgabe",
    shipping: "/de/versand-und-zahlung",
    care: "/de/schmuckpflege"
  }
} as const;

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function getAlternatePath(locale: Locale, path: string): string {
  const segments = path.split("/").filter(Boolean);
  const currentLocale = isLocale(segments[0] ?? "") ? (segments[0] as Locale) : defaultLocale;
  const tail = segments.slice(1);

  const collectionAliases: Record<Locale, string[]> = {
    cs: ["kolekce"],
    en: ["collection"],
    de: ["kollektion"]
  };
  const productAliases: Record<Locale, string[]> = {
    cs: ["produkt"],
    en: ["product"],
    de: ["produkt"]
  };

  if (tail.length === 0) return localizedPaths[locale].home;
  if (collectionAliases[currentLocale].includes(tail[0])) {
    const category = localizedCategorySlugs.find((slugs) => slugs[currentLocale] === tail[1]);
    return category ? `${localizedPaths[locale].collection}/${category[locale]}` : localizedPaths[locale].collection;
  }
  if (productAliases[currentLocale].includes(tail[0])) {
    return [localizedPaths[locale].product, ...tail.slice(1)].join("/");
  }

  const staticMap = Object.entries(localizedPaths[currentLocale]).find(([, value]) => value === `/${segments.join("/")}`);
  if (staticMap) {
    const [key] = staticMap as [keyof (typeof localizedPaths)[Locale], string];
    return localizedPaths[locale][key];
  }

  return localizedPaths[locale].home;
}

export function getLocalizedAlternates(path: string): Record<Locale, string> {
  return Object.fromEntries(locales.map((locale) => [locale, getAlternatePath(locale, path)])) as Record<Locale, string>;
}
