import type { Category, CategorySlug, Locale, Product } from "@/types/domain";

const imageBase = "https://364fec5f17.cbaul-cdnwnd.com/a801b254206739e67b9c214cc417d27e";

export const categories: Category[] = [
  {
    id: "cat-earrings",
    slug: "earrings",
    localizedSlug: { cs: "nausnice", sk: "nausnice", en: "earrings", de: "ohrringe" },
    name: { cs: "Náušnice", sk: "Náušnice", en: "Earrings", de: "Ohrringe" },
    description: {
      cs: "Jemné náušnice pro každodenní eleganci i večerní lesk.",
      sk: "Jemné náušnice na každodennú eleganciu aj večerný lesk.",
      en: "Delicate earrings for everyday elegance and evening polish.",
      de: "Feine Ohrringe für den Alltag und besondere Abende."
    },
    active: true
  },
  {
    id: "cat-necklaces",
    slug: "necklaces",
    localizedSlug: { cs: "nahrdelniky", sk: "nahrdelniky", en: "necklaces", de: "halsketten" },
    name: { cs: "Náhrdelníky", sk: "Náhrdelníky", en: "Necklaces", de: "Halsketten" },
    description: {
      cs: "Nadčasové linie, které podtrhnou dekolt s lehkostí.",
      sk: "Nadčasové línie, ktoré s ľahkosťou podčiarknu dekolt.",
      en: "Timeless lines that frame the neckline with ease.",
      de: "Zeitlose Linien, die das Dekollete sanft betonen."
    },
    active: true
  },
  {
    id: "cat-bracelets",
    slug: "bracelets",
    localizedSlug: { cs: "naramky", sk: "naramky", en: "bracelets", de: "armbaender" },
    name: { cs: "Náramky", sk: "Náramky", en: "Bracelets", de: "Armbänder" },
    description: {
      cs: "Minimalistické náramky vrstvené podle nálady.",
      sk: "Minimalistické náramky na vrstvenie podľa nálady.",
      en: "Minimal bracelets made to be layered by mood.",
      de: "Minimalistische Armbänder zum Kombinieren nach Stimmung."
    },
    active: true
  }
];

export const products: Product[] = [
  {
    id: "prod-luna-earrings",
    slug: "luna-nausnice",
    name: { cs: "Luna náušnice", sk: "Náušnice Luna", en: "Luna Earrings", de: "Luna Ohrringe" },
    shortDescription: {
      cs: "Jemné kruhové náušnice s perleťovým odleskem.",
      sk: "Jemné kruhové náušnice s perleťovým odleskom.",
      en: "Delicate hoops with a soft mother-of-pearl glow.",
      de: "Feine Creolen mit sanftem Perlmuttschimmer."
    },
    longDescription: {
      cs: "Demonstrační produkt inspirovaný aktuální vizuální atmosférou AMARÉE. Finální popis, cena a sklad musí být potvrzeny před ostrým spuštěním.",
      sk: "Demonštračný produkt inšpirovaný vizuálnou atmosférou AMARÉE. Finálny popis, cena a sklad musia byť potvrdené pred spustením.",
      en: "Demo product inspired by the current AMARÉE visual direction. Final copy, pricing and stock must be confirmed before launch.",
      de: "Demo-Produkt nach der aktuellen AMARÉE Bildsprache. Finale Texte, Preise und Bestände müssen vor dem Launch geprüft werden."
    },
    category: "earrings",
    price: 129000,
    originalPrice: 159000,
    currency: "CZK",
    sku: "1001",
    stockQuantity: 12,
    material: { cs: "Stříbro 925/1000, perleťový detail", sk: "Striebro 925/1000, perleťový detail", en: "Silver 925/1000, mother-of-pearl detail", de: "Silber 925/1000, Perlmutt-Detail" },
    dimensions: { cs: "Průměr 18 mm", sk: "Priemer 18 mm", en: "18 mm diameter", de: "18 mm Durchmesser" },
    care: { cs: "Uchovávejte v suchu a čistěte jemným hadříkem.", sk: "Uchovávajte v suchu a čistite jemnou handričkou.", en: "Keep dry and clean with a soft cloth.", de: "Trocken lagern und mit einem weichen Tuch reinigen." },
    active: true,
    featured: true,
    bestseller: true,
    images: [
      {
        id: "img-luna-1",
        url: `${imageBase}/200000029-a0467a046a/700/ChatGPT%20Image%2016.%204.%202026%2020_48_34-2.webp?ph=364fec5f17`,
        alt: { cs: "Luna náušnice AMARÉE", sk: "Náušnice Luna AMARÉE", en: "AMARÉE Luna earrings", de: "AMARÉE Luna Ohrringe" },
        sortOrder: 1
      },
      {
        id: "img-luna-2",
        url: `${imageBase}/200000028-12b9a12b9b/ChatGPT%20Image%2016.%204.%202026%2020_48_34-5.png?ph=364fec5f17`,
        alt: { cs: "Detail náušnic Luna", sk: "Detail náušníc Luna", en: "Luna earrings detail", de: "Detail der Luna Ohrringe" },
        sortOrder: 2
      }
    ],
    createdAt: "2026-04-17T00:00:00.000Z",
    updatedAt: "2026-04-17T00:00:00.000Z"
  },
  {
    id: "prod-sera-necklace",
    slug: "sera-nahrdelnik",
    name: { cs: "Sera náhrdelník", sk: "Náhrdelník Sera", en: "Sera Necklace", de: "Sera Halskette" },
    shortDescription: {
      cs: "Elegantní řetízek s jemným rubínovým tónem.",
      sk: "Elegantná retiazka s jemným rubínovým tónom.",
      en: "An elegant chain with a subtle ruby-toned detail.",
      de: "Eine elegante Kette mit feinem rubinfarbenem Akzent."
    },
    longDescription: {
      cs: "Demonstrační produkt pro ověření katalogu, detailu a objednávkového toku. Finální produktová data doplňte v administraci.",
      sk: "Demonštračný produkt na overenie katalógu, detailu a objednávkového procesu. Finálne údaje doplňte v administrácii.",
      en: "Demo product for validating catalog, detail and checkout flow. Final product data should be completed in admin.",
      de: "Demo-Produkt zur Prüfung von Katalog, Detailseite und Checkout. Finale Produktdaten im Admin ergänzen."
    },
    category: "necklaces",
    price: 189000,
    currency: "CZK",
    sku: "1002",
    stockQuantity: 8,
    material: { cs: "Pozlacené stříbro 925/1000", sk: "Pozlátené striebro 925/1000", en: "Gold-plated silver 925/1000", de: "Vergoldetes Silber 925/1000" },
    dimensions: { cs: "Délka 42 cm + 5 cm prodloužení", sk: "Dĺžka 42 cm + 5 cm predĺženie", en: "42 cm length + 5 cm extension", de: "42 cm Länge + 5 cm Verlängerung" },
    care: { cs: "Nevystavujte parfému ani chlorované vodě.", sk: "Nevystavujte parfumom ani chlórovanej vode.", en: "Avoid perfume and chlorinated water.", de: "Parfum und Chlorwasser vermeiden." },
    active: true,
    featured: true,
    bestseller: false,
    images: [
      {
        id: "img-sera-1",
        url: `${imageBase}/200000027-63c3063c32/700/ChatGPT%20Image%2016.%204.%202026%2020_48_24-0.webp?ph=364fec5f17`,
        alt: { cs: "Sera náhrdelník AMARÉE", sk: "Náhrdelník Sera AMARÉE", en: "AMARÉE Sera necklace", de: "AMARÉE Sera Halskette" },
        sortOrder: 1
      },
      {
        id: "img-sera-2",
        url: `${imageBase}/200000026-16aa916aab/ChatGPT%20Image%2016.%204.%202026%2020_48_24-3.png?ph=364fec5f17`,
        alt: { cs: "Detail náhrdelníku Sera", sk: "Detail náhrdelníka Sera", en: "Sera necklace detail", de: "Detail der Sera Halskette" },
        sortOrder: 2
      }
    ],
    createdAt: "2026-04-17T00:00:00.000Z",
    updatedAt: "2026-04-17T00:00:00.000Z"
  },
  {
    id: "prod-aura-bracelet",
    slug: "aura-naramek",
    name: { cs: "Aura náramek", sk: "Náramok Aura", en: "Aura Bracelet", de: "Aura Armband" },
    shortDescription: {
      cs: "Lehký náramek s decentním leskem pro vrstvení.",
      sk: "Ľahký náramok s decentným leskom na vrstvenie.",
      en: "A lightweight bracelet with subtle shine for layering.",
      de: "Ein leichtes Armband mit dezentem Glanz zum Layering."
    },
    longDescription: {
      cs: "Demonstrační produkt připravený pro seed databáze a první testy objednávek.",
      sk: "Demonštračný produkt pripravený na prvé testy objednávok.",
      en: "Demo product prepared for database seed and initial order tests.",
      de: "Demo-Produkt für Datenbank-Seed und erste Bestelltests."
    },
    category: "bracelets",
    price: 99000,
    currency: "CZK",
    sku: "1003",
    stockQuantity: 16,
    material: { cs: "Stříbro 925/1000", sk: "Striebro 925/1000", en: "Silver 925/1000", de: "Silber 925/1000" },
    dimensions: { cs: "Nastavitelná délka 16-19 cm", sk: "Nastaviteľná dĺžka 16 – 19 cm", en: "Adjustable 16-19 cm length", de: "Verstellbare Länge 16-19 cm" },
    care: { cs: "Po nošení vraťte do šperkovnice nebo sáčku.", sk: "Po nosení uložte do šperkovnice alebo vrecka.", en: "Store in a jewelry box or pouch after wearing.", de: "Nach dem Tragen in Box oder Beutel aufbewahren." },
    active: true,
    featured: false,
    bestseller: true,
    images: [
      {
        id: "img-aura-1",
        url: `${imageBase}/200000025-a5f13a5f14/700/ChatGPT%20Image%2016.%204.%202026%2020_48_28-5.webp?ph=364fec5f17`,
        alt: { cs: "Aura náramek AMARÉE", sk: "Náramok Aura AMARÉE", en: "AMARÉE Aura bracelet", de: "AMARÉE Aura Armband" },
        sortOrder: 1
      },
      {
        id: "img-aura-2",
        url: `${imageBase}/200000024-40cee40cf1/ChatGPT%20Image%2016.%204.%202026%2020_48_28-2.png?ph=364fec5f17`,
        alt: { cs: "Detail náramku Aura", sk: "Detail náramku Aura", en: "Aura bracelet detail", de: "Detail des Aura Armbands" },
        sortOrder: 2
      }
    ],
    createdAt: "2026-04-17T00:00:00.000Z",
    updatedAt: "2026-04-17T00:00:00.000Z"
  }
];

export function getCategoryByLocalizedSlug(locale: Locale, slug?: string): Category | undefined {
  if (!slug) return undefined;
  return categories.find((category) => category.localizedSlug[locale] === slug);
}

export function getCategoryBySlug(slug: CategorySlug): Category {
  const category = categories.find((item) => item.slug === slug);
  if (!category) throw new Error(`Unknown category: ${slug}`);
  return category;
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug && product.active);
}

export function getProductsByCategory(category?: CategorySlug): Product[] {
  return products.filter((product) => product.active && (!category || product.category === category));
}

export function getFeaturedProducts(): Product[] {
  return products.filter((product) => product.active && product.featured);
}

export function getRecommendedProducts(productId?: string): Product[] {
  return products.filter((product) => product.active && product.id !== productId).slice(0, 3);
}
