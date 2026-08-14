import Image from "next/image";
import Link from "next/link";
import { AboutImageInput } from "@/components/admin/about-image-input";
import { AdminShell } from "@/components/admin/admin-shell";
import { StorefrontContentSubmit } from "@/components/admin/storefront-content-submit";
import { requireOrderAdmin } from "@/lib/admin-auth";
import { getStorefrontContentSettings } from "@/lib/admin/storefront-content";
import { updateStorefrontContent } from "./actions";

const inputClass = "min-h-11 w-full border border-line bg-white px-3 py-2 font-redhat text-sm outline-none focus:border-ruby focus:ring-2 focus:ring-ruby/10";
const labelClass = "grid gap-2 font-redhat text-sm font-semibold";
const localeNames = { cs: "Čeština", sk: "Slovenština", en: "Angličtina", de: "Němčina" } as const;

export default async function StorefrontContentPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireOrderAdmin();
  const [settings, query] = await Promise.all([getStorefrontContentSettings(), searchParams]);
  return <AdminShell><main className="mx-auto max-w-page px-5 py-10">
    <nav className="font-redhat text-xs text-muted"><Link href="/admin/settings">Nastavení</Link> / Obsah webu</nav>
    <h1 className="mt-4 font-newsreader text-5xl">Obsah webu</h1>
    <p className="mt-4 max-w-3xl font-redhat text-sm leading-6 text-muted">Běžné texty a fotografii stránky O nás můžete měnit bez zásahu do kódu. Jednotlivé odstavce oddělte prázdným řádkem.</p>
    {query.saved === "1" ? <p className="mt-5 border border-emerald-200 bg-emerald-50 p-4 font-redhat text-sm font-semibold text-emerald-800">Obsah byl uložen.</p> : null}
    {query.error ? <p className="mt-5 border border-red-200 bg-red-50 p-4 font-redhat text-sm font-semibold text-red-800">{query.error}</p> : null}
    <form action={updateStorefrontContent} className="mt-8 grid gap-10">
      <section className="border border-line bg-white p-6 md:p-8"><h2 className="font-newsreader text-3xl">Úvodní obrazovka</h2><div className="mt-6 grid gap-7">{Object.entries(localeNames).map(([locale, label]) => <fieldset className="grid gap-4 border-t border-line pt-5 first:border-0 first:pt-0" key={locale}><legend className="font-redhat text-sm font-bold text-ruby">{label}</legend><label className={labelClass}>Nadpis<input className={inputClass} name={`heroClaim_${locale}`} defaultValue={settings.heroClaim[locale as keyof typeof localeNames]} /></label><label className={labelClass}>Úvodní text<textarea className={inputClass} rows={3} name={`heroIntro_${locale}`} defaultValue={settings.heroIntro[locale as keyof typeof localeNames]} /></label></fieldset>)}</div></section>
      <section className="border border-line bg-white p-6 md:p-8"><h2 className="font-newsreader text-3xl">O nás</h2><div className="mt-6 grid gap-6 md:grid-cols-[280px_1fr]"><div><div className="relative aspect-[4/5] overflow-hidden bg-blush"><Image alt="Náhled fotografie O nás" className="object-cover" fill src={settings.aboutImageUrl ?? "/images/about/anette-founder-v4.png"} unoptimized /></div><AboutImageInput /></div><div className="grid gap-7">{Object.entries(localeNames).map(([locale, label]) => <fieldset className="grid gap-4 border-t border-line pt-5 first:border-0 first:pt-0" key={locale}><legend className="font-redhat text-sm font-bold text-ruby">{label}</legend><label className={labelClass}>Text<textarea className={inputClass} rows={8} name={`about_${locale}`} defaultValue={settings.aboutParagraphs[locale as keyof typeof localeNames].join("\n\n")} /></label><label className={labelClass}>Popis fotografie<input className={inputClass} name={`aboutAlt_${locale}`} defaultValue={settings.aboutImageAlt[locale as keyof typeof localeNames]} /></label></fieldset>)}</div></div></section>
      <section className="border border-line bg-white p-6 md:p-8"><h2 className="font-newsreader text-3xl">Zákaznická podpora</h2><div className="mt-6 grid gap-5 md:grid-cols-2">{Object.entries(localeNames).map(([locale, label]) => <label className={labelClass} key={locale}>{label}<input className={inputClass} name={`supportHours_${locale}`} defaultValue={settings.supportHours[locale as keyof typeof localeNames]} /></label>)}</div></section>
      <StorefrontContentSubmit />
    </form>
  </main></AdminShell>;
}
