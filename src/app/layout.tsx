import type { Metadata } from "next";
import { Montserrat, Newsreader, Playfair_Display, Red_Hat_Text } from "next/font/google";
import { headers } from "next/headers";
import { defaultLocale, isLocale } from "@/i18n/routing";
import { isIndexingAllowed } from "@/lib/environment";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin-ext"],
  weight: ["400"],
  variable: "--font-newsreader",
  display: "swap"
});

const redHat = Red_Hat_Text({
  subsets: ["latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-redhat",
  display: "swap"
});

const playfair = Playfair_Display({
  subsets: ["latin-ext"],
  weight: ["600"],
  variable: "--font-playfair",
  display: "swap"
});

const montserrat = Montserrat({
  subsets: ["latin-ext"],
  weight: ["500"],
  variable: "--font-montserrat",
  display: "swap"
});

export const metadata: Metadata = {
  title: "A M A R É E",
  description: "Pečlivě vybrané stříbrné šperky z Olomouce od zakladatelky Anette.",
  robots: isIndexingAllowed()
    ? { index: true, follow: true }
    : { index: false, follow: false, noarchive: true, nocache: true }
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const requestedLocale = (await headers()).get("X-NEXT-INTL-LOCALE");
  const locale = requestedLocale && isLocale(requestedLocale) ? requestedLocale : defaultLocale;

  return (
    <html
      lang={locale}
      data-scroll-behavior="smooth"
      className={`${newsreader.variable} ${redHat.variable} ${playfair.variable} ${montserrat.variable}`}
    >
      <body className="font-redhat antialiased">{children}</body>
    </html>
  );
}
