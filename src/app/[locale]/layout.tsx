import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { enabledLocales, isLocale, localizedPaths } from "@/i18n/routing";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { CookieConsent } from "@/components/site/cookie-consent";
import { DocumentLocale } from "@/components/site/document-locale";
import { CartHydrator } from "@/components/shop/cart-hydrator";
import { company } from "@/lib/config/company";

export function generateStaticParams() {
  return enabledLocales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const description = locale === "sk"
    ? "Nadčasové šperky, ktoré podčiarknu váš štýl. Kvalitné materiály a jemný dizajn AMARÉE."
    : "Pečlivě vybrané stříbrné šperky z Olomouce od zakladatelky Anette.";

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: "A M A R É E",
      template: "%s | A M A R É E"
    },
    description,
    alternates: {
      canonical: localizedPaths[locale].home,
      languages: {
        "cs-CZ": localizedPaths.cs.home,
        "sk-SK": localizedPaths.sk.home,
        "x-default": localizedPaths.cs.home
      }
    },
    openGraph: {
      type: "website",
      siteName: "A M A R É E",
      locale: locale === "sk" ? "sk_SK" : "cs_CZ",
      alternateLocale: locale === "sk" ? ["cs_CZ"] : ["sk_SK"],
      images: ["/opengraph-image"]
    }
  };
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider messages={messages}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "OnlineStore",
          name: company.brand,
          legalName: company.legalName,
          identifier: { "@type": "PropertyValue", name: "IČO", value: company.companyId },
          additionalProperty: [
            { "@type": "PropertyValue", name: "Obchodní rejstřík", value: company.registerEntry },
            { "@type": "PropertyValue", name: "Den zápisu", value: company.registeredAt },
            { "@type": "PropertyValue", name: "Plátce DPH", value: company.vatPayer }
          ],
          email: company.email,
          telephone: company.phone,
          address: { "@type": "PostalAddress", streetAddress: `${company.address.street}, ${company.address.district}`, postalCode: company.address.postalCode, addressLocality: company.address.city, addressCountry: company.address.countryCode }
        }) }}
      />
      <DocumentLocale locale={locale} />
      <CartHydrator locale={locale} />
      <Header locale={locale} />
      <main>{children}</main>
      <Footer locale={locale} />
      <CookieConsent />
    </NextIntlClientProvider>
  );
}
