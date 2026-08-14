import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { ArrowRight, BadgeInfo, Bell, Building2, CakeSlice, ChevronDown, Clock3, Copy, Crown, Gem, Gift, Heart, Landmark, Mail, MapPin, Phone, RotateCcw, Sparkles, Truck } from "lucide-react";
import { ProductCard } from "@/components/shop/product-card";
import { AddToCartButton } from "@/components/shop/add-to-cart-button";
import { ProductGallery } from "@/components/shop/product-gallery";
import { CheckoutExperience } from "@/components/checkout/checkout-experience";
import { ContactForm } from "@/components/site/contact-form";
import { NewsletterSignup } from "@/components/site/newsletter-signup";
import { enabledLocales, getLocalizedAlternates, isLocale, localizedPaths, type Locale } from "@/i18n/routing";
import {
  getCatalogCategories,
  getCatalogCategoryByLocalizedSlug,
  getCatalogCategoryBySlug,
  getCatalogProductAlternatePaths,
  getCatalogProductBySlug,
  getCatalogProducts,
  getRecommendedCatalogProducts,
  resolveCatalogProductByLocalizedSlug
} from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { company } from "@/lib/config/company";
import { getLegalPageContent, getLegalPageNavigation } from "@/lib/legal-pages";
import { getPaymentProvider } from "@/lib/payments";
import { GOPAY_TEST_COOKIE, isGoPayCheckoutAvailable } from "@/lib/payments/gopay-access";
import { getPacketaCodCapabilities } from "@/lib/admin/integration-settings";
import { getHallmarkSettings, isPublicHallmarkPageReady } from "@/lib/admin/hallmark-settings";
import { getStorefrontHeroSettings } from "@/lib/admin/storefront-hero";
import { getStorefrontContentSettings } from "@/lib/admin/storefront-content";
import { getCustomerLoyaltyOverview } from "@/lib/loyalty/customer";
import { getLoyaltySettings } from "@/lib/loyalty/settings";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type PageParams = {
  locale: string;
  slug?: string[];
};

const aboutImage = "/images/about/anette-founder-v4.png";
const benefitIcons = [Gem, Gift, RotateCcw, Truck] as const;
const newsletterIcons = [Sparkles, Bell, Heart] as const;

export function generateStaticParams() {
  const paths = enabledLocales.flatMap((locale) => [
    { locale, slug: undefined },
    { locale, slug: localizedPaths[locale].collection.split("/").slice(2) },
    { locale, slug: localizedPaths[locale].about.split("/").slice(2) },
    { locale, slug: localizedPaths[locale].faq.split("/").slice(2) },
    { locale, slug: localizedPaths[locale].contact.split("/").slice(2) },
    { locale, slug: localizedPaths[locale].cart.split("/").slice(2) },
    { locale, slug: localizedPaths[locale].checkout.split("/").slice(2) },
    { locale, slug: localizedPaths[locale].club.split("/").slice(2) },
    { locale, slug: localizedPaths[locale].hallmark.split("/").slice(2) }
  ]);

  return paths;
}

export async function generateMetadata({
  params
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, slug = [] } = await params;
  if (!isLocale(locale)) notFound();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const path = `/${locale}${slug.length ? `/${slug.join("/")}` : ""}`;
  const isProductRoute = path.startsWith(`${localizedPaths[locale].product}/`);
  const [product, category, hero] = await Promise.all([
    isProductRoute ? resolveCatalogProductByLocalizedSlug(locale, slug[1]) : getCatalogProductBySlug(locale, slug[1]),
    routeCategory(locale, path, slug[1]),
    getStorefrontHeroSettings()
  ]);
  const canonicalPath = isProductRoute && product ? `${localizedPaths[locale].product}/${product.slug}` : path;
  const pageTitle = getPageTitle(locale, path, product?.name[locale], category?.name[locale]);
  const description = product?.shortDescription[locale] ?? category?.description[locale] ?? getPageDescription(locale);
  const privatePaths = new Set<string>([localizedPaths[locale].cart, localizedPaths[locale].checkout, localizedPaths[locale].thankYou, localizedPaths[locale].account, localizedPaths[locale].login]);
  const localizedAlternates = product
    ? await getCatalogProductAlternatePaths(product.id)
    : getLocalizedAlternates(path);

  return {
    title: slug.length === 0
      ? { absolute: locale === "sk" ? "Strieborné šperky 925 pre každý deň | AMARÉE" : "Stříbrné šperky 925 pro každý den | AMARÉE" }
      : pageTitle,
    description,
    robots: privatePaths.has(path) ? { index: false, follow: false } : undefined,
    alternates: {
      canonical: canonicalPath,
      languages: {
        "cs-CZ": localizedAlternates.cs,
        "sk-SK": localizedAlternates.sk,
        "x-default": localizedAlternates.cs
      }
    },
    openGraph: {
      url: new URL(canonicalPath, siteUrl).toString(),
      title: pageTitle,
      description,
      images: product?.images[0]?.url ? [product.images[0].url] : [hero.activeImageUrl]
    }
  };
}

async function routeCategory(locale: Locale, path: string, categorySlug?: string) {
  return path.startsWith(`${localizedPaths[locale].collection}/`)
    ? getCatalogCategoryByLocalizedSlug(locale, categorySlug)
    : undefined;
}

function getPageTitle(locale: Locale, path: string, productName?: string, categoryName?: string) {
  if (productName) return productName;
  if (categoryName) return locale === "sk" ? `Strieborné ${categoryName.toLocaleLowerCase("sk")} 925` : `Stříbrné ${categoryName.toLocaleLowerCase("cs")} 925`;

  const titles: Record<Locale, Partial<Record<keyof (typeof localizedPaths)[Locale], string>>> = {
    cs: { home: "Stříbrné šperky 925", collection: "Dámské stříbrné šperky 925", about: "Příběh značky", faq: "Časté dotazy ke stříbrným šperkům", contact: "Kontakt", cart: "Košík", checkout: "Objednávka", thankYou: "Děkujeme za objednávku", terms: "Obchodní podmínky", privacy: "Ochrana osobních údajů", returns: "Výměna, vrácení a reklamace", shipping: "Doprava a platba", care: "Jak pečovat o stříbrné šperky", club: "AMARÉE Club", hallmark: "Puncovní informace", account: "Můj účet", login: "Přihlášení" },
    sk: { home: "Strieborné šperky 925", collection: "Dámske strieborné šperky 925", about: "Príbeh značky", faq: "Časté otázky o strieborných šperkoch", contact: "Kontakt", cart: "Košík", checkout: "Objednávka", thankYou: "Ďakujeme za objednávku", terms: "Obchodné podmienky", privacy: "Ochrana osobných údajov", returns: "Výmena, vrátenie a reklamácie", shipping: "Doprava a platba", care: "Ako sa starať o strieborné šperky", club: "AMARÉE Club", hallmark: "Puncové informácie", account: "Môj účet", login: "Prihlásenie" },
    en: { home: "A M A R É E", collection: "Jewelry", about: "About Us", faq: "FAQ", contact: "Contact", cart: "Cart", checkout: "Checkout", thankYou: "Thank you for your order", terms: "Terms and Conditions", privacy: "Privacy Policy", returns: "Returns and Complaints", shipping: "Shipping and Payment", care: "Jewelry Care", club: "AMARÉE Club", hallmark: "Hallmark information", account: "My account", login: "Sign in" },
    de: { home: "A M A R É E", collection: "Schmuck", about: "Über uns", faq: "Häufige Fragen", contact: "Kontakt", cart: "Warenkorb", checkout: "Bestellung", thankYou: "Vielen Dank für Ihre Bestellung", terms: "Geschäftsbedingungen", privacy: "Datenschutz", returns: "Umtausch, Rückgabe und Reklamation", shipping: "Versand und Zahlung", care: "Schmuckpflege", club: "AMARÉE Club", hallmark: "Punzierung", account: "Mein Konto", login: "Anmelden" }
  };
  const routeKey = Object.entries(localizedPaths[locale]).find(([, route]) => route === path)?.[0] as keyof (typeof localizedPaths)[Locale] | undefined;
  return (routeKey && titles[locale][routeKey]) || "A M A R É E";
}

function getPageDescription(locale: Locale) {
  return {
    cs: "Pečlivě vybrané stříbrné šperky z Olomouce od zakladatelky Anette.",
    sk: "Starostlivo vybrané strieborné šperky z Olomouca od zakladateľky Anette.",
    en: "Carefully selected silver jewelry from Olomouc by founder Anette.",
    de: "Sorgfältig ausgewählter Silberschmuck aus Olomouc von Gründerin Anette."
  }[locale];
}

function CategoryNavigation({
  locale,
  allLabel,
  activeCategory,
  categories
}: {
  locale: Locale;
  allLabel: string;
  activeCategory?: string;
  categories: Awaited<ReturnType<typeof getCatalogCategories>>;
}) {
  const linkClass = "inline-flex min-h-11 items-center justify-center rounded-brand border px-5 py-2 font-redhat text-sm font-semibold transition";
  const activeClass = "border-ruby bg-ruby text-white";
  const inactiveClass = "border-line bg-white text-ink hover:border-ruby hover:text-ruby";

  return (
    <nav aria-label={allLabel} className="flex flex-wrap justify-center gap-2">
      <Link
        href={localizedPaths[locale].collection}
        className={`${linkClass} ${activeCategory ? inactiveClass : activeClass}`}
      >
        {allLabel}
      </Link>
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`${localizedPaths[locale].category}/${category.localizedSlug[locale]}`}
          className={`${linkClass} ${activeCategory === category.slug ? activeClass : inactiveClass}`}
        >
          {category.name[locale]}
        </Link>
      ))}
    </nav>
  );
}

export default async function LocalizedPage({
  params,
  searchParams
}: {
  params: Promise<PageParams>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, slug = [] } = await params;
  const query = await searchParams;
  if (!isLocale(locale)) notFound();
  const route = `/${locale}${slug.length ? `/${slug.join("/")}` : ""}`;

  if (slug.length === 0) return <HomePage locale={locale} />;
  if (route === localizedPaths[locale].collection) return <CollectionPage locale={locale} />;
  if (route.startsWith(`${localizedPaths[locale].collection}/`)) return <CollectionPage locale={locale} categorySlug={slug[1]} />;
  if (route.startsWith(`${localizedPaths[locale].product}/`)) return <ProductPage locale={locale} slug={slug[1]} />;
  if (route === localizedPaths[locale].about) return <AboutPage locale={locale} />;
  if (route === localizedPaths[locale].faq) return <FaqPage locale={locale} />;
  if (route === localizedPaths[locale].contact) return <ContactPage locale={locale} />;
  if (route === localizedPaths[locale].cart) return <CartPage locale={locale} />;
  if (route === localizedPaths[locale].checkout) return <CheckoutPage locale={locale} />;
  if (route === localizedPaths[locale].login) return <CustomerLoginPage locale={locale} query={query} />;
  if (route === localizedPaths[locale].account) return <CustomerAccountPage locale={locale} query={query} />;
  if (route === localizedPaths[locale].club) return <AmareeClubPage locale={locale} />;
  if (route === `${localizedPaths[locale].checkout}/vysledek`) {
    const paymentId = typeof query.paymentId === "string"
      ? query.paymentId
      : typeof query.id === "string"
        ? query.id
        : undefined;
    return <PaymentResultPage locale={locale} paymentId={paymentId} />;
  }
  if (route === localizedPaths[locale].thankYou) return <ThankYouPage locale={locale} />;
  if (route === localizedPaths[locale].hallmark) return <HallmarkInformationPage locale={locale} />;
  if (
    [
      localizedPaths[locale].terms,
      localizedPaths[locale].privacy,
      localizedPaths[locale].returns,
      localizedPaths[locale].shipping,
      localizedPaths[locale].care
    ].some((legalRoute) => legalRoute === route)
  ) {
    return <LegalPage locale={locale} route={route} />;
  }

  notFound();
}

function CustomerLoginPage({ locale, query }: { locale: Locale; query: Record<string, string | string[] | undefined> }) {
  const copy = {
    cs: { eyebrow: "AMARÉE Club", title: "Přihlášení k účtu", text: "Pošleme vám bezpečný přihlašovací odkaz. Před odesláním objednávky zůstaňte přihlášení, jinak se nákup do AMARÉE Clubu nezapočítá.", email: "E-mail", submit: "Poslat přihlašovací odkaz", sent: "Odkaz jsme odeslali. Zkontrolujte svou e-mailovou schránku.", error: "Odkaz se nepodařilo odeslat. Zkontrolujte e-mail a zkuste to znovu." },
    sk: { eyebrow: "AMARÉE Club", title: "Prihlásenie do účtu", text: "Pošleme vám bezpečný prihlasovací odkaz. Pred odoslaním objednávky zostaňte prihlásení, inak sa nákup do AMARÉE Clubu nezapočíta.", email: "E-mail", submit: "Poslať prihlasovací odkaz", sent: "Odkaz sme odoslali. Skontrolujte si doručenú poštu.", error: "Odkaz sa nepodarilo odoslať. Skontrolujte e-mail a skúste to znova." },
    en: { eyebrow: "AMARÉE Club", title: "Sign in", text: "We will email you a secure sign-in link. Stay signed in when placing the order, otherwise the purchase will not count towards AMARÉE Club.", email: "Email", submit: "Send sign-in link", sent: "The link has been sent. Please check your inbox.", error: "We could not send the link. Check your email and try again." },
    de: { eyebrow: "AMARÉE Club", title: "Anmelden", text: "Wir senden Ihnen einen sicheren Anmeldelink per E-Mail. Bleiben Sie beim Absenden der Bestellung angemeldet, sonst zählt der Einkauf nicht für den AMARÉE Club.", email: "E-Mail", submit: "Anmeldelink senden", sent: "Der Link wurde gesendet. Bitte prüfen Sie Ihren Posteingang.", error: "Der Link konnte nicht gesendet werden. Prüfen Sie Ihre E-Mail-Adresse und versuchen Sie es erneut." }
  }[locale];
  return <section className="page-shell py-14 md:py-20"><div className="mx-auto max-w-xl border border-line bg-white p-7 md:p-10"><p className="font-redhat text-sm font-semibold uppercase text-ruby">{copy.eyebrow}</p><h1 className="mt-3 font-newsreader text-5xl">{copy.title}</h1><p className="mt-4 font-redhat text-sm leading-6 text-muted">{copy.text}</p>{query.sent === "1" ? <p className="mt-6 border border-emerald-200 bg-emerald-50 p-4 font-redhat text-sm text-emerald-800" role="status">{copy.sent}</p> : null}{query.error ? <p className="mt-6 border border-red-200 bg-red-50 p-4 font-redhat text-sm text-red-800" role="alert">{copy.error}</p> : null}<form action="/api/customer/auth/magic-link" className="mt-7 grid gap-4" method="post"><input name="locale" type="hidden" value={locale} /><label className="grid gap-2 font-redhat text-sm font-semibold">{copy.email}<input autoComplete="email" className="min-h-12 border border-line px-4 outline-none focus:border-ruby" name="email" required type="email" /></label><button className="min-h-12 bg-ruby px-6 font-redhat text-sm font-semibold text-white" type="submit">{copy.submit}</button></form></div></section>;
}

async function AmareeClubPage({ locale }: { locale: Locale }) {
  const settings = await getLoyaltySettings();
  const currency = locale === "cs" ? "CZK" : "EUR";
  const threshold = currency === "CZK" ? settings.thresholdCzkMinor : settings.thresholdEurMinor;
  const minimumOrder = currency === "CZK" ? settings.minimumOrderCzkMinor : settings.minimumOrderEurMinor;
  const values = {
    reward: `${settings.rewardPercent} %`,
    threshold: formatMoney(threshold, locale, currency),
    minimum: formatMoney(minimumOrder, locale, currency),
    validity: String(settings.rewardValidDays),
    delay: String(settings.confirmationDelayDays),
    birthdayReward: `${settings.birthdayRewardPercent} %`,
    birthdayValidity: String(settings.birthdayRewardValidDays)
  };
  const copy = {
    cs: {
      title: "AMARÉE Club",
      intro: "Odměňujeme zákazníky, kteří se k našim šperkům rádi vracejí. Členství je bezplatné a přehled odměn najdete ve svém zákaznickém účtu.",
      accountRequired: "Důležité: před odesláním objednávky musíte být přihlášení ke svému zákaznickému účtu. Nákup bez přihlášení nelze do AMARÉE Clubu zpětně započítat.",
      active: "AMARÉE Club je aktivní.",
      inactive: "AMARÉE Club pro vás připravujeme. Do spuštění se nákupy ani odměny nezapočítávají.",
      howTitle: "Jak Club funguje",
      how: [
        `Po doručených nákupech v celkové hodnotě ${values.threshold} získáte jednorázovou slevu ${values.reward} na další objednávku.`,
        `Odměnu lze použít na objednávku zboží alespoň za ${values.minimum}. Do této částky se nezapočítává doprava ani případné poplatky.`,
        `Voucher platí ${values.validity} dní, je určen pouze majiteli zákaznického účtu a lze jej využít jednou.`,
        "V jedné objednávce lze použít pouze jeden slevový kód; klubové a jiné slevy se nesčítají."
      ],
      countedTitle: "Které nákupy se započítávají",
      counted: [
        "Započítává se hodnota zboží po odečtení slev, bez dopravy a platebních poplatků.",
        `Nákup se do Clubu připíše ${values.delay} dní po doručení, pokud objednávka nebyla vrácena nebo zrušena.`,
        "Započítají se pouze objednávky odeslané během přihlášení ke stejnému zákaznickému účtu."
      ],
      birthdayTitle: "Narozeninová odměna",
      birthday: settings.birthdayRewardEnabled
        ? `Po prvním potvrzeném nákupu vám v den narozenin připravíme jednorázový voucher ${values.birthdayReward}. Platí ${values.birthdayValidity} dní. Ukládáme pouze den a měsíc narození, nikoli rok.`
        : "Narozeninová odměna momentálně není aktivní.",
      returnsTitle: "Vrácení zboží a zrušené objednávky",
      returns: "Vrácené, stornované nebo plně refundované nákupy nezakládají nárok na odměnu. Pokud už byly započítány, může AMARÉE odpovídající body nebo nevyužitou odměnu odečíst či zrušit.",
      accountTitle: "Zákaznický účet",
      account: "Přihlášení probíhá bezpečným odkazem zaslaným na e-mail. V účtu uvidíte objednávky, započítanou hodnotu i dostupné vouchery. Členství můžete kdykoli přestat využívat; s žádostí o zrušení účtu nám napište.",
      changesTitle: "Změny programu",
      changes: "AMARÉE může pravidla programu do budoucna přiměřeně upravit nebo program ukončit. Změna se nedotkne již vydaného voucheru před koncem jeho uvedené platnosti, není-li nutná kvůli zneužití nebo právní povinnosti.",
      cta: "Přejít do mého účtu"
    },
    sk: {
      title: "AMARÉE Club",
      intro: "Odmeňujeme zákazníkov, ktorí sa k našim šperkom radi vracajú. Členstvo je bezplatné a prehľad odmien nájdete vo svojom zákazníckom účte.",
      accountRequired: "Dôležité: pred odoslaním objednávky musíte byť prihlásení do svojho zákazníckeho účtu. Nákup bez prihlásenia nemožno do AMARÉE Clubu spätne započítať.",
      active: "AMARÉE Club je aktívny.", inactive: "AMARÉE Club pre vás pripravujeme. Do spustenia sa nákupy ani odmeny nezapočítavajú.",
      howTitle: "Ako Club funguje",
      how: [`Po doručených nákupoch v celkovej hodnote ${values.threshold} získate jednorazovú zľavu ${values.reward} na ďalšiu objednávku.`, `Odmenu možno použiť na objednávku tovaru aspoň za ${values.minimum}. Doprava a poplatky sa nezapočítavajú.`, `Voucher platí ${values.validity} dní, patrí iba majiteľovi účtu a možno ho použiť raz.`, "V jednej objednávke možno použiť iba jeden zľavový kód; zľavy sa nesčítavajú."],
      countedTitle: "Ktoré nákupy sa započítavajú", counted: ["Započítava sa hodnota tovaru po odpočítaní zliav, bez dopravy a poplatkov.", `Nákup sa pripíše ${values.delay} dní po doručení, ak nebol vrátený alebo zrušený.`, "Započítajú sa iba objednávky odoslané počas prihlásenia do rovnakého zákazníckeho účtu."],
      birthdayTitle: "Narodeninová odmena", birthday: settings.birthdayRewardEnabled ? `Po prvom potvrdenom nákupe vám v deň narodenín pripravíme jednorazový voucher ${values.birthdayReward}. Platí ${values.birthdayValidity} dní. Ukladáme iba deň a mesiac narodenia.` : "Narodeninová odmena momentálne nie je aktívna.",
      returnsTitle: "Vrátenie tovaru a zrušené objednávky", returns: "Vrátené, zrušené alebo plne refundované nákupy nezakladajú nárok na odmenu. Už pripísanú hodnotu alebo nevyužitú odmenu možno zodpovedajúcim spôsobom zrušiť.",
      accountTitle: "Zákaznícky účet", account: "Prihlásenie prebieha bezpečným odkazom zaslaným na e-mail. V účte uvidíte objednávky, započítanú hodnotu aj dostupné vouchery.",
      changesTitle: "Zmeny programu", changes: "AMARÉE môže pravidlá primerane upraviť alebo program ukončiť. Už vydaný voucher zostáva platný do uvedeného dátumu, ak nejde o zneužitie alebo právnu povinnosť.", cta: "Prejsť do môjho účtu"
    },
    en: {
      title: "AMARÉE Club", intro: "We reward customers who return to our jewelry. Membership is free and rewards are available in your customer account.", accountRequired: "Important: you must be signed in to your customer account when submitting the order. A guest purchase cannot be credited to AMARÉE Club afterwards.", active: "AMARÉE Club is active.", inactive: "AMARÉE Club is being prepared. Purchases and rewards are not collected before launch.", howTitle: "How it works", how: [`After delivered purchases totaling ${values.threshold}, you receive a one-time ${values.reward} discount for a future order.`, `The reward can be used on goods worth at least ${values.minimum}; delivery and fees are excluded.`, `The voucher is valid for ${values.validity} days, belongs to the account holder and can be used once.`, "Only one discount code can be used per order."], countedTitle: "Eligible purchases", counted: ["The value of goods after discounts is counted; delivery and fees are excluded.", `A purchase is credited ${values.delay} days after delivery if it has not been returned or cancelled.`, "Only orders submitted while signed in to the same customer account are eligible."], birthdayTitle: "Birthday reward", birthday: settings.birthdayRewardEnabled ? `After your first confirmed purchase, a one-time ${values.birthdayReward} voucher is issued on your birthday and remains valid for ${values.birthdayValidity} days. We store only the day and month.` : "The birthday reward is currently inactive.", returnsTitle: "Returns and cancellations", returns: "Returned, cancelled or fully refunded purchases do not qualify. Previously credited value or an unused reward may be reversed.", accountTitle: "Customer account", account: "Sign-in uses a secure link sent by email. Your orders, progress and vouchers are shown in the account.", changesTitle: "Programme changes", changes: "AMARÉE may reasonably amend or discontinue the programme. Already issued vouchers remain valid until their stated expiry unless misuse or a legal obligation requires otherwise.", cta: "Go to my account"
    },
    de: {
      title: "AMARÉE Club", intro: "Wir belohnen Kunden, die gerne zu unserem Schmuck zurückkehren. Die Mitgliedschaft ist kostenlos.", accountRequired: "Wichtig: Beim Absenden der Bestellung müssen Sie in Ihrem Kundenkonto angemeldet sein. Ein Gastkauf kann dem AMARÉE Club nicht nachträglich gutgeschrieben werden.", active: "Der AMARÉE Club ist aktiv.", inactive: "Der AMARÉE Club wird vorbereitet. Vor dem Start werden keine Einkäufe oder Prämien erfasst.", howTitle: "So funktioniert der Club", how: [`Nach zugestellten Einkäufen im Gesamtwert von ${values.threshold} erhalten Sie einmalig ${values.reward} Rabatt auf eine weitere Bestellung.`, `Die Prämie gilt ab einem Warenwert von ${values.minimum}; Versand und Gebühren zählen nicht.`, `Der Gutschein ist ${values.validity} Tage gültig, persönlich und einmalig nutzbar.`, "Pro Bestellung ist nur ein Rabattcode möglich."], countedTitle: "Berücksichtigte Einkäufe", counted: ["Berücksichtigt wird der Warenwert nach Rabatten, ohne Versand und Gebühren.", `Der Einkauf wird ${values.delay} Tage nach Zustellung gutgeschrieben, sofern er nicht retourniert oder storniert wurde.`, "Nur Bestellungen, die während der Anmeldung im selben Kundenkonto abgesendet wurden, werden berücksichtigt."], birthdayTitle: "Geburtstagsprämie", birthday: settings.birthdayRewardEnabled ? `Nach dem ersten bestätigten Einkauf erhalten Sie an Ihrem Geburtstag einmalig ${values.birthdayReward} Rabatt. Der Gutschein ist ${values.birthdayValidity} Tage gültig. Gespeichert werden nur Tag und Monat.` : "Die Geburtstagsprämie ist derzeit nicht aktiv.", returnsTitle: "Retouren und Stornierungen", returns: "Retournierte, stornierte oder vollständig erstattete Einkäufe begründen keinen Prämienanspruch. Bereits erfasste Werte oder ungenutzte Prämien können storniert werden.", accountTitle: "Kundenkonto", account: "Die Anmeldung erfolgt über einen sicheren Link per E-Mail. Im Konto sehen Sie Bestellungen, Fortschritt und Gutscheine.", changesTitle: "Programmänderungen", changes: "AMARÉE kann die Regeln angemessen ändern oder das Programm beenden. Bereits ausgestellte Gutscheine bleiben bis zum Ablauf gültig, sofern kein Missbrauch oder eine Rechtspflicht entgegensteht.", cta: "Zu meinem Konto"
    }
  }[locale];

  const clubEyebrow = {
    cs: "Věrnostní program",
    sk: "Vernostný program",
    en: "Loyalty programme",
    de: "Treueprogramm"
  }[locale];

  const sections = [
    { title: copy.howTitle, items: copy.how },
    { title: copy.countedTitle, items: copy.counted },
    { title: copy.birthdayTitle, paragraphs: [copy.birthday] },
    { title: copy.returnsTitle, paragraphs: [copy.returns] },
    { title: copy.accountTitle, paragraphs: [copy.account] },
    { title: copy.changesTitle, paragraphs: [copy.changes] }
  ];

  return <section className="page-shell py-10 md:py-14"><div className="mx-auto max-w-4xl"><p className="font-redhat text-sm font-semibold uppercase text-ruby">{clubEyebrow}</p><h1 className="mt-2 font-newsreader text-5xl leading-none text-ink md:text-6xl">{copy.title}</h1><p className="mt-5 max-w-3xl font-redhat text-base font-medium leading-7 text-muted">{copy.intro}</p><p className={`mt-7 border px-5 py-4 font-redhat text-sm font-semibold ${settings.enabled ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-line bg-blush text-ruby"}`}>{settings.enabled ? copy.active : copy.inactive}</p><p className="mt-4 border border-amber-300 bg-amber-50 px-5 py-4 font-redhat text-sm font-semibold leading-6 text-amber-950">{copy.accountRequired}</p><article className="mt-9 grid gap-8">{sections.map((section) => <section className="border-t border-line pt-7" key={section.title}><h2 className="font-newsreader text-3xl text-ink">{section.title}</h2>{section.items ? <ul className="mt-4 grid list-disc gap-2 pl-5 font-redhat text-base font-medium leading-7 text-muted">{section.items.map((item) => <li key={item}>{item}</li>)}</ul> : null}{section.paragraphs ? <div className="mt-4 grid gap-3 font-redhat text-base font-medium leading-7 text-muted">{section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div> : null}</section>)}</article><Link className="mt-10 inline-flex min-h-12 items-center justify-center bg-ruby px-7 font-redhat text-sm font-semibold text-white transition hover:bg-rubyDark" href={localizedPaths[locale].account}>{copy.cta}</Link></div></section>;
}

function CustomerBirthdayCard({
  day,
  locale,
  month,
  query,
  rewardPercent
}: {
  day: number | null;
  locale: Locale;
  month: number | null;
  query: Record<string, string | string[] | undefined>;
  rewardPercent: number;
}) {
  const copy = {
    cs: { title: "Narozeninová odměna", text: `Doplňte den a měsíc narození. Po prvním potvrzeném nákupu vám v den narozenin jednou ročně připravíme voucher ${rewardPercent} % na další objednávku.`, privacy: "Celé datum narození ani rok narození neukládáme.", day: "Den", month: "Měsíc", save: "Uložit narozeniny", saved: "Narozeniny byly bezpečně uloženy.", locked: "Narozeniny už jsou uložené. Pro opravu nám napište na info@amaree.cz.", invalid: "Zvolte platný den a měsíc.", value: "Uložené narozeniny" },
    sk: { title: "Narodeninová odmena", text: `Doplňte deň a mesiac narodenia. Po prvom potvrdenom nákupe vám v deň narodenín raz ročne pripravíme voucher ${rewardPercent} % na ďalšiu objednávku.`, privacy: "Celý dátum ani rok narodenia neukladáme.", day: "Deň", month: "Mesiac", save: "Uložiť narodeniny", saved: "Narodeniny boli bezpečne uložené.", locked: "Narodeniny sú už uložené. O opravu nás požiadajte na info@amaree.cz.", invalid: "Zvoľte platný deň a mesiac.", value: "Uložené narodeniny" },
    en: { title: "Birthday reward", text: `Add your birth day and month. After your first confirmed purchase, we will prepare a ${rewardPercent}% voucher on your birthday once a year.`, privacy: "We do not store your full date or year of birth.", day: "Day", month: "Month", save: "Save birthday", saved: "Your birthday has been saved securely.", locked: "Your birthday is already saved. Contact info@amaree.cz to correct it.", invalid: "Choose a valid day and month.", value: "Saved birthday" },
    de: { title: "Geburtstagsprämie", text: `Geben Sie Tag und Monat Ihres Geburtstags an. Nach dem ersten bestätigten Einkauf erhalten Sie einmal jährlich an Ihrem Geburtstag einen Gutschein über ${rewardPercent} %.`, privacy: "Das vollständige Geburtsdatum und Geburtsjahr speichern wir nicht.", day: "Tag", month: "Monat", save: "Geburtstag speichern", saved: "Ihr Geburtstag wurde sicher gespeichert.", locked: "Ihr Geburtstag ist bereits gespeichert. Änderungen sind über info@amaree.cz möglich.", invalid: "Wählen Sie einen gültigen Tag und Monat.", value: "Gespeicherter Geburtstag" }
  }[locale];
  const hasBirthday = Boolean(day && month);
  const error = query.birthday_error === "locked" ? copy.locked : query.birthday_error ? copy.invalid : null;
  return <section className="mt-8 border border-line bg-white p-6"><div className="flex items-start gap-3"><CakeSlice className="mt-1 shrink-0 text-ruby" size={22} /><div><h2 className="font-newsreader text-3xl">{copy.title}</h2><p className="mt-2 max-w-2xl font-redhat text-sm leading-6 text-muted">{copy.text}</p></div></div>{query.birthday_saved === "1" ? <p className="mt-5 border border-emerald-200 bg-emerald-50 p-3 font-redhat text-sm text-emerald-800" role="status">{copy.saved}</p> : null}{error ? <p className="mt-5 border border-red-200 bg-red-50 p-3 font-redhat text-sm text-red-800" role="alert">{error}</p> : null}{hasBirthday ? <p className="mt-5 font-redhat text-sm"><strong>{copy.value}:</strong> {day}. {month}.</p> : <form action="/api/customer/profile/birthday" className="mt-5 flex flex-wrap items-end gap-3" method="post"><input name="locale" type="hidden" value={locale} /><label className="grid gap-2 font-redhat text-sm font-semibold">{copy.day}<select className="min-h-11 min-w-28 border border-line bg-white px-3" name="day" required><option value="">—</option>{Array.from({ length: 31 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label className="grid gap-2 font-redhat text-sm font-semibold">{copy.month}<select className="min-h-11 min-w-28 border border-line bg-white px-3" name="month" required><option value="">—</option>{Array.from({ length: 12 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value}</option>)}</select></label><button className="min-h-11 bg-ruby px-5 font-redhat text-sm font-semibold text-white" type="submit">{copy.save}</button></form>}<p className="mt-3 font-redhat text-xs text-muted">{copy.privacy}</p></section>;
}

async function CustomerAccountPage({ locale, query }: { locale: Locale; query: Record<string, string | string[] | undefined> }) {
  const overview = await getCustomerLoyaltyOverview();
  if (!overview) redirect(localizedPaths[locale].login);
  const currency = locale === "cs" ? "CZK" : "EUR";
  const dateLocale = { cs: "cs-CZ", sk: "sk-SK", en: "en-GB", de: "de-DE" }[locale];
  const account = overview.accounts.find((item) => item.currency === currency);
  const threshold = currency === "EUR" ? overview.settings.thresholdEurMinor : overview.settings.thresholdCzkMinor;
  const progress = Number(account?.progress_minor ?? 0);
  const percentage = Math.min(100, Math.round((progress / threshold) * 100));
  const rewards = overview.rewards.filter((reward) => reward.currency === currency && reward.status === "available" && new Date(reward.expires_at) > new Date());
  const labels = {
    cs: { title: "Můj účet", progress: "Cesta k další odměně", earned: "Započítané nákupy", remaining: "Do odměny zbývá", rewards: "Dostupné odměny", empty: "Zatím nemáte dostupnou odměnu.", orders: "Moje objednávky", logout: "Odhlásit se", valid: "Platí do", minimum: "Minimální nákup", clubOff: "Věrnostní program je zatím vypnutý.", explanation: (amount: string, percent: number) => `Po nákupech za ${amount} získáte ${percent} % na jeden další nákup.` },
    sk: { title: "Môj účet", progress: "Cesta k ďalšej odmene", earned: "Započítané nákupy", remaining: "Do odmeny zostáva", rewards: "Dostupné odmeny", empty: "Zatiaľ nemáte dostupnú odmenu.", orders: "Moje objednávky", logout: "Odhlásiť sa", valid: "Platí do", minimum: "Minimálny nákup", clubOff: "Vernostný program je zatiaľ vypnutý.", explanation: (amount: string, percent: number) => `Po nákupoch za ${amount} získate ${percent} % na jeden ďalší nákup.` },
    en: { title: "My account", progress: "Progress to your next reward", earned: "Eligible purchases", remaining: "Remaining", rewards: "Available rewards", empty: "You do not have an available reward yet.", orders: "My orders", logout: "Sign out", valid: "Valid until", minimum: "Minimum purchase", clubOff: "The loyalty program is currently disabled.", explanation: (amount: string, percent: number) => `After ${amount} in purchases, you receive ${percent}% off one future purchase.` },
    de: { title: "Mein Konto", progress: "Fortschritt zur nächsten Prämie", earned: "Berücksichtigte Einkäufe", remaining: "Noch erforderlich", rewards: "Verfügbare Prämien", empty: "Sie haben derzeit keine verfügbare Prämie.", orders: "Meine Bestellungen", logout: "Abmelden", valid: "Gültig bis", minimum: "Mindestbestellwert", clubOff: "Das Treueprogramm ist derzeit deaktiviert.", explanation: (amount: string, percent: number) => `Nach Einkäufen im Wert von ${amount} erhalten Sie ${percent}% Rabatt auf einen weiteren Einkauf.` }
  }[locale];
  const statusLabels: Record<Locale, Record<string, string>> = {
    cs: { new: "Nová", awaiting_payment: "Čeká na platbu", paid: "Zaplacená", processing: "Zpracovává se", shipped: "Odeslaná", delivered: "Doručená", cancelled: "Zrušená", refunded: "Vrácená" },
    sk: { new: "Nová", awaiting_payment: "Čaká na platbu", paid: "Zaplatená", processing: "Spracúva sa", shipped: "Odoslaná", delivered: "Doručená", cancelled: "Zrušená", refunded: "Vrátená" },
    en: { new: "New", awaiting_payment: "Awaiting payment", paid: "Paid", processing: "Processing", shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled", refunded: "Refunded" },
    de: { new: "Neu", awaiting_payment: "Zahlung ausstehend", paid: "Bezahlt", processing: "In Bearbeitung", shipped: "Versendet", delivered: "Zugestellt", cancelled: "Storniert", refunded: "Erstattet" }
  };
  return <section className="page-shell py-12 md:py-16"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="font-redhat text-sm font-semibold uppercase text-ruby">AMARÉE Club</p><h1 className="mt-2 font-newsreader text-5xl">{labels.title}</h1><p className="mt-2 font-redhat text-sm text-muted">{overview.user.email}</p></div><form action="/api/customer/auth/logout" method="post"><input name="locale" type="hidden" value={locale} /><button className="min-h-11 border border-line px-5 font-redhat text-sm font-semibold hover:border-ruby" type="submit">{labels.logout}</button></form></div>{!overview.settings.enabled ? <p className="mt-8 border border-line bg-blush p-5 font-redhat text-sm">{labels.clubOff}</p> : <><div className="mt-8 grid gap-6 lg:grid-cols-2"><section className="border border-line bg-white p-6"><div className="flex items-center gap-3 text-ruby"><Crown size={22} /><h2 className="font-newsreader text-3xl">{labels.progress}</h2></div><div className="mt-6 h-2 overflow-hidden bg-blush"><div className="h-full bg-ruby" style={{ width: `${percentage}%` }} /></div><div className="mt-4 flex justify-between gap-4 font-redhat text-sm"><span>{labels.earned}: <strong>{formatMoney(progress, locale, currency)}</strong></span><span>{labels.remaining}: <strong>{formatMoney(Math.max(threshold - progress, 0), locale, currency)}</strong></span></div><p className="mt-4 font-redhat text-xs leading-5 text-muted">{labels.explanation(formatMoney(threshold, locale, currency), overview.settings.rewardPercent)}</p></section><section className="border border-line bg-white p-6"><h2 className="font-newsreader text-3xl">{labels.rewards}</h2><div className="mt-5 grid gap-3">{rewards.map((reward) => { const discount = reward.discount_codes as unknown as { code: string; minimum_order_minor: number } | null; return <div className="border border-line bg-blush/40 p-4" key={reward.id}><div className="flex items-center justify-between gap-3"><div><strong className="font-redhat text-lg text-ruby">{reward.reward_percent} %</strong>{reward.reward_type === "birthday" ? <p className="font-redhat text-xs font-semibold text-ruby">{locale === "sk" ? "Narodeninová odmena" : locale === "en" ? "Birthday reward" : locale === "de" ? "Geburtstagsprämie" : "Narozeninová odměna"}</p> : null}</div><span className="inline-flex items-center gap-2 font-mono text-sm"><Copy size={15} />{discount?.code}</span></div><p className="mt-2 font-redhat text-xs text-muted">{labels.valid}: {new Intl.DateTimeFormat(dateLocale).format(new Date(reward.expires_at))} · {labels.minimum}: {formatMoney(discount?.minimum_order_minor ?? 0, locale, currency)}</p></div>; })}{!rewards.length ? <p className="font-redhat text-sm text-muted">{labels.empty}</p> : null}</div></section></div>{overview.settings.birthdayRewardEnabled ? <CustomerBirthdayCard day={overview.profile?.birthday_day ?? null} locale={locale} month={overview.profile?.birthday_month ?? null} query={query} rewardPercent={overview.settings.birthdayRewardPercent} /> : null}</>}<section className="mt-8 border border-line bg-white"><div className="border-b border-line p-6"><h2 className="font-newsreader text-3xl">{labels.orders}</h2></div><div className="divide-y divide-line">{overview.orders.map((order) => <div className="flex flex-wrap items-center justify-between gap-3 p-5 font-redhat text-sm" key={order.id}><div><strong>{order.order_number}</strong><p className="mt-1 text-xs text-muted">{new Intl.DateTimeFormat(dateLocale).format(new Date(order.created_at))}</p></div><div className="text-right"><strong>{formatMoney(order.total_minor, locale, order.currency)}</strong><p className="mt-1 text-xs text-muted">{statusLabels[locale][order.status] ?? order.status}</p></div></div>)}</div></section></section>;
}

async function HallmarkInformationPage({ locale }: { locale: Locale }) {
  const settings = await getHallmarkSettings();
  if (!isPublicHallmarkPageReady(settings)) notFound();
  const labels = {
    cs: {
      title: "Puncovní informace",
      marks: "Současné české puncovní značky",
      registration: "Registrace provozovatele",
      registrationDate: "Datum registrace",
      registry: "Seznam registrovaných subjektů",
      source: "Oficiální přehled a vysvětlení značek na webu Puncovního úřadu",
      imageAlt: "Současné české puncovní značky pro zlato, stříbro a platinu"
    },
    sk: {
      title: "Puncové informácie",
      marks: "Súčasné české puncové značky",
      registration: "Registrácia prevádzkovateľa",
      registrationDate: "Dátum registrácie",
      registry: "Zoznam registrovaných subjektov",
      source: "Oficiálny prehľad a vysvetlenie značiek na webe Puncového úradu ČR",
      imageAlt: "Súčasné české puncové značky pre zlato, striebro a platinu"
    },
    en: {
      title: "Hallmark information",
      marks: "Current Czech hallmarks",
      registration: "Operator registration",
      registrationDate: "Registration date",
      registry: "Register of registered businesses",
      source: "Official hallmark overview and guidance from the Czech Assay Office",
      imageAlt: "Current Czech hallmarks for gold, silver and platinum"
    },
    de: {
      title: "Punzierung",
      marks: "Aktuelle tschechische Punzen",
      registration: "Registrierung des Betreibers",
      registrationDate: "Registrierungsdatum",
      registry: "Verzeichnis der registrierten Unternehmen",
      source: "Offizielle Übersicht und Erläuterung des tschechischen Punzierungsamts",
      imageAlt: "Aktuelle tschechische Punzen für Gold, Silber und Platin"
    }
  }[locale];
  const hallmarkImageUrl = settings.hallmarkImageUrl ?? "/legal/czech-hallmarks-current.jpg";
  return (
    <section className="page-shell py-12 md:py-16">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-newsreader text-5xl md:text-6xl">{labels.title}</h1>
        <div className="mt-8 whitespace-pre-line font-redhat text-base leading-8 text-ink">{settings.publicText}</div>
        {settings.assayOfficeRegistered ? (
          <div className="mt-10 border border-line bg-blush/40 p-6 md:p-8">
            <h2 className="font-newsreader text-3xl">{labels.registration}</h2>
            {settings.registrationNote ? <p className="mt-3 font-redhat text-sm leading-7">{settings.registrationNote}</p> : null}
            {settings.registrationDate ? <p className="mt-2 font-redhat text-sm"><strong>{labels.registrationDate}:</strong> {new Intl.DateTimeFormat(locale === "sk" ? "sk-SK" : "cs-CZ").format(new Date(`${settings.registrationDate}T00:00:00`))}</p> : null}
            {settings.registryUrl ? <a className="mt-4 inline-block font-redhat text-sm font-semibold text-ruby underline underline-offset-4" href={settings.registryUrl} rel="noreferrer" target="_blank">{labels.registry}</a> : null}
          </div>
        ) : null}
        <figure className="mt-10 border border-line bg-white p-4 md:p-7">
          <figcaption className="mb-5 font-redhat text-sm font-semibold text-ruby">{labels.marks}</figcaption>
          <Image alt={labels.imageAlt} className="mx-auto h-auto w-full max-w-[760px]" height={2419} src={hallmarkImageUrl} unoptimized={hallmarkImageUrl.startsWith("http")} width={1829} />
          <a className="mt-5 block font-redhat text-sm font-semibold text-ruby underline underline-offset-4" href="https://punc.gov.cz/puncovni-znacky-cz-soucasne/" rel="noreferrer" target="_blank">{labels.source}</a>
        </figure>
        <div className="mt-8 flex flex-wrap gap-5 font-redhat text-sm font-semibold">
          <a className="text-ruby underline underline-offset-4" href="https://punc.gov.cz/" rel="noreferrer" target="_blank">Puncovní úřad</a>
          {settings.publicDocumentUrl ? <a className="text-ruby underline underline-offset-4" href={settings.publicDocumentUrl} rel="noreferrer" target="_blank">{settings.publicDocumentFilename ?? "Veřejný dokument (PDF)"}</a> : null}
        </div>
      </div>
    </section>
  );
}

async function HomePage({ locale }: { locale: Locale }) {
  const t = await getTranslations();
  const [products, categories, hero, content] = await Promise.all([getCatalogProducts(locale), getCatalogCategories(), getStorefrontHeroSettings(), getStorefrontContentSettings()]);

  return (
    <>
      <section className="relative h-[70svh] min-h-[560px] max-h-[650px] overflow-hidden bg-ink md:h-[78svh] md:min-h-[640px] md:max-h-[820px]">
        <Image
          src={hero.activeImageUrl}
          alt={hero.alt[locale] || t("home.heroAlt")}
          fill
          priority
          quality={95}
          sizes="100vw"
          className="object-cover object-[51%_center] md:-scale-x-100 md:object-right"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-black/35 md:bg-[linear-gradient(90deg,rgba(0,0,0,0.52)_0%,rgba(0,0,0,0.24)_48%,rgba(0,0,0,0.08)_100%)]" />
        <div className="page-shell relative z-10 flex h-full items-end pb-6 pt-32 md:items-center md:pb-0 md:pt-20">
          <div className="max-w-[560px] text-white">
            <h1 className="max-w-[320px] font-newsreader text-[42px] leading-[1.02] text-white sm:max-w-none sm:text-6xl md:text-7xl">{content.heroClaim[locale]}</h1>
            <p className="mt-4 max-w-lg font-redhat text-[15px] font-medium leading-6 text-white/95 sm:mt-5 sm:text-base sm:leading-7 md:text-xl md:leading-8">{content.heroIntro[locale]}</p>
            <Link href={localizedPaths[locale].collection} className="mt-5 inline-flex min-h-14 items-center justify-center gap-3 rounded-brand bg-ruby px-8 py-4 font-redhat text-base font-semibold text-white shadow-soft transition hover:bg-rubyDark sm:mt-7">
              <span>{t("home.cta")}</span>
              <ArrowRight aria-hidden="true" size={18} strokeWidth={1.8} />
            </Link>
          </div>
        </div>
      </section>
      <section className="border-y border-line bg-white">
        <div className="page-shell grid grid-cols-2 gap-x-6 gap-y-6 py-7 md:grid-cols-4 md:py-9">
          {t.raw("home.benefits").map((benefit: string, index: number) => {
            const Icon = benefitIcons[index];
            return (
              <div key={benefit} className="flex min-h-12 items-center justify-center gap-4 text-center font-redhat text-base font-semibold">
                <Icon aria-hidden="true" className="shrink-0 text-ruby" size={26} strokeWidth={1.7} />
                <span className="text-ink">{benefit}</span>
              </div>
            );
          })}
        </div>
      </section>
      <section className="page-shell pb-16 pt-14 md:pb-20 md:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="amaree-h2 text-ruby">{t("home.categoriesTitle")}</h2>
          <p className="amaree-body mt-3">{t("home.categoriesSubtitle")}</p>
        </div>
        <div className="mt-7">
          <CategoryNavigation locale={locale} allLabel={t("collection.allShort")} categories={categories} />
        </div>
        <div className="mx-auto mt-10 grid max-w-6xl gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {products.slice(0, 6).map((product) => (
            <ProductCard key={product.id} product={product} locale={locale} compact />
          ))}
        </div>
      </section>
      <Newsletter locale={locale} />
    </>
  );
}

function FaqPage({ locale }: { locale: Locale }) {
  const copy = {
    cs: {
      title: "Často se ptáte",
      intro: "Stručné odpovědi před prvním nákupem.",
      items: [
        ["Z jakého materiálu jsou šperky AMARÉE?", "Aktuální nabídku tvoří stříbrné a pozlacené stříbrné šperky. Přesný materiál každého šperku najdete v jeho parametrech."],
        ["Kdy objednávku odešlete?", "Skladové produkty odesíláme zpravidla do 24 hodin v pracovní dny. Jakmile zásilku předáme Zásilkovně, pošleme vám odkaz pro sledování."],
        ["Je objednávka vhodná jako dárek?", "Ano. Šperky připravujeme v elegantním balení, které je vhodné také k darování."],
        ["Co když zvolím špatnou velikost?", "Rozměry a možnosti nastavení uvádíme u každého produktu. Pokud si nejste jistí, napište nám před objednáním; nepoužitý šperk lze vrátit podle podmínek do 30 dnů." ]
      ]
    },
    sk: {
      title: "Často sa pýtate",
      intro: "Stručné odpovede pred prvým nákupom.",
      items: [
        ["Z akého materiálu sú šperky AMARÉE?", "Aktuálnu ponuku tvoria strieborné a pozlátené strieborné šperky. Presný materiál každého šperku nájdete v jeho parametroch."],
        ["Kedy objednávku odošlete?", "Skladové produkty zvyčajne odosielame do 24 hodín v pracovné dni. Po odovzdaní Zásielkovni vám pošleme odkaz na sledovanie."],
        ["Je objednávka vhodná ako darček?", "Áno. Šperky pripravujeme v elegantnom balení vhodnom aj na darovanie."],
        ["Čo ak zvolím nesprávnu veľkosť?", "Rozmery a možnosti nastavenia uvádzame pri každom produkte. Ak si nie ste istí, napíšte nám pred objednaním." ]
      ]
    },
    en: {
      title: "Frequently asked questions",
      intro: "Clear answers before your first order.",
      items: [
        ["What are AMARÉE pieces made from?", "Our current selection consists of silver and gold-plated silver jewelry. The exact material is listed in each product's specifications."],
        ["When will my order be dispatched?", "In-stock products are usually dispatched within 24 hours on business days. We send tracking details once the parcel is handed to the carrier."],
        ["Is the order suitable as a gift?", "Yes. Jewelry is prepared in elegant packaging suitable for gifting."],
        ["What if I choose the wrong size?", "Dimensions and adjustment ranges are shown with each product. Contact us before ordering if you are unsure." ]
      ]
    },
    de: {
      title: "Häufige Fragen",
      intro: "Klare Antworten vor Ihrer ersten Bestellung.",
      items: [
        ["Aus welchem Material besteht AMARÉE Schmuck?", "Das aktuelle Sortiment besteht aus Silber und vergoldetem Silber. Das genaue Material finden Sie in den Produktparametern."],
        ["Wann wird meine Bestellung versendet?", "Vorrätige Produkte versenden wir an Werktagen in der Regel innerhalb von 24 Stunden. Die Sendungsverfolgung erhalten Sie nach Übergabe an den Versanddienstleister."],
        ["Eignet sich die Bestellung als Geschenk?", "Ja. Der Schmuck wird in einer eleganten, geschenktauglichen Verpackung vorbereitet."],
        ["Was passiert bei einer falschen Größe?", "Maße und Einstellmöglichkeiten stehen bei jedem Produkt. Kontaktieren Sie uns vor der Bestellung, wenn Sie unsicher sind." ]
      ]
    }
  }[locale];
  return <section className="page-shell py-12 md:py-16"><div className="mx-auto max-w-3xl text-center"><h1 className="amaree-h1 text-ruby">{copy.title}</h1><p className="amaree-body mt-3">{copy.intro}</p></div><div className="mx-auto mt-9 max-w-4xl">{copy.items.map(([question, answer], index) => <details className="group border-b border-line first:border-t" key={question} open={index === 0}><summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-redhat text-base font-semibold text-ink marker:content-none">{question}<ChevronDown aria-hidden="true" className="shrink-0 text-ruby transition group-open:rotate-180" size={20} strokeWidth={1.6} /></summary><p className="max-w-3xl pb-5 font-redhat text-sm leading-7 text-muted">{answer}</p></details>)}</div></section>;
}

async function CollectionPage({ locale, categorySlug }: { locale: Locale; categorySlug?: string }) {
  const t = await getTranslations("collection");
  const [category, categories] = await Promise.all([
    getCatalogCategoryByLocalizedSlug(locale, categorySlug),
    getCatalogCategories()
  ]);
  const products = (await getCatalogProducts(locale, category?.slug));

  return (
    <section className="page-shell py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: category?.name[locale] ?? t("title"),
        url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://amaree.cz"}${category ? `${localizedPaths[locale].collection}/${category.localizedSlug[locale]}` : localizedPaths[locale].collection}`,
        mainEntity: { "@type": "ItemList", itemListElement: products.map((product, index) => ({ "@type": "ListItem", position: index + 1, url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://amaree.cz"}${localizedPaths[locale].product}/${product.slug}`, name: product.name[locale] })) }
      }) }} />
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="amaree-h1 text-ruby">{category?.name[locale] ?? t("title")}</h1>
        <p className="amaree-body mt-3">{t("subtitle")}</p>
      </div>
      <div className="mt-8">
        <CategoryNavigation locale={locale} allLabel={t("allShort")} activeCategory={category?.slug} categories={categories} />
      </div>
      {products.length ? (
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} locale={locale} eager={index === 0} />
          ))}
        </div>
      ) : (
        <p className="amaree-body mt-12">{t("empty")}</p>
      )}
    </section>
  );
}

async function ProductPage({ locale, slug }: { locale: Locale; slug?: string }) {
  const t = await getTranslations("product");
  const product = await resolveCatalogProductByLocalizedSlug(locale, slug);
  if (!product) notFound();
  if (slug !== product.slug) permanentRedirect(`${localizedPaths[locale].product}/${product.slug}`);
  const category = await getCatalogCategoryBySlug(product.category);
  if (!category) notFound();
  const recommendedProducts = await getRecommendedCatalogProducts(locale, product.id);
  const isDemoProduct = product.id.startsWith("prod-");
  const parameters = [
    { label: t("category"), value: category.name[locale] },
    { label: t("material"), value: confirmedParameter(product.material[locale]) },
    { label: t("color"), value: confirmedParameter(product.color?.[locale]) },
    { label: t("dimensions"), value: confirmedParameter(product.dimensions[locale]) ?? t("notSpecified") },
    { label: t("clasp"), value: confirmedParameter(product.clasp?.[locale]) },
    {
      label: t("weight"),
      value: product.weightGrams
        ? `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(product.weightGrams)} g`
        : t("notSpecified")
    },
    { label: t("sku"), value: product.sku },
    { label: t("availability"), value: product.stockQuantity > 0 ? t("inStock") : t("soldOut") }
  ].filter((parameter): parameter is { label: string; value: string } => Boolean(parameter.value));

  return (
    <section className="page-shell py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "@id": `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://amaree.cz"}${localizedPaths[locale].product}/${product.slug}#product`,
            name: product.name[locale],
            image: product.images.map((image) => image.url),
            description: product.shortDescription[locale],
            sku: product.sku,
            brand: { "@type": "Brand", name: "AMARÉE" },
            category: category.name[locale],
            material: confirmedParameter(product.material[locale]),
            offers: {
              "@type": "Offer",
              url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://amaree.cz"}${localizedPaths[locale].product}/${product.slug}`,
              priceCurrency: product.currency,
              price: product.price / 100,
              availability: product.stockQuantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              itemCondition: "https://schema.org/NewCondition",
              seller: { "@type": "Organization", name: company.legalName }
            }
          })
        }}
      />
      <div className="grid items-start gap-10 md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <ProductGallery images={product.images} locale={locale} />
          <div className="mt-8 hidden border-t border-line md:block">
            <ProductInformation
              descriptionTitle={t("description")}
              description={product.longDescription[locale]}
              careTitle={t("care")}
              care={product.care[locale]}
              shippingTitle={t("shippingAndReturns")}
              shipping={`${t("shippingBody")} ${t("returnsBody")}`}
            />
          </div>
        </div>
        <div className="md:sticky md:top-28 md:self-start">
          {isDemoProduct ? <p className="amaree-subtitle">{t("demo")}</p> : null}
          <h1 className={`amaree-h1 ${isDemoProduct ? "mt-4" : ""}`}>{product.name[locale]}</h1>
          <p className="amaree-body mt-5">{product.shortDescription[locale]}</p>
          <div className="mt-6 flex items-center gap-3 font-redhat text-lg font-semibold">
            <span>{formatMoney(product.price, locale, product.currency)}</span>
            {product.originalPrice ? <span className="text-muted line-through">{formatMoney(product.originalPrice, locale, product.currency)}</span> : null}
          </div>
          <div className="mt-8">
            <AddToCartButton product={product} disabled={product.stockQuantity < 1} />
          </div>
          {product.stockQuantity > 0 ? <p className="mt-3 flex items-center gap-2 font-redhat text-sm text-muted"><Truck aria-hidden="true" className="text-ruby" size={18} strokeWidth={1.7} />{t("dispatch")}</p> : null}
          <div className="mt-10 border-t border-line pt-8">
            <h2 className="font-redhat text-sm font-semibold uppercase text-ruby">{t("parameters")}</h2>
            <dl className="mt-4 divide-y divide-line border-y border-line">
              {parameters.map((parameter) => (
                <div key={parameter.label} className="grid grid-cols-[minmax(7rem,0.7fr)_1.3fr] gap-4 py-3 font-redhat text-sm leading-6">
                  <dt className="text-muted">{parameter.label}</dt>
                  <dd className="text-ink">{parameter.value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-2 md:hidden">
              <ProductInformation
                descriptionTitle={t("description")}
                description={product.longDescription[locale]}
                careTitle={t("care")}
                care={product.care[locale]}
                shippingTitle={t("shippingAndReturns")}
                shipping={`${t("shippingBody")} ${t("returnsBody")}`}
              />
            </div>
          </div>
        </div>
      </div>
      <h2 className="amaree-h2 mt-20">{t("recommended")}</h2>
      <div className="mt-8 grid gap-8 md:grid-cols-3">
        {recommendedProducts.map((item) => (
          <ProductCard key={item.id} product={item} locale={locale} />
        ))}
      </div>
    </section>
  );
}

function confirmedParameter(value?: string) {
  const normalized = value?.trim().toLocaleLowerCase("cs") ?? "";
  if (!normalized) return undefined;
  if (/(čeká na potvrzení|bude doplněno|bude upřesněno|awaiting confirmation|to be confirmed|wird noch bestätigt|wird ergänzt|\btbd\b|\bn\/a\b)/i.test(normalized) || normalized === "-") {
    return undefined;
  }
  return value?.trim();
}

function ProductInformation({
  descriptionTitle,
  description,
  careTitle,
  care,
  shippingTitle,
  shipping
}: {
  descriptionTitle: string;
  description: string;
  careTitle: string;
  care: string;
  shippingTitle: string;
  shipping: string;
}) {
  return (
    <div>
      <ProductDisclosure title={descriptionTitle} body={description} defaultOpen />
      <ProductDisclosure title={careTitle} body={care} />
      <ProductDisclosure title={shippingTitle} body={shipping} />
    </div>
  );
}

function ProductDisclosure({ title, body, defaultOpen = false }: { title: string; body: string; defaultOpen?: boolean }) {
  return (
    <details className="group border-b border-line" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-redhat text-sm font-semibold text-ink marker:content-none">
        {title}
        <ChevronDown
          aria-hidden="true"
          className="shrink-0 text-ruby transition-transform duration-200 group-open:rotate-180"
          size={18}
          strokeWidth={1.6}
        />
      </summary>
      <p className="pb-5 font-redhat text-sm leading-6 text-muted">{body}</p>
    </details>
  );
}

function AboutCopy({ locale, paragraphs }: { locale: Locale; paragraphs: string[] }) {
  return (
    <div className="amaree-body mt-6 grid gap-5">
      {paragraphs.map((paragraph, index) => (
        <p
          className={index === 0 ? "font-semibold text-ink" : index === paragraphs.length - 1 ? "font-redhat font-bold text-ruby" : undefined}
          key={paragraph}
        >
          {paragraph}
        </p>
      ))}
    </div>
  );
}

async function AboutPage({ locale }: { locale: Locale }) {
  const content = await getStorefrontContentSettings();

  return (
    <section className="page-shell grid gap-8 py-10 md:grid-cols-2 md:gap-10 md:py-12">
      <div>
        <h1 className="amaree-h1">{locale === "cs" || locale === "sk" ? "O nás" : locale === "en" ? "About Us" : "Über uns"}</h1>
        <AboutCopy locale={locale} paragraphs={content.aboutParagraphs[locale]} />
      </div>
      <div className="relative aspect-[4/5] overflow-hidden rounded-brand bg-blush">
        <Image src={content.aboutImageUrl ?? aboutImage} alt={content.aboutImageAlt[locale]} fill priority sizes="(min-width: 768px) 45vw, 90vw" className="object-cover" unoptimized={Boolean(content.aboutImageUrl)} />
      </div>
    </section>
  );
}

async function ContactPage({ locale }: { locale: Locale }) {
  const content = await getStorefrontContentSettings();
  const labels = {
    cs: { title: "Kontakt", intro: "Máte dotaz k objednávce nebo našim šperkům? Napište nám nebo zavolejte.", company: "Firemní údaje", companyId: "IČO", vat: "Společnost není plátcem DPH.", bank: "Bankovní spojení", address: "Sídlo společnosti", addressNote: "Adresa neslouží jako prodejna ani výdejní místo.", contact: "Rychlý kontakt", hours: "Zákaznická podpora" },
    sk: { title: "Kontakt", intro: "Máte otázku k objednávke alebo našim šperkom? Napíšte nám alebo zavolajte.", company: "Firemné údaje", companyId: "IČO", vat: "Spoločnosť nie je platiteľom DPH.", bank: "Bankové spojenie", address: "Sídlo spoločnosti", addressNote: "Adresa neslúži ako predajňa ani výdajné miesto.", contact: "Rýchly kontakt", hours: "Zákaznícka podpora" },
    en: { title: "Contact", intro: "Have a question about an order or our jewelry? Send us an e-mail or call us.", company: "Company details", companyId: "Company ID", vat: "The company is not VAT registered.", bank: "Bank account", address: "Registered office", addressNote: "This address is not a shop or customer collection point.", contact: "Get in touch", hours: "Customer support" },
    de: { title: "Kontakt", intro: "Haben Sie eine Frage zu einer Bestellung oder zu unserem Schmuck? Schreiben Sie uns oder rufen Sie an.", company: "Unternehmensdaten", companyId: "Unternehmens-ID", vat: "Das Unternehmen ist nicht umsatzsteuerpflichtig.", bank: "Bankverbindung", address: "Unternehmenssitz", addressNote: "Diese Adresse ist weder Verkaufsstelle noch Abholort.", contact: "Direkter Kontakt", hours: "Kundenservice" }
  }[locale];
  const address = `${company.address.street}, ${company.address.district}, ${company.address.postalCode} ${company.address.city}`;

  return (
    <section className="page-shell py-10 md:py-12">
      <div className="max-w-3xl">
        <h1 className="amaree-h1">{labels.title}</h1>
        <p className="amaree-body mt-4">{labels.intro}</p>
      </div>
      <div className="mt-8 grid gap-10 border-y border-line py-8 md:grid-cols-2 md:gap-0">
        <div className="md:pr-12">
          <h2 className="font-redhat text-base font-bold text-ruby">{labels.company}</h2>
          <dl className="mt-6 grid gap-5 font-redhat text-sm leading-6 text-ink">
            <div className="flex items-start gap-3">
              <Building2 aria-hidden="true" className="mt-0.5 shrink-0 text-ruby" size={19} strokeWidth={1.7} />
              <div><dt className="sr-only">{labels.company}</dt><dd>{company.legalName}</dd></div>
            </div>
            <div className="flex items-start gap-3">
              <BadgeInfo aria-hidden="true" className="mt-0.5 shrink-0 text-ruby" size={19} strokeWidth={1.7} />
              <div><dt className="font-semibold">{labels.companyId}</dt><dd>{company.companyId}</dd><dd className="mt-1 text-sm text-muted">{labels.vat}</dd></div>
            </div>
            <div className="flex items-start gap-3">
              <Landmark aria-hidden="true" className="mt-0.5 shrink-0 text-ruby" size={19} strokeWidth={1.7} />
              <div><dt className="font-semibold">{labels.bank}</dt><dd>{company.bankAccount}</dd></div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin aria-hidden="true" className="mt-0.5 shrink-0 text-ruby" size={19} strokeWidth={1.7} />
              <div><dt className="font-semibold">{labels.address}</dt><dd>{address}</dd><dd className="mt-1 text-sm text-muted">{labels.addressNote}</dd></div>
            </div>
          </dl>
        </div>
        <div className="border-line md:border-l md:pl-12">
          <h2 className="font-redhat text-base font-bold text-ruby">{labels.contact}</h2>
          <div className="mt-6 grid gap-5 font-redhat text-sm leading-6 text-ink">
            <a className="flex items-center gap-3 transition hover:text-ruby" href={`mailto:${company.email}`}>
              <Mail aria-hidden="true" className="shrink-0 text-ruby" size={19} strokeWidth={1.7} />
              <span>{company.email}</span>
            </a>
            <a className="flex items-center gap-3 transition hover:text-ruby" href={`tel:${company.phone.replace(/\s/g, "")}`}>
              <Phone aria-hidden="true" className="shrink-0 text-ruby" size={19} strokeWidth={1.7} />
              <span>{company.phone}</span>
            </a>
            <div className="flex items-start gap-3">
              <Clock3 aria-hidden="true" className="mt-0.5 shrink-0 text-ruby" size={19} strokeWidth={1.7} />
              <div><p className="font-semibold">{labels.hours}</p><p className="mt-1 text-muted">{content.supportHours[locale]}</p></div>
            </div>
          </div>
        </div>
      </div>
      <ContactForm locale={locale} />
    </section>
  );
}

async function CartPage({ locale }: { locale: Locale }) {
  const t = await getTranslations("cart");
  return (
    <section className="page-shell py-12">
      <h1 className="amaree-h1">{t("title")}</h1>
      <p className="amaree-body mt-6">{locale === "sk" ? "Košík je dostupný ako vysúvací panel v pravej časti obrazovky." : "Košík je dostupný jako vysouvací panel v pravé části obrazovky."}</p>
      <Link href={localizedPaths[locale].collection} className="mt-8 inline-block rounded-brand bg-ruby px-6 py-3 font-redhat text-sm font-semibold text-white">
        {locale === "cs" ? "Pokračovat v nákupu" : locale === "sk" ? "Pokračovať v nákupe" : "Continue shopping"}
      </Link>
    </section>
  );
}

async function CheckoutPage({ locale }: { locale: Locale }) {
  const t = await getTranslations("checkout");
  const packetaCodCapabilities = await getPacketaCodCapabilities();
  const cookieStore = await cookies();
  const gopayEnabled = isGoPayCheckoutAvailable(cookieStore.get(GOPAY_TEST_COOKIE)?.value);
  return (
    <section className="page-shell py-12">
      <h1 className="amaree-h1">{t("title")}</h1>
      <CheckoutExperience gopayEnabled={gopayEnabled} locale={locale} packetaCodCapabilities={packetaCodCapabilities} />
    </section>
  );
}

async function ThankYouPage({ locale }: { locale: Locale }) {
  const t = await getTranslations("checkout");
  return (
    <section className="page-shell py-20">
      <h1 className="amaree-h1">{t("thankYou")}</h1>
      <p className="amaree-body mt-6">{t("confirmation")}</p>
      <Link href={localizedPaths[locale].collection} className="mt-8 inline-block rounded-brand bg-ruby px-6 py-3 font-redhat text-sm font-semibold text-white">
        {t("backToCollection")}
      </Link>
    </section>
  );
}

async function PaymentResultPage({ locale, paymentId }: { locale: Locale; paymentId?: string }) {
  let status = "unavailable";
  if (paymentId && /^\d+$/.test(paymentId)) {
    try {
      status = (await getPaymentProvider("gopay").getPaymentStatus(paymentId)).status;
    } catch {
      const { data } = await createSupabaseAdminClient()
        .from("payments")
        .select("status")
        .eq("provider", "gopay")
        .eq("provider_payment_id", paymentId)
        .maybeSingle();
      status = data?.status ?? "unavailable";
    }
  }
  const copy = {
    cs: {
      paid: ["Děkujeme za vaši objednávku", "Platba proběhla úspěšně. Potvrzení a podrobnosti objednávky jsme odeslali na váš e-mail."],
      pending: ["Platbu ověřujeme", "Aktualizace může trvat několik okamžiků. Potvrzení pošleme e-mailem."],
      failed: ["Platba se nezdařila", "Objednávka zůstává nezaplacená. Můžete nás kontaktovat nebo platbu zopakovat."],
      cancelled: ["Platba byla zrušena", "Objednávka nebyla zaplacena."],
      expired: ["Platnost platby vypršela", "Objednávka zůstává nezaplacená. Platbu můžete vytvořit znovu nebo nás kontaktovat."],
      refunded: ["Platba byla vrácena", "Částka byla vrácena prostřednictvím původní platební metody."],
      unavailable: ["Stav platby teď nelze ověřit", "Zkuste stránku později obnovit nebo nás kontaktujte."]
    },
    sk: {
      paid: ["Ďakujeme za vašu objednávku", "Platba prebehla úspešne. Potvrdenie a podrobnosti objednávky sme odoslali na váš e-mail."],
      pending: ["Platbu overujeme", "Aktualizácia môže trvať niekoľko okamihov. Potvrdenie pošleme e-mailom."],
      failed: ["Platba sa nepodarila", "Objednávka zostáva nezaplatená. Platbu môžete zopakovať alebo nás kontaktovať."],
      cancelled: ["Platba bola zrušená", "Objednávka nebola zaplatená."],
      expired: ["Platnosť platby vypršala", "Objednávka zostáva nezaplatená. Platbu môžete vytvoriť znova alebo nás kontaktovať."],
      refunded: ["Platba bola vrátená", "Suma bola vrátená prostredníctvom pôvodnej platobnej metódy."],
      unavailable: ["Stav platby teraz nemožno overiť", "Skúste stránku neskôr obnoviť alebo nás kontaktujte."]
    },
    en: {
      paid: ["Payment successful", "Thank you. We sent the order confirmation to your email."], pending: ["We are verifying the payment", "The update may take a moment."],
      failed: ["Payment failed", "The order remains unpaid."], cancelled: ["Payment cancelled", "The order was not paid."], expired: ["Payment expired", "The order remains unpaid."], refunded: ["Payment refunded", "The amount was returned to the original payment method."], unavailable: ["Payment status is unavailable", "Please try again later."]
    },
    de: {
      paid: ["Zahlung erfolgreich", "Vielen Dank. Die Bestätigung wurde per E-Mail versendet."], pending: ["Zahlung wird geprüft", "Die Aktualisierung kann einen Moment dauern."],
      failed: ["Zahlung fehlgeschlagen", "Die Bestellung ist noch unbezahlt."], cancelled: ["Zahlung storniert", "Die Bestellung wurde nicht bezahlt."], expired: ["Zahlung abgelaufen", "Die Bestellung ist noch unbezahlt."], refunded: ["Zahlung erstattet", "Der Betrag wurde über die ursprüngliche Zahlungsart zurückerstattet."], unavailable: ["Zahlungsstatus nicht verfügbar", "Bitte versuchen Sie es später erneut."]
    }
  } as const;
  const displayStatus = status === "paid" || status === "pending" || status === "failed" || status === "cancelled" || status === "expired" || status === "refunded" ? status : "unavailable";
  const [title, description] = copy[locale][displayStatus];
  return (
    <section className="page-shell py-20">
      <p className="amaree-subtitle text-ruby">GoPay</p>
      <h1 className="amaree-h1 mt-3">{title}</h1>
      <p className="amaree-body mt-6">{description}</p>
      <Link className="mt-8 inline-block rounded-brand bg-ruby px-6 py-3 font-redhat text-sm font-semibold text-white" href={localizedPaths[locale].collection}>{locale === "sk" ? "Späť k šperkom" : "Zpět ke šperkům"}</Link>
    </section>
  );
}

async function LegalPage({ locale, route }: { locale: Locale; route: string }) {
  const page = getLegalPageContent(locale, route);
  const navigation = getLegalPageNavigation(locale);
  const navigationLabel = locale === "cs" ? "Pro zákazníky" : locale === "sk" ? "Pre zákazníkov" : locale === "en" ? "Customer care" : "Kundenservice";

  return (
    <section className="page-shell py-8 md:py-10">
      <div className="max-w-4xl">
        <p className="amaree-subtitle text-ruby">{navigationLabel}</p>
        <h1 className="mt-2 font-newsreader text-5xl leading-[0.95] text-ink md:text-6xl">{page.title}</h1>
        <p className="mt-4 max-w-3xl font-redhat text-base font-medium leading-7 text-muted">{page.intro}</p>
      </div>
      <div className="mt-8 grid gap-8 lg:grid-cols-[250px_minmax(0,760px)] lg:items-start lg:gap-14">
        <aside className="lg:sticky lg:top-32">
          <nav aria-label={navigationLabel} className="grid gap-1 border-y border-line py-3">
            {navigation.map((item) => (
              <Link
                aria-current={item.href === route ? "page" : undefined}
                className={`rounded-brand px-3 py-3 font-redhat text-sm font-semibold transition ${item.href === route ? "bg-ruby text-white" : "text-ink hover:bg-blush hover:text-ruby"}`}
                href={item.href}
                key={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <article>
          {page.notice ? <p className="rounded-brand border border-line bg-blush px-5 py-4 font-redhat text-sm leading-6 text-ruby">{page.notice}</p> : null}
          <div className={`${page.notice ? "mt-7 " : ""}grid gap-7`}>
            {page.sections.map((section) => (
              <section className="border-t border-line pt-6 first:border-t-0 first:pt-0" key={section.title}>
                <h2 className="font-newsreader text-2xl leading-tight text-ink md:text-3xl">{section.title}</h2>
                {section.paragraphs?.length ? (
                  <div className="mt-3 grid gap-3 font-redhat text-base font-medium leading-7 text-muted">
                    {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  </div>
                ) : null}
                {section.items?.length ? (
                  <ul className="mt-3 grid list-disc gap-2 pl-5 font-redhat text-base font-medium leading-7 text-muted">
                    {section.items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                ) : null}
              </section>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

async function Newsletter({ locale }: { locale: Locale }) {
  const t = await getTranslations("home");
  return (
    <section className="page-shell pb-16 pt-12 md:pb-20 md:pt-16">
      <div className="mx-auto max-w-5xl text-center">
        <h2 className="mx-auto max-w-4xl font-newsreader text-3xl leading-tight text-ink sm:text-4xl md:text-5xl">
          <span>{t("newsletterTitleBefore")} </span>
          <span className="whitespace-nowrap text-ruby">{t("newsletterTitleBrand")}</span>
          {t("newsletterTitleAfter") ? <span> {t("newsletterTitleAfter")}</span> : null}
        </h2>
        <p className="amaree-body mx-auto mt-4 max-w-2xl">{t("newsletterText")}</p>
        <div className="mx-auto mt-8 grid max-w-4xl gap-y-5 sm:grid-cols-3">
          {t.raw("newsletterBenefits").map((benefit: string, index: number) => {
            const Icon = newsletterIcons[index];
            return (
              <div key={benefit} className={`flex items-center justify-center gap-3 px-4 ${index > 0 ? "sm:border-l sm:border-line" : ""}`}>
                <Icon aria-hidden="true" className="shrink-0 text-ruby" size={23} strokeWidth={1.6} />
                <span className="font-redhat text-sm font-semibold text-ink">{benefit}</span>
              </div>
            );
          })}
        </div>
        <NewsletterSignup locale={locale} />
      </div>
    </section>
  );
}
