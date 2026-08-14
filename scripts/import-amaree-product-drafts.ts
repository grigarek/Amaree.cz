import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { inspectImage } from "../src/lib/images/inspect-image";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRole) throw new Error("Supabase není nakonfigurovaný.");

const supabase = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });

type Locale = "cs" | "sk" | "en" | "de";
type ProductDraft = {
  internalId: string;
  sku: string;
  category: "necklaces" | "bracelets" | "earrings";
  names: Record<Locale, string>;
  slugs: Record<Locale, string>;
  colors: Record<Locale, string>;
  goldPlated?: boolean;
  images: Array<{ path: string; alt: Record<Locale, string> }>;
};

type CatalogContent = {
  priceCzkMinor: number;
  priceEurMinor: number;
  descriptions: Record<Locale, { short: string; long: string }>;
};

const care: Record<Locale, string> = {
  cs: "Chraňte před vodou, parfémem a kosmetikou. Po nošení jemně otřete měkkým hadříkem.",
  sk: "Chráňte pred vodou, parfumom a kozmetikou. Po nosení jemne utrite mäkkou handričkou.",
  en: "Keep away from water, perfume and cosmetics. Wipe gently with a soft cloth after wear.",
  de: "Vor Wasser, Parfüm und Kosmetik schützen. Nach dem Tragen sanft mit einem weichen Tuch abwischen."
};

const catalogContent: Record<string, CatalogContent> = {
  "amaree-clover-necklace-black": {
    priceCzkMinor: 149900,
    priceEurMinor: 5990,
    descriptions: {
      cs: {
        short: "Jemný náhrdelník s černým čtyřlístkem a lemem z čirých kamínků pro elegantní každodenní styling.",
        long: "Minuit v černém provedení spojuje jemný řetízek ve stříbrném tónu s výrazným čtyřlístkovým přívěskem. Kontrast černého středu a čirých kamínků působí čistě a nadčasově; náhrdelník vynikne samostatně i při vrstvení."
      },
      sk: {
        short: "Jemný náhrdelník s čiernym štvorlístkom a lemom z čírych kamienkov pre elegantný každodenný štýl.",
        long: "Minuit v čiernom prevedení spája jemnú retiazku v striebornom tóne s výrazným štvorlístkovým príveskom. Kontrast čierneho stredu a čírych kamienkov pôsobí čisto a nadčasovo; náhrdelník vynikne samostatne aj pri vrstvení."
      },
      en: {
        short: "A delicate necklace with a black clover motif framed by clear stones for refined everyday styling.",
        long: "The black Minuit necklace pairs a fine silver-tone chain with a distinctive four-leaf pendant. The contrast between the black centre and clear stones feels clean and timeless, whether worn alone or layered."
      },
      de: {
        short: "Feine Halskette mit schwarzem Kleeblatt und klaren Steinen für einen eleganten Alltagslook.",
        long: "Die schwarze Minuit Halskette verbindet eine feine Kette im Silberton mit einem markanten vierblättrigen Anhänger. Der Kontrast aus schwarzer Mitte und klaren Steinen wirkt pur und zeitlos, solo ebenso wie im Layering."
      }
    }
  },
  "amaree-clover-necklace-pink": {
    priceCzkMinor: 149900,
    priceEurMinor: 5990,
    descriptions: {
      cs: {
        short: "Jemný náhrdelník s růžovým čtyřlístkem a čirými kamínky pro lehký, romantický detail.",
        long: "Rosée spojuje jemný řetízek ve stříbrném tónu s růžovým čtyřlístkovým přívěskem lemovaným čirými kamínky. Decentní barevný akcent rozjasní každodenní outfit a snadno se kombinuje s dalšími šperky kolekce."
      },
      sk: {
        short: "Jemný náhrdelník s ružovým štvorlístkom a čírymi kamienkami pre ľahký romantický detail.",
        long: "Rosée spája jemnú retiazku v striebornom tóne s ružovým štvorlístkovým príveskom lemovaným čírymi kamienkami. Decentný farebný akcent rozžiari každodenný outfit a ľahko sa kombinuje s ďalšími šperkami kolekcie."
      },
      en: {
        short: "A delicate necklace with a pink clover motif and clear stones for a soft, romantic accent.",
        long: "The Rosée necklace pairs a fine silver-tone chain with a pink four-leaf pendant framed by clear stones. Its subtle colour brightens everyday looks and pairs naturally with other pieces from the collection."
      },
      de: {
        short: "Feine Halskette mit rosa Kleeblatt und klaren Steinen für einen sanften, romantischen Akzent.",
        long: "Die Rosée Halskette verbindet eine feine Kette im Silberton mit einem rosa vierblättrigen Anhänger, der von klaren Steinen eingefasst ist. Der dezente Farbakzent verleiht Alltagslooks Leichtigkeit und lässt sich harmonisch kombinieren."
      }
    }
  },
  "amaree-clover-bracelet-black": {
    priceCzkMinor: 139900,
    priceEurMinor: 5590,
    descriptions: {
      cs: {
        short: "Jemný řetízkový náramek s černým čtyřlístkem a čirými kamínky pro nadčasový kontrast.",
        long: "Černý náramek Minuit staví na jemném řetízku ve stříbrném tónu a výrazném čtyřlístkovém motivu. Černý střed lemovaný čirými kamínky dodává šperku elegantní kontrast, který obstojí samostatně i vedle dalších náramků."
      },
      sk: {
        short: "Jemný retiazkový náramok s čiernym štvorlístkom a čírymi kamienkami pre nadčasový kontrast.",
        long: "Čierny náramok Minuit stavia na jemnej retiazke v striebornom tóne a výraznom štvorlístkovom motíve. Čierny stred lemovaný čírymi kamienkami dodáva šperku elegantný kontrast, ktorý vynikne samostatne aj vedľa ďalších náramkov."
      },
      en: {
        short: "A fine chain bracelet with a black clover motif and clear stones for timeless contrast.",
        long: "The black Minuit bracelet combines a fine silver-tone chain with a distinctive four-leaf motif. Its black centre framed by clear stones creates an elegant contrast that works beautifully alone or stacked."
      },
      de: {
        short: "Feines Kettenarmband mit schwarzem Kleeblatt und klaren Steinen für zeitlosen Kontrast.",
        long: "Das schwarze Minuit Armband kombiniert eine feine Kette im Silberton mit einem markanten vierblättrigen Motiv. Die von klaren Steinen eingefasste schwarze Mitte setzt einen eleganten Kontrast, solo ebenso wie im Armband-Stack."
      }
    }
  },
  "amaree-tennis-bracelet-silver": {
    priceCzkMinor: 129900,
    priceEurMinor: 5190,
    descriptions: {
      cs: {
        short: "Elegantní náramek s pravidelnou řadou čirých kamínků a jemným třpytem.",
        long: "Lueur je lehký náramek tvořený souvislou řadou čirých kamínků ve stříbrném tónu. Čistá linie působí slavnostně, ale zůstává dostatečně jemná pro každodenní nošení; prodlužovací řetízek umožňuje pohodlné přizpůsobení zápěstí."
      },
      sk: {
        short: "Elegantný náramok s pravidelným radom čírych kamienkov a jemným leskom.",
        long: "Lueur je ľahký náramok tvorený súvislým radom čírych kamienkov v striebornom tóne. Čistá línia pôsobí slávnostne, no zostáva dostatočne jemná na každodenné nosenie; predlžovacia retiazka umožňuje pohodlné prispôsobenie zápästiu."
      },
      en: {
        short: "An elegant bracelet with an even row of clear stones and a delicate sparkle.",
        long: "Lueur is a light silver-tone bracelet formed by a continuous row of clear stones. Its clean line feels polished yet remains subtle enough for everyday wear, while the extension chain offers a comfortable adjustable fit."
      },
      de: {
        short: "Elegantes Armband mit einer gleichmäßigen Reihe klarer Steine und feinem Funkeln.",
        long: "Lueur ist ein leichtes Armband im Silberton mit einer durchgehenden Reihe klarer Steine. Die klare Linie wirkt festlich und zugleich dezent genug für jeden Tag; die Verlängerungskette ermöglicht eine angenehme Anpassung."
      }
    }
  },
  "amaree-clover-earrings-black": {
    priceCzkMinor: 119900,
    priceEurMinor: 4790,
    descriptions: {
      cs: {
        short: "Drobné náušnice s černým čtyřlístkem a čirými kamínky pro čistý elegantní detail.",
        long: "Černé náušnice Minuit pracují s kompaktním čtyřlístkovým motivem ve stříbrném tónu. Černý střed a lem z čirých kamínků vytvářejí výrazný, ale stále jemný kontrast vhodný pro každodenní i večerní styling."
      },
      sk: {
        short: "Drobné náušnice s čiernym štvorlístkom a čírymi kamienkami pre čistý elegantný detail.",
        long: "Čierne náušnice Minuit pracujú s kompaktným štvorlístkovým motívom v striebornom tóne. Čierny stred a lem z čírych kamienkov vytvárajú výrazný, no stále jemný kontrast vhodný na každodenný aj večerný štýl."
      },
      en: {
        short: "Petite earrings with a black clover motif and clear stones for a polished detail.",
        long: "The black Minuit earrings feature a compact four-leaf motif in a silver tone. A black centre framed by clear stones creates a defined yet delicate contrast suited to both everyday and evening looks."
      },
      de: {
        short: "Zierliche Ohrringe mit schwarzem Kleeblatt und klaren Steinen für ein elegantes Detail.",
        long: "Die schwarzen Minuit Ohrringe zeigen ein kompaktes vierblättriges Motiv im Silberton. Die schwarze Mitte und der Rahmen aus klaren Steinen bilden einen ausdrucksstarken, dennoch feinen Kontrast für Alltag und Abend."
      }
    }
  },
  "amaree-clover-earrings-pink": {
    priceCzkMinor: 119900,
    priceEurMinor: 4790,
    descriptions: {
      cs: {
        short: "Drobné náušnice s růžovým čtyřlístkem a čirými kamínky pro jemný barevný akcent.",
        long: "Růžové náušnice Rosée přinášejí kompaktní čtyřlístkový motiv ve stříbrném tónu. Růžový střed lemovaný čirými kamínky rozjasní obličej a snadno doplní každodenní i slavnostnější kombinace."
      },
      sk: {
        short: "Drobné náušnice s ružovým štvorlístkom a čírymi kamienkami pre jemný farebný akcent.",
        long: "Ružové náušnice Rosée prinášajú kompaktný štvorlístkový motív v striebornom tóne. Ružový stred lemovaný čírymi kamienkami rozžiari tvár a ľahko doplní každodenné aj slávnostnejšie kombinácie."
      },
      en: {
        short: "Petite earrings with a pink clover motif and clear stones for a soft touch of colour.",
        long: "The pink Rosée earrings feature a compact four-leaf motif in a silver tone. Their pink centre framed by clear stones brightens the face and complements both everyday and more polished looks."
      },
      de: {
        short: "Zierliche Ohrringe mit rosa Kleeblatt und klaren Steinen für einen sanften Farbakzent.",
        long: "Die rosa Rosée Ohrringe zeigen ein kompaktes vierblättriges Motiv im Silberton. Die von klaren Steinen eingefasste rosa Mitte bringt Frische ans Gesicht und passt zu alltäglichen wie festlicheren Looks."
      }
    }
  },
  "amaree-hoop-earrings-silver": {
    priceCzkMinor: 89900,
    priceEurMinor: 3590,
    descriptions: {
      cs: {
        short: "Drobné kruhové náušnice ve stříbrném tónu s řadou čirých kamínků.",
        long: "Stříbrné kruhové náušnice Lueur mají kompaktní siluetu a přední linii zdobenou čirými kamínky. Díky decentní velikosti se snadno nosí každý den a přidávají outfitu jemný, upravený třpyt."
      },
      sk: {
        short: "Drobné kruhové náušnice v striebornom tóne s radom čírych kamienkov.",
        long: "Strieborné kruhové náušnice Lueur majú kompaktnú siluetu a prednú líniu zdobenú čírymi kamienkami. Vďaka decentnej veľkosti sa ľahko nosia každý deň a dodávajú outfitu jemný, upravený lesk."
      },
      en: {
        short: "Petite silver-tone hoops finished with a neat row of clear stones.",
        long: "The silver Lueur hoops have a compact silhouette with a front row of clear stones. Their understated size makes them easy to wear every day while adding a refined touch of sparkle."
      },
      de: {
        short: "Zierliche Creolen im Silberton mit einer feinen Reihe klarer Steine.",
        long: "Die silberfarbenen Lueur Creolen haben eine kompakte Silhouette und eine Vorderseite mit klaren Steinen. Ihre dezente Größe macht sie zum unkomplizierten Begleiter für jeden Tag mit feinem Glanz."
      }
    }
  },
  "amaree-hoop-earrings-gold": {
    priceCzkMinor: 99900,
    priceEurMinor: 3990,
    descriptions: {
      cs: {
        short: "Drobné kruhové náušnice ve zlatém tónu s jemnou řadou čirých kamínků.",
        long: "Zlaté kruhové náušnice Lueur spojují kompaktní tvar s přední linií čirých kamínků. Teplý kovový tón působí elegantně a díky decentní velikosti jsou náušnice příjemnou volbou pro každodenní nošení."
      },
      sk: {
        short: "Drobné kruhové náušnice v zlatom tóne s jemným radom čírych kamienkov.",
        long: "Zlaté kruhové náušnice Lueur spájajú kompaktný tvar s prednou líniou čírych kamienkov. Teplý kovový tón pôsobí elegantne a vďaka decentnej veľkosti sú náušnice príjemnou voľbou na každodenné nosenie."
      },
      en: {
        short: "Petite gold-tone hoops finished with a delicate row of clear stones.",
        long: "The gold Lueur hoops combine a compact shape with a front row of clear stones. Their warm metallic tone feels elegant, while the understated size makes them an effortless everyday choice."
      },
      de: {
        short: "Zierliche Creolen im Goldton mit einer feinen Reihe klarer Steine.",
        long: "Die goldfarbenen Lueur Creolen verbinden eine kompakte Form mit einer Vorderseite aus klaren Steinen. Der warme Metallton wirkt elegant und die dezente Größe macht sie zur angenehmen Wahl für jeden Tag."
      }
    }
  }
};

const products: ProductDraft[] = [
  {
    internalId: "amaree-clover-necklace-black", sku: "AMR-NCL-CLO-BLK-001", category: "necklaces",
    names: { cs: "Minuit náhrdelník", sk: "Minuit náhrdelník", en: "Minuit Necklace", de: "Minuit Halskette" },
    slugs: { cs: "minuit-nahrdelnik", sk: "minuit-nahrdelnik", en: "minuit-necklace", de: "minuit-halskette" },
    colors: { cs: "Stříbrná a černá", sk: "Strieborná a čierna", en: "Silver and black", de: "Silber und Schwarz" },
    images: [
      { path: "public/products/amaree-clover-necklace-black/main-white.png", alt: { cs: "Černý náhrdelník Minuit na bílém pozadí", sk: "Čierny náhrdelník Minuit na bielom pozadí", en: "Minuit black necklace on a white background", de: "Schwarze Minuit Halskette auf weißem Hintergrund" } },
      { path: "public/products/amaree-clover-necklace-black/worn-detail.png", alt: { cs: "Detail černého náhrdelníku Minuit na krku", sk: "Detail čierneho náhrdelníka Minuit na krku", en: "Close-up of the Minuit black necklace being worn", de: "Nahaufnahme der getragenen schwarzen Minuit Halskette" } },
      { path: "public/products/amaree-clover-necklace-black/source.jpg", alt: { cs: "Detail černého přívěsku Minuit", sk: "Detail čierneho prívesku Minuit", en: "Detail of the black Minuit pendant", de: "Detail des schwarzen Minuit Anhängers" } },
      { path: "public/products/amaree-clover-necklace-black/lifestyle.png", alt: { cs: "Žena s černým náhrdelníkem Minuit", sk: "Žena s čiernym náhrdelníkom Minuit", en: "Woman wearing the Minuit black necklace", de: "Frau mit schwarzer Minuit Halskette" } }
    ]
  },
  {
    internalId: "amaree-clover-necklace-pink", sku: "AMR-NCL-CLO-PNK-001", category: "necklaces",
    names: { cs: "Rosée náhrdelník", sk: "Rosée náhrdelník", en: "Rosée Necklace", de: "Rosée Halskette" },
    slugs: { cs: "rosee-nahrdelnik", sk: "rosee-nahrdelnik", en: "rosee-necklace", de: "rosee-halskette" },
    colors: { cs: "Stříbrná a růžová", sk: "Strieborná a ružová", en: "Silver and pink", de: "Silber und Rosa" },
    images: [
      { path: "public/products/amaree-clover-necklace-pink/main-white.png", alt: { cs: "Růžový náhrdelník Rosée na bílém pozadí", sk: "Ružový náhrdelník Rosée na bielom pozadí", en: "Rosée pink necklace on a white background", de: "Rosa Rosée Halskette auf weißem Hintergrund" } },
      { path: "public/products/amaree-clover-necklace-pink/worn-detail.png", alt: { cs: "Detail růžového náhrdelníku Rosée na krku", sk: "Detail ružového náhrdelníka Rosée na krku", en: "Close-up of the Rosée pink necklace being worn", de: "Nahaufnahme der getragenen rosa Rosée Halskette" } },
      { path: "public/products/amaree-clover-necklace-pink/lifestyle.png", alt: { cs: "Žena s růžovým náhrdelníkem Rosée", sk: "Žena s ružovým náhrdelníkom Rosée", en: "Woman wearing the Rosée pink necklace", de: "Frau mit rosa Rosée Halskette" } }
    ]
  },
  {
    internalId: "amaree-clover-bracelet-black", sku: "AMR-BRC-CLO-BLK-001", category: "bracelets",
    names: { cs: "Minuit náramek", sk: "Minuit náramok", en: "Minuit Bracelet", de: "Minuit Armband" },
    slugs: { cs: "minuit-naramek", sk: "minuit-naramok", en: "minuit-bracelet", de: "minuit-armband" },
    colors: { cs: "Stříbrná a černá", sk: "Strieborná a čierna", en: "Silver and black", de: "Silber und Schwarz" },
    images: [
      { path: "public/products/amaree-clover-bracelet-black/main-white.png", alt: { cs: "Černý náramek Minuit na bílém pozadí", sk: "Čierny náramok Minuit na bielom pozadí", en: "Minuit black bracelet on a white background", de: "Schwarzes Minuit Armband auf weißem Hintergrund" } },
      { path: "public/products/amaree-clover-bracelet-black/worn-detail.png", alt: { cs: "Detail černého náramku Minuit na zápěstí", sk: "Detail čierneho náramku Minuit na zápästí", en: "Close-up of the Minuit black bracelet on a wrist", de: "Nahaufnahme des schwarzen Minuit Armbands am Handgelenk" } },
      { path: "public/products/amaree-clover-bracelet-black/source.jpg", alt: { cs: "Detail černého náramku Minuit", sk: "Detail čierneho náramku Minuit", en: "Detail of the black Minuit bracelet", de: "Detail des schwarzen Minuit Armbands" } },
      { path: "public/products/amaree-clover-bracelet-black/lifestyle.png", alt: { cs: "Žena s černým náramkem Minuit", sk: "Žena s čiernym náramkom Minuit", en: "Woman wearing the Minuit black bracelet", de: "Frau mit schwarzem Minuit Armband" } }
    ]
  },
  {
    internalId: "amaree-tennis-bracelet-silver", sku: "AMR-BRC-TEN-SLV-001", category: "bracelets",
    names: { cs: "Lueur stříbrný náramek", sk: "Lueur strieborný náramok", en: "Lueur Silver Bracelet", de: "Lueur Armband Silber" },
    slugs: { cs: "lueur-stribrny-naramek", sk: "lueur-strieborny-naramok", en: "lueur-silver-bracelet", de: "lueur-armband-silber" },
    colors: { cs: "Stříbrná", sk: "Strieborná", en: "Silver", de: "Silber" },
    images: [
      { path: "public/products/amaree-tennis-bracelet-silver/main-white.png", alt: { cs: "Stříbrný náramek Lueur na bílém pozadí", sk: "Strieborný náramok Lueur na bielom pozadí", en: "Lueur silver bracelet on a white background", de: "Lueur Armband in Silber auf weißem Hintergrund" } },
      { path: "public/products/amaree-tennis-bracelet-silver/worn-detail.png", alt: { cs: "Detail stříbrného náramku Lueur na zápěstí", sk: "Detail strieborného náramku Lueur na zápästí", en: "Close-up of the Lueur silver bracelet on a wrist", de: "Nahaufnahme des Lueur Armbands in Silber am Handgelenk" } },
      { path: "public/products/amaree-tennis-bracelet-silver/detail.jpg", alt: { cs: "Detail stříbrného náramku Lueur", sk: "Detail strieborného náramku Lueur", en: "Detail of the Lueur silver bracelet", de: "Detail des Lueur Armbands in Silber" } },
      { path: "public/products/amaree-tennis-bracelet-silver/lifestyle.png", alt: { cs: "Žena se stříbrným náramkem Lueur", sk: "Žena so strieborným náramkom Lueur", en: "Woman wearing the Lueur silver bracelet", de: "Frau mit Lueur Armband in Silber" } }
    ]
  },
  {
    internalId: "amaree-clover-earrings-black", sku: "AMR-EAR-CLO-BLK-001", category: "earrings",
    names: { cs: "Minuit náušnice", sk: "Minuit náušnice", en: "Minuit Earrings", de: "Minuit Ohrringe" },
    slugs: { cs: "minuit-nausnice", sk: "minuit-nausnice", en: "minuit-earrings", de: "minuit-ohrringe" },
    colors: { cs: "Stříbrná a černá", sk: "Strieborná a čierna", en: "Silver and black", de: "Silber und Schwarz" },
    images: [
      { path: "public/products/amaree-clover-earrings-black/main-white.png", alt: { cs: "Černé náušnice Minuit na bílém pozadí", sk: "Čierne náušnice Minuit na bielom pozadí", en: "Minuit black earrings on a white background", de: "Schwarze Minuit Ohrringe auf weißem Hintergrund" } },
      { path: "public/products/amaree-clover-earrings-black/worn-detail.png", alt: { cs: "Detail malé černé náušnice Minuit v uchu", sk: "Detail malej čiernej náušnice Minuit v uchu", en: "Close-up of a small Minuit black earring being worn", de: "Nahaufnahme eines kleinen schwarzen Minuit Ohrrings am Ohr" } },
      { path: "public/products/amaree-clover-earrings-black/source.jpg", alt: { cs: "Detail černých náušnic Minuit", sk: "Detail čiernych náušníc Minuit", en: "Detail of the black Minuit earrings", de: "Detail der schwarzen Minuit Ohrringe" } },
      { path: "public/products/amaree-clover-earrings-black/lifestyle.png", alt: { cs: "Žena s černými náušnicemi Minuit", sk: "Žena s čiernymi náušnicami Minuit", en: "Woman wearing Minuit black earrings", de: "Frau mit schwarzen Minuit Ohrringen" } }
    ]
  },
  {
    internalId: "amaree-clover-earrings-pink", sku: "AMR-EAR-CLO-PNK-001", category: "earrings",
    names: { cs: "Rosée náušnice", sk: "Rosée náušnice", en: "Rosée Earrings", de: "Rosée Ohrringe" },
    slugs: { cs: "rosee-nausnice", sk: "rosee-nausnice", en: "rosee-earrings", de: "rosee-ohrringe" },
    colors: { cs: "Stříbrná a růžová", sk: "Strieborná a ružová", en: "Silver and pink", de: "Silber und Rosa" },
    images: [
      { path: "public/products/amaree-clover-earrings-pink/main-white.png", alt: { cs: "Růžové náušnice Rosée na bílém pozadí", sk: "Ružové náušnice Rosée na bielom pozadí", en: "Rosée pink earrings on a white background", de: "Rosa Rosée Ohrringe auf weißem Hintergrund" } },
      { path: "public/products/amaree-clover-earrings-pink/worn-detail.png", alt: { cs: "Detail malé růžové náušnice Rosée v uchu", sk: "Detail malej ružovej náušnice Rosée v uchu", en: "Close-up of a small Rosée pink earring being worn", de: "Nahaufnahme eines kleinen rosa Rosée Ohrrings am Ohr" } },
      { path: "public/products/amaree-clover-earrings-pink/detail.png", alt: { cs: "Detail růžových náušnic Rosée", sk: "Detail ružových náušníc Rosée", en: "Detail of Rosée pink earrings", de: "Detail der rosa Rosée Ohrringe" } },
      { path: "public/products/amaree-clover-earrings-pink/lifestyle.png", alt: { cs: "Žena s růžovými náušnicemi Rosée", sk: "Žena s ružovými náušnicami Rosée", en: "Woman wearing Rosée pink earrings", de: "Frau mit rosa Rosée Ohrringen" } }
    ]
  },
  {
    internalId: "amaree-hoop-earrings-silver", sku: "AMR-EAR-HOO-SLV-001", category: "earrings",
    names: { cs: "Lueur kruhové náušnice stříbrné", sk: "Lueur kruhové náušnice strieborné", en: "Lueur Silver Hoop Earrings", de: "Lueur Creolen Silber" },
    slugs: { cs: "lueur-kruhove-nausnice-stribrne", sk: "lueur-kruhove-nausnice-strieborne", en: "lueur-silver-hoop-earrings", de: "lueur-creolen-silber" },
    colors: { cs: "Stříbrná", sk: "Strieborná", en: "Silver", de: "Silber" },
    images: [
      { path: "public/products/amaree-hoop-earrings-silver/main-white.png", alt: { cs: "Stříbrné kruhové náušnice Lueur na bílém pozadí", sk: "Strieborné kruhové náušnice Lueur na bielom pozadí", en: "Lueur silver hoop earrings on a white background", de: "Lueur Creolen in Silber auf weißem Hintergrund" } },
      { path: "public/products/amaree-hoop-earrings-silver/worn-detail.png", alt: { cs: "Detail malé stříbrné kruhové náušnice Lueur v uchu", sk: "Detail malej striebornej kruhovej náušnice Lueur v uchu", en: "Close-up of a small Lueur silver hoop earring being worn", de: "Nahaufnahme einer kleinen Lueur Creole in Silber am Ohr" } },
      { path: "public/products/amaree-hoop-earrings-silver/detail.png", alt: { cs: "Detail stříbrných kruhových náušnic Lueur", sk: "Detail strieborných kruhových náušníc Lueur", en: "Detail of Lueur silver hoop earrings", de: "Detail der Lueur Creolen in Silber" } },
      { path: "public/products/amaree-hoop-earrings-silver/lifestyle.png", alt: { cs: "Žena se stříbrnými kruhovými náušnicemi Lueur", sk: "Žena so striebornými kruhovými náušnicami Lueur", en: "Woman wearing Lueur silver hoop earrings", de: "Frau mit Lueur Creolen in Silber" } }
    ]
  },
  {
    internalId: "amaree-hoop-earrings-gold", sku: "AMR-EAR-HOO-GLD-001", category: "earrings", goldPlated: true,
    names: { cs: "Lueur kruhové náušnice pozlacené", sk: "Lueur kruhové náušnice pozlátené", en: "Lueur Gold-Plated Hoop Earrings", de: "Lueur Vergoldete Creolen" },
    slugs: { cs: "lueur-kruhove-nausnice-pozlacene", sk: "lueur-kruhove-nausnice-pozlatene", en: "lueur-gold-plated-hoop-earrings", de: "lueur-vergoldete-creolen" },
    colors: { cs: "Zlatá", sk: "Zlatá", en: "Gold", de: "Gold" },
    images: [
      { path: "public/products/amaree-hoop-earrings-gold/main-white.png", alt: { cs: "Pozlacené kruhové náušnice Lueur na bílém pozadí", sk: "Pozlátené kruhové náušnice Lueur na bielom pozadí", en: "Lueur gold-plated hoop earrings on a white background", de: "Vergoldete Lueur Creolen auf weißem Hintergrund" } },
      { path: "public/products/amaree-hoop-earrings-gold/worn-detail.png", alt: { cs: "Detail malé pozlacené kruhové náušnice Lueur v uchu", sk: "Detail malej pozlátenej kruhovej náušnice Lueur v uchu", en: "Close-up of a small Lueur gold-plated hoop earring being worn", de: "Nahaufnahme einer kleinen vergoldeten Lueur Creole am Ohr" } },
      { path: "public/products/amaree-hoop-earrings-gold/detail.png", alt: { cs: "Detail pozlacených kruhových náušnic Lueur", sk: "Detail pozlátených kruhových náušníc Lueur", en: "Detail of Lueur gold-plated hoop earrings", de: "Detail der vergoldeten Lueur Creolen" } },
      { path: "public/products/amaree-hoop-earrings-gold/lifestyle.png", alt: { cs: "Žena s pozlacenými kruhovými náušnicemi Lueur", sk: "Žena s pozlátenými kruhovými náušnicami Lueur", en: "Woman wearing Lueur gold-plated hoop earrings", de: "Frau mit vergoldeten Lueur Creolen" } }
    ]
  }
];

async function uploadImages(productId: string, product: ProductDraft) {
  const { data: existingRows, error: existingError } = await supabase.from("product_images").select("id,storage_path,original_filename,sort_order").eq("product_id", productId).is("archived_at", null);
  if (existingError) throw existingError;
  let nextOrder = Math.max(-1, ...(existingRows ?? []).map((row) => row.sort_order)) + 1;
  let uploaded = 0;

  for (const image of product.images) {
    const filename = basename(image.path);
    const existing = (existingRows ?? []).find((row) => row.original_filename === filename);
    if (existing) continue;
    const buffer = await readFile(image.path);
    const inspected = inspectImage(buffer);
    const imageId = randomUUID();
    const storagePath = `products/${productId}/${imageId}.${inspected.extension}`;
    const { error: uploadError } = await supabase.storage.from("product-images").upload(storagePath, buffer, { contentType: inspected.mimeType, upsert: false, cacheControl: "31536000" });
    if (uploadError) throw uploadError;
    const { error: rowError } = await supabase.from("product_images").insert({ id: imageId, product_id: productId, storage_path: storagePath, original_filename: basename(image.path), mime_type: inspected.mimeType, size_bytes: buffer.length, width: inspected.width, height: inspected.height, sort_order: nextOrder, is_primary: (existingRows ?? []).length === 0 && uploaded === 0 });
    if (rowError) throw rowError;
    const { error: altError } = await supabase.from("product_image_translations").insert((Object.keys(image.alt) as Locale[]).map((locale) => ({ image_id: imageId, locale, alt_text: image.alt[locale] })));
    if (altError) throw altError;
    nextOrder += 1;
    uploaded += 1;
  }
  const { data: orderedRows, error: orderedError } = await supabase.from("product_images").select("id,original_filename").eq("product_id", productId).is("archived_at", null);
  if (orderedError) throw orderedError;
  const imageRank = (filename: string) => filename.startsWith("main.") ? 0 : filename === "worn-detail.png" ? 1 : filename === "lifestyle.png" ? 2 : 3;
  const desiredOrder = product.images.map((image) => basename(image.path)).sort((a, b) => imageRank(a) - imageRank(b));
  for (const [temporaryIndex, row] of (orderedRows ?? []).entries()) {
    const { error: shiftError } = await supabase.from("product_images").update({ sort_order: 10000 + temporaryIndex }).eq("id", row.id);
    if (shiftError) throw shiftError;
  }
  for (const row of orderedRows ?? []) {
    const targetOrder = desiredOrder.indexOf(row.original_filename);
    if (targetOrder < 0) continue;
    const { error: orderError } = await supabase.from("product_images").update({ sort_order: targetOrder }).eq("id", row.id);
    if (orderError) throw orderError;
  }
  if (uploaded) return `uploaded-${uploaded}`;
  return "kept-existing";
}

async function main() {
  const { data: categoryRows, error: categoryError } = await supabase.from("categories").select("id,internal_slug").in("internal_slug", ["necklaces", "bracelets", "earrings"]);
  if (categoryError) throw categoryError;
  const categoryIds = new Map((categoryRows ?? []).map((row) => [row.internal_slug, row.id]));
  const results = [];

  for (const product of products) {
    const categoryId = categoryIds.get(product.category);
    if (!categoryId) throw new Error(`Chybí kategorie ${product.category}.`);
    const content = catalogContent[product.internalId];
    if (!content) throw new Error(`Chybí katalogový obsah pro ${product.internalId}.`);

    const { data: existingProduct, error: existingProductError } = await supabase.from("products").select("id").eq("internal_id", product.internalId).maybeSingle();
    if (existingProductError) throw existingProductError;
    const productMutation = existingProduct
      ? supabase.from("products").update({ sku: product.sku, category_id: categoryId }).eq("id", existingProduct.id).select("id").single()
      : supabase.from("products").insert({ internal_id: product.internalId, sku: product.sku, category_id: categoryId, weight_grams: null, active: false, publication_status: "draft", featured: false, is_new: true, sort_order: 0, low_stock_threshold: 2, archived_at: null }).select("id").single();
    const { data: saved, error: productError } = await productMutation;
    if (productError) throw productError;
    const productId = saved.id;

    const material = product.goldPlated
      ? { cs: "Pozlacené stříbro", sk: "Pozlátené striebro", en: "Gold-plated silver", de: "Vergoldetes Silber" }
      : { cs: "Stříbro", sk: "Striebro", en: "Silver", de: "Silber" };
    const translations = (Object.keys(product.names) as Locale[]).map((locale) => ({
      product_id: productId, locale, slug: product.slugs[locale], name: product.names[locale], short_description: content.descriptions[locale].short, long_description: content.descriptions[locale].long, material: material[locale], color: product.colors[locale], dimensions: "", length: "", clasp_type: "", finish: "", stones: "", care: care[locale], seo_title: `${product.names[locale]} | AMARÉE`, seo_description: content.descriptions[locale].short
    }));
    const { error: translationsError } = await supabase.from("product_translations").upsert(translations, { onConflict: "product_id,locale" });
    if (translationsError) throw translationsError;
    const { error: priceError } = await supabase.from("product_prices").upsert([{ product_id: productId, currency: "CZK", amount_minor: content.priceCzkMinor, original_amount_minor: null }, { product_id: productId, currency: "EUR", amount_minor: content.priceEurMinor, original_amount_minor: null }], { onConflict: "product_id,currency" });
    if (priceError) throw priceError;
    const { data: inventory, error: inventoryReadError } = await supabase.from("inventory_items").select("id").eq("product_id", productId).is("variant_id", null).maybeSingle();
    if (inventoryReadError) throw inventoryReadError;
    if (!inventory) {
      const { error: inventoryError } = await supabase.from("inventory_items").insert({ product_id: productId, variant_id: null, quantity: 0 });
      if (inventoryError) throw inventoryError;
    }
    const imageStatus = await uploadImages(productId, product);
    results.push({ id: productId, internalId: product.internalId, imageStatus });
  }
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
