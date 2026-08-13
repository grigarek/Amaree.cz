import type { Metadata } from "next";
import Link from "next/link";
import { Clock3, Mail } from "lucide-react";
import { MaintenanceCountdown } from "@/components/maintenance-countdown";
import { getMaintenanceSettings } from "@/lib/admin/maintenance-settings";
import { company } from "@/lib/config/company";
import type { MaintenanceLocale } from "@/lib/maintenance";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AMARÉE | Údržba e-shopu",
  robots: { index: false, follow: false, noarchive: true, nocache: true }
};

function returnTime(value: string | null, locale: MaintenanceLocale) {
  if (!value) return null;
  return new Intl.DateTimeFormat(locale === "sk" ? "sk-SK" : "cs-CZ", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Prague" }).format(new Date(value));
}

export default async function MaintenancePage({ searchParams }: { searchParams: Promise<{ locale?: string }> }) {
  const [settings, query] = await Promise.all([getMaintenanceSettings(), searchParams]);
  const locale: MaintenanceLocale = query.locale === "sk" ? "sk" : "cs";
  const expectedBack = returnTime(settings.expectedBackAt, locale);
  const copy = locale === "sk"
    ? { eyebrow: "Krátka prestávka", back: settings.countdownEnabled ? "Spustenie e-shopu" : "Predpokladaný návrat", contact: "Potrebujete nám napísať?", admin: "Správa e-shopu" }
    : { eyebrow: "Krátká přestávka", back: settings.countdownEnabled ? "Spuštění e-shopu" : "Předpokládaný návrat", contact: "Potřebujete nám napsat?", admin: "Správa e-shopu" };

  return <main className="relative flex min-h-screen items-center overflow-hidden bg-white px-5 py-14">
    <div aria-hidden className="absolute inset-x-0 top-0 h-2 bg-ruby" />
    <section className="relative mx-auto w-full max-w-3xl text-center">
      <p className="amaree-wordmark text-4xl sm:text-5xl">AMARÉE</p>
      <p className="amaree-est mt-3 text-[10px] text-ruby">EST. 2025</p>
      <div className="mx-auto mt-12 h-px w-16 bg-ruby" />
      <p className="mt-8 font-redhat text-xs font-semibold uppercase tracking-[0.18em] text-ruby">{copy.eyebrow}</p>
      <h1 className="mt-4 font-newsreader text-5xl leading-tight sm:text-6xl">{settings.headline[locale]}</h1>
      <p className="mx-auto mt-6 max-w-2xl font-redhat text-base font-medium leading-7 text-muted sm:text-lg sm:leading-8">{settings.message[locale]}</p>
      {settings.countdownEnabled && settings.expectedBackAt ? <MaintenanceCountdown locale={locale} targetAt={settings.expectedBackAt} /> : null}
      {expectedBack ? <div className="mx-auto mt-8 inline-flex items-center gap-3 border border-line bg-blush px-5 py-4 font-redhat text-sm"><Clock3 className="text-ruby" size={19} /><span><strong>{copy.back}:</strong> {expectedBack}</span></div> : null}
      <div className="mt-10 flex flex-col items-center gap-3 font-redhat text-sm text-muted"><span>{copy.contact}</span><a className="inline-flex items-center gap-2 font-semibold text-ink transition hover:text-ruby" href={`mailto:${company.email}`}><Mail size={18} />{company.email}</a></div>
      <div className="mt-12 flex justify-center gap-4 font-redhat text-xs font-semibold text-muted"><Link className={locale === "cs" ? "text-ruby" : "hover:text-ruby"} href="/maintenance?locale=cs">Čeština</Link><span aria-hidden>·</span><Link className={locale === "sk" ? "text-ruby" : "hover:text-ruby"} href="/maintenance?locale=sk">Slovenčina</Link></div>
      <Link className="mt-10 inline-block font-redhat text-[11px] text-muted/70 hover:text-ruby" href="/admin">{copy.admin}</Link>
    </section>
  </main>;
}
