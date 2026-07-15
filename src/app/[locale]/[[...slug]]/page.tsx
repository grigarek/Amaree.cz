import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProductCard } from "@/components/shop/product-card";
import { AddToCartButton } from "@/components/shop/add-to-cart-button";
import { getLocalizedAlternates, isLocale, localizedPaths, locales, type Locale } from "@/i18n/routing";
import { categories, getCategoryByLocalizedSlug, getFeaturedProducts, getProductBySlug, getProductsByCategory, getRecommendedProducts } from "@/lib/products";
import { formatMoney } from "@/lib/money";

type PageParams = {
  locale: string;
  slug?: string[];
};

const heroImage =
  "https://364fec5f17.cbaul-cdnwnd.com/a801b254206739e67b9c214cc417d27e/200000023-3c90a3c90c/700/ChatGPT%20Image%2016.%204.%202026%2021_22_44.webp?ph=364fec5f17";

const aboutImage = "https://duyn491kcolsw.cloudfront.net/files/2d/2dc/700/2dc4zl.jpg?ph=364fec5f17";

export function generateStaticParams() {
  const paths = locales.flatMap((locale) => [
    { locale, slug: undefined },
    { locale, slug: localizedPaths[locale].collection.split("/").slice(2) },
    { locale, slug: localizedPaths[locale].about.split("/").slice(2) },
    { locale, slug: localizedPaths[locale].inspiration.split("/").slice(2) },
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
  const product = getProductBySlug(slug[1] ?? "");
  const category = routeCategory(locale, path, slug[1]);
  const pageTitle = getPageTitle(locale, path, product?.name[locale], category?.name[locale]);
  const description = product?.shortDescription[locale] ?? category?.description[locale] ?? getPageDescription(locale);

  return {
    title: slug.length === 0 ? { absolute: "A M A R É E" } : pageTitle,
    description,
    alternates: {
      canonical: path,
      languages: getLocalizedAlternates(path)
    },
    openGraph: {
      url: new URL(path, siteUrl).toString(),
      title: pageTitle,
      description,
      images: product?.images[0]?.url ? [product.images[0].url] : [heroImage]
    }
  };
}

function routeCategory(locale: Locale, path: string, categorySlug?: string) {
  return path.startsWith(`${localizedPaths[locale].collection}/`)
    ? getCategoryByLocalizedSlug(locale, categorySlug)
    : undefined;
}

function getPageTitle(locale: Locale, path: string, productName?: string, categoryName?: string) {
  if (productName) return productName;
  if (categoryName) return categoryName;

  const titles: Record<Locale, Partial<Record<keyof (typeof localizedPaths)[Locale], string>>> = {
    cs: { home: "A M A R É E", collection: "Kolekce", about: "O nás", inspiration: "Inspirace", contact: "Kontakt", cart: "Košík", checkout: "Objednávka", thankYou: "Děkujeme za objednávku", terms: "Obchodní podmínky", privacy: "Ochrana osobních údajů", returns: "Reklamace a vrácení", shipping: "Doprava a platba", care: "Péče o šperky" },
    en: { home: "A M A R É E", collection: "Collection", about: "About Us", inspiration: "Inspiration", contact: "Contact", cart: "Cart", checkout: "Checkout", thankYou: "Thank you for your order", terms: "Terms and Conditions", privacy: "Privacy Policy", returns: "Returns and Complaints", shipping: "Shipping and Payment", care: "Jewelry Care" },
    de: { home: "A M A R É E", collection: "Kollektion", about: "Über uns", inspiration: "Inspiration", contact: "Kontakt", cart: "Warenkorb", checkout: "Bestellung", thankYou: "Vielen Dank für Ihre Bestellung", terms: "Geschäftsbedingungen", privacy: "Datenschutz", returns: "Reklamation und Rückgabe", shipping: "Versand und Zahlung", care: "Schmuckpflege" }
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

export default async function LocalizedPage({ params }: { params: Promise<PageParams> }) {
  const { locale, slug = [] } = await params;
  if (!isLocale(locale)) notFound();
  const route = `/${locale}${slug.length ? `/${slug.join("/")}` : ""}`;

  if (slug.length === 0) return <HomePage locale={locale} />;
  if (route === localizedPaths[locale].collection) return <CollectionPage locale={locale} />;
  if (route.startsWith(`${localizedPaths[locale].collection}/`)) return <CollectionPage locale={locale} categorySlug={slug[1]} />;
  if (route.startsWith(`${localizedPaths[locale].product}/`)) return <ProductPage locale={locale} slug={slug[1]} />;
  if (route === localizedPaths[locale].about) return <AboutPage locale={locale} />;
  if (route === localizedPaths[locale].inspiration) return <InspirationPage locale={locale} />;
  if (route === localizedPaths[locale].contact) return <ContactPage locale={locale} />;
  if (route === localizedPaths[locale].cart) return <CartPage locale={locale} />;
  if (route === localizedPaths[locale].checkout) return <CheckoutPage locale={locale} />;
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
  const featured = getFeaturedProducts();

  return (
    <>
      <section className="page-shell grid min-h-[calc(100vh-112px)] items-center gap-10 py-10 md:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="amaree-subtitle">{t("brand.est")}</p>
          <h1 className="amaree-h1 mt-4">{t("brand.claim")}</h1>
          <p className="amaree-body mt-6 max-w-xl">{t("brand.intro")}</p>
          <Link href={localizedPaths[locale].collection} className="mt-8 inline-block rounded-brand bg-ruby px-6 py-3 font-redhat text-sm font-semibold text-white">
            {t("home.cta")}
          </Link>
        </div>
        <div className="relative min-h-[54vh] overflow-hidden rounded-brand bg-blush">
          <Image src={heroImage} alt="AMARÉE editoriální fotografie šperků" fill priority sizes="(min-width: 768px) 55vw, 90vw" className="object-cover" />
        </div>
      </section>
      <section className="border-y border-line bg-white">
        <div className="page-shell grid grid-cols-2 gap-4 py-6 md:grid-cols-4">
          {t.raw("home.benefits").map((benefit: string) => (
            <div key={benefit} className="amaree-ui text-center text-ruby">
              {benefit}
            </div>
          ))}
        </div>
      </section>
      <section className="page-shell py-20">
        <h2 className="amaree-h2">{t("home.categoriesTitle")}</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {categories.map((category) => (
            <Link key={category.id} href={`${localizedPaths[locale].category}/${category.localizedSlug[locale]}`} className="group rounded-brand border border-line bg-white p-6 transition hover:shadow-soft">
              <span className="amaree-subtitle">{category.name[locale]}</span>
              <p className="amaree-body mt-8">{category.description[locale]}</p>
            </Link>
          ))}
        </div>
      </section>
      <section className="page-shell py-10">
        <div className="flex items-end justify-between gap-6">
          <h2 className="amaree-h2">{t("home.bestsellers")}</h2>
          <Link className="amaree-ui text-ruby" href={localizedPaths[locale].collection}>
            {t("home.cta")}
          </Link>
        </div>
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} locale={locale} />
          ))}
        </div>
      </section>
      <section className="mt-16 bg-blush py-20">
        <div className="page-shell grid items-center gap-10 md:grid-cols-2">
          <div className="relative aspect-[4/5] overflow-hidden rounded-brand">
            <Image src={aboutImage} alt="AMARÉE příběh značky" fill sizes="(min-width: 768px) 45vw, 90vw" className="object-cover" />
          </div>
          <div>
            <p className="amaree-subtitle">{t("home.storyTitle")}</p>
            <AboutCopy locale={locale} />
          </div>
        </div>
      </section>
      <section className="page-shell py-20">
        <div className="rounded-brand bg-rubyDark p-8 text-white md:p-12">
          <p className="font-redhat text-sm font-semibold uppercase tracking-[0.18em]">{t("home.campaign")}</p>
          <h2 className="mt-4 font-newsreader text-4xl md:text-6xl">{t("home.campaignText")}</h2>
        </div>
      </section>
      <Newsletter locale={locale} />
    </>
  );
}

async function CollectionPage({ locale, categorySlug }: { locale: Locale; categorySlug?: string }) {
  const t = await getTranslations("collection");
  const category = getCategoryByLocalizedSlug(locale, categorySlug);
  const products = getProductsByCategory(category?.slug);

  return (
    <section className="page-shell py-12">
      <p className="amaree-subtitle">{t("all")}</p>
      <h1 className="amaree-h1 mt-3">{category?.name[locale] ?? t("title")}</h1>
      <div className="mt-8 grid gap-4 border-y border-line py-5 md:grid-cols-4">
        <label className="amaree-ui">
          {t("filter")}
          <select className="mt-2 w-full rounded-brand border border-line bg-white px-3 py-3" name="category">
            <option>{t("all")}</option>
            {categories.map((item) => (
              <option key={item.id}>{item.name[locale]}</option>
            ))}
          </select>
        </label>
        <label className="amaree-ui">
          {t("availability")}
          <select className="mt-2 w-full rounded-brand border border-line bg-white px-3 py-3" name="availability">
            <option>{t("inStock")}</option>
          </select>
        </label>
        <label className="amaree-ui">
          {t("price")}
          <input className="mt-2 w-full rounded-brand border border-line px-3 py-3" inputMode="numeric" name="priceRange" placeholder="0 - 5000 Kč" />
        </label>
        <label className="amaree-ui">
          {t("sort")}
          <select className="mt-2 w-full rounded-brand border border-line bg-white px-3 py-3" name="sort">
            <option>{t("newest")}</option>
            <option>{t("priceAsc")}</option>
            <option>{t("priceDesc")}</option>
          </select>
        </label>
      </div>
      {products.length ? (
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} locale={locale} />
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
  const product = slug ? getProductBySlug(slug) : undefined;
  if (!product) notFound();

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
      <div className="grid gap-10 md:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-4 md:grid-cols-2">
          {product.images.map((image, index) => (
            <div key={image.id} className="relative aspect-[4/5] overflow-hidden rounded-brand bg-blush">
              <Image
                src={image.url}
                alt={image.alt[locale]}
                fill
                loading={index === 0 ? "eager" : "lazy"}
                sizes="(min-width: 768px) 30vw, 90vw"
                className="object-cover"
              />
            </div>
          ))}
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
            <AddToCartButton productId={product.id} disabled={product.stockQuantity < 1} />
          </div>
          <div className="mt-10 grid gap-5 border-t border-line pt-8">
            <Info title={t("material")} body={product.material[locale]} />
            <Info title={t("dimensions")} body={product.dimensions[locale]} />
            <Info title={t("care")} body={product.care[locale]} />
            <Info title={t("shipping")} body={t("shippingBody")} />
            <Info title={t("returns")} body={t("returnsBody")} />
          </div>
        </div>
      </div>
      <h2 className="amaree-h2 mt-20">{t("recommended")}</h2>
      <div className="mt-8 grid gap-8 md:grid-cols-3">
        {getRecommendedProducts(product.id).map((item) => (
          <ProductCard key={item.id} product={item} locale={locale} />
        ))}
      </div>
    </section>
  );
}

function Info({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h2 className="amaree-ui text-ruby">{title}</h2>
      <p className="mt-1 font-redhat text-sm leading-6 text-muted">{body}</p>
    </div>
  );
}

function AboutCopy({ locale = "cs" }: { locale?: Locale }) {
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
      {copy[locale].map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </div>
  );
}

function AboutPage({ locale }: { locale: Locale }) {
  return (
    <section className="page-shell grid gap-10 py-12 md:grid-cols-2">
      <div>
        <p className="amaree-subtitle">A M A R É E</p>
        <h1 className="amaree-h1 mt-4">{locale === "cs" ? "O nás" : locale === "en" ? "About Us" : "Über uns"}</h1>
        <AboutCopy locale={locale} />
      </div>
      <div className="relative aspect-[4/5] overflow-hidden rounded-brand bg-blush">
        <Image src={aboutImage} alt="AMARÉE tým a detail" fill sizes="(min-width: 768px) 45vw, 90vw" className="object-cover" />
      </div>
    </section>
  );
}

function InspirationPage({ locale }: { locale: Locale }) {
  return (
    <section className="page-shell py-12">
      <h1 className="amaree-h1">{locale === "cs" ? "Inspirace" : "Inspiration"}</h1>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {getFeaturedProducts().map((product) => (
          <div key={product.id} className="rounded-brand border border-line bg-white p-5">
            <p className="amaree-subtitle">{product.name[locale]}</p>
            <p className="amaree-body mt-4">{product.shortDescription[locale]}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ContactPage({ locale }: { locale: Locale }) {
  const labels = {
    cs: { title: "Kontakt", message: "Zpráva", consent: "Souhlasím se zpracováním osobních údajů. TODO doplnit finální právní text.", send: "Odeslat", demo: "Demonstrační režim: formulář bude dostupný po bezpečném napojení e-mailové služby." },
    en: { title: "Contact", message: "Message", consent: "I agree to personal data processing. TODO add final legal copy.", send: "Send", demo: "Demo mode: the form will be available after the e-mail service is connected securely." },
    de: { title: "Kontakt", message: "Nachricht", consent: "Ich stimme der Verarbeitung personenbezogener Daten zu. TODO finalen Rechtstext ergänzen.", send: "Senden", demo: "Demo-Modus: Das Formular wird nach sicherer Anbindung des E-Mail-Dienstes verfügbar." }
  }[locale];

  return (
    <section className="page-shell grid gap-10 py-12 md:grid-cols-2">
      <div>
        <h1 className="amaree-h1">{labels.title}</h1>
        <div className="amaree-body mt-8 grid gap-3">
          <a href="mailto:info@amaree.cz">info@amaree.cz</a>
          <a href="tel:+420737076249">+420 737 076 249</a>
          <p>Příčná 129/3, Olomouc</p>
        </div>
      </div>
      <div aria-describedby="contact-demo-note" className="grid gap-4 rounded-brand border border-line bg-white p-6" role="group">
        <label className="sr-only" htmlFor="contact-email">E-mail</label>
        <input autoComplete="email" className="rounded-brand border border-line px-4 py-3" id="contact-email" name="email" placeholder="E-mail" type="email" />
        <label className="sr-only" htmlFor="contact-message">{labels.message}</label>
        <textarea className="min-h-36 rounded-brand border border-line px-4 py-3" id="contact-message" name="message" placeholder={labels.message} />
        <label className="flex gap-3 font-redhat text-sm text-muted">
          <input name="privacyConsent" required type="checkbox" />
          {labels.consent}
        </label>
        <p className="font-redhat text-sm text-muted" id="contact-demo-note">{labels.demo}</p>
        <button className="cursor-not-allowed rounded-brand bg-ruby px-5 py-3 font-redhat text-sm font-semibold text-white opacity-50" disabled type="button">{labels.send}</button>
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
      <div aria-describedby="checkout-provider-note" className="mt-10 grid gap-8 md:grid-cols-[1fr_360px]">
        <div className="grid gap-6">
          <fieldset className="rounded-brand border border-line bg-white p-6">
            <legend className="amaree-subtitle">{t("contact")}</legend>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="sr-only" htmlFor="checkout-email">{t("email")}</label>
              <input autoComplete="email" className="rounded-brand border border-line px-4 py-3" id="checkout-email" name="email" placeholder={t("email")} type="email" required />
              <label className="sr-only" htmlFor="checkout-phone">{t("phone")}</label>
              <input autoComplete="tel" className="rounded-brand border border-line px-4 py-3" id="checkout-phone" name="phone" placeholder={t("phone")} required />
              <label className="sr-only" htmlFor="checkout-name">{t("name")}</label>
              <input autoComplete="name" className="rounded-brand border border-line px-4 py-3 md:col-span-2" id="checkout-name" name="name" placeholder={t("name")} required />
            </div>
          </fieldset>
          <fieldset className="rounded-brand border border-line bg-white p-6">
            <legend className="amaree-subtitle">{t("shipping")}</legend>
            <div className="mt-5 grid gap-3 font-redhat text-sm">
              <label><input name="shipping" type="radio" value="zasilkovna" defaultChecked /> {t("packeta")}</label>
              <label><input name="shipping" type="radio" value="ppl" /> PPL</label>
              <label><input name="shipping" type="radio" value="pickup" /> {t("pickup")}</label>
            </div>
          </fieldset>
        </div>
        <aside className="rounded-brand border border-line bg-white p-6">
          <p className="amaree-subtitle">{t("payment")}</p>
          <p className="mt-4 font-redhat text-sm text-muted" id="checkout-provider-note">{t("providerNote")}</p>
          <button className="mt-6 w-full cursor-not-allowed rounded-brand bg-ruby px-5 py-3 font-redhat text-sm font-semibold text-white opacity-50" disabled type="button">{t("submit")}</button>
        </aside>
      </div>
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

async function LegalPage({ locale, route }: { locale: Locale; route: string }) {
  const t = await getTranslations({ locale, namespace: "legal" });

  return (
    <section className="page-shell py-12">
      <h1 className="amaree-h1">{t("title")}</h1>
      <div className="amaree-body mt-8 max-w-3xl">
        <p>{t("todo", { route })}</p>
        <p>{t("placeholder")}</p>
      </div>
    </section>
  );
}

async function Newsletter({ locale }: { locale: Locale }) {
  const t = await getTranslations("home");
  return (
    <section className="page-shell py-16">
      <div className="grid gap-6 border-y border-line py-10 md:grid-cols-[1fr_420px]">
        <div>
          <h2 className="amaree-h2">{t("newsletterTitle")}</h2>
          <p className="amaree-body mt-4">{t("newsletterText")}</p>
        </div>
        <div aria-describedby="newsletter-demo-note" className="flex flex-col gap-3 self-center sm:flex-row" role="group">
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
