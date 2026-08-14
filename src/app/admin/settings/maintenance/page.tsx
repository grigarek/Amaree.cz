import Link from "next/link";
import { ArrowLeft, ExternalLink, Wrench } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireOrderAdmin } from "@/lib/admin-auth";
import { getMaintenanceSettings } from "@/lib/admin/maintenance-settings";
import { formatPragueDateTimeLocal } from "@/lib/maintenance";
import { updateMaintenanceSettings } from "./actions";

const inputClass = "min-h-11 w-full border border-line bg-white px-3 font-redhat text-sm outline-none focus:border-ruby focus:ring-2 focus:ring-ruby/10";
const textareaClass = `${inputClass} min-h-28 resize-y py-3 leading-6`;
const labelClass = "grid gap-2 font-redhat text-sm font-semibold";

export default async function MaintenanceSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; enabled?: string; error?: string }> }) {
  await requireOrderAdmin();
  const [settings, query] = await Promise.all([getMaintenanceSettings(), searchParams]);

  return <AdminShell><main className="mx-auto max-w-4xl px-5 py-10">
    <Link className="inline-flex items-center gap-2 font-redhat text-sm font-semibold text-muted hover:text-ruby" href="/admin/settings"><ArrowLeft size={17} />Zpět na nastavení</Link>
    <div className="mt-6 flex items-start gap-4"><Wrench className="mt-1 text-ruby" size={28} /><div><p className="font-redhat text-sm font-semibold uppercase text-ruby">Provoz e-shopu</p><h1 className="mt-2 font-newsreader text-5xl">Režim údržby</h1></div></div>
    <p className="mt-5 max-w-3xl font-redhat text-sm leading-6 text-muted">Po zapnutí se návštěvníkům místo e-shopu zobrazí klidná informační stránka. Administrace, potvrzení plateb, synchronizace zásilek a dokončení již zaplacené objednávky zůstanou dostupné.</p>
    {query.saved === "1" ? <p className={`mt-6 border p-4 font-redhat text-sm font-semibold ${query.enabled === "1" ? "border-amber-300 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`} role="status">{query.enabled === "1" ? "Režim údržby je aktivní. Veřejný e-shop je dočasně skrytý." : "Režim údržby je vypnutý. E-shop je veřejně dostupný."}</p> : null}
    {query.error ? <p className="mt-6 border border-red-200 bg-red-50 p-4 font-redhat text-sm font-semibold text-red-800" role="alert">{query.error}</p> : null}

    <form action={updateMaintenanceSettings} className="mt-8 grid gap-6">
      <section className="border border-line bg-white p-6 md:p-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div><h2 className="font-newsreader text-3xl">Stav e-shopu</h2><p className="mt-2 font-redhat text-sm text-muted">Změna se projeví ihned po uložení.</p></div>
          <label className="flex cursor-pointer items-center gap-3 font-redhat text-sm font-semibold">
            <span>Zapnout údržbu</span>
            <span className="relative inline-flex h-7 w-12 shrink-0"><input className="peer sr-only" defaultChecked={settings.enabled} name="enabled" type="checkbox" /><span className="absolute inset-0 rounded-full bg-line transition peer-checked:bg-ruby" /><span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" /></span>
          </label>
        </div>
        <div className="mt-7 border-t border-line pt-6">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
            <div><h3 className="font-redhat text-base font-bold">Odpočet do spuštění</h3><p className="mt-1 font-redhat text-sm text-muted">Na údržbové stránce zobrazí zbývající dny, hodiny, minuty a sekundy.</p></div>
            <label className="flex cursor-pointer items-center gap-3 font-redhat text-sm font-semibold">
              <span>Zobrazit odpočet</span>
              <span className="relative inline-flex h-7 w-12 shrink-0"><input className="peer sr-only" defaultChecked={settings.countdownEnabled} name="countdownEnabled" type="checkbox" /><span className="absolute inset-0 rounded-full bg-line transition peer-checked:bg-ruby" /><span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" /></span>
            </label>
          </div>
          <label className={`${labelClass} mt-5 max-w-md`}>Datum a čas spuštění<input className={inputClass} defaultValue={formatPragueDateTimeLocal(settings.expectedBackAt)} name="expectedBackAt" type="datetime-local" /><span className="font-normal text-muted">Zadává se český čas. Pole je povinné pouze při zapnutém odpočtu.</span></label>
        </div>
      </section>

      <section className="border border-line bg-white p-6 md:p-8"><h2 className="font-newsreader text-3xl">Sdělení zákazníkům</h2><div className="mt-6 grid gap-7">
        <fieldset className="grid gap-4"><legend className="font-redhat text-sm font-bold text-ruby">Čeština</legend><label className={labelClass}>Nadpis<input className={inputClass} defaultValue={settings.headline.cs} maxLength={120} name="headlineCs" required /></label><label className={labelClass}>Text<textarea className={textareaClass} defaultValue={settings.message.cs} maxLength={500} name="messageCs" required /></label></fieldset>
        <fieldset className="grid gap-4 border-t border-line pt-6"><legend className="font-redhat text-sm font-bold text-ruby">Slovenština</legend><label className={labelClass}>Nadpis<input className={inputClass} defaultValue={settings.headline.sk} maxLength={120} name="headlineSk" required /></label><label className={labelClass}>Text<textarea className={textareaClass} defaultValue={settings.message.sk} maxLength={500} name="messageSk" required /></label></fieldset>
      </div></section>

      <div className="flex flex-wrap items-center justify-between gap-4 border border-line bg-white p-4"><Link className="inline-flex min-h-11 items-center gap-2 px-3 font-redhat text-sm font-semibold text-muted hover:text-ruby" href="/maintenance?preview=1" target="_blank">Zobrazit náhled <ExternalLink size={17} /></Link><button className="min-h-11 bg-ruby px-7 font-redhat text-sm font-semibold text-white hover:bg-ruby/90" type="submit">Uložit režim údržby</button></div>
    </form>
  </main></AdminShell>;
}
