import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowRight, BadgeInfo, Bell, Building2, ChevronDown, Gem, Gift, Heart, Landmark, Mail, MapPin, Phone, RotateCcw, Sparkles, Truck } from "lucide-react";
import { ProductCard } from "@/components/shop/product-card";
import { AddToCartButton } from "@/components/shop/add-to-cart-button";
import { CheckoutExperience } from "@/components/checkout/checkout-experience";
import { enabledLocales, isLocale, localizedPaths, type Locale } from "@/i18n/routing";
import {
  getCatalogCategories,
  getCatalogCategoryByLocalizedSlug,
  getCatalogCategoryBySlug,
  getCatalogProductBySlug,
  getCatalogProducts,
  getRecommendedCatalogProducts
} from "@/lib/catalog";
import { formatMoney } from "@/lib/money";
import { company } from "@/lib/config/company";
import { getLegalPageContent, getLegalPageNavigation } from "@/lib/legal-pages";
import { getPaymentProvider } from "@/lib/payments";

type PageParams = {
  locale: string;
  slug?: string[];
};

const heroImage = "/images/amaree-hero-lifestyle-v2.png";

const aboutImage = "/images/amaree-about-couple-web.jpg";
const benefitIcons = [Gem, Gift, RotateCcw, Truck] as const;
const newsletterIcons = [Sparkles, Bell, Heart] as const;

export function generateStaticParams() {
  const paths = enabledLocales.flatMap((locale) => [
    { locale, slug: undefined },
    { locale, slug: localizedPaths[locale].collection.split("/").slice(2) },
    { locale, slug: localizedPaths[locale].about.split("/").slice(2) },
    { locale, slug: localizedPaths[locale].contact.split("/").slice(2) },
    { locale, slug: localizedPaths[locale].cart.split("/").slice(2) },
    { locale, slug: localizedPaths[locale].checkout.split("/").slice(2) }
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
  const product = await getCatalogProductBySlug(locale, slug[1]);
  const category = await routeCategory(locale, path, slug[1]);
  const pageTitle = getPageTitle(locale, path, product?.name[locale], category?.name[locale]);
  const description = product?.shortDescription[locale] ?? category?.description[locale] ?? getPageDescription(locale);

  return {
    title: slug.length === 0 ? { absolute: "A M A R É E" } : pageTitle,
    description,
    alternates: {
      canonical: path
    },
    openGraph: {
      url: new URL(path, siteUrl).toString(),
      title: pageTitle,
      description,
      images: product?.images[0]?.url ? [product.images[0].url] : [heroImage]
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
  if (categoryName) return categoryName;

  const titles: Record<Locale, Partial<Record<keyof (typeof localizedPaths)[Locale], string>>> = {
    cs: { home: "A M A R É E", collection: "Šperky", about: "O nás", contact: "Kontakt", cart: "Košík", checkout: "Objednávka", thankYou: "Děkujeme za objednávku", terms: "Obchodní podmínky", privacy: "Ochrana osobních údajů", returns: "Výměna, vrácení a reklamace", shipping: "Doprava a platba", care: "Péče o šperky" },
    en: { home: "A M A R É E", collection: "Jewelry", about: "About Us", contact: "Contact", cart: "Cart", checkout: "Checkout", thankYou: "Thank you for your order", terms: "Terms and Conditions", privacy: "Privacy Policy", returns: "Returns and Complaints", shipping: "Shipping and Payment", care: "Jewelry Care" },
    de: { home: "A M A R É E", collection: "Schmuck", about: "Über uns", contact: "Kontakt", cart: "Warenkorb", checkout: "Bestellung", thankYou: "Vielen Dank für Ihre Bestellung", terms: "Geschäftsbedingungen", privacy: "Datenschutz", returns: "Umtausch, Rückgabe und Reklamation", shipping: "Versand und Zahlung", care: "Schmuckpflege" }
  };
  const routeKey = Object.entries(localizedPaths[locale]).find(([, route]) => route === path)?.[0] as keyof (typeof localizedPaths)[Locale] | undefined;
  return (routeKey && titles[locale][routeKey]) || "A M A R É E";
}

function getPageDescription(locale: Locale) {
  return {
    cs: "Minimalistická elegance, která podtrhne váš styl. Kvalitní materiály. Nadčasový design.",
    en: "Minimalist elegance that elevates your style. Quality materials. Timeless design.",
    de: "Minimalistische Eleganz, die Ihren Stil unterstreicht. Hochwertige Materialien. Zeitloses Design."
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
  if (route === localizedPaths[locale].contact) return <ContactPage locale={locale} />;
  if (route === localizedPaths[locale].cart) return <CartPage locale={locale} />;
  if (route === localizedPaths[locale].checkout) return <CheckoutPage locale={locale} />;
  if (route === `${localizedPaths[locale].checkout}/vysledek`) {
    return <PaymentResultPage locale={locale} paymentId={typeof query.id === "string" ? query.id : undefined} />;
  }
  if (route === localizedPaths[locale].thankYou) return <ThankYouPage locale={locale} />;
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

async function HomePage({ locale }: { locale: Locale }) {
  const t = await getTranslations();
  const [products, categories] = await Promise.all([getCatalogProducts(locale), getCatalogCategories()]);

  return (
    <>
      <section className="relative h-[76svh] min-h-[600px] max-h-[820px] overflow-hidden bg-ink md:h-[78svh] md:min-h-[640px]">
        <Image
          src={heroImage}
          alt={t("home.heroAlt")}
          fill
          priority
          quality={95}
          sizes="100vw"
          className="object-cover object-[67%_center] md:object-center"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-black/30 md:bg-black/20" />
        <div className="page-shell relative z-10 flex h-full items-end pb-14 pt-32 md:items-center md:pb-0 md:pt-20">
          <div className="max-w-[560px] text-white">
            <h1 className="font-newsreader text-5xl leading-[1.02] text-white sm:text-6xl md:text-7xl">{t("brand.claim")}</h1>
            <p className="mt-5 max-w-md font-cormorant text-xl leading-8 text-white/90 md:text-2xl">{t("brand.intro")}</p>
            <Link href={localizedPaths[locale].collection} className="mt-7 inline-flex min-h-14 items-center justify-center gap-3 rounded-brand bg-ruby px-8 py-4 font-redhat text-base font-semibold text-white shadow-soft transition hover:bg-rubyDark">
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
      <section className="bg-blush py-14 md:py-16">
        <div className="page-shell">
          <h2 className="text-center amaree-h2 text-ruby">{t("home.aboutTitle")}</h2>
          <div className="mt-9 grid items-center gap-10 md:grid-cols-[1.05fr_0.95fr] md:gap-14">
            <div className="relative aspect-[5/4] overflow-hidden rounded-brand">
              <Image src={aboutImage} alt={t("home.aboutAlt")} fill sizes="(min-width: 768px) 48vw, 90vw" className="object-cover object-[center_68%]" />
            </div>
            <div>
              <p className="amaree-subtitle">{t("home.storyTitle")}</p>
              <AboutCopy locale={locale} compact />
              <Link href={localizedPaths[locale].about} className="mt-7 inline-flex min-h-12 items-center gap-3 rounded-brand bg-ruby px-6 py-3 font-redhat text-sm font-semibold text-white transition hover:bg-rubyDark">
                <span>{t("home.aboutCta")}</span>
                <ArrowRight aria-hidden="true" size={17} strokeWidth={1.8} />
              </Link>
            </div>
          </div>
        </div>
      </section>
      <Newsletter locale={locale} />
    </>
  );
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
  const product = await getCatalogProductBySlug(locale, slug);
  if (!product) notFound();
  const category = await getCatalogCategoryBySlug(product.category);
  if (!category) notFound();
  const recommendedProducts = await getRecommendedCatalogProducts(locale, product.id);
  const parameters = [
    { label: t("category"), value: category.name[locale] },
    { label: t("material"), value: product.material[locale] },
    { label: t("color"), value: product.color?.[locale] },
    { label: t("dimensions"), value: product.dimensions[locale] },
    {
      label: t("weight"),
      value: product.weightGrams
        ? `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(product.weightGrams)} g`
        : undefined
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
            name: product.name[locale],
            image: product.images.map((image) => image.url),
            description: product.shortDescription[locale],
            sku: product.sku,
            offers: {
              "@type": "Offer",
              priceCurrency: product.currency,
              price: product.price / 100,
              availability: product.stockQuantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
            }
          })
        }}
      />
      <div className="grid items-start gap-10 md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="grid snap-x snap-mandatory auto-cols-[88%] grid-flow-col gap-3 overflow-x-auto overscroll-x-contain pb-2 md:grid-flow-row md:grid-cols-2 md:auto-cols-auto md:gap-4 md:overflow-visible md:pb-0">
            {product.images.map((image, index) => (
              <div key={image.id} className="relative aspect-[4/5] snap-start overflow-hidden rounded-brand bg-blush">
                <Image
                  src={image.url}
                  alt={image.alt[locale]}
                  fill
                  loading={index < 2 ? "eager" : "lazy"}
                  sizes="(min-width: 768px) 30vw, 90vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
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
          <p className="amaree-subtitle">{t("demo")}</p>
          <h1 className="amaree-h1 mt-4">{product.name[locale]}</h1>
          <p className="amaree-body mt-5">{product.shortDescription[locale]}</p>
          <div className="mt-6 flex items-center gap-3 font-redhat text-lg font-semibold">
            <span>{formatMoney(product.price, locale)}</span>
            {product.originalPrice ? <span className="text-muted line-through">{formatMoney(product.originalPrice, locale)}</span> : null}
          </div>
          <div className="mt-8">
            <AddToCartButton product={product} disabled={product.stockQuantity < 1} />
          </div>
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

function AboutCopy({ locale = "cs", compact = false }: { locale?: Locale; compact?: boolean }) {
  const copy = {
    cs: [
      "Amarée je rodinný projekt, který vznikl z přirozené blízkosti ke světu šperků.",
      "Naše ženy měly vždy cit pro eleganci a detail - a právě jejich vnímání stylu nás přivedlo k myšlence vytvořit vlastní značku.",
      "Chtěli jsme nabídnout šperky, které nejsou jen doplňkem, ale přirozenou součástí každodenního stylu.",
      "Věříme v jednoduchost, kvalitní materiály a nadčasový design, který vydrží.",
      "- Tým Amarée"
    ],
    en: [
      "Amarée is a family project born from a natural closeness to the world of jewelry.",
      "The women in our family have always had a feeling for elegance and detail, and their sense of style led us to create our own brand.",
      "We wanted to offer jewelry that is not only an accessory, but a natural part of everyday style.",
      "We believe in simplicity, quality materials and timeless design that lasts.",
      "- Team Amarée"
    ],
    de: [
      "Amarée ist ein Familienprojekt, entstanden aus einer natürlichen Nähe zur Welt des Schmucks.",
      "Die Frauen in unserer Familie hatten immer ein Gefühl für Eleganz und Detail, und genau ihr Stilverständnis brachte uns auf die Idee einer eigenen Marke.",
      "Wir wollten Schmuck anbieten, der nicht nur Accessoire ist, sondern ein natürlicher Teil des Alltagsstils.",
      "Wir glauben an Einfachheit, hochwertige Materialien und zeitloses Design, das bleibt.",
      "- Team Amarée"
    ]
  };

  return (
    <div className="amaree-body mt-6 grid gap-5">
      {(compact ? copy[locale].slice(0, 2) : copy[locale]).map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </div>
  );
}

function AboutPage({ locale }: { locale: Locale }) {
  const imageAlt = {
    cs: "Pár stojící za rodinnou značkou šperků AMARÉE",
    en: "The couple behind the AMARÉE family jewelry brand",
    de: "Das Paar hinter der Familienschmuckmarke AMARÉE"
  }[locale];

  return (
    <section className="page-shell grid gap-8 py-10 md:grid-cols-2 md:gap-10 md:py-12">
      <div>
        <h1 className="amaree-h1">{locale === "cs" ? "O nás" : locale === "en" ? "About Us" : "Über uns"}</h1>
        <AboutCopy locale={locale} />
      </div>
      <div className="relative aspect-[4/5] overflow-hidden rounded-brand bg-blush">
        <Image src={aboutImage} alt={imageAlt} fill sizes="(min-width: 768px) 45vw, 90vw" className="object-cover" />
      </div>
    </section>
  );
}

function ContactPage({ locale }: { locale: Locale }) {
  const labels = {
    cs: { title: "Kontakt", intro: "Máte dotaz k objednávce nebo našim šperkům? Napište nám nebo zavolejte.", company: "Firemní údaje", companyId: "IČO", bank: "Bankovní spojení", address: "Adresa", contact: "Rychlý kontakt", formTitle: "Napište nám", email: "E-mail", message: "Zpráva", consent: "Souhlasím se zpracováním osobních údajů.", send: "Odeslat zprávu", demo: "Odesílání formuláře spustíme po bezpečném napojení e-mailové služby." },
    en: { title: "Contact", intro: "Have a question about an order or our jewelry? Send us an e-mail or call us.", company: "Company details", companyId: "Company ID", bank: "Bank account", address: "Address", contact: "Get in touch", formTitle: "Send us a message", email: "E-mail", message: "Message", consent: "I agree to the processing of personal data.", send: "Send message", demo: "The form will be enabled once the e-mail service is connected securely." },
    de: { title: "Kontakt", intro: "Haben Sie eine Frage zu einer Bestellung oder zu unserem Schmuck? Schreiben Sie uns oder rufen Sie an.", company: "Unternehmensdaten", companyId: "Unternehmens-ID", bank: "Bankverbindung", address: "Adresse", contact: "Direkter Kontakt", formTitle: "Schreiben Sie uns", email: "E-Mail", message: "Nachricht", consent: "Ich stimme der Verarbeitung personenbezogener Daten zu.", send: "Nachricht senden", demo: "Das Formular wird nach sicherer Anbindung des E-Mail-Dienstes aktiviert." }
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
              <div><dt className="font-semibold">{labels.companyId}</dt><dd>{company.companyId}</dd></div>
            </div>
            <div className="flex items-start gap-3">
              <Landmark aria-hidden="true" className="mt-0.5 shrink-0 text-ruby" size={19} strokeWidth={1.7} />
              <div><dt className="font-semibold">{labels.bank}</dt><dd>{company.bankAccount}</dd></div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin aria-hidden="true" className="mt-0.5 shrink-0 text-ruby" size={19} strokeWidth={1.7} />
              <div><dt className="font-semibold">{labels.address}</dt><dd>{address}</dd></div>
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
            <a className="flex items-center gap-3 transition hover:text-ruby" href="tel:+420737076249">
              <Phone aria-hidden="true" className="shrink-0 text-ruby" size={19} strokeWidth={1.7} />
              <span>{company.phone}</span>
            </a>
          </div>
          <form aria-describedby="contact-form-note" className="mt-8 border-t border-line pt-8">
            <h2 className="font-redhat text-base font-bold text-ruby">{labels.formTitle}</h2>
            <div className="mt-5 grid gap-4">
              <label className="sr-only" htmlFor="contact-email">{labels.email}</label>
              <input autoComplete="email" className="min-h-12 rounded-brand border border-line bg-white px-4 font-redhat text-sm" id="contact-email" name="email" placeholder={labels.email} type="email" />
              <label className="sr-only" htmlFor="contact-message">{labels.message}</label>
              <textarea className="min-h-32 rounded-brand border border-line bg-white px-4 py-3 font-redhat text-sm" id="contact-message" name="message" placeholder={labels.message} />
              <label className="flex items-start gap-3 font-redhat text-sm leading-6 text-muted">
                <input className="mt-1" name="privacyConsent" required type="checkbox" />
                <span>{labels.consent}</span>
              </label>
              <p className="font-redhat text-sm leading-6 text-muted" id="contact-form-note">{labels.demo}</p>
              <button className="cursor-not-allowed rounded-brand bg-ruby px-5 py-3 font-redhat text-sm font-semibold text-white opacity-50" disabled type="button">{labels.send}</button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

async function CartPage({ locale }: { locale: Locale }) {
  const t = await getTranslations("cart");
  return (
    <section className="page-shell py-12">
      <h1 className="amaree-h1">{t("title")}</h1>
      <p className="amaree-body mt-6">Košík je dostupný jako vysouvací panel v pravé části obrazovky a data přepočítává serverová API vrstva.</p>
      <Link href={localizedPaths[locale].collection} className="mt-8 inline-block rounded-brand bg-ruby px-6 py-3 font-redhat text-sm font-semibold text-white">
        {locale === "cs" ? "Pokračovat v nákupu" : "Continue shopping"}
      </Link>
    </section>
  );
}

async function CheckoutPage({ locale }: { locale: Locale }) {
  const t = await getTranslations("checkout");
  return (
    <section className="page-shell py-12">
      <h1 className="amaree-h1">{t("title")}</h1>
      <CheckoutExperience locale={locale} />
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
      status = "unavailable";
    }
  }
  const copy = {
    cs: {
      paid: ["Platba proběhla úspěšně", "Děkujeme. Potvrzení objednávky jsme odeslali na váš e-mail."],
      pending: ["Platbu ověřujeme", "Aktualizace může trvat několik okamžiků. Potvrzení pošleme e-mailem."],
      failed: ["Platba se nezdařila", "Objednávka zůstává nezaplacená. Můžete nás kontaktovat nebo platbu zopakovat."],
      cancelled: ["Platba byla zrušena", "Objednávka nebyla zaplacena."],
      unavailable: ["Stav platby teď nelze ověřit", "Zkuste stránku později obnovit nebo nás kontaktujte."]
    },
    en: {
      paid: ["Payment successful", "Thank you. We sent the order confirmation to your email."], pending: ["We are verifying the payment", "The update may take a moment."],
      failed: ["Payment failed", "The order remains unpaid."], cancelled: ["Payment cancelled", "The order was not paid."], unavailable: ["Payment status is unavailable", "Please try again later."]
    },
    de: {
      paid: ["Zahlung erfolgreich", "Vielen Dank. Die Bestätigung wurde per E-Mail versendet."], pending: ["Zahlung wird geprüft", "Die Aktualisierung kann einen Moment dauern."],
      failed: ["Zahlung fehlgeschlagen", "Die Bestellung ist noch unbezahlt."], cancelled: ["Zahlung storniert", "Die Bestellung wurde nicht bezahlt."], unavailable: ["Zahlungsstatus nicht verfügbar", "Bitte versuchen Sie es später erneut."]
    }
  } as const;
  const displayStatus = status === "paid" || status === "pending" || status === "failed" || status === "cancelled" ? status : "unavailable";
  const [title, description] = copy[locale][displayStatus];
  return (
    <section className="page-shell py-20">
      <p className="amaree-subtitle text-ruby">GoPay</p>
      <h1 className="amaree-h1 mt-3">{title}</h1>
      <p className="amaree-body mt-6">{description}</p>
      <Link className="mt-8 inline-block rounded-brand bg-ruby px-6 py-3 font-redhat text-sm font-semibold text-white" href={localizedPaths[locale].collection}>Zpět ke šperkům</Link>
    </section>
  );
}

async function LegalPage({ locale, route }: { locale: Locale; route: string }) {
  const page = getLegalPageContent(locale, route);
  const navigation = getLegalPageNavigation(locale);
  const navigationLabel = locale === "cs" ? "Pro zákazníky" : locale === "en" ? "Customer care" : "Kundenservice";

  return (
    <section className="page-shell py-8 md:py-10">
      <div className="max-w-4xl">
        <p className="amaree-subtitle text-ruby">{navigationLabel}</p>
        <h1 className="mt-2 font-newsreader text-5xl leading-[0.95] text-ink md:text-6xl">{page.title}</h1>
        <p className="mt-4 max-w-3xl font-cormorant text-lg leading-7 text-muted">{page.intro}</p>
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
          <p className="rounded-brand border border-line bg-blush px-5 py-4 font-redhat text-sm leading-6 text-ruby">{page.notice}</p>
          <div className="mt-7 grid gap-7">
            {page.sections.map((section) => (
              <section className="border-t border-line pt-6 first:border-t-0 first:pt-0" key={section.title}>
                <h2 className="font-newsreader text-2xl leading-tight text-ink md:text-3xl">{section.title}</h2>
                {section.paragraphs?.length ? (
                  <div className="mt-3 grid gap-3 font-cormorant text-lg leading-7 text-muted">
                    {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  </div>
                ) : null}
                {section.items?.length ? (
                  <ul className="mt-3 grid list-disc gap-2 pl-5 font-cormorant text-base leading-7 text-muted">
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
        <div aria-describedby="newsletter-demo-note" className="mx-auto mt-9 flex max-w-xl flex-col gap-3 sm:flex-row" role="group">
          <label className="sr-only" htmlFor={`newsletter-email-${locale}`}>E-mail</label>
          <input autoComplete="email" className="min-h-12 flex-1 rounded-brand border border-line px-4" id={`newsletter-email-${locale}`} name="email" placeholder="E-mail" type="email" />
          <button className="cursor-not-allowed rounded-brand bg-ruby px-5 py-3 font-redhat text-sm font-semibold text-white opacity-50" disabled type="button">
            {t("subscribe")}
          </button>
          <span className="sr-only" id="newsletter-demo-note">{t("newsletterDemo")}</span>
        </div>
      </div>
    </section>
  );
}
