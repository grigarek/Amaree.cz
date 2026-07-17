"use client";

import { Menu, ShoppingBag, Truck, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useSyncExternalStore } from "react";
import { localizedPaths, type Locale } from "@/i18n/routing";
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
  const count = useCartStore((state) => state.lines.reduce((total, line) => total + line.quantity, 0));
  const isHome = pathname === localizedPaths[locale].home;
  const transparent = isHome && !scrolled;

  const links = [
    { href: localizedPaths[locale].collection, label: t("nav.collection") },
    { href: localizedPaths[locale].about, label: t("nav.about") },
    { href: localizedPaths[locale].contact, label: t("nav.contact") }
  ];

  return (
    <>
      <div className="flex items-center justify-center gap-2 bg-ruby px-3 py-2 text-center font-redhat text-[10px] font-semibold uppercase tracking-[0.1em] text-white sm:px-4 sm:text-xs sm:tracking-[0.16em]">
        <Truck aria-hidden="true" className="shrink-0" size={16} strokeWidth={1.8} />
        <span>{t("home.announcement")}</span>
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
          <nav className="hidden items-center gap-8 md:flex">
            {links.map((link) => (
              <Link key={link.href} href={{ pathname: link.href }} className={`amaree-ui transition ${transparent ? "text-white hover:text-white/70" : "text-ink hover:text-ruby"}`}>
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <ProductSearch locale={locale} transparent={transparent} />
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
