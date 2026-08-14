import Link from "next/link";
import { Facebook, Instagram, Mail, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { localizedPaths, type Locale } from "@/i18n/routing";
import { categories } from "@/lib/products";
import { getHallmarkSettings, isPublicHallmarkPageReady } from "@/lib/admin/hallmark-settings";
import { PaymentTrustMarks } from "@/components/checkout/payment-trust-marks";

export async function Footer({ locale }: { locale: Locale }) {
  const [t, hallmarkSettings] = await Promise.all([getTranslations(), getHallmarkSettings()]);
  const showHallmarkLink = hallmarkSettings.footerLinkEnabled && isPublicHallmarkPageReady(hallmarkSettings);
  const footerCategories = ["necklaces", "earrings", "bracelets"]
    .map((slug) => categories.find((category) => category.slug === slug))
    .filter((category) => category !== undefined);
  return (
    <footer className="bg-[#f4ecec]">
      <div className="page-shell grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.15fr_0.8fr_1.05fr_1fr] lg:gap-14 lg:py-16">
        <div>
          <div className="w-fit text-center">
            <p className="amaree-wordmark text-3xl">{t("brand.name")}</p>
            <p className="amaree-est mt-1 text-[10px] text-ruby">{t("brand.est")}</p>
          </div>
          <h2 className="mt-5 font-redhat text-base font-bold text-ink">{t("footer.tagline")}</h2>
          <p className="mt-3 max-w-sm font-redhat text-sm leading-7 text-ink">{t("brand.intro")}</p>
          <div className="mt-6 flex items-center gap-4" aria-label={t("footer.socialMedia")}>
            <a
              aria-label={t("footer.instagram")}
              className="text-ruby transition hover:opacity-65"
              href="https://www.instagram.com/amaree_cz"
              rel="noreferrer"
              target="_blank"
              title={t("footer.instagram")}
            >
              <Instagram aria-hidden="true" size={22} strokeWidth={1.6} />
            </a>
            <a
              aria-label={t("footer.facebook")}
              className="text-ruby transition hover:opacity-65"
              href="https://www.facebook.com/profile.php?id=61592564824401"
              rel="noreferrer"
              target="_blank"
              title={t("footer.facebook")}
            >
              <Facebook aria-hidden="true" size={22} strokeWidth={1.6} />
            </a>
          </div>
          <PaymentTrustMarks locale={locale} />
        </div>
        <div>
          <h2 className="font-redhat text-base font-bold text-ruby">{t("footer.collection")}</h2>
          <div className="mt-5 grid gap-3 font-redhat text-sm text-ink">
            {footerCategories.map((category) => (
              <Link
                className="transition hover:text-ruby"
                href={`${localizedPaths[locale].category}/${category.localizedSlug[locale]}`}
                key={category.id}
              >
                {category.name[locale]}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h2 className="font-redhat text-base font-bold text-ruby">{t("footer.legal")}</h2>
          <div className="mt-5 grid gap-3 font-redhat text-sm text-ink">
            <Link className="transition hover:text-ruby" href={localizedPaths[locale].shipping}>{t("footer.shipping")}</Link>
            <Link className="transition hover:text-ruby" href={localizedPaths[locale].returns}>{t("footer.returns")}</Link>
            <Link className="transition hover:text-ruby" href={localizedPaths[locale].care}>{t("footer.care")}</Link>
            <Link className="transition hover:text-ruby" href={localizedPaths[locale].club}>{t("footer.club")}</Link>
            <Link className="transition hover:text-ruby" href={localizedPaths[locale].privacy}>{t("footer.privacy")}</Link>
            <Link className="transition hover:text-ruby" href={localizedPaths[locale].terms}>{t("footer.terms")}</Link>
            {showHallmarkLink ? <Link className="transition hover:text-ruby" href={localizedPaths[locale].hallmark}>{t("footer.hallmark")}</Link> : null}
          </div>
        </div>
        <div>
          <h2 className="font-redhat text-base font-bold text-ruby">{t("footer.contact")}</h2>
          <div className="mt-5 grid gap-4 font-redhat text-sm leading-6 text-ink">
            <a className="flex items-start gap-3 transition hover:text-ruby" href={`mailto:${t("footer.email")}`}>
              <Mail aria-hidden="true" className="mt-0.5 shrink-0 text-ruby" size={18} strokeWidth={1.8} />
              <span>{t("footer.email")}</span>
            </a>
            <a className="flex items-start gap-3 transition hover:text-ruby" href={`tel:${t("footer.phone").replace(/\s/g, "")}`}>
              <Phone aria-hidden="true" className="mt-0.5 shrink-0 text-ruby" size={18} strokeWidth={1.8} />
              <span>{t("footer.phone")}</span>
            </a>
          </div>
        </div>
      </div>
      <div className="page-shell border-t border-line py-5 text-center font-redhat text-xs text-muted">
        Copyright 2026 Amaree.cz. {t("footer.rights")}
      </div>
    </footer>
  );
}
