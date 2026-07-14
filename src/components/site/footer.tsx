import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { localizedPaths, type Locale } from "@/i18n/routing";

export async function Footer({ locale }: { locale: Locale }) {
  const t = await getTranslations();

  return (
    <footer className="mt-24 border-t border-line bg-white">
      <div className="page-shell grid gap-10 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-newsreader text-3xl tracking-[0.18em]">{t("brand.name")}</p>
          <p className="mt-2 font-redhat text-xs font-semibold tracking-[0.32em] text-ruby">{t("brand.est")}</p>
          <p className="amaree-body mt-6 max-w-md">{t("brand.intro")}</p>
        </div>
        <div>
          <h2 className="amaree-subtitle">{t("footer.contact")}</h2>
          <div className="mt-4 grid gap-2 font-redhat text-sm text-muted">
            <a href={`mailto:${t("footer.email")}`}>{t("footer.email")}</a>
            <a href="tel:+420737076249">{t("footer.phone")}</a>
            <span>{t("footer.address")}</span>
          </div>
        </div>
        <div>
          <h2 className="amaree-subtitle">{t("footer.legal")}</h2>
          <div className="mt-4 grid gap-2 font-redhat text-sm text-muted">
            <Link href={localizedPaths[locale].terms}>{t("footer.terms")}</Link>
            <Link href={localizedPaths[locale].privacy}>{t("footer.privacy")}</Link>
            <Link href={localizedPaths[locale].shipping}>{t("footer.shipping")}</Link>
            <Link href={localizedPaths[locale].care}>{t("footer.care")}</Link>
          </div>
        </div>
      </div>
      <div className="border-t border-line py-5 text-center font-redhat text-xs text-muted">
        Copyright 2026 <strong>Amarée.cz</strong>. {t("footer.rights")}
      </div>
    </footer>
  );
}
