"use client";

import Image from "next/image";
import { Menu, ShoppingBag, Truck, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore, type MouseEvent } from "react";
import { enabledLocales, getAlternatePath, localeNames, localizedPaths, type Locale } from "@/i18n/routing";
import { useCartStore } from "@/store/cart-store";
import { CartDrawer } from "@/components/shop/cart-drawer";
import { ProductSearch } from "@/components/site/product-search";

function subscribeToScroll(callback: () => void) {
  window.addEventListener("scroll", callback, { passive: true });
  return () => window.removeEventListener("scroll", callback);
}

function getScrollSnapshot() {
  return window.scrollY > 40;
}

function getServerScrollSnapshot() {
  return false;
}

export function Header({ locale }: { locale: Locale }) {
  const t = useTranslations();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const scrolled = useSyncExternalStore(subscribeToScroll, getScrollSnapshot, getServerScrollSnapshot);
  const openCart = useCartStore((state) => state.open);
  const clearCart = useCartStore((state) => state.clear);
  const cartLines = useCartStore((state) => state.lines);
  const count = useCartStore((state) => state.lines.reduce((total, line) => total + line.quantity, 0));
  const isHome = pathname === localizedPaths[locale].home;
  const transparent = isHome && !scrolled;

  function confirmMarketChange(targetLocale: Locale, event: MouseEvent<HTMLAnchorElement>) {
    if (targetLocale === locale || cartLines.length === 0) return;
    const confirmed = window.confirm(t("nav.marketChangeConfirm"));
    if (!confirmed) {
      event.preventDefault();
      return;
    }
    clearCart();
  }

  const links = [
    { href: localizedPaths[locale].collection, label: t("nav.collection") },
    { href: localizedPaths[locale].about, label: t("nav.about") },
    { href: localizedPaths[locale].faq, label: t("nav.faq") },
    { href: localizedPaths[locale].contact, label: t("nav.contact") }
  ];

  return (
    <>
      <div className="h-8 bg-ruby text-white">
        <div className="mx-auto grid h-full w-full max-w-page grid-cols-[80px_minmax(0,1fr)_80px] items-center px-2 sm:grid-cols-[96px_minmax(0,1fr)_96px] sm:px-5 md:px-8">
          <span aria-hidden="true" />
          <div className="flex min-w-0 items-center justify-center gap-1.5 text-center font-redhat text-[8px] font-semibold uppercase tracking-[0.03em] sm:gap-2 sm:text-xs sm:tracking-[0.16em]">
            <Truck aria-hidden="true" className="hidden shrink-0 sm:block" size={15} strokeWidth={1.8} />
            <span className="truncate sm:hidden">{t("home.announcementShort")}</span>
            <span className="hidden truncate sm:inline">{t("home.announcement")}</span>
          </div>
          <nav aria-label={t("nav.market")} className="flex h-full items-center justify-self-end">
            {enabledLocales.map((targetLocale) => (
              <Link
                aria-current={targetLocale === locale ? "page" : undefined}
                aria-label={localeNames[targetLocale]}
                className={`relative flex h-full min-w-10 items-center justify-center gap-1 px-1 font-redhat text-[9px] font-semibold uppercase tracking-[0.08em] transition-colors first:after:hidden after:absolute after:left-0 after:h-3 after:w-px after:bg-white/20 sm:min-w-12 sm:gap-1.5 sm:px-2 ${
                  targetLocale === locale
                    ? "text-white before:absolute before:inset-x-2 before:bottom-0 before:h-px before:bg-white/90"
                    : "text-white/55 hover:text-white"
                }`}
                href={getAlternatePath(targetLocale, pathname)}
                key={targetLocale}
                onClick={(event) => confirmMarketChange(targetLocale, event)}
                title={localeNames[targetLocale]}
              >
                <Image
                  alt=""
                  aria-hidden="true"
                  className={`h-3 w-[18px] object-contain transition-opacity sm:h-3.5 sm:w-[21px] ${
                    targetLocale === locale ? "opacity-100" : "opacity-45"
                  }`}
                  height={14}
                  src={`/flags/${targetLocale === "cs" ? "cz" : "sk"}.svg`}
                  width={21}
                />
                <span>{targetLocale === "cs" ? "CZ" : "SK"}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <header
        className={`left-0 right-0 z-40 border-b transition-colors duration-300 ${
          transparent
            ? "absolute top-8 border-transparent bg-transparent text-white"
            : isHome
              ? "fixed top-0 border-line bg-ivory/95 text-ink shadow-sm backdrop-blur"
              : "sticky top-0 border-line bg-ivory/95 text-ink backdrop-blur"
        }`}
      >
        <div className="page-shell flex h-20 items-center justify-between gap-4">
          <button
            aria-label={t("nav.menu")}
            className={`rounded-brand border p-2 md:hidden ${transparent ? "border-white/40 text-white" : "border-line text-ink"}`}
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={20} />
          </button>
          <Link href={{ pathname: localizedPaths[locale].home }} className="min-w-max text-center">
            <span className="amaree-wordmark block text-[31px]" style={{ color: transparent ? "white" : "var(--color-ruby)" }}>{t("brand.name")}</span>
            <span className="amaree-est mt-1 block text-[10px]" style={{ color: transparent ? "white" : "var(--color-ruby)" }}>{t("brand.est")}</span>
          </Link>
          <nav className="hidden items-center gap-6 md:flex lg:gap-8">
            {links.map((link) => (
              <Link key={link.href} href={{ pathname: link.href }} className={`amaree-ui transition ${transparent ? "text-white hover:text-white/70" : "text-ink hover:text-ruby"}`}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ProductSearch locale={locale} transparent={transparent} />
            <Link
              aria-label={locale === "sk" ? "Môj účet" : "Můj účet"}
              className={`p-2 transition-opacity hover:opacity-65 ${transparent ? "text-white" : "text-ink"}`}
              href={localizedPaths[locale].account}
              title={locale === "sk" ? "Môj účet" : "Můj účet"}
            >
              <UserRound size={21} strokeWidth={1.35} />
            </Link>
            <button aria-label={t("nav.cart")} className={`relative p-2 transition-opacity hover:opacity-65 ${transparent ? "text-white" : "text-ink"}`} onClick={openCart} type="button">
              <ShoppingBag size={22} strokeWidth={1.35} />
              <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-ruby px-1 text-[10px] font-semibold leading-none text-white">
                {count}
              </span>
            </button>
          </div>
        </div>
      </header>
      {menuOpen ? (
        <div className="fixed inset-0 z-50 bg-ivory p-5 md:hidden">
          <div className="flex items-center justify-between">
            <div className="text-center">
              <span className="amaree-wordmark block text-[31px]">{t("brand.name")}</span>
              <span className="amaree-est mt-1 block text-[10px] text-ruby">{t("brand.est")}</span>
            </div>
            <button aria-label={t("nav.close")} className="rounded-brand border border-line p-2" onClick={() => setMenuOpen(false)} type="button">
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
        </div>
      ) : null}
      <CartDrawer locale={locale} />
    </>
  );
}
