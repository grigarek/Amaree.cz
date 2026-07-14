import type { Metadata } from "next";
import { Cormorant_Garamond, Newsreader, Red_Hat_Text } from "next/font/google";
import { headers } from "next/headers";
import { defaultLocale, isLocale } from "@/i18n/routing";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin-ext"],
  weight: ["400"],
  variable: "--font-newsreader",
  display: "swap"
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin-ext"],
  weight: ["400"],
  variable: "--font-cormorant",
  display: "swap"
});

const redHat = Red_Hat_Text({
  subsets: ["latin-ext"],
  weight: ["500", "600"],
  variable: "--font-redhat",
  display: "swap"
});

export const metadata: Metadata = {
  title: "A M A R É E",
  description: "Minimalistická elegance, která podtrhne váš styl. Kvalitní materiály. Nadčasový design."
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const requestedLocale = (await headers()).get("X-NEXT-INTL-LOCALE");
  const locale = requestedLocale && isLocale(requestedLocale) ? requestedLocale : defaultLocale;

  return (
    <html lang={locale} data-scroll-behavior="smooth" className={`${newsreader.variable} ${cormorant.variable} ${redHat.variable}`}>
      <body className="font-redhat antialiased">{children}</body>
    </html>
  );
}
