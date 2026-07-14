"use client";

import { Menu, Search, ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { getAlternatePath, localeNames, localizedPaths, locales, type Locale } from "@/i18n/routing";
import { useCartStore } from "@/store/cart-store";
import { CartDrawer } from "@/components/shop/cart-drawer";

export function Header({ locale }: { locale: Locale }) {
  const t = useTranslations();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const openCart = useCartStore((state) => state.open);
  const count = useCartStore((state) => state.lines.reduce((total, line) => total + line.quantity, 0));

  const links = [
    { href: localizedPaths[locale].home, label: t("nav.home") },
    { href: localizedPaths[locale].collection, label: t("nav.collection") },
    { href: localizedPaths[locale].about, label: t("nav.about") },
    { href: localizedPaths[locale].inspiration, label: t("nav.inspiration") },
    { href: localizedPaths[locale].contact, label: t("nav.contact") }
  ];

  return (
    <>
      <div className="bg-rubyDark px-4 py-2 text-center font-redhat text-xs font-semibold uppercase tracking-[0.16em] text-white">
        {t("home.announcement")}
      </div>
      <header className="sticky top-0 z-40 border-b border-line bg-ivory/92 backdrop-blur">
        <div className="page-shell flex h-20 items-center justify-between gap-4">
          <button
            aria-label={t("nav.menu")}
            className="rounded-brand border border-line p-2 md:hidden"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={20} />
          </button>
          <Link href={{ pathname: localizedPaths[locale].home }} className="min-w-max text-center">
            <span className="block font-newsreader text-2xl tracking-[0.18em] text-ink">{t("brand.name")}</span>
            <span className="block font-redhat text-[10px] font-semibold tracking-[0.32em] text-ruby">{t("brand.est")}</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            {links.map((link) => (
              <Link key={link.href} href={{ pathname: link.href }} className="amaree-ui text-ink transition hover:text-ruby">
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <button aria-label={t("nav.search")} className="rounded-brand border border-line p-2">
              <Search size={18} />
            </button>
            <div className="hidden items-center gap-1 md:flex">
              {locales.map((item) => (
                <Link
                  key={item}
                  href={{ pathname: getAlternatePath(item, pathname) }}
                  hrefLang={item}
                  className={`amaree-ui rounded-brand px-2 py-1 ${item === locale ? "bg-ruby text-white" : "text-muted hover:text-ruby"}`}
                >
                  {item.toUpperCase()}
                </Link>
              ))}
            </div>
            <button aria-label={t("nav.cart")} className="relative rounded-brand border border-line p-2" onClick={openCart}>
              <ShoppingBag size={18} />
              <span className="absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full bg-ruby px-1 text-[11px] font-semibold text-white">
                {count}
              </span>
            </button>
          </div>
        </div>
      </header>
      {menuOpen ? (
        <div className="fixed inset-0 z-50 bg-ivory p-5 md:hidden">
          <div className="flex items-center justify-between">
            <span className="font-newsreader text-2xl tracking-[0.18em]">{t("brand.name")}</span>
            <button aria-label="Close" className="rounded-brand border border-line p-2" onClick={() => setMenuOpen(false)}>
              <X size={20} />
            </button>
          </div>
          <nav className="mt-10 grid gap-5">
            {links.map((link) => (
              <Link key={link.href} href={{ pathname: link.href }} className="amaree-h3" onClick={() => setMenuOpen(false)}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-10 flex gap-2">
            {locales.map((item) => (
              <Link key={item} href={{ pathname: getAlternatePath(item, pathname) }} className="amaree-ui rounded-brand border border-line px-3 py-2">
                {localeNames[item]}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
      <CartDrawer locale={locale} />
    </>
  );
}
