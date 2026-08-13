import Image from "next/image";
import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireOrderAdmin } from "@/lib/admin-auth";
import { getStorefrontHeroSettings } from "@/lib/admin/storefront-hero";
import { updateStorefrontHero } from "./actions";

const inputClass = "min-h-11 w-full border border-line bg-white px-3 py-2 font-redhat text-sm outline-none focus:border-ruby focus:ring-2 focus:ring-ruby/10";
const labelClass = "grid gap-2 font-redhat text-sm font-semibold";

export default async function HeroSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireOrderAdmin();
  const [settings, query] = await Promise.all([getStorefrontHeroSettings(), searchParams]);

  return (
    <AdminShell>
      <main className="mx-auto max-w-page px-5 py-10">
        <nav className="font-redhat text-xs text-muted"><Link className="hover:text-ruby" href="/admin/settings">Nastavení</Link> / Hlavní fotografie</nav>
        <h1 className="mt-4 font-newsreader text-5xl">Hlavní fotografie webu</h1>
        <p className="mt-4 max-w-3xl font-redhat text-sm leading-6 text-muted">Fotografii lze kdykoli vyměnit bez úpravy kódu. Volitelné datum začátku a konce dovolí připravit časově omezenou kampaň; mimo nastavené období se automaticky zobrazí záložní fotografie.</p>
        {query.saved === "1" ? <p className="mt-5 border border-emerald-200 bg-emerald-50 p-4 font-redhat text-sm font-semibold text-emerald-800" role="status">Hlavní fotografie byla uložena a web ji používá.</p> : null}
        {query.error ? <p className="mt-5 border border-red-200 bg-red-50 p-4 font-redhat text-sm font-semibold text-red-800" role="alert">{query.error}</p> : null}
        <div className={`mt-5 border p-4 font-redhat text-sm ${settings.isActive ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-amber-200 bg-amber-50 text-amber-950"}`}>{settings.isActive ? "Nahraná fotografie je nyní aktivní na webu." : "Web nyní používá bezpečnou záložní fotografii."}</div>

        <form action={updateStorefrontHero} className="mt-8 border border-line bg-white p-6 md:p-8">
          <div className="relative aspect-[3/2] overflow-hidden bg-blush">
            <Image alt="Aktuální náhled hlavní fotografie" className="object-cover" fill priority sizes="(min-width: 1200px) 1100px, 92vw" src={settings.imageUrl ?? settings.activeImageUrl} unoptimized />
          </div>
          <p className="mt-3 font-redhat text-xs text-muted">Doporučený poměr 3:2, alespoň 1800 × 1200 px, JPG, PNG nebo WebP, nejvýše 12 MB. Text domovské stránky je vlevo, proto je vhodné ponechat levou část snímku klidnější.</p>

          <div className="mt-7 border border-line p-4">
            <label className={labelClass}>Nahrát novou fotografii<input accept="image/jpeg,image/png,image/webp" className="block w-full font-redhat text-sm" name="heroImage" type="file" /></label>
            {settings.imageFilename ? <p className="mt-2 font-redhat text-xs text-muted">Nahraný soubor: {settings.imageFilename}</p> : null}
            {settings.imagePath ? <label className="mt-3 flex items-center gap-2 font-redhat text-xs"><input name="removeHeroImage" type="checkbox" />Odstranit nahranou fotografii a použít záložní</label> : null}
          </div>

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className={labelClass}>Spustit od<input className={inputClass} defaultValue={settings.activeFrom} name="activeFrom" type="date" /><span className="font-normal text-muted">Prázdné pole znamená ihned.</span></label>
            <label className={labelClass}>Ukončit po tomto dni<input className={inputClass} defaultValue={settings.activeUntil} name="activeUntil" type="date" /><span className="font-normal text-muted">Prázdné pole znamená bez omezení.</span></label>
          </div>

          <h2 className="mt-7 font-newsreader text-3xl">Popis fotografie pro přístupnost</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <label className={labelClass}>Čeština<input className={inputClass} defaultValue={settings.alt.cs} maxLength={300} name="altCs" /></label>
            <label className={labelClass}>Slovenština<input className={inputClass} defaultValue={settings.alt.sk} maxLength={300} name="altSk" /></label>
            <label className={labelClass}>Angličtina<input className={inputClass} defaultValue={settings.alt.en} maxLength={300} name="altEn" /></label>
            <label className={labelClass}>Němčina<input className={inputClass} defaultValue={settings.alt.de} maxLength={300} name="altDe" /></label>
          </div>

          <label className="mt-6 flex items-center gap-3 border border-line p-4 font-redhat text-sm font-semibold"><input defaultChecked={settings.enabled} name="enabled" type="checkbox" />Používat nahranou fotografii na webu</label>
          <button className="mt-7 min-h-11 bg-ruby px-6 font-redhat text-sm font-semibold text-white" type="submit">Uložit hlavní fotografii</button>
        </form>
      </main>
    </AdminShell>
  );
}
