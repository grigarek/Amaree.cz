import Link from "next/link";
import { ArrowLeft, CakeSlice, Crown } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireOrderAdmin } from "@/lib/admin-auth";
import { getLoyaltySettings } from "@/lib/loyalty/settings";
import { updateLoyaltySettings } from "./actions";

const inputClass = "min-h-11 w-full border border-line bg-white px-3 font-redhat text-sm outline-none focus:border-ruby focus:ring-2 focus:ring-ruby/10";
const labelClass = "grid gap-2 font-redhat text-sm font-semibold";

function Toggle({ checked, label, name }: { checked: boolean; label: string; name: string }) {
  return <label className="flex cursor-pointer items-center gap-3 font-redhat text-sm font-semibold"><span>{label}</span><span className="relative inline-flex h-7 w-12"><input className="peer sr-only" defaultChecked={checked} name={name} type="checkbox" /><span className="absolute inset-0 rounded-full bg-line transition peer-checked:bg-ruby" /><span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" /></span></label>;
}

export default async function LoyaltySettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  await requireOrderAdmin();
  const [settings, query] = await Promise.all([getLoyaltySettings(), searchParams]);
  return <AdminShell><main className="mx-auto max-w-4xl px-5 py-10">
    <Link className="inline-flex items-center gap-2 font-redhat text-sm font-semibold text-muted hover:text-ruby" href="/admin/settings"><ArrowLeft size={17} />Zpět na nastavení</Link>
    <div className="mt-6 flex items-start gap-4"><Crown className="mt-1 text-ruby" size={28} /><div><p className="font-redhat text-sm font-semibold uppercase text-ruby">AMARÉE Club</p><h1 className="mt-2 font-newsreader text-5xl">Věrnostní program</h1></div></div>
    <p className="mt-5 max-w-3xl font-redhat text-sm leading-6 text-muted">Zákazník získá jednorázovou procentní slevu na další nákup po dosažení nastavené hodnoty doručených objednávek. Odměny nelze sčítat.</p>
    {query.saved === "1" ? <p className="mt-6 border border-emerald-200 bg-emerald-50 p-4 font-redhat text-sm font-semibold text-emerald-800">Nastavení věrnostního programu bylo uloženo.</p> : null}
    {query.error ? <p className="mt-6 border border-red-200 bg-red-50 p-4 font-redhat text-sm font-semibold text-red-800">{query.error}</p> : null}
    <form action={updateLoyaltySettings} className="mt-8 grid gap-6">
      <section className="border border-line bg-white p-6 md:p-8"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div><h2 className="font-newsreader text-3xl">Stav programu</h2><p className="mt-2 font-redhat text-sm text-muted">Zapněte až po spuštění databázové migrace a závěrečném testu.</p></div><Toggle checked={settings.enabled} label="Program aktivní" name="enabled" /></div></section>
      <section className="border border-line bg-white p-6 md:p-8"><h2 className="font-newsreader text-3xl">Pravidla odměny</h2><div className="mt-6 grid gap-5 md:grid-cols-2">
        <label className={labelClass}>Odměna na další nákup (%)<input className={inputClass} defaultValue={settings.rewardPercent} max="50" min="1" name="rewardPercent" required type="number" /></label>
        <label className={labelClass}>Platnost odměny (dní)<input className={inputClass} defaultValue={settings.rewardValidDays} max="730" min="1" name="rewardValidDays" required type="number" /></label>
        <label className={labelClass}>Hranice nákupů v Kč<input className={inputClass} defaultValue={settings.thresholdCzkMinor / 100} min="1" name="thresholdCzk" required step="1" type="number" /></label>
        <label className={labelClass}>Hranice nákupů v EUR<input className={inputClass} defaultValue={settings.thresholdEurMinor / 100} min="1" name="thresholdEur" required step="0.01" type="number" /></label>
        <label className={labelClass}>Minimální další nákup v Kč<input className={inputClass} defaultValue={settings.minimumOrderCzkMinor / 100} min="0" name="minimumOrderCzk" required step="1" type="number" /></label>
        <label className={labelClass}>Minimální další nákup v EUR<input className={inputClass} defaultValue={settings.minimumOrderEurMinor / 100} min="0" name="minimumOrderEur" required step="0.01" type="number" /></label>
        <label className={labelClass}>Připsat po doručení za (dní)<input className={inputClass} defaultValue={settings.confirmationDelayDays} max="120" min="0" name="confirmationDelayDays" required type="number" /><span className="font-normal text-muted">Doporučeno 30 dní kvůli vrácení zboží.</span></label>
      </div></section>
      <section className="border border-line bg-white p-6 md:p-8"><div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center"><div className="flex gap-3"><CakeSlice className="mt-1 text-ruby" size={23} /><div><h2 className="font-newsreader text-3xl">Narozeninová odměna</h2><p className="mt-2 max-w-xl font-redhat text-sm leading-6 text-muted">Jednou ročně, přesně v den narozenin, pro zákazníka s alespoň jedním potvrzeným nákupem. Ukládá se pouze den a měsíc narození.</p></div></div><Toggle checked={settings.birthdayRewardEnabled} label="Odměna aktivní" name="birthdayRewardEnabled" /></div><div className="mt-7 grid gap-5 md:grid-cols-2">
        <label className={labelClass}>Výše odměny (%)<input className={inputClass} defaultValue={settings.birthdayRewardPercent} max="50" min="1" name="birthdayRewardPercent" required type="number" /></label>
        <label className={labelClass}>Platnost voucheru (dní)<input className={inputClass} defaultValue={settings.birthdayRewardValidDays} max="365" min="1" name="birthdayRewardValidDays" required type="number" /></label>
      </div><p className="mt-5 border-l-2 border-ruby pl-4 font-redhat text-xs leading-5 text-muted">Pro voucher platí stejná minimální hodnota objednávky jako pro běžnou klubovou odměnu. Datum narození zákazník zadá ve svém účtu a běžně jej nelze měnit.</p></section>
      <div className="flex justify-end border border-line bg-white p-4"><button className="min-h-11 bg-ruby px-7 font-redhat text-sm font-semibold text-white" type="submit">Uložit věrnostní program</button></div>
    </form>
  </main></AdminShell>;
}
