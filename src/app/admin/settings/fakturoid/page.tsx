import Link from "next/link";
import { AdminShell } from "@/components/admin/admin-shell";
import { FakturoidConnectionTest } from "@/components/admin/fakturoid-connection-test";
import { getFakturoidConfig } from "@/lib/accounting/fakturoid-client";
import { requireOrderAdmin } from "@/lib/admin-auth";
import { getFakturoidOperationalSettings } from "@/lib/admin/integration-settings";
import { updateFakturoidSettings } from "../actions";

const inputClass = "min-h-11 border border-line bg-white px-3 font-redhat text-sm";

export default async function FakturoidSettingsPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireOrderAdmin();
  const [settings, query] = await Promise.all([getFakturoidOperationalSettings(), searchParams]);
  const credentialsReady = Boolean(getFakturoidConfig());
  const apiAllowed = process.env.FAKTUROID_API_ENABLED === "true";

  return (
    <AdminShell>
      <main className="mx-auto max-w-4xl px-5 py-10">
        <Link className="font-redhat text-sm font-semibold text-ruby" href="/admin/settings">← Nastavení</Link>
        <p className="mt-7 font-redhat text-sm font-semibold uppercase text-ruby">Fakturace</p>
        <h1 className="mt-3 font-newsreader text-5xl">Fakturoid</h1>
        <p className="mt-5 max-w-3xl font-redhat text-sm leading-6 text-muted">E-shop zůstává zdrojem objednávek a skladu. Do Fakturoidu se přenese neměnný snímek položek objednávky a odkaz na vystavený doklad se vrátí do jejího detailu.</p>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <div className={`border p-4 font-redhat text-sm ${credentialsReady ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}><strong>Přístupové údaje</strong><p className="mt-1 text-muted">{credentialsReady ? "Bezpečně uložené" : "Nejsou doplněné"}</p></div>
          <div className={`border p-4 font-redhat text-sm ${apiAllowed ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}><strong>Serverové povolení</strong><p className="mt-1 text-muted">{apiAllowed ? "Povoleno" : "Vypnuto"}</p></div>
        </div>
        <FakturoidConnectionTest />
        {query.saved === "1" ? <p className="mt-5 border border-ruby/30 bg-blush p-4 font-redhat text-sm font-semibold text-ruby" role="status">Nastavení fakturace bylo uloženo.</p> : null}

        <form action={updateFakturoidSettings} className="mt-8 border border-line bg-white p-6">
          <div className="grid gap-6">
            <label className="flex items-start gap-3 font-redhat text-sm"><input defaultChecked={settings.enabled} name="enabled" type="checkbox" /><span><strong className="block">Zapnout propojení s Fakturoidem</strong><span className="mt-1 block text-muted">Zapínejte až po vložení přístupů a vytvoření kontrolní faktury.</span></span></label>
            <label className="grid gap-2 font-redhat text-sm font-semibold">Kdy fakturu automaticky vytvořit<select className={inputClass} defaultValue={settings.automaticTrigger} name="automaticTrigger"><option value="manual">Pouze ručně</option><option value="paid">Po ověřené úhradě</option><option value="delivered">Po doručení objednávky (doporučeno)</option></select></label>
            <label className="flex items-start gap-3 font-redhat text-sm"><input defaultChecked={settings.sendAutomatically} name="sendAutomatically" type="checkbox" /><span><strong className="block">Po vytvoření automaticky odeslat zákazníkovi</strong><span className="mt-1 block text-muted">Odesílání faktur přes Fakturoid vyžaduje jeho placený tarif.</span></span></label>
            <label className="grid gap-2 font-redhat text-sm font-semibold">Splatnost ve dnech<input className={inputClass} defaultValue={settings.dueDays} max="365" min="0" name="dueDays" type="number" /><span className="font-normal text-muted">Pro již zaplacené objednávky ponechte 0.</span></label>
          </div>
          <button className="mt-7 min-h-11 bg-ruby px-6 font-redhat text-sm font-semibold text-white" type="submit">Uložit nastavení fakturace</button>
        </form>
      </main>
    </AdminShell>
  );
}
